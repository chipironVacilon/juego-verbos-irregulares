# Verbos Irregulares · juego de inglés

Juego en el navegador para aprender los verbos irregulares en inglés (6º de Primaria).
Incluye la pronunciación en inglés, frases de ejemplo y su traducción al español.

No necesita instalación, ni conexión, ni servidor: se abre el archivo `index.html`
con doble clic.

## Cómo se juega

- **Tarjetas**: las tres formas del verbo (infinitivo, pasado, participio), el
  significado, un botón 🔊 por forma y dos frases de ejemplo (pasado simple y
  presente perfecto) con su traducción. Hay buscador y una lista de los 54 verbos.
- **Quiz de formas**: ¿cuál es el pasado o el participio de…? Cuatro opciones.
- **Completa la frase**: una frase con un hueco, su traducción como pista y cuatro
  formas para elegir.
- **Escucha y adivina**: se oye el verbo en inglés y hay que reconocerlo entre cuatro.

Cada ronda son 10 preguntas. Se ganan estrellas, se cuenta la racha y el progreso
se guarda en el propio navegador (`localStorage`). Los verbos que falla aparecen
más a menudo en las siguientes rondas.

Atajos de teclado: `1`-`4` responden y `Enter` pasa a la siguiente pregunta.

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
| `index.html` | El juego completo: pantallas, estilos y lógica. |
| `verbs.js` | Los 54 verbos con sus dos frases de ejemplo y su traducción. |
| `assets/audio/` | Las grabaciones en inglés (270 ficheros MP3, ~1,8 MB en total): 3 formas y 2 frases por verbo. |
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
4. Comprueba los datos y el juego:

```bash
node scripts/check-data.mjs
node scripts/play-test.mjs            # añade --shots /tmp/capturas para ver imágenes
```

`play-test.mjs` usa Chromium en modo headless (busca `chromium` en el sistema o
la ruta de `CHROME_PATH`).

## Notas

- La interfaz está en español de España y el contenido sigue el vocabulario de
  Primaria (p. ej. "nevera", "coger el autobús", "la paga").
- Las frases usan el pasado simple y el presente perfecto, que son los tiempos que
  se trabajan en 6º de Primaria.
- El juego no recoge datos ni envía nada a internet. Las estrellas y el progreso
  se guardan solo en el navegador donde se juega; el botón de la barra superior
  vuelve al inicio y `IVG.reset()` (desde la consola) borra el progreso.
