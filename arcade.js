/*
 * Maze arcade engine for the irregular-verb game.
 *
 * The screen and the scoring live in index.html; this file only owns the
 * simulation: the maze grid, the alien, the monsters, whose turn it is to move
 * and how a frame is painted on a canvas. Everything is tile-based so the
 * movement rules stay readable and can be tested without a browser clock.
 *
 * Grid legend: "#" is a wall, "." is a corridor. The maze must stay rectangular
 * and surrounded by walls.
 */
window.ArcadeGame = (() => {
  "use strict";

  const MAZE = [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#.#...............#.#",
    "#.#.###.#####.###.#.#",
    "#.....#...#...#.....#",
    "#####.#.#...#.#.#####",
    "#.....#.#...#.#.....#",
    "#.###.#.#####.#.###.#",
    "#.#...............#.#",
    "#.###.###.#.###.###.#",
    "#.........#.........#",
    "#####################"
  ];

  const WALL = "#";
  const ROWS = MAZE.length;
  const COLS = MAZE[0].length;
  const TILE = 28;

  /** Milliseconds the alien needs to cross one tile. */
  const PLAYER_STEP_MS = 240;
  /** Milliseconds a monster needs to cross one tile: slower, so it can be dodged. */
  const MONSTER_STEP_MS = 400;
  /** Share of monster steps that chase instead of wandering. */
  const CHASE_CHANCE = 0.85;
  /** Safety net so a long pause cannot replay dozens of steps at once. */
  const MAX_STEPS_PER_TICK = 4;
  const MAX_TICK_MS = 100;
  /** How long a collected word turns the ghosts into prey. */
  const POWER_MS = 5000;

  const PLAYER_START = { r: 6, c: 10 };
  const MONSTER_STARTS = [
    { r: 1, c: 1 },
    { r: 1, c: 19 },
    { r: 11, c: 19 }
  ];

  const DIRECTIONS = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1]
  };
  const DIRECTION_LIST = Object.keys(DIRECTIONS);

  const isWall = (r, c) => r < 0 || c < 0 || r >= ROWS || c >= COLS || MAZE[r][c] === WALL;
  const keyOf = (r, c) => r * COLS + c;
  const canStep = (r, c, direction) => {
    const delta = DIRECTIONS[direction];
    if (!delta) return false;
    return !isWall(r + delta[0], c + delta[1]);
  };

  /** Corridor cells, i.e. everywhere a word or an actor can be. */
  function corridors() {
    const cells = [];
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (!isWall(r, c)) cells.push({ r, c });
      }
    }
    return cells;
  }

  const directionFrom = (from, to) =>
    DIRECTION_LIST.find((name) => {
      const [dr, dc] = DIRECTIONS[name];
      return from.r + dr === to.r && from.c + dc === to.c;
    }) || null;

  /**
   * First step of the shortest path from one cell to another, as a direction
   * name, or null when there is no way through.
   */
  function stepTowards(from, to) {
    if (isWall(to.r, to.c)) return null;
    const start = keyOf(from.r, from.c);
    const goal = keyOf(to.r, to.c);
    if (start === goal) return null;

    const queue = [from];
    const parent = new Map([[start, null]]);
    while (queue.length > 0) {
      const cell = queue.shift();
      for (const name of DIRECTION_LIST) {
        const [dr, dc] = DIRECTIONS[name];
        const r = cell.r + dr;
        const c = cell.c + dc;
        const key = keyOf(r, c);
        if (isWall(r, c) || parent.has(key)) continue;
        parent.set(key, cell);
        if (key === goal) {
          // Walk back from the goal until the cell right after the start.
          let step = { r, c };
          let previous = parent.get(keyOf(step.r, step.c));
          while (previous && keyOf(previous.r, previous.c) !== start) {
            step = previous;
            previous = parent.get(keyOf(step.r, step.c));
          }
          return directionFrom(from, step);
        }
        queue.push({ r, c });
      }
    }
    return null;
  }

  /** A wander step that never doubles back unless it is the only way out. */
  function wanderStep(entity) {
    const options = DIRECTION_LIST.filter((name) => canStep(entity.r, entity.c, name));
    const forward = options.filter((name) => name !== oppositeOf(entity.dir));
    const pool = forward.length > 0 ? forward : options;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const oppositeOf = (direction) => {
    if (direction === "up") return "down";
    if (direction === "down") return "up";
    if (direction === "left") return "right";
    if (direction === "right") return "left";
    return null;
  };

  /**
   * Corridor cells mapped to how many steps they are from `from`, by BFS. A
   * fleeing ghost reads it as a hill: it always climbs away from the alien.
   */
  function distanceField(from) {
    const field = new Map([[keyOf(from.r, from.c), 0]]);
    const queue = [from];
    while (queue.length > 0) {
      const cell = queue.shift();
      const steps = field.get(keyOf(cell.r, cell.c));
      for (const name of DIRECTION_LIST) {
        const [dr, dc] = DIRECTIONS[name];
        const r = cell.r + dr;
        const c = cell.c + dc;
        const key = keyOf(r, c);
        if (isWall(r, c) || field.has(key)) continue;
        field.set(key, steps + 1);
        queue.push({ r, c });
      }
    }
    return field;
  }

  /**
   * The neighbour furthest from the alien. A ghost can end up in a dead end, so
   * this is only "away" when the maze allows it; ties and corridors are random.
   */
  function fleeStep(monster, field) {
    const options = DIRECTION_LIST.filter((name) => canStep(monster.r, monster.c, name));
    if (options.length === 0) return null;
    const scored = options.map((name) => {
      const [dr, dc] = DIRECTIONS[name];
      const key = keyOf(monster.r + dr, monster.c + dc);
      return { name, away: field.has(key) ? field.get(key) : -1 };
    });
    const best = Math.max(...scored.map((option) => option.away));
    const pool = scored.filter((option) => option.away === best).map((option) => option.name);
    const forward = pool.filter((name) => name !== oppositeOf(monster.dir));
    const chosen = forward.length > 0 ? forward : pool;
    return chosen[Math.floor(Math.random() * chosen.length)];
  }

  const entity = (r, c) => ({ r, c, dir: null, desired: null, timer: 0, moved: false });

  const distance = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

  function shuffled(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Free corridor cells for word signs: away from the alien, away from the
   * monsters and spread out among themselves. Later passes relax the spacing so
   * a crowded board still gets every word.
   */
  function pickCells(game, count) {
    const player = game.player;
    const free = corridors().filter(
      (cell) =>
        distance(cell, player) > 0 &&
        !game.monsters.some((monster) => monster.r === cell.r && monster.c === cell.c)
    );
    const pool = shuffled(free);
    const picked = [];
    for (const gap of [6, 4, 2, 0]) {
      for (const cell of pool) {
        if (picked.length >= count) return picked;
        if (picked.some((other) => other.r === cell.r && other.c === cell.c)) continue;
        const apart = picked.every((other) => distance(other, cell) >= gap);
        const farFromPlayer = distance(cell, player) >= Math.max(3, gap);
        if (apart && farFromPlayer) picked.push(cell);
      }
    }
    return picked;
  }

  /**
   * Put the given words on the board. Each entry needs `text` and `correct`;
   * the cell is chosen here so the caller never has to know the maze.
   */
  function placeWords(game, words) {
    const cells = pickCells(game, words.length);
    game.words = words.slice(0, cells.length).map((word, index) => ({
      text: word.text,
      correct: Boolean(word.correct),
      r: cells[index].r,
      c: cells[index].c
    }));
    return game.words;
  }

  function create() {
    return {
      rows: ROWS,
      cols: COLS,
      tile: TILE,
      player: { ...entity(PLAYER_START.r, PLAYER_START.c), desired: null },
      // Every ghost remembers its corner, so an eaten one knows where to wait
      // until the power runs out.
      monsters: MONSTER_STARTS.map((start, id) => ({
        ...entity(start.r, start.c),
        id,
        home: { ...start },
        eaten: false
      })),
      words: [],
      flash: null,
      power: 0,
      over: false,
      moves: 0
    };
  }

  /** Queue a turn. The alien takes it as soon as the corridor allows it. */
  function setDirection(game, direction) {
    if (!game || game.over || !DIRECTIONS[direction]) return;
    game.player.desired = direction;
  }

  function stepPlayer(game) {
    const player = game.player;
    player.moved = false;
    if (player.desired && canStep(player.r, player.c, player.desired)) player.dir = player.desired;
    if (player.dir && canStep(player.r, player.c, player.dir)) {
      const [dr, dc] = DIRECTIONS[player.dir];
      player.r += dr;
      player.c += dc;
      player.moved = true;
      game.moves += 1;
    }
    return player.moved;
  }

  function stepMonster(game, monster, fleeField) {
    monster.moved = false;
    let direction = null;
    if (fleeField) direction = fleeStep(monster, fleeField);
    else if (Math.random() < CHASE_CHANCE) direction = stepTowards(monster, game.player);
    if (!direction) direction = wanderStep(monster);
    if (!direction) return false;
    monster.dir = direction;
    const [dr, dc] = DIRECTIONS[direction];
    monster.previous = { r: monster.r, c: monster.c };
    monster.r += dr;
    monster.c += dc;
    monster.moved = true;
    return true;
  }

  const touching = (a, b) => a.r === b.r && a.c === b.c;

  /** A ghost eaten while the power lasts: out of the maze until it runs out. */
  function eatMonster(monster) {
    monster.eaten = true;
    monster.moved = false;
    monster.dir = null;
    monster.desired = null;
    monster.previous = null;
    monster.timer = 0;
  }

  /** Power over: the eaten ghosts are back in their corners, hunting again. */
  function wakeMonsters(game) {
    for (const monster of game.monsters) {
      if (!monster.eaten) continue;
      monster.eaten = false;
      monster.r = monster.home.r;
      monster.c = monster.home.c;
      monster.dir = null;
      monster.desired = null;
      monster.previous = null;
      monster.timer = 0;
    }
  }

  /** Two actors swapped tiles during the same tick: they did meet. */
  const crossed = (monster, player, previousPlayer) =>
    Boolean(
      monster.previous &&
        previousPlayer &&
        monster.previous.r === player.r &&
        monster.previous.c === player.c &&
        previousPlayer.r === monster.r &&
        previousPlayer.c === monster.c
    );

  /**
   * Advance the simulation by dtMs. Long pauses are clamped so at most a couple
   * of steps play out; the returned events are what the caller has to react to.
   * `word` is the sign the alien just walked onto (only on entering its cell).
   */
  function tick(game, dtMs) {
    const events = { caught: null, word: null, eaten: null };
    if (!game || game.over) return events;

    const dt = Math.min(MAX_TICK_MS, Math.max(0, Number(dtMs) || 0));
    const previousPlayer = { r: game.player.r, c: game.player.c };

    if (game.power > 0) {
      game.power = Math.max(0, game.power - dt);
      if (game.power === 0) wakeMonsters(game);
    }

    game.player.timer += dt;
    for (let step = 0; step < MAX_STEPS_PER_TICK && game.player.timer >= PLAYER_STEP_MS; step += 1) {
      game.player.timer -= PLAYER_STEP_MS;
      stepPlayer(game);
    }

    if (game.flash) {
      game.flash.ttl -= dt;
      if (game.flash.ttl <= 0) game.flash = null;
    }

    if (game.player.moved) {
      const hit = game.words.find(
        (word) => word.r === game.player.r && word.c === game.player.c
      );
      if (hit) {
        events.word = hit;
        // A wrong sign stays on the board and only blinks, so the board always
        // keeps exactly one correct word while the player learns the others.
        game.flash = hit.correct ? null : { r: hit.r, c: hit.c, ttl: 320 };
      }
    }

    const fleeing = game.power > 0 ? distanceField(game.player) : null;
    for (const monster of game.monsters) {
      if (monster.eaten) continue;
      monster.timer += dt;
      for (let step = 0; step < MAX_STEPS_PER_TICK && monster.timer >= MONSTER_STEP_MS; step += 1) {
        monster.timer -= MONSTER_STEP_MS;
        stepMonster(game, monster, fleeing);
      }
    }

    for (const monster of game.monsters) {
      if (monster.eaten) continue;
      if (touching(monster, game.player) || crossed(monster, game.player, previousPlayer)) {
        if (game.power > 0) {
          eatMonster(monster);
          events.eaten = monster;
        } else {
          events.caught = monster;
          game.over = true;
        }
        break;
      }
    }
    return events;
  }

  /* =====================================================================
     Presentation and effects, on LittleJS
     =====================================================================
     Everything above is the simulation: pure, clock-free and testable in
     Node. From here down nothing is ever read back, so the engine can own
     the canvas, the fixed 60Hz loop, the particles and the shake without
     touching the rules.

     The maze is still drawn procedurally on purpose: a page opened from disk
     cannot load sprite files (the browser blocks them over file://), so the
     engine's texture path is not available to this game.
  */

  const MAZE_W = COLS * TILE;
  const MAZE_H = ROWS * TILE;

  /** Maze pixels (y down) to LittleJS world units (y up, origin at the centre). */
  const at = (x, y) => vec2(x - MAZE_W / 2, MAZE_H / 2 - y);
  /** A maze-pixel size, as a world size. */
  const span = (x, y) => vec2(x, y);
  /** Offsets in maze pixels around a point, as the polygon LittleJS expects. */
  const shape = (pairs) => pairs.map(([x, y]) => vec2(x, -y));

  const paint = {
    wall: rgb(139 / 255, 124 / 255, 1),
    wallEdge: rgb(139 / 255, 124 / 255, 1, 0.45),
    floor: rgb(1, 1, 1, 0.03),
    alien: rgb(74 / 255, 222 / 255, 128 / 255),
    eye: rgb(11 / 255, 16 / 255, 32 / 255),
    monster: rgb(251 / 255, 113 / 255, 133 / 255),
    frightened: rgb(72 / 255, 148 / 255, 1),
    good: rgb(1, 209 / 255, 102 / 255),
    bad: rgb(251 / 255, 113 / 255, 133 / 255),
    word: rgb(1, 209 / 255, 102 / 255, 0.26),
    wordBad: rgb(251 / 255, 113 / 255, 133 / 255, 0.28)
  };

  /** Where an actor is drawn: the tile plus how far it is into the next one. */
  function positionOf(actor, stepMs) {
    const progress = Math.min(1, actor.timer / stepMs);
    let dr = 0;
    let dc = 0;
    if (actor.dir && canStep(actor.r, actor.c, actor.dir)) {
      [dr, dc] = DIRECTIONS[actor.dir];
    }
    return {
      x: (actor.c + 0.5 + dc * progress) * TILE,
      y: (actor.r + 0.5 + dr * progress) * TILE
    };
  }

  const tileCentre = (r, c) => at((c + 0.5) * TILE, (r + 0.5) * TILE);

  /** Walls are the only static part of the board, and they are cheap to redraw. */
  function drawWalls() {
    const half = (TILE - 3) / 2;
    const square = shape([[-half, -half], [half, -half], [half, half], [-half, half]]);
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (!isWall(r, c)) continue;
        drawPoly(square, paint.wall, 1, paint.wallEdge, tileCentre(r, c));
      }
    }
  }

  function drawWord(word) {
    const label = String(word.text || "");
    if (!label) return;
    const centre = tileCentre(word.r, word.c);
    const height = TILE * 0.72;
    const width = Math.max(TILE * 1.5, label.length * TILE * 0.26 + 12);
    const colour = word.correct ? paint.good : paint.bad;
    drawRect(centre, span(width, height), word.correct ? paint.word : paint.wordBad);
    // lineColor = the fill colour on purpose: a Canvas2D lineWidth of 0 is ignored
    // and would otherwise stroke a black hairline over the glyphs, muddying them.
    drawText(label, centre, TILE * 0.44, colour, 0, colour);
  }

  /** The alien bobs its antennae because the engine gives us a clock. */
  function drawAlien(px, py) {
    const radius = TILE * 0.34;
    const bob = Math.sin(time * 7) * radius * 0.1;
    drawEllipse(at(px, py), span(radius * 2, radius * 2.16), paint.alien);

    const stalk = radius * 0.85;
    const tipLeft = { x: px - radius * 0.78, y: py - radius * 1.5 + bob };
    const tipRight = { x: px + radius * 0.78, y: py - radius * 1.5 + bob };
    drawLine(at(px - radius * 0.5, py - stalk), at(tipLeft.x, tipLeft.y), 2, paint.alien);
    drawLine(at(px + radius * 0.5, py - stalk), at(tipRight.x, tipRight.y), 2, paint.alien);
    drawCircle(at(tipLeft.x, tipLeft.y), 3.6, paint.alien);
    drawCircle(at(tipRight.x, tipRight.y), 3.6, paint.alien);

    drawEllipse(at(px - radius * 0.36, py - radius * 0.1), span(radius * 0.36, radius * 0.52), paint.eye);
    drawEllipse(at(px + radius * 0.36, py - radius * 0.1), span(radius * 0.36, radius * 0.52), paint.eye);
    drawEllipse(at(px, py + radius * 0.42), span(radius * 0.6, radius * 0.28), paint.eye);
  }

  /** The wavy-bottomed ghost, as one polygon: cheaper than filling and stroking. */
  function ghostShape(radius) {
    const outline = [
      [-1, 0.75], [-1, -0.15], [-0.9, -0.6], [-0.55, -0.95], [0, -1.05],
      [0.55, -0.95], [0.9, -0.6], [1, -0.15], [1, 0.75],
      [0.5, 0.35], [0, 0.8], [-0.5, 0.35]
    ];
    return shape(outline.map(([x, y]) => [x * radius, y * radius]));
  }

  function drawMonster(px, py, colour) {
    const radius = TILE * 0.32;
    drawPoly(ghostShape(radius), colour, 0, colour, at(px, py));
    drawCircle(at(px - radius * 0.34, py - radius * 0.35), radius * 0.4, paint.eye);
    drawCircle(at(px + radius * 0.34, py - radius * 0.35), radius * 0.4, paint.eye);
  }

  /** Pink ghosts hunt; while the power lasts they turn blue and become prey. */
  const monsterColour = (game) => (game && game.power > 0 ? paint.frightened : paint.monster);

  /** A wrong sign keeps blinking on the board until its timer runs out. */
  function drawFlash(game) {
    if (!game.flash) return;
    const alpha = Math.min(1, game.flash.ttl / 320) * 0.5;
    const centre = tileCentre(game.flash.r, game.flash.c);
    drawRect(centre, span(TILE - 6, TILE - 6), rgb(251 / 255, 113 / 255, 133 / 255, alpha));
  }

  /** Rings left by a pickup: their radius is driven by a LittleJS tween. */
  let rings = [];

  function drawRings() {
    if (rings.length === 0) return;
    rings = rings.filter((ring) => ring.until > time);
    for (const ring of rings) {
      const size = TILE * ring.scale;
      drawEllipse(vec2(ring.x, ring.y), span(size, size), CLEAR_WHITE, 0, 2, ring.colour);
    }
  }

  function drawWorld(game) {
    drawRect(vec2(0, 0), span(MAZE_W, MAZE_H), paint.floor);
    drawWalls();
    for (const word of game.words) drawWord(word);
    drawFlash(game);
    drawRings();
    const ghostColour = monsterColour(game);
    for (const monster of game.monsters) {
      if (monster.eaten) continue;
      const spot = positionOf(monster, MONSTER_STEP_MS);
      drawMonster(spot.x, spot.y, ghostColour);
    }
    const spot = positionOf(game.player, PLAYER_STEP_MS);
    drawAlien(spot.x, spot.y);
  }

  /* ---------------------------------------------------------------------
     Engine host: one canvas, one loop, entered and left with the screen
     --------------------------------------------------------------------- */

  let engineBoot = null;
  let engineReady = false;
  let canvas = null;
  let live = null;

  function engineUpdate() {
    if (!live) return;
    // The engine already runs at a fixed frameRate, so the step is exact and
    // the simulation never sees a jittery frame delta again.
    live.update(1000 / frameRate);
  }

  function engineRender() {
    if (live) drawWorld(live.game);
  }

  function boot() {
    if (engineBoot) return engineBoot;
    engineBoot = (async () => {
      showSplashScreen = false;
      // Canvas2D only: the headless test runs Chromium with --disable-gpu and
      // this game loads no textures, so WebGL would only add a failure mode.
      setGLEnable(false);
      canvasFixedSize = vec2(MAZE_W, MAZE_H);
      canvasClearColor = CLEAR_BLACK;
      cameraShakeDistance = 7;
      cameraShakeDecay = 2.4;
      await engineInit(() => {}, engineUpdate, () => {}, engineRender, () => {}, [], document.body);
      canvas = mainCanvas;
      if (canvas) {
        // The stage starts empty: the engine's canvas is the only one on screen.
        canvas.classList.add("arcade__canvas");
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Laberinto del arcade");
      }
      setCameraScale(1);
      setCameraPos(vec2(0, 0));
      setPaused(true);
      engineReady = true;
    })();
    return engineBoot;
  }

  /**
   * Attach the engine canvas to the stage of an arcade screen and let it run.
   * `update` receives the fixed step in milliseconds on every engine frame.
   */
  async function start(host, game, update) {
    live = { game, update };
    rings = [];
    await boot();
    if (!engineReady) return false;
    if (host && canvas && canvas.parentNode !== host) {
      canvas.removeAttribute("style");
      host.appendChild(canvas);
    }
    setCameraPos(vec2(0, 0));
    setCameraScale(1);
    setPaused(false);
    return true;
  }

  /** The screen is gone: stop the loop instead of drawing into a detached canvas. */
  function stop() {
    live = null;
    if (engineReady) setPaused(true);
  }

  /* ---------------------------------------------------------------------
     Juice. Each of these is called by the caller that owns the rule, so the
     simulation still decides what happened and the engine only shows it.
     --------------------------------------------------------------------- */

  function ring(r, c, colour, duration) {
    const spot = tileCentre(r, c);
    const item = { x: spot.x, y: spot.y, scale: 0.2, colour, until: time + duration };
    tweenProperty(item, "scale", 0.2, 2, duration);
    rings.push(item);
  }

  /* A built-in effect at scale 1 spans one world unit, and one world unit here
     is one maze pixel, so every effect is scaled by the tile to be visible. */
  function fxEat(r, c) {
    if (!engineReady) return;
    particleEffect("explosion", tileCentre(r, c), { scale: TILE * 0.7 });
    ring(r, c, paint.good, 0.45);
    cameraShake(0.18);
  }

  function fxWrong(r, c) {
    if (!engineReady) return;
    particleEffect("sparks", tileCentre(r, c), { scale: TILE * 0.45 });
    ring(r, c, paint.bad, 0.35);
    cameraShake(0.35, vec2(0, 1));
  }

  function fxCaught(r, c) {
    if (!engineReady) return;
    particleEffect("explosion", tileCentre(r, c), { scale: TILE * 1.4 });
    cameraShake(0.9, vec2(1, 0.6));
  }

  function fxEaten(r, c) {
    if (!engineReady) return;
    particleEffect("explosion", tileCentre(r, c), { scale: TILE * 0.8 });
    ring(r, c, paint.frightened, 0.4);
    cameraShake(0.25, vec2(0, 1));
  }

  return {
    MAZE,
    ROWS,
    COLS,
    TILE,
    MAZE_W,
    MAZE_H,
    PLAYER_STEP_MS,
    MONSTER_STEP_MS,
    POWER_MS,
    DIRECTIONS,
    create,
    setDirection,
    tick,
    placeWords,
    isWall,
    corridors,
    stepTowards,
    monsterColour,
    start,
    stop,
    fxEat,
    fxWrong,
    fxCaught,
    fxEaten
  };
})();
