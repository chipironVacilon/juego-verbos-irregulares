# Arcade: motor LittleJS y "juice"

Sustituir la capa de pintado propia del arcade por el motor LittleJS (vendorizado,
sin build) para tener partículas, tweens, camera shake y animación, manteniendo la
simulación determinista actual y el resto del juego intacto.

## Specs

- **S1** — "me gustaría añadir un motor algo más avanzado pero ligero".
  El motor elegido debe ser más capaz que el pintado propio y seguir siendo ligero.
- **S2** — Objetivo elegido por el usuario: "Efectos y sensación arcade (juice)" —
  partículas, tweens, camera shake, sonido y sprites animados.
- **S3** — Restricción de peso elegida: "Acepto vendorizar unos cientos de KB".
  El motor entra como fichero vendorizado en el repo.
- **S4** — Alcance elegido: "Motor completo, solo para el arcade". Los otros cuatro
  modos (tarjetas, quiz, frases, escucha) no se tocan.
- **S5** — Se conserva el contrato del README: "No necesita instalación, ni conexión,
  ni servidor: se abre el archivo `index.html` con doble clic". Sin build, sin
  servidor, y el arcade debe seguir funcionando desde `file://`.
- **S6** — Alcance del juice elegido: "Todo el juice del arcade de una vez" —
  partículas al comer, shake al morir, tweens en el HUD, sonidos y animación del alien.

## Tasks

| ID | Specs | Ruta | Commit |
| --- | --- | --- | --- |
| T1 | S1, S3 | inline | `build(arcade): vendor LittleJS 1.31.0` |
| T2 | S1, S2, S4, S5 | inline | `feat(arcade): render the maze and the juice with LittleJS` |
| T3 | S2, S6 | inline | `feat(arcade): render the maze and the juice with LittleJS` |
| T4 | S5, S6 | inline | `docs(arcade): document the port and the vendored engine` |
| T5 | S1-S6 | inline | `docs(arcade): document the port and the vendored engine` |

## Log

- **L1** (petición original, literal): "me gustaría añadir un motor algo más avanzado
  pero ligero"
- **L2** (decisiones del usuario, por cuestionario): objetivo = "Efectos y sensación
  arcade (juice)"; restricción negociable = "Acepto vendorizar unos cientos de KB";
  profundidad = "Motor completo, solo para el arcade"; alcance = "Todo el juice del
  arcade de una vez"; ubicación = "Repo principal, directo sobre master" (sin rama).
- **L3** (incidente de entorno, evidencia): el directorio de sesión original
  (`/home/pepe/.herdr/worktrees/verbos-irregulares/marcianitos`) quedó vacío entre dos
  comandos: `ls -la` mostraba solo `.atl`. La rama `marcianitos` ya estaba mergeada
  (`c0be11d`) y `git worktree list` del repo real solo lista el principal. No se perdió
  trabajo: el repo real `/home/pepe/proyectos/verbos-irregulares` está limpio en
  `master` y contiene `arcade.js` desde `6f30387`. El usuario autorizó trabajar ahí,
  directamente sobre `master`.
- **L4** (decisión técnica, motor): **LittleJS 1.31.0**, MIT, cero dependencias,
  `dist/littlejs.min.js` = 581 981 bytes, globales y `<script src>` clásico (los builds
  ESM-only como Kaboom/Excalibur/Pixi quedan descartados porque `<script type="module">`
  está bloqueado sobre `file://` por CORS; Phaser 3 se descarta por ~1,2 MB y por
  exigir un sistema de escenas para 1 de 5 modos).
- **L5** (decisión técnica, bucle): LittleJS pasa a ser dueño del bucle del arcade a
  60 Hz fijos y llama a `stepArcade` desde `gameUpdate`; desaparece el
  `requestAnimationFrame` propio de `startArcadeLoop`. Con
  `setHeadlessMode(true)` + `setEngineManualStep(true)` + `engineStep(n)` la suite
  avanza frames exactos, así que el determinismo del test se conserva.
- **L6** (decisión técnica, render): se fuerza `setGLEnable(false)` (Canvas2D). El
  play-test lanza Chromium con `--disable-gpu` y el arcade no usa texturas, así que
  WebGL solo añadiría una vía de fallo. El arte se mantiene **procedural** (`drawRect`,
  `drawPoly`, `drawEllipse`): sobre `file://` el navegador bloquea cargar imágenes desde
  disco, así que no hay spritesheets.
- **L7** (decisión técnica, audio): **no se usa ZzFX**. El repo ya tiene `Sfx`
  (osciladores WebAudio procedurales, sin archivos de audio) y meter un segundo motor
  de audio crearía dos `AudioContext` compitiendo. Las señales nuevas del arcade se
  añaden a `Sfx`.
- **L8** (decisión técnica, alcance del canvas): `engineInit` recibe `rootElement` con
  el contenedor del escenario y `canvasFixedSize` igual al tamaño del laberinto
  (21×28 por 13×28 = 588×364 px CSS), para que el canvas no dependa del tamaño de la
  ventana y el CSS siga escalándolo al ancho del panel.
- **L9** (verificación, entorno): el Chromium del equipo es el *snap*, que no puede leer
  rutas ocultas ni `/tmp`. La verificación se hace sirviendo una copia por
  `http://127.0.0.1` con el `pageUrl` parcheado solo en la copia, nunca en
  `scripts/play-test.mjs` (precedente: `odd/tasks/arcade-minigame.md`, L6).
- **L11** (bug encontrado durante la verificación, causa no obvia): al cargar LittleJS
  antes del `<script>` inline, el juego se quedaba con `<main id="view">` vacío y el
  harness moría con `Cannot read properties of null (reading 'textContent')`. La causa
  real solo apareció con el log de consola de Chromium:
  `Uncaught SyntaxError: Identifier 'rand' has already been declared`.
  Los dos son scripts clásicos y comparten el ámbito global: la librería declara
  `var rand` y el juego declaraba `const rand` (`index.html:853`), lo que invalida el
  script **entero** — por eso `window.IVG` existía pero nada se renderizaba, porque su
  asignación está antes de la última línea (`else render();`). Renombrado a
  `randomIndex`. Regla para el futuro: cualquier nombre nuevo de nivel superior en el
  `<script>` inline debe comprobarse contra los 1406 globales del motor.
- **L12** (verificación del corte visual): el arcade se mira en las capturas del
  harness (`08-arcade`, `09-arcade-punto`) porque el port cambia el motor de dibujo y
  ningún test de texto puede decir si el laberinto se ve.
- **L13** (alcance revisado, T4 no hizo falta): `scripts/play-test.mjs` **no se tocó**.
  El harness sigue por tiempo real y juega el arcade como siempre; sus 473
  comprobaciones pasan sin cambios. La única adaptación necesaria fue de producto, no
  de test: quitar el `<canvas>` de relleno del template, porque al montar el motor
  quedaban dos elementos con la clase `.arcade__canvas`, el `querySelector` devolvía el
  vacío (300×150 por defecto) y el chequeo "el laberinto se dibuja en el lienzo"
  fallaba con "muestras pintadas 0".
- **L14** (dos bugs de render, encontrados mirando la captura):
  1. Las partículas salían invisibles: la referencia dice que un efecto incorporado a
     `scale 1` ocupa **una unidad de mundo**, y aquí una unidad es un píxel, así que
     `scale 0.55` era medio píxel. Ahora se escala por `TILE`.
  2. El texto de las palabras se veía parduzco: `drawText` recibe `lineColor=BLACK` por
     defecto y, como Canvas2D ignora `lineWidth = 0` y conserva el valor anterior,
     trazaba un pelo negro sobre el glifo. Se pasa el color de relleno también como
     `lineColor`. Comprobado midiendo el píxel más brillante: `(249,204,99)` frente al
     `(255,209,102)` pedido.
- **L15** (verificación final): `node scripts/check-data.mjs` → 61 verbos, 122 frases,
  `Dataset OK`. Harness completo por HTTP sobre una copia: **473 comprobaciones OK**, sin
  errores de consola. `npm test` tal cual (con `file://`) sigue fallando en este equipo
  por el snap (L9), igual que antes del cambio: no es una regresión de esta tarea.
