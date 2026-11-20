# Verbos Irregulares · juego de inglés

Juego en el navegador para aprender los verbos irregulares en inglés (6º de Primaria).
Incluye la pronunciación en inglés, frases de ejemplo y su traducción al español.

No necesita instalación, ni conexión, ni servidor: se abre el archivo `index.html`
con doble clic.

## Cómo se juega

- **Tarjetas**: las tres formas del verbo (infinitivo, pasado, participio), el
  significado, un botón 🔊 por forma y dos frases de ejemplo (pasado simple y
  presente perfecto) con su traducción. Hay buscador y una lista de los 61 verbos.
- **Quiz de formas**: ¿cuál es el pasado o el participio de…? Cuatro opciones.
- **Completa la frase**: una frase con un hueco, su traducción como pista y cuatro
  formas para elegir.
- **Escucha y adivina**: se oye el verbo en inglés y hay que reconocerlo entre cuatro.
- **Arcade del marcianito**: un laberinto tipo Pac-Man. Arriba aparece un verbo en
  infinitivo y por el laberinto hay cuatro palabras: con las flechas del teclado se
  mueve al marcianito para recoger la que es su **pasado**, esquivando a los
  monstruos. Cada partida empieza con una cuenta atrás de tres segundos que pita
  una vez por segundo: el laberinto se ve pero está congelado y todavía sin
  palabras, y justo al terminar aparece el verbo de arriba y se pronuncia una
  vez. Cada acierto suma un punto, da una estrella y cambia el verbo: al recoger
  el pasado correcto se oye su audio y, acto seguido, el del verbo que aparece
  después. Además abre **cinco segundos de poder**: los monstruos se vuelven
  azules, huyen del marcianito y se los puede comer (vuelven a su esquina cuando
  el poder se acaba). La partida termina cuando un monstruo te alcanza. El récord
  del arcade se guarda en el navegador.

En un móvil o una tableta el arcade se juega **a pantalla completa y con el dedo**.
Al entrar desde el inicio el juego ocupa toda la pantalla (la barra de arriba y el
pie de página desaparecen) y pide al navegador su modo pantalla completa cuando lo
tiene. Se controla de dos maneras: deslizando el dedo sobre el laberinto en la
dirección que se quiere tomar, o tocando las cuatro flechas grandes que aparecen
debajo. Un toque basta por giro, porque el marcianito sigue andando en la
dirección marcada hasta chocar con una pared. El botón **⤢ Pantalla completa**
entra y sale de ese modo también en el ordenador, y en el móvil sirve para volver
a la página normal al terminar.

Cada ronda son 10 preguntas. Se ganan estrellas, se cuenta la racha y el progreso
se guarda en el propio navegador (`localStorage`). Los verbos que falla aparecen
más a menudo en las siguientes rondas, con un tope: un par de verbos flojos no
pueden acaparar la partida. En el arcade, además, nunca vuelven los cuatro verbos
que acabas de ver. En el inicio, el botón **Borrar progreso** pide confirmación y
deja el perfil como recién instalado (estrellas, racha, récords, estadísticas y
nivel).

Atajos de teclado: `1`-`4` responden y `Enter` pasa a la siguiente pregunta. El
arcade se juega con las flechas (`←` `↑` `→` `↓`), con las flechas táctiles de la
pantalla o deslizando el dedo por el laberinto.

## Niveles

La pantalla de inicio deja elegir nivel y la elección se guarda en el navegador.

- **Nivel 1**: los diez primeros verbos (`awake`, `be`, `beat`, `become`, `begin`,
  `bend`, `bet`, `bind`, `bite`, `bleed`). Todas las actividades usan solo el
  **infinitivo y el pasado**: las tarjetas enseñan esas dos formas con su frase en
  pasado simple, el quiz pregunta el pasado, las frases van en pasado simple y la
  escucha reproduce el pasado.
- **Nivel 2**: los 61 verbos con las tres formas, como el juego de siempre. Es el
  nivel que aparece marcado la primera vez.

Cada nivel arma sus propias opciones: en el nivel 1 las respuestas falsas salen de
sus diez verbos, así que no se cuelan formas que todavía no se han estudiado. El
arcade también respeta el nivel: en el nivel 1 el verbo de arriba y las cuatro
palabras del laberinto salen de esos diez verbos, y lo que se recoge es siempre el
pasado. Las estrellas, la racha y las rondas son las mismas en los dos niveles; la
barra de progreso cuenta solo los verbos del nivel elegido.

## La pronunciación

El audio son **grabaciones incluidas con el juego**: voces neuronales británicas
(en-GB-Sonia, con ritmo un poco más lento para aprender), comprimidas a MP3 mono
32 kbps. Reproduce sin internet y suena igual en cualquier dispositivo. Si falta
algún fichero, el juego usa automáticamente la voz en inglés del navegador como
respaldo y avisa en la pantalla de inicio.

Para **regenerar el audio** (p. ej. tras añadir verbos o cambiar la voz):

```bash
npm install                              # una sola vez, necesita internet
npm run audio                            # solo lo que falte
npm run audio -- --force                 # todo de nuevo
TTS_VOICE=en-GB-RyanNeural npm run audio -- --force   # otra voz
```

Necesita `ffmpeg` en el sistema y conexión a internet cada vez que generes
audio (habla con el servicio de Microsoft). Voces británicas disponibles:
Sonia (la usada), Libby, Maisie, Ryan, Thomas.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `index.html` | El juego completo: pantallas, estilos y lógica (incluida la pantalla y el marcador del arcade). |
| `arcade.js` | La simulación del arcade (laberinto, marcianito, monstruos, movimiento por casillas, puntuación de casillas) y su capa de dibujo y efectos sobre LittleJS. |
| `vendor/littlejs.min.js` | El motor LittleJS 1.31.0, vendorizado (MIT, ~570 KB). Se carga con un `<script src>` normal, sin módulos ni compilación. |
| `verbs.js` | Los 61 verbos con sus dos frases de ejemplo y su traducción. |
| `assets/audio/` | Las grabaciones en inglés (305 ficheros MP3, ~2 MB en total): 3 formas y 2 frases por verbo. |
| `package.json` | Dependencia de los scripts (`msedge-tts`); `npm install` una sola vez. |
| `scripts/generate-audio.mjs` | Genera o regenera los MP3 con las voces neuronales británicas de Edge. |
| `scripts/check-data.mjs` | Comprueba que `verbs.js` esté bien formado. |
| `scripts/play-test.mjs` | Juega una ronda completa de cada modo en Chromium y verifica que todo funcione. |

## Añadir o cambiar verbos

1. Abre `verbs.js` y copia una entrada existente.
2. Cada verbo necesita `base`, `past`, `participle`, `es` y dos `examples` (una en
   pasado simple y otra en presente perfecto). El campo `target` es la palabra
   exacta que el juego tapa en la frase.
3. Si el verbo se escribe igual en presente pero suena distinto (como `read`),
   añade `speakPast` / `speakParticiple` con la palabra que debe decir la voz y un
   `tip` para explicarlo. Tras añadir verbos, regenera el audio:
   `node scripts/generate-audio.mjs`.
4. Si el verbo entra en el nivel 1, apúntalo también en `LEVEL_ONE_BASES`, dentro de
   `index.html`; si no, el nivel 2 lo usará pero el nivel 1 no lo verá.
5. Comprueba los datos y el juego:

```bash
node scripts/check-data.mjs
node scripts/play-test.mjs            # añade --shots /tmp/capturas para ver imágenes
```

`play-test.mjs` usa Chromium en modo headless (busca `chromium` en el sistema o
la ruta de `CHROME_PATH`).

## El motor del arcade

El arcade corre sobre [LittleJS](https://github.com/KilledByAPixel/LittleJS) 1.31.0
(MIT), copiado en `vendor/littlejs.min.js` con su licencia al lado. Se eligió por
encajar con la promesa del juego: es un `<script src>` clásico, no necesita
compilación ni servidor, y funciona abriendo `index.html` con doble clic.

- **Qué pone el motor**: el lienzo y el bucle a 60 Hz fijos, las partículas, los
tweens, la vibración de cámara y el reloj de la animación.
- **Qué sigue siendo nuestro**: toda la simulación (`arcade.js` hasta
`function drawWorld`) es JavaScript puro sin reloj, así que se puede probar en Node;
y el dibujo del laberinto es procedural (`drawRect`, `drawPoly`, `drawEllipse`) porque
un navegador no deja cargar imágenes de sprites desde el disco al abrir el fichero.
- **Qué no se usa**: el audio de LittleJS. El juego ya tiene `Sfx`, osciladores
WebAudio sin archivos, y dos motores de audio serían un problema, no una mejora.

Si algún día se actualiza el motor, basta con reemplazar el fichero de `vendor/`:
no hay ninguna API del juego en juego más que la que usa `arcade.js`.

## Notas

- La interfaz está en español de España y el contenido sigue el vocabulario de
  Primaria (p. ej. "nevera", "coger el autobús", "la paga").
- Las frases usan el pasado simple y el presente perfecto, que son los tiempos que
  se trabajan en 6º de Primaria.
- El juego no recoge datos ni envía nada a internet. Las estrellas, el progreso y
  el récord del arcade se guardan solo en el navegador donde se juega; el botón de
  la barra superior vuelve al inicio y `IVG.reset()` (desde la consola) borra el
  progreso.
