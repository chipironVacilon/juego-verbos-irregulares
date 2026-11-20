# Arcade "marcianitos": nuevo modo de mini-juego

Nuevo modo de juego tipo Pac-Man: un marcianito recorre un laberinto con las
flechas, esquiva monstruos y recoge la única palabra que es el pasado del verbo
infinitivo mostrado arriba. Cada acierto suma un punto y cambia el verbo; la
partida termina al tocar un monstruo.

## Specs

- **S1** — "quiero añadir un nuevo tipo de mini-juego. En este caso será un típico
  arcade similar a pac-man."
- **S2** — "Controlamos a un marcianito con las flechas del teclado para movernos
  por un laberinto esquivando monstruos."
- **S3** — "Al inicio da cada partida aparece un verbo en infinitivo en la parte
  superior."
- **S4** — "Por el laberinto se distribuyen diferentes palabras de las cuales sólo
  una es la correspondiente al tiempo "pasado" del verbo de la parte superior."
- **S5** — "Cada vez que recolectemos la palabra correcta sumaremos un punto y
  cambiará la palabra."
- **S6** — "Así hasta que nos topemos con uno de los monstruos"

## Tasks

| ID | Specs | Ruta | Commit |
| --- | --- | --- | --- |
| T1 | S1, S2, S3 | inline | `feat(arcade): add the maze arcade engine` |
| T2 | S4, S5 | inline | `feat(arcade): play the arcade inside the game` |
| T3 | S6 | inline | `feat(arcade): play the arcade inside the game` |
| T4 | S1-S6 | inline | `test(arcade): cover the arcade mode and document it` |
| T5 | S1-S6 | inline | `test(arcade): cover the arcade mode and document it` |

## Log

- **L1** (petición original, literal): "quiero añadir un nuevo tipo de mini-juego.
  En este caso será un típico arcade similar a pac-man. Controlamos a un marcianito
  con las flechas del teclado para movernos por un laberinto esquivando monstruos.
  Al inicio da cada partida aparece un verbo en infinitivo en la parte superior. Por
  el laberinto se distribuyen diferentes palabras de las cuales sólo una es la
  correspondiente al tiempo "pasado" del verbo de la parte superior. Cada vez que
  recolectemos la palabra correcta sumaremos un punto y cambiará la palabra. Así
  hasta que nos topemos con uno de los monstruos"
- **L2** (mapa del código, evidencia): el juego entero vive en `index.html`
  (script clásico, sin build): `MODES` en `index.html:1235`, `LEVELS` /
  `LEVEL_ONE_BASES` en `:1247`, `startRound` en `:1392`, `renderRound`:1720,
  `render()`:1783, `answer()`:1803, `nextQuestion()`:1836, delegación de clicks
  en `:1860`, `keydown` global en `:1927`, hook de depuración `window.IVG` en
  `:1953`. Paleta en `:11-25`. El test de navegador es `scripts/play-test.mjs`
  (CDP sobre Chromium) y ya comprueba `home.modes === 4` en `:178`.
- **L3** (decisión técnica, el agente la asume): el motor del arcade va en un
  fichero nuevo `arcade.js` cargado con `<script src>` clásico (como `verbs.js`),
  para no engordar `index.html` y seguir funcionando con doble clic sobre el
  fichero. El estilo, el enrutado, el marcador y la persistencia se quedan en
  `index.html`, que ya los tiene.
- **L4** (decisión técnica): recoger una palabra incorrecta no resta, sólo
  parpadea en rojo; el usuario sólo definió puntuar al acertar.
- **L5** (decisión técnica): los monstruos persiguen al marcianito (BFS por el
  laberinto) y son más lentos que él; así la partida termina de verdad al tocarlos
  y no al azar.
- **L6** (verificación, entorno): el Chromium del sistema es el *snap*, que no
  puede leer ni este worktree (ruta oculta) ni `/tmp` (tmp privado). El harness
  corre con la copia servida por `http://127.0.0.1:8913` desde `/tmp/ivg-verify`
  (`pageUrl` parcheado solo en la copia, nunca en `scripts/play-test.mjs`).
  Resultado: 469 comprobaciones OK, estable en 4 pasadas.
- **L7** (bug encontrado durante la verificación del motor): `stepTowards`
  devolvía la dirección de la última rama explorada del BFS en vez de la del
  primer paso, así que los monstruos orbitaban al jugador sin llegar a tocarlo.
  Corregido con `directionFrom(from, step)`.
- **L8** (alcance): el arcade se juega con teclado, como pidió el usuario. Queda
  fuera de esta tarea un mando táctil en pantalla; y recoger una palabra
  equivocada no resta, solo parpadea (L4).
- **L9** (slice boundaries, unidad de trabajo): el corte real de esta función no
  cae en 400 líneas exactas porque es un modo nuevo de una sola pieza. Quedó así:
  1. `feat(arcade): add the maze arcade engine` → `arcade.js` (+480).
  2. `feat(arcade): play the arcade inside the game` → `index.html` (+331).
  3. `test(arcade): cover the arcade mode and document it` →
     `scripts/play-test.mjs` (+237), `README.md` (+27), este documento.
  Los tests del harness necesitan la pantalla terminada (el arcade se juega en
  tiempo real), así que van en el último corte y no repartidos. El motor se
  verificó antes en Node, donde sí se observó el fallo y su corrección (L7).
- **L10** (verificación previa a los commits): `node scripts/check-data.mjs` OK
  (61 verbos, 122 frases) y harness completo en verde, 469 comprobaciones.
  `npm test` tal cual (con `file://`) falla en este equipo **antes** de estos
  cambios, por el snap (L6): no es una regresión de esta tarea.
