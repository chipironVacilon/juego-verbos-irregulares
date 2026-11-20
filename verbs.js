/*
 * Irregular verb dataset for the game.
 *
 * Every entry needs:
 *   base        - infinitive shown on the card
 *   past        - simple past, variants separated by " / " (was / were)
 *   participle  - past participle
 *   es          - Spanish meaning (Spain)
 *   examples    - one past-simple and one present-perfect sentence:
 *                   en     - English sentence
 *                   es     - Spain Spanish translation
 *                   form   - "past" | "participle" (which form the sentence trains)
 *                   target - the exact word inside `en` that gets blanked out
 *
 * Optional:
 *   speakPast / speakParticiple - text sent to the speech engine when the
 *                                 written form would be read wrong by a TTS voice
 *                                 (e.g. "read" is read as the present, so we ask
 *                                 the engine for "red").
 *   tip - small note shown under the card.
 */
const VERBS = [
  {
    base: "be",
    past: "was / were",
    participle: "been",
    es: "ser, estar",
    speakPast: "was",
    examples: [
      { en: "I was at the park yesterday.", es: "Ayer estuve en el parque.", form: "past", target: "was" },
      { en: "She has been very kind to me.", es: "Ha sido muy amable conmigo.", form: "participle", target: "been" }
    ]
  },
  {
    base: "have",
    past: "had",
    participle: "had",
    es: "tener",
    examples: [
      { en: "We had pizza last night.", es: "Anoche cenamos pizza.", form: "past", target: "had" },
      { en: "I have had this bike for two years.", es: "He tenido esta bici durante dos años.", form: "participle", target: "had" }
    ]
  },
  {
    base: "do",
    past: "did",
    participle: "done",
    es: "hacer",
    examples: [
      { en: "I did my homework before dinner.", es: "Hice los deberes antes de cenar.", form: "past", target: "did" },
      { en: "She has done all her chores.", es: "Ha hecho todas sus tareas de casa.", form: "participle", target: "done" }
    ]
  },
  {
    base: "go",
    past: "went",
    participle: "gone",
    es: "ir",
    examples: [
      { en: "We went to the beach last summer.", es: "El verano pasado fuimos a la playa.", form: "past", target: "went" },
      { en: "He has gone to the shop.", es: "Ha ido a la tienda.", form: "participle", target: "gone" }
    ]
  },
  {
    base: "come",
    past: "came",
    participle: "come",
    es: "venir",
    examples: [
      { en: "My cousin came to my birthday party.", es: "Mi primo vino a mi fiesta de cumpleaños.", form: "past", target: "came" },
      { en: "They have come from far away.", es: "Han venido de muy lejos.", form: "participle", target: "come" }
    ]
  },
  {
    base: "see",
    past: "saw",
    participle: "seen",
    es: "ver",
    examples: [
      { en: "I saw a dolphin at the beach.", es: "Vi un delfín en la playa.", form: "past", target: "saw" },
      { en: "Have you seen my new shoes?", es: "¿Has visto mis zapatos nuevos?", form: "participle", target: "seen" }
    ]
  },
  {
    base: "eat",
    past: "ate",
    participle: "eaten",
    es: "comer",
    examples: [
      { en: "We ate paella on Sunday.", es: "El domingo comimos paella.", form: "past", target: "ate" },
      { en: "She has eaten all the cake.", es: "Se ha comido toda la tarta.", form: "participle", target: "eaten" }
    ]
  },
  {
    base: "drink",
    past: "drank",
    participle: "drunk",
    es: "beber",
    examples: [
      { en: "I drank a lot of water after the match.", es: "Bebí mucha agua después del partido.", form: "past", target: "drank" },
      { en: "He has drunk three glasses of milk.", es: "Ha bebido tres vasos de leche.", form: "participle", target: "drunk" }
    ]
  },
  {
    base: "get",
    past: "got",
    participle: "got",
    es: "conseguir, obtener",
    examples: [
      { en: "I got a good mark in English.", es: "Saqué una buena nota en inglés.", form: "past", target: "got" },
      { en: "She has got a new bike.", es: "Ha conseguido una bici nueva.", form: "participle", target: "got" }
    ]
  },
  {
    base: "give",
    past: "gave",
    participle: "given",
    es: "dar",
    examples: [
      { en: "My grandma gave me a present.", es: "Mi abuela me dio un regalo.", form: "past", target: "gave" },
      { en: "He has given me his phone number.", es: "Me ha dado su número de teléfono.", form: "participle", target: "given" }
    ]
  },
  {
    base: "take",
    past: "took",
    participle: "taken",
    es: "coger, llevar",
    examples: [
      { en: "We took the bus to the city centre.", es: "Cogimos el autobús al centro.", form: "past", target: "took" },
      { en: "She has taken some beautiful photos.", es: "Ha hecho unas fotos preciosas.", form: "participle", target: "taken" }
    ]
  },
  {
    base: "make",
    past: "made",
    participle: "made",
    es: "hacer, preparar",
    examples: [
      { en: "My dad made a cake for my birthday.", es: "Mi padre hizo una tarta para mi cumpleaños.", form: "past", target: "made" },
      { en: "I have made a mistake.", es: "He cometido un error.", form: "participle", target: "made" }
    ]
  },
  {
    base: "know",
    past: "knew",
    participle: "known",
    es: "saber, conocer",
    examples: [
      { en: "I knew the answer.", es: "Sabía la respuesta.", form: "past", target: "knew" },
      { en: "I have known her since primary school.", es: "La conozco desde el colegio.", form: "participle", target: "known" }
    ]
  },
  {
    base: "say",
    past: "said",
    participle: "said",
    es: "decir",
    examples: [
      { en: "My mum said yes.", es: "Mi madre dijo que sí.", form: "past", target: "said" },
      { en: "I have said that many times.", es: "He dicho eso muchas veces.", form: "participle", target: "said" }
    ]
  },
  {
    base: "tell",
    past: "told",
    participle: "told",
    es: "contar, decir a alguien",
    examples: [
      { en: "She told me a funny story.", es: "Me contó una historia divertida.", form: "past", target: "told" },
      { en: "I have told you twice.", es: "Te lo he dicho dos veces.", form: "participle", target: "told" }
    ]
  },
  {
    base: "think",
    past: "thought",
    participle: "thought",
    es: "pensar",
    examples: [
      { en: "I thought it was a good idea.", es: "Pensé que era una buena idea.", form: "past", target: "thought" },
      { en: "I have thought about it a lot.", es: "He pensado mucho en ello.", form: "participle", target: "thought" }
    ]
  },
  {
    base: "find",
    past: "found",
    participle: "found",
    es: "encontrar",
    examples: [
      { en: "I found a coin under the sofa.", es: "Encontré una moneda debajo del sofá.", form: "past", target: "found" },
      { en: "We have found the missing cat.", es: "Hemos encontrado al gato perdido.", form: "participle", target: "found" }
    ]
  },
  {
    base: "feel",
    past: "felt",
    participle: "felt",
    es: "sentirse, notar",
    examples: [
      { en: "I felt nervous before the exam.", es: "Me sentí nerviosa antes del examen.", form: "past", target: "felt" },
      { en: "She has felt sick all morning.", es: "Se ha sentido mal toda la mañana.", form: "participle", target: "felt" }
    ]
  },
  {
    base: "leave",
    past: "left",
    participle: "left",
    es: "irse, dejar",
    examples: [
      { en: "We left home at eight.", es: "Salimos de casa a las ocho.", form: "past", target: "left" },
      { en: "The train has left already.", es: "El tren ya se ha ido.", form: "participle", target: "left" }
    ]
  },
  {
    base: "sleep",
    past: "slept",
    participle: "slept",
    es: "dormir",
    examples: [
      { en: "I slept for nine hours.", es: "Dormí nueve horas.", form: "past", target: "slept" },
      { en: "She has slept in her new bed.", es: "Ha dormido en su cama nueva.", form: "participle", target: "slept" }
    ]
  },
  {
    base: "run",
    past: "ran",
    participle: "run",
    es: "correr",
    examples: [
      { en: "I ran in the school race.", es: "Corrí en la carrera del colegio.", form: "past", target: "ran" },
      { en: "He has run ten kilometres.", es: "Ha corrido diez kilómetros.", form: "participle", target: "run" }
    ]
  },
  {
    base: "swim",
    past: "swam",
    participle: "swum",
    es: "nadar",
    examples: [
      { en: "We swam in the river last Sunday.", es: "El domingo pasado nadamos en el río.", form: "past", target: "swam" },
      { en: "She has swum in the sea many times.", es: "Ha nadado en el mar muchas veces.", form: "participle", target: "swum" }
    ]
  },
  {
    base: "sing",
    past: "sang",
    participle: "sung",
    es: "cantar",
    examples: [
      { en: "My sister sang at the school festival.", es: "Mi hermana cantó en el festival del colegio.", form: "past", target: "sang" },
      { en: "They have sung a famous song.", es: "Han cantado una canción famosa.", form: "participle", target: "sung" }
    ]
  },
  {
    base: "write",
    past: "wrote",
    participle: "written",
    es: "escribir",
    examples: [
      { en: "I wrote a letter to my penfriend.", es: "Escribí una carta a mi amigo por correspondencia.", form: "past", target: "wrote" },
      { en: "She has written three poems today.", es: "Hoy ha escrito tres poemas.", form: "participle", target: "written" }
    ]
  },
  {
    base: "read",
    past: "read",
    participle: "read",
    es: "leer",
    speakPast: "red",
    speakParticiple: "red",
    tip: "En pasado y participio se escribe igual, pero se pronuncia /red/.",
    examples: [
      { en: "I read a whole book last week.", es: "La semana pasada leí un libro entero.", form: "past", target: "read" },
      { en: "We have read that story at school.", es: "Hemos leído esa historia en clase.", form: "participle", target: "read" }
    ]
  },
  {
    base: "speak",
    past: "spoke",
    participle: "spoken",
    es: "hablar",
    examples: [
      { en: "She spoke to the teacher in English.", es: "Habló con la profesora en inglés.", form: "past", target: "spoke" },
      { en: "I have spoken to him once.", es: "Le he hablado una vez.", form: "participle", target: "spoken" }
    ]
  },
  {
    base: "break",
    past: "broke",
    participle: "broken",
    es: "romper",
    examples: [
      { en: "He broke the window with a ball.", es: "Rompió la ventana con un balón.", form: "past", target: "broke" },
      { en: "I have broken my glasses.", es: "He roto mis gafas.", form: "participle", target: "broken" }
    ]
  },
  {
    base: "buy",
    past: "bought",
    participle: "bought",
    es: "comprar",
    examples: [
      { en: "We bought some sweets.", es: "Compramos unos dulces.", form: "past", target: "bought" },
      { en: "She has bought a new backpack.", es: "Se ha comprado una mochila nueva.", form: "participle", target: "bought" }
    ]
  },
  {
    base: "bring",
    past: "brought",
    participle: "brought",
    es: "traer",
    examples: [
      { en: "I brought my pencil case to class.", es: "Traje mi estuche a clase.", form: "past", target: "brought" },
      { en: "They have brought their lunch.", es: "Han traído su comida.", form: "participle", target: "brought" }
    ]
  },
  {
    base: "begin",
    past: "began",
    participle: "begun",
    es: "empezar",
    examples: [
      { en: "The film began at nine.", es: "La película empezó a las nueve.", form: "past", target: "began" },
      { en: "The concert has begun.", es: "El concierto ha empezado.", form: "participle", target: "begun" }
    ]
  },
  {
    base: "become",
    past: "became",
    participle: "become",
    es: "hacerse, convertirse",
    examples: [
      { en: "She became a chess champion.", es: "Se convirtió en campeona de ajedrez.", form: "past", target: "became" },
      { en: "He has become very tall.", es: "Se ha hecho muy alto.", form: "participle", target: "become" }
    ]
  },
  {
    base: "catch",
    past: "caught",
    participle: "caught",
    es: "atrapar, coger",
    examples: [
      { en: "I caught the ball with one hand.", es: "Atrapé la pelota con una mano.", form: "past", target: "caught" },
      { en: "She has caught a cold.", es: "Se ha resfriado.", form: "participle", target: "caught" }
    ]
  },
  {
    base: "teach",
    past: "taught",
    participle: "taught",
    es: "enseñar",
    examples: [
      { en: "My mum taught me to ride a bike.", es: "Mi madre me enseñó a montar en bici.", form: "past", target: "taught" },
      { en: "He has taught us a new game.", es: "Nos ha enseñado un juego nuevo.", form: "participle", target: "taught" }
    ]
  },
  {
    base: "fly",
    past: "flew",
    participle: "flown",
    es: "volar",
    examples: [
      { en: "We flew to Rome last summer.", es: "El verano pasado volamos a Roma.", form: "past", target: "flew" },
      { en: "The bird has flown away.", es: "El pájaro se ha ido volando.", form: "participle", target: "flown" }
    ]
  },
  {
    base: "drive",
    past: "drove",
    participle: "driven",
    es: "conducir",
    examples: [
      { en: "My dad drove us to school.", es: "Mi padre nos llevó al colegio en coche.", form: "past", target: "drove" },
      { en: "She has driven a tractor.", es: "Ha conducido un tractor.", form: "participle", target: "driven" }
    ]
  },
  {
    base: "ride",
    past: "rode",
    participle: "ridden",
    es: "montar (en bici, a caballo)",
    examples: [
      { en: "I rode a horse at the farm.", es: "Monté a caballo en la granja.", form: "past", target: "rode" },
      { en: "He has ridden his new bike.", es: "Ha montado en su bici nueva.", form: "participle", target: "ridden" }
    ]
  },
  {
    base: "sit",
    past: "sat",
    participle: "sat",
    es: "sentarse",
    examples: [
      { en: "I sat next to my friend.", es: "Me senté al lado de mi amiga.", form: "past", target: "sat" },
      { en: "We have sat in the front row.", es: "Nos hemos sentado en la primera fila.", form: "participle", target: "sat" }
    ]
  },
  {
    base: "stand",
    past: "stood",
    participle: "stood",
    es: "estar de pie",
    examples: [
      { en: "We stood in the queue for an hour.", es: "Estuvimos una hora en la cola.", form: "past", target: "stood" },
      { en: "They have stood in the rain.", es: "Han estado de pie bajo la lluvia.", form: "participle", target: "stood" }
    ]
  },
  {
    base: "wake",
    past: "woke",
    participle: "woken",
    es: "despertarse",
    examples: [
      { en: "I woke up at seven.", es: "Me desperté a las siete.", form: "past", target: "woke" },
      { en: "He has woken up late.", es: "Se ha despertado tarde.", form: "participle", target: "woken" }
    ]
  },
  {
    base: "wear",
    past: "wore",
    participle: "worn",
    es: "llevar puesto",
    examples: [
      { en: "She wore a red dress to the party.", es: "Llevó un vestido rojo a la fiesta.", form: "past", target: "wore" },
      { en: "I have worn this jacket all winter.", es: "He llevado esta chaqueta todo el invierno.", form: "participle", target: "worn" }
    ]
  },
  {
    base: "win",
    past: "won",
    participle: "won",
    es: "ganar",
    examples: [
      { en: "Our team won the match.", es: "Nuestro equipo ganó el partido.", form: "past", target: "won" },
      { en: "I have won a prize.", es: "He ganado un premio.", form: "participle", target: "won" }
    ]
  },
  {
    base: "lose",
    past: "lost",
    participle: "lost",
    es: "perder",
    examples: [
      { en: "I lost my keys on the bus.", es: "Perdí las llaves en el autobús.", form: "past", target: "lost" },
      { en: "She has lost her pencil case.", es: "Ha perdido su estuche.", form: "participle", target: "lost" }
    ]
  },
  {
    base: "meet",
    past: "met",
    participle: "met",
    es: "conocer, quedar con",
    examples: [
      { en: "I met my favourite writer.", es: "Conocí a mi escritor favorito.", form: "past", target: "met" },
      { en: "We have met before.", es: "Nos hemos visto antes.", form: "participle", target: "met" }
    ]
  },
  {
    base: "pay",
    past: "paid",
    participle: "paid",
    es: "pagar",
    examples: [
      { en: "I paid for the tickets.", es: "Pagué las entradas.", form: "past", target: "paid" },
      { en: "She has paid with her card.", es: "Ha pagado con su tarjeta.", form: "participle", target: "paid" }
    ]
  },
  {
    base: "put",
    past: "put",
    participle: "put",
    es: "poner",
    examples: [
      { en: "I put my books on the table.", es: "Puse mis libros en la mesa.", form: "past", target: "put" },
      { en: "She has put the cake in the fridge.", es: "Ha puesto la tarta en la nevera.", form: "participle", target: "put" }
    ]
  },
  {
    base: "cut",
    past: "cut",
    participle: "cut",
    es: "cortar",
    examples: [
      { en: "I cut some paper for the craft.", es: "Corté un poco de papel para la manualidad.", form: "past", target: "cut" },
      { en: "He has cut his finger.", es: "Se ha cortado el dedo.", form: "participle", target: "cut" }
    ]
  },
  {
    base: "hurt",
    past: "hurt",
    participle: "hurt",
    es: "doler, hacerse daño",
    examples: [
      { en: "My knee hurt after the fall.", es: "Me dolió la rodilla después de la caída.", form: "past", target: "hurt" },
      { en: "I have hurt my foot.", es: "Me he hecho daño en el pie.", form: "participle", target: "hurt" }
    ]
  },
  {
    base: "let",
    past: "let",
    participle: "let",
    es: "dejar, permitir",
    examples: [
      { en: "My teacher let us choose the book.", es: "Mi profesora nos dejó elegir el libro.", form: "past", target: "let" },
      { en: "She has let me use her phone.", es: "Me ha dejado usar su teléfono.", form: "participle", target: "let" }
    ]
  },
  {
    base: "send",
    past: "sent",
    participle: "sent",
    es: "enviar",
    examples: [
      { en: "I sent an email to my cousin.", es: "Envié un correo a mi prima.", form: "past", target: "sent" },
      { en: "He has sent me a photo.", es: "Me ha enviado una foto.", form: "participle", target: "sent" }
    ]
  },
  {
    base: "spend",
    past: "spent",
    participle: "spent",
    es: "pasar (tiempo), gastar",
    examples: [
      { en: "We spent the weekend in the mountains.", es: "Pasamos el fin de semana en la montaña.", form: "past", target: "spent" },
      { en: "I have spent all my pocket money.", es: "Me he gastado toda la paga.", form: "participle", target: "spent" }
    ]
  },
  {
    base: "build",
    past: "built",
    participle: "built",
    es: "construir",
    examples: [
      { en: "They built a tree house.", es: "Construyeron una casa en el árbol.", form: "past", target: "built" },
      { en: "We have built a snowman.", es: "Hemos hecho un muñeco de nieve.", form: "participle", target: "built" }
    ]
  },
  {
    base: "choose",
    past: "chose",
    participle: "chosen",
    es: "elegir",
    examples: [
      { en: "I chose the blue notebook.", es: "Elegí el cuaderno azul.", form: "past", target: "chose" },
      { en: "She has chosen a nice song.", es: "Ha elegido una canción bonita.", form: "participle", target: "chosen" }
    ]
  },
  {
    base: "fall",
    past: "fell",
    participle: "fallen",
    es: "caerse",
    examples: [
      { en: "I fell off my bike.", es: "Me caí de la bici.", form: "past", target: "fell" },
      { en: "The leaves have fallen.", es: "Las hojas han caído.", form: "participle", target: "fallen" }
    ]
  },
  {
    base: "forget",
    past: "forgot",
    participle: "forgotten",
    es: "olvidar",
    examples: [
      { en: "I forgot my homework at home.", es: "Me olvidé los deberes en casa.", form: "past", target: "forgot" },
      { en: "She has forgotten my name.", es: "Ha olvidado mi nombre.", form: "participle", target: "forgotten" }
    ]
  },
  {
    base: "awake",
    past: "awoke",
    participle: "awoken",
    es: "despertarse",
    examples: [
      { en: "I awoke at seven this morning.", es: "Me desperté a las siete esta mañana.", form: "past", target: "awoke" },
      { en: "She has awoken very early.", es: "Se ha despertado muy temprano.", form: "participle", target: "awoken" }
    ]
  },
  {
    base: "beat",
    past: "beat",
    participle: "beaten",
    es: "golpear, ganar",
    examples: [
      { en: "Our team beat theirs in the final.", es: "Nuestro equipo ganó al suyo en la final.", form: "past", target: "beat" },
      { en: "He has beaten the record.", es: "Ha batido el récord.", form: "participle", target: "beaten" }
    ]
  },
  {
    base: "bend",
    past: "bent",
    participle: "bent",
    es: "doblar",
    examples: [
      { en: "I bent the paper in half.", es: "Doblé el papel por la mitad.", form: "past", target: "bent" },
      { en: "She has bent the wire.", es: "Ha doblado el alambre.", form: "participle", target: "bent" }
    ]
  },
  {
    base: "bet",
    past: "bet",
    participle: "bet",
    es: "apostar",
    examples: [
      { en: "He bet ten euros on the horse.", es: "Apostó diez euros al caballo.", form: "past", target: "bet" },
      { en: "We have bet on the wrong team.", es: "Hemos apostado por el equipo equivocado.", form: "participle", target: "bet" }
    ]
  },
  {
    base: "bind",
    past: "bound",
    participle: "bound",
    es: "atar, encuadernar",
    examples: [
      { en: "She bound the books with string.", es: "Ató los libros con cuerda.", form: "past", target: "bound" },
      { en: "They have bound the newspapers.", es: "Han encuadernado los periódicos.", form: "participle", target: "bound" }
    ]
  },
  {
    base: "bite",
    past: "bit",
    participle: "bitten",
    es: "morder",
    examples: [
      { en: "The dog bit my shoe.", es: "El perro mordió mi zapato.", form: "past", target: "bit" },
      { en: "It has bitten my finger.", es: "Me ha mordido el dedo.", form: "participle", target: "bitten" }
    ]
  },
  {
    base: "bleed",
    past: "bled",
    participle: "bled",
    es: "sangrar",
    examples: [
      { en: "My knee bled a little.", es: "Mi rodilla sangró un poco.", form: "past", target: "bled" },
      { en: "His nose has bled twice.", es: "Le ha sangrado la nariz dos veces.", form: "participle", target: "bled" }
    ]
  }
];

if (typeof module !== "undefined" && module.exports) module.exports = VERBS;
