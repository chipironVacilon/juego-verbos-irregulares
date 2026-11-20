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
  const PLAYER_STEP_MS = 130;
  /** Milliseconds a monster needs to cross one tile: slower, so it can be dodged. */
  const MONSTER_STEP_MS = 215;
  /** Share of monster steps that chase instead of wandering. */
  const CHASE_CHANCE = 0.85;
  /** Safety net so a long pause cannot replay dozens of steps at once. */
  const MAX_STEPS_PER_TICK = 4;
  const MAX_TICK_MS = 100;

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
      monsters: MONSTER_STARTS.map((start, id) => ({ ...entity(start.r, start.c), id })),
      words: [],
      flash: null,
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

  function stepMonster(game, monster) {
    monster.moved = false;
    let direction = null;
    if (Math.random() < CHASE_CHANCE) direction = stepTowards(monster, game.player);
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
    const events = { caught: null, word: null };
    if (!game || game.over) return events;

    const dt = Math.min(MAX_TICK_MS, Math.max(0, Number(dtMs) || 0));
    const previousPlayer = { r: game.player.r, c: game.player.c };

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

    for (const monster of game.monsters) {
      monster.timer += dt;
      for (let step = 0; step < MAX_STEPS_PER_TICK && monster.timer >= MONSTER_STEP_MS; step += 1) {
        monster.timer -= MONSTER_STEP_MS;
        stepMonster(game, monster);
      }
    }

    for (const monster of game.monsters) {
      if (touching(monster, game.player) || crossed(monster, game.player, previousPlayer)) {
        events.caught = monster;
        game.over = true;
        break;
      }
    }
    return events;
  }

  const theme = {
    wall: "#8b7cff",
    wallEdge: "rgba(139, 124, 255, 0.45)",
    floor: "rgba(255, 255, 255, 0.03)",
    alien: "#4ade80",
    alienEye: "#0b1020",
    monster: "#fb7185",
    monsterEye: "#0b1020",
    word: "rgba(255, 209, 102, 0.16)",
    wordText: "#ffd166",
    badWord: "rgba(251, 113, 133, 0.18)",
    badWordText: "#fb7185"
  };

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  /** The static maze is painted once into an offscreen canvas. */
  function paintMaze(game) {
    const canvas = document.createElement("canvas");
    const scale = game.scale || 1;
    canvas.width = COLS * TILE * scale;
    canvas.height = ROWS * TILE * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.scale(scale, scale);
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        if (!isWall(r, c)) continue;
        ctx.fillStyle = theme.wall;
        roundedRect(ctx, c * TILE + 1.5, r * TILE + 1.5, TILE - 3, TILE - 3, 6);
        ctx.fill();
        ctx.strokeStyle = theme.wallEdge;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    return canvas;
  }

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

  function drawAlien(ctx, x, y) {
    const radius = TILE * 0.34;
    ctx.fillStyle = theme.alien;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = theme.alien;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.5, y - radius * 0.85);
    ctx.lineTo(x - radius * 0.78, y - radius * 1.5);
    ctx.moveTo(x + radius * 0.5, y - radius * 0.85);
    ctx.lineTo(x + radius * 0.78, y - radius * 1.5);
    ctx.stroke();
    ctx.fillStyle = theme.alien;
    ctx.beginPath();
    ctx.arc(x - radius * 0.78, y - radius * 1.5, 1.8, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.78, y - radius * 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = theme.alienEye;
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.36, y - radius * 0.1, radius * 0.18, radius * 0.26, 0, 0, Math.PI * 2);
    ctx.ellipse(x + radius * 0.36, y - radius * 0.1, radius * 0.18, radius * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.42, radius * 0.3, radius * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMonster(ctx, x, y) {
    const radius = TILE * 0.32;
    ctx.fillStyle = theme.monster;
    ctx.beginPath();
    ctx.arc(x, y - radius * 0.15, radius, Math.PI, 0);
    ctx.lineTo(x + radius, y + radius * 0.75);
    ctx.lineTo(x + radius * 0.5, y + radius * 0.35);
    ctx.lineTo(x, y + radius * 0.8);
    ctx.lineTo(x - radius * 0.5, y + radius * 0.35);
    ctx.lineTo(x - radius, y + radius * 0.75);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = theme.monsterEye;
    ctx.beginPath();
    ctx.arc(x - radius * 0.34, y - radius * 0.35, radius * 0.2, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.34, y - radius * 0.35, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWord(ctx, word) {
    const label = String(word.text || "");
    if (!label) return;
    const x = (word.c + 0.5) * TILE;
    const y = (word.r + 0.5) * TILE;
    ctx.font = "600 11px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = Math.max(TILE * 1.5, ctx.measureText(label).width + 12);
    const height = TILE * 0.72;
    ctx.fillStyle = word.correct ? theme.word : theme.badWord;
    roundedRect(ctx, x - width / 2, y - height / 2, width, height, height / 2);
    ctx.fill();
    ctx.fillStyle = word.correct ? theme.wordText : theme.badWordText;
    ctx.fillText(label, x, y + 0.5);
  }

  function draw(ctx, game, size) {
    if (!ctx) return;
    if (!game.mazeLayer) game.mazeLayer = paintMaze(game);
    ctx.clearRect(0, 0, size.width, size.height);
    if (game.mazeLayer) ctx.drawImage(game.mazeLayer, 0, 0, size.width, size.height);

    for (const word of game.words) drawWord(ctx, word);
    if (game.flash) {
      ctx.fillStyle = theme.badWordText;
      ctx.globalAlpha = Math.min(1, game.flash.ttl / 320) * 0.5;
      roundedRect(ctx, game.flash.c * TILE + 3, game.flash.r * TILE + 3, TILE - 6, TILE - 6, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const monster of game.monsters) {
      const spot = positionOf(monster, MONSTER_STEP_MS);
      drawMonster(ctx, spot.x, spot.y);
    }
    const spot = positionOf(game.player, PLAYER_STEP_MS);
    drawAlien(ctx, spot.x, spot.y);
  }

  return {
    MAZE,
    ROWS,
    COLS,
    TILE,
    PLAYER_STEP_MS,
    MONSTER_STEP_MS,
    DIRECTIONS,
    create,
    setDirection,
    tick,
    draw,
    placeWords,
    isWall,
    corridors,
    stepTowards
  };
})();
