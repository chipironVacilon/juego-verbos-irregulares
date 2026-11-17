#!/usr/bin/env node
/*
 * End-to-end check of the game in a real browser, without a test framework.
 *
 *   node scripts/play-test.mjs [--shots <dir>]
 *
 * It boots headless Chromium through the DevTools protocol, plays a complete
 * round of every mode (right and wrong answers), opens the cards screen, and
 * fails on any console error or broken expectation. With --shots it also saves
 * PNG screenshots so a human can eyeball the design.
 */
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pageUrl = `file://${join(root, "index.html")}`;
const VERBS = createRequire(import.meta.url)(join(root, "verbs.js"));

const shotsIndex = process.argv.indexOf("--shots");
const shotsDir = shotsIndex > -1 ? resolve(process.argv[shotsIndex + 1]) : null;

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/snap/bin/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/firefox"
].filter(Boolean);

const chromePath = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
if (!chromePath) throw new Error("No Chromium found (set CHROME_PATH)");

const failures = [];
const passes = [];
const check = (condition, label, detail) => {
  if (condition) passes.push(label);
  else failures.push(detail === undefined ? label : `${label} :: ${detail}`);
};

const profiles = await mkdtemp(join(tmpdir(), "ivg-profile-"));
const port = 9333 + (process.pid % 400);

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profiles}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--force-device-scale-factor=1",
    "--window-size=900,1250",
    "--allow-file-access-from-files",
    "--autoplay-policy=no-user-gesture-required",
    pageUrl
  ],
  { stdio: ["ignore", "pipe", "pipe"] }
);

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function pageTarget() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch (error) {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error("Chromium DevTools endpoint never came up");
}

const target = await pageTarget();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((open, error) => {
  socket.addEventListener("open", open, { once: true });
  socket.addEventListener("error", error, { once: true });
});

let messageId = 0;
const pending = new Map();
const consoleErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve: done, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(`${message.error.message}`));
    else done(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params.exceptionDetails;
    consoleErrors.push(details.exception?.description || details.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  }
});

const send = (method, params = {}) => {
  const id = (messageId += 1);
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((done, reject) => {
    pending.set(id, { resolve: done, reject });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }
    }, 20000);
  });
};

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) {
    throw new Error(
      `Page threw: ${response.exceptionDetails.exception?.description || response.exceptionDetails.text}`
    );
  }
  return response.result.value;
}

async function shot(name) {
  if (!shotsDir) return;
  await mkdir(shotsDir, { recursive: true });
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(shotsDir, `${name}.png`), Buffer.from(data, "base64"));
}

const waitFor = async (expression, label) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await evaluate(expression)) return true;
    await sleep(100);
  }
  check(false, `esperaba: ${label}`);
  return false;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 1250, deviceScaleFactor: 1, mobile: false });
await waitFor("!!window.IVG", "el juego arranca");

/* ---------------------------------------------------------------- home ---- */

const home = await evaluate(`(() => ({
  modes: document.querySelectorAll('.mode').length,
  stars: document.getElementById('stat-stars').textContent,
  practiced: document.querySelector('.progress-card p').textContent,
  hasBanner: !!document.querySelector('.banner'),
  verbCount: IVG.verbs.length
}))()`);
check(home.modes === 4, "el inicio ofrece 4 modos", `encontrados ${home.modes}`);
check(home.verbCount === 54, "el juego carga los 54 verbos", `cargó ${home.verbCount}`);
check(home.practiced.includes(`de ${home.verbCount} verbos`), "la barra de progreso usa el total", home.practiced);
check(home.stars === "0", "empieza con 0 estrellas", home.stars);
await shot("01-home");

/* --------------------------------------------------------------- study ---- */

await evaluate("document.querySelector('[data-action=study]').click()");
await waitFor("document.querySelector('.verb-card') !== null", "la pantalla de tarjetas");

const study = await evaluate(`(() => ({
  forms: [...document.querySelectorAll('.form-row__value')].map(node => node.textContent.trim()),
  sentences: [...document.querySelectorAll('.example__es')].map(node => node.textContent.trim()),
  speaks: document.querySelectorAll('.speak').length
}))()`);
check(study.forms.join(" | ") === "be | was / were | been", "la tarjeta muestra las tres formas", study.forms.join(" | "));
check(study.sentences.length === 2 && study.sentences.every((text) => text.length > 3), "cada tarjeta trae dos traducciones", JSON.stringify(study.sentences));
check(study.speaks >= 5, "hay altavoces para formas y frases", `encontrados ${study.speaks}`);
await shot("02-tarjetas");

await evaluate("document.querySelector('[data-action=study-next]').click()");
const nextCard = await evaluate("document.querySelector('.form-row__value').textContent.trim()");
check(nextCard === "have", "siguiente tarjeta avanza al verbo siguiente", nextCard);

await evaluate(`(() => {
  const input = document.querySelector('[data-role=study-filter]');
  input.value = 'nadar';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
const filtered = await evaluate("[...document.querySelectorAll('.verb-grid button')].map(node => node.textContent.trim())");
check(filtered.includes("swim") && filtered.length < 6, "el buscador filtra en español", JSON.stringify(filtered));

await evaluate(`(() => {
  const input = document.querySelector('[data-role=study-filter]');
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);

/* --------------------------------------------------------- audio clips ---- */

// Every recorded clip ships with the game: verify they are all there.
const expectedClips = [];
for (const verb of VERBS) {
  expectedClips.push(
    join(root, "assets", "audio", verb.base, "base.mp3"),
    join(root, "assets", "audio", verb.base, "past.mp3"),
    join(root, "assets", "audio", verb.base, "participle.mp3"),
    join(root, "assets", "audio", verb.base, "example-1.mp3"),
    join(root, "assets", "audio", verb.base, "example-2.mp3")
  );
}
const missingClips = expectedClips.filter((path) => !existsSync(path));
check(missingClips.length === 0, "los 270 clips grabados existen", `faltan ${missingClips.length}`);

const clipTotal = readdirSync(join(root, "assets", "audio")).reduce((sum, verbDir) => {
  const verbPath = join(root, "assets", "audio", verbDir);
  return sum + readdirSync(verbPath).filter((file) => file.endsWith(".mp3")).length;
}, 0);
check(clipTotal === expectedClips.length, "no hay clips de más ni de menos", `hay ${clipTotal}`);

await waitFor("IVG.player.fileMode !== null", "la prueba de audio del arranque");
const audioBoot = await evaluate("IVG.player.fileMode");
check(audioBoot === true, "el navegador reproduce los clips grabados", `fileMode=${audioBoot}`);

// The cards screen must wire every speaker button to real files.
await evaluate("location.hash = '#study'");
await waitFor("!!document.querySelector('.verb-card')", "tarjetas para el audio");
const studyAudio = JSON.parse(
  await evaluate(`(() => JSON.stringify({
    buttons: [...document.querySelectorAll('[data-action=speak]')].map(button => JSON.parse(button.dataset.clips || '[]')),
    noBanner: !document.querySelector('.banner')
  }))()`)
);
check(studyAudio.buttons.length === 5, "la tarjeta tiene 5 botones de audio", `${studyAudio.buttons.length}`);
check(
  studyAudio.buttons.every((clips) => clips.length > 0 && existsSync(join(root, clips[0]))),
  "cada botón apunta a un fichero que existe",
  JSON.stringify(studyAudio.buttons)
);
check(studyAudio.noBanner, "sin aviso de audio cuando los clips existen");

await evaluate("document.querySelector('[data-action=speak]').click()");
await new Promise((done) => setTimeout(done, 400));
const afterClick = await evaluate("IVG.player.fileMode");
check(afterClick === true, "al pulsar 🔊 suenan los clips grabados", `fileMode=${afterClick}`);

// Regression: stopping a playing clip used to poison the player state
// (empty src fired a media error that permanently downgraded to synth).
await evaluate("document.querySelector('[data-action=speak]').click()");
await new Promise((done) => setTimeout(done, 200));
await evaluate("document.querySelector('[data-action=speak]').click()");
await new Promise((done) => setTimeout(done, 200));
const afterSpam = await evaluate("IVG.player.fileMode");
check(afterSpam === true, "repetir el clic no degrada a la voz del navegador", `fileMode=${afterSpam}`);

await evaluate(`(() => {
  document.querySelector('[data-action=speak]').click();
  document.querySelector('.study-nav [data-action=study-next]').click();
  return true;
})()`);
const afterNavigation = await evaluate("IVG.player.fileMode");
check(afterNavigation === true, "navegar con audio en marcha no degrada el reproductor", `fileMode=${afterNavigation}`);
await evaluate("document.querySelector('[data-action=speak]').click()");
const stillTrue = await evaluate("IVG.player.fileMode");
check(stillTrue === true, "después de navegar los clips siguen sonando", `fileMode=${stillTrue}`);

// A missing clip must downgrade exactly once and only on a real load error.
const fakeResult = await evaluate(`(() => new Promise((done) => {
  IVG.player.say(['assets/audio/no-existe.mp3'], 'docs');
  setTimeout(() => done(JSON.stringify({ fileMode: IVG.player.fileMode })), 1200);
}))()`);
const fake = JSON.parse(fakeResult);
check(fake.fileMode === false, "un clip inexistente activa el respaldo del navegador", JSON.stringify(fake));
// A page reload resets fileMode to the boot probe; that path is what players see
// after a broken state, and it is the boot behaviour already checked above.

/* ---------------------------------------------------------- every mode ---- */

async function playRound(mode, { correctCount }) {
  await evaluate("location.hash = ''");
  await evaluate("document.querySelector('[data-action=home]').click()");
  await waitFor("!!document.querySelector('.mode')", "volver al inicio");

  await evaluate(`document.querySelector('[data-mode=${mode}]').click()`);
  await waitFor(
    `IVG.state.round && IVG.state.round.mode === '${mode}' && IVG.state.view === 'play'`,
    `arranca el modo ${mode}`
  );

  const total = await evaluate("IVG.state.round.items.length");
  check(total === 10, `${mode}: la ronda tiene 10 preguntas`, `tiene ${total}`);

  let expectedScore = 0;
  const missed = [];

  for (let question = 0; question < total; question += 1) {
    const snapshot = JSON.parse(
      await evaluate(`(() => {
        const round = IVG.state.round;
        const item = round.items[round.index];
        return JSON.stringify({
          index: round.index,
          correct: item.correct,
          options: item.options,
          mode: round.mode,
          sentence: item.sentence || "",
          renderedSentence: (document.querySelector('.sentence') || {}).textContent || "",
          translation: (document.querySelector('.translation') || {}).textContent || "",
          hasBlank: !!document.querySelector('.sentence .blank'),
          optionCount: document.querySelectorAll('.option').length
        });
      })()`)
    );

    check(snapshot.optionCount === 4, `${mode}: cuatro opciones por pregunta`, `${snapshot.optionCount}`);
    check(
      snapshot.options.filter((option) => option === snapshot.correct).length === 1,
      `${mode}: la respuesta aparece una sola vez`,
      JSON.stringify(snapshot.options)
    );
    if (mode === "gaps") {
      check(snapshot.hasBlank, "frases: la frase muestra el hueco", snapshot.sentence);
      check(
        snapshot.renderedSentence.includes("?") && !snapshot.renderedSentence.includes("____"),
        "frases: el hueco se pinta como hueco",
        snapshot.renderedSentence
      );
      check(snapshot.renderedSentence.length > 12, "frases: la frase se lee entera", snapshot.renderedSentence);
      check(
        snapshot.translation.length > 8,
        "frases: la traducción aparece antes de responder",
        snapshot.translation
      );
    }
    if (question === 0) await shot(`03-${mode}-pregunta`);

    const wantsRight = question < correctCount;
    const index = wantsRight
      ? snapshot.options.indexOf(snapshot.correct)
      : snapshot.options.findIndex((option) => option !== snapshot.correct);

    await evaluate(`document.querySelectorAll('.option')[${index}].click()`);

    const after = JSON.parse(
      await evaluate(`(() => {
        const round = IVG.state.round;
        return JSON.stringify({
          score: round.score,
          streak: round.streak,
          answered: round.answered,
          feedback: (document.querySelector('.feedback__head') || {}).textContent || "",
          correctButtons: document.querySelectorAll('.option.is-correct').length,
          wrongButtons: document.querySelectorAll('.option.is-wrong').length,
          disabled: [...document.querySelectorAll('.option')].every(button => button.disabled),
          starsShown: document.querySelector('.round-top .stat:last-child b').textContent,
          hasTranslation: !!document.querySelector('.feedback .example__es'),
          hasSentence: !!document.querySelector('.feedback .example__en span')
        });
      })()`)
    );

    if (wantsRight) {
      expectedScore += 1;
      check(after.score === expectedScore, `${mode}: suma un acierto`, `score ${after.score} ≠ ${expectedScore}`);
      check(after.feedback.includes("Muy bien"), `${mode}: el acierto se celebra`, after.feedback);
    } else {
      missed.push(snapshot.correct);
      check(after.streak === 0, `${mode}: fallar reinicia la racha`, `racha ${after.streak}`);
      check(after.feedback.includes("Casi"), `${mode}: el fallo dice cuál era`, after.feedback);
    }
    check(after.correctButtons === 1, `${mode}: se marca la opción correcta`, `${after.correctButtons}`);
    check(after.wrongButtons === (wantsRight ? 0 : 1), `${mode}: se marca el fallo`, `${after.wrongButtons}`);
    check(after.disabled, `${mode}: las opciones se bloquean al responder`);
    check(after.hasTranslation, `${mode}: la corrección trae traducción`);
    check(after.hasSentence, `${mode}: la corrección trae la frase en inglés`);

    await evaluate("document.querySelector('.option.is-dim')?.click()");
    const unchanged = await evaluate("IVG.state.round.score");
    check(unchanged === expectedScore, `${mode}: responder dos veces no suma de más`, `score ${unchanged}`);

    if (question === 0) await shot(`04-${mode}-correccion`);

    await evaluate("document.querySelector('[data-action=next]').click()");
  }

  const result = JSON.parse(
    await evaluate(`(() => JSON.stringify({
      title: document.querySelector('.result h2').textContent,
      score: document.querySelector('.result__score').textContent,
      review: (document.querySelector('.result__review') || {}).textContent || "",
      actions: document.querySelectorAll('.result__actions button').length
    }))()`)
  );
  check(result.score.includes(`${expectedScore}`), `${mode}: el resultado cuenta los aciertos`, result.score);
  check(result.actions === 3, `${mode}: el resultado ofrece volver a jugar`, `${result.actions}`);
  check(
    missed.length === 0 || result.review.length > 0,
    `${mode}: los fallos aparecen como repaso`,
    result.review
  );
  if (mode === "quiz") await shot("05-resultado");
  return expectedScore;
}

const quizScore = await playRound("quiz", { correctCount: 8 });
const gapsScore = await playRound("gaps", { correctCount: 6 });
const listenScore = await playRound("listen", { correctCount: 10 });

const totals = JSON.parse(
  await evaluate(`(() => JSON.stringify({
    stars: IVG.profile.stars,
    bestStreak: IVG.profile.bestStreak,
    rounds: IVG.profile.rounds,
    stored: JSON.parse(localStorage.getItem('verbos-irregulares-v1') || '{}').stars,
    header: document.getElementById('stat-stars').textContent
  }))()`)
);
check(totals.stars === quizScore + gapsScore + listenScore, "las estrellas se acumulan entre rondas", JSON.stringify(totals));
check(totals.stored === totals.stars, "las estrellas se guardan en el navegador", JSON.stringify(totals));
check(totals.rounds === 3, "se cuentan las rondas jugadas", `${totals.rounds}`);

/* ------------------------------------------------------ audio + keyboard ---- */

await evaluate("document.querySelector('[data-action=home]').click()");
await waitFor("!!document.querySelector('.mode')", "volver al inicio después de jugar");
const starsBeforeTopbarClick = await evaluate("IVG.profile.stars");
await evaluate("document.querySelectorAll('.stat')[0].click()");
const starsAfterTopbarClick = await evaluate("IVG.profile.stars");
check(starsAfterTopbarClick === starsBeforeTopbarClick, "tocar la barra superior no altera las estrellas");

await evaluate("location.hash = '#study'");
await waitFor("!!document.querySelector('.verb-card')", "volver a las tarjetas");
const speakWorked = await evaluate(`(() => {
  const button = document.querySelector('[data-action=speak]');
  button.click();
  return true;
})()`);
check(speakWorked, "los botones de audio responden al clic");

await evaluate("location.hash = '#quiz'");
await waitFor("IVG.state.round && IVG.state.round.mode === 'quiz'", "el modo quiz arranca desde la URL");
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))`);
const keyAnswered = await evaluate("!!IVG.state.round.answered");
check(keyAnswered, "la tecla 1 responde la pregunta");
await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
const keyAdvanced = await evaluate("IVG.state.round.index");
check(keyAdvanced === 1, "Enter pasa a la siguiente pregunta", `índice ${keyAdvanced}`);

/* ---------------------------------------------------------------- mobile ---- */

await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true
});
await evaluate("document.querySelector('[data-action=home]').click()");
await waitFor("!!document.querySelector('.mode')", "inicio en vista móvil");
const mobileLayout = JSON.parse(
  await evaluate(`(() => JSON.stringify({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    modeWidth: Math.round(document.querySelector('.mode').getBoundingClientRect().width),
    viewport: window.innerWidth
  }))()`)
);
check(!mobileLayout.overflow, "en móvil no hay scroll horizontal", JSON.stringify(mobileLayout));
check(mobileLayout.modeWidth < mobileLayout.viewport, "en móvil las tarjetas entran a lo ancho", JSON.stringify(mobileLayout));
await shot("06-movil-inicio");

await evaluate("document.querySelector('[data-mode=gaps]').click()");
await waitFor("IVG.state.view === 'play'", "ronda en móvil");
await evaluate("document.querySelectorAll('.option')[0].click()");
const mobileRound = await evaluate("document.documentElement.scrollWidth > window.innerWidth + 1");
check(!mobileRound, "en móvil la ronda no desborda");
await shot("07-movil-ronda");

/* ----------------------------------------------------------------- done ---- */

check(consoleErrors.length === 0, "sin errores de consola", consoleErrors.join(" | "));

socket.close();
chrome.kill("SIGKILL");

console.log(`\n${passes.length} comprobaciones OK`);
if (failures.length) {
  console.error(`\n${failures.length} fallo(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("Todo verde");
