#!/usr/bin/env node
/*
 * Generates the game's audio clips with Microsoft Edge neural voices
 * (via the msedge-tts package) and compresses them with ffmpeg.
 *
 *   npm install                (once, needs internet)
 *   node scripts/generate-audio.mjs                 # everything missing
 *   node scripts/generate-audio.mjs --force eat     # regenerate one verb
 *   node scripts/generate-audio.mjs --list          # show what would be generated
 *
 * Produces, for every verb:
 *   assets/audio/<base>/base.mp3        "eat"
 *   assets/audio/<base>/past.mp3        "ate"
 *   assets/audio/<base>/participle.mp3  "eaten"
 *   assets/audio/<base>/example-1.mp3   past-simple sentence
 *   assets/audio/<base>/example-2.mp3   present-perfect sentence
 *
 * The speech is requested at a slightly slower rate (-8%) and a light pitch lift,
 * which reads better for a child. ffmpeg then converts to mono 32 kbps MP3 with
 * loudness normalisation and silence trimming.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const require = createRequire(import.meta.url);

let MsEdgeTTS, OUTPUT_FORMAT;
try {
  ({ MsEdgeTTS, OUTPUT_FORMAT } = createRequire(join(root, "noop.js"))("msedge-tts"));
} catch {
  console.error(
    "Falta la dependencia msedge-tts. Instálala desde la raíz del proyecto\n" +
      "(necesita internet, una sola vez):\n" +
      "  npm install"
  );
  process.exit(1);
}

const VERBS = require(join(root, "verbs.js"));
const OUT_DIR = join(root, "assets", "audio");

const VOICE = process.env.TTS_VOICE || "en-GB-SoniaNeural";
const RATE = "-8%";
const PITCH = "+5Hz";
const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const forceIndex = args.indexOf("--force");
const forceTargets = forceIndex > -1 ? args.slice(forceIndex + 1).filter((arg) => !arg.startsWith("--")) : [];

const sayText = (verb, form) => {
  if (form === "base") return verb.base;
  if (form === "past") return verb.speakPast || verb.past.split("/")[0].trim();
  return verb.speakParticiple || verb.participle.split("/")[0].trim();
};

/** One clip: what to say and where it goes. */
function clipsFor(verb) {
  const clips = [
    { file: "base.mp3", text: verb.base },
    { file: "past.mp3", text: sayText(verb, "past") },
    { file: "participle.mp3", text: sayText(verb, "participle") }
  ];
  verb.examples.forEach((example, index) => {
    clips.push({ file: `example-${index + 1}.mp3`, text: example.en });
  });
  return clips;
}

const ffmpegAvailable = (() => {
  try {
    execFileSync(FFMPEG, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
if (!ffmpegAvailable) {
  console.error("No se encontró ffmpeg (instálalo o define FFMPEG_PATH).");
  process.exit(1);
}

const jobs = [];
for (const verb of VERBS) {
  const verbDir = join(OUT_DIR, verb.base);
  for (const clip of clipsFor(verb)) {
    const target = join(verbDir, clip.file);
    const forced = forceTargets.length === 0 || forceTargets.includes(verb.base);
    if (!forced || !existsSync(target)) {
      jobs.push({ verb, clip, target, dir: verbDir });
    }
  }
}

const countAudio = (dir) => {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry);
    if (!statSync(entryPath).isDirectory()) continue;
    for (const file of readdirSync(entryPath)) {
      if (file.endsWith(".mp3")) total += statSync(join(entryPath, file)).size;
    }
  }
  return total;
};

console.log(`Voz: ${VOICE} · verbos: ${VERBS.length} · clips a generar: ${jobs.length}`);
if (listOnly) {
  for (const job of jobs.slice(0, 12)) console.log(`  ${job.verb.base}/${job.clip.file}  "${job.clip.text}"`);
  if (jobs.length > 12) console.log(`  … y ${jobs.length - 12} más`);
  const existing = countAudio(OUT_DIR);
  console.log(`Ya generados: ${(existing / 1024).toFixed(0)} KB`);
  process.exit(0);
}

if (jobs.length === 0) {
  console.log("Nada que generar: todos los clips existen (usa --force <verbo> para regenerar).");
  process.exit(0);
}

const tts = new MsEdgeTTS();
await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

let done = 0;
let failed = [];
const started = Date.now();

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function synthesize(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const { audioStream } = tts.toStream(text, { rate: RATE, pitch: PITCH });
      const chunks = [];
      await new Promise((resolveStream, rejectStream) => {
        audioStream.on("data", (chunk) => chunks.push(chunk));
        audioStream.on("close", resolveStream);
        audioStream.on("error", rejectStream);
        setTimeout(() => rejectStream(new Error("sin respuesta en 20s")), 20000);
      });
      const raw = Buffer.concat(chunks);
      if (raw.length > 500) return raw;
      throw new Error(`respuesta sospechosamente corta (${raw.length} bytes)`);
    } catch (error) {
      if (attempt === retries) throw error;
      await sleep(1200 * attempt);
      // A broken socket sometimes only recovers after renegotiating the session.
      try {
        tts.close();
      } catch {}
      await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    }
  }
  throw new Error("unreachable");
}

for (const job of jobs) {
  const { verb, clip, target, dir } = job;
  try {
    mkdirSync(dir, { recursive: true });
    const raw = await synthesize(clip.text);

    execFileSync(FFMPEG, [
      "-v", "error",
      "-y",
      "-i", "pipe:0",
      "-ac", "1",
      "-ar", "22050",
      "-b:a", "32k",
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11, silenceremove=start_periods=1:start_threshold=-45dB, areverse, silenceremove=start_periods=1:start_threshold=-45dB, areverse",
      "-write_xing", "0",
      "-id3v2_version", "0",
      target
    ], { input: raw, stdio: ["pipe", "ignore", "pipe"], maxBuffer: 10 * 1024 * 1024 });

    done += 1;
    if (done % 25 === 0 || done === jobs.length) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`  ${done}/${jobs.length} clips (${elapsed}s)`);
    }
  } catch (error) {
    failed.push(`${verb.base}/${clip.file}: ${error.message}`);
  }
}

tts.close();

const totalBytes = countAudio(OUT_DIR);
const totalClips = VERBS.reduce((sum, verb) => sum + clipsFor(verb).length, 0);

console.log(`\nGenerados: ${done} clips · errores: ${failed.length}`);
for (const failure of failed) console.error(`  - ${failure}`);
console.log(`Total audio: ${(totalBytes / 1024 / 1024).toFixed(2)} MB en ${OUT_DIR} (objetivo: ${totalClips} clips)`);

if (failed.length > 0) process.exit(1);
if (totalClips !== readdirSync(OUT_DIR).reduce(
  (sum, entry) => sum + readdirSync(join(OUT_DIR, entry)).filter((file) => file.endsWith(".mp3")).length,
  0
)) {
  console.error("El número de clips no coincide con el esperado; revisa los errores de arriba.");
  process.exit(1);
}
console.log("Audio listo");
