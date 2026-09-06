// Level structure and handcrafted levels for Lumen Swap
import { TILE_TYPES, CANVAS_SIZE } from '../core/Constants.js';
import { Spike, LaserBeam, Checkpoint, ExitPortal } from '../entities/Hazards.js';

export class Level {
  constructor(data) {
    this.name = data.name;
    this.instruction = data.instruction || '';
    this.width = data.width || 32;
    this.height = data.height || 18;
    this.tileSize = CANVAS_SIZE.TILE_SIZE;

    this.tiles = new Uint8Array(this.width * this.height);
    this.playerSpawn = { ...data.spawn };
    this.checkpoint = { ...data.spawn };

    this.spikes = [];
    this.lasers = [];
    this.checkpoints = [];
    this.exitPortal = null;
    this.isCompleted = false;

    this.loadFromData(data);
  }

  getTile(col, row) {
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) {
      return TILE_TYPES.EMPTY;
    }
    return this.tiles[row * this.width + col];
  }

  setTile(col, row, type) {
    if (col >= 0 && col < this.width && row >= 0 && row < this.height) {
      this.tiles[row * this.width + col] = type;
    }
  }

  setCheckpoint(x, y) {
    this.checkpoint = { x, y };
  }

  loadFromData(data) {
    // 1. Tilemap layout from ASCII or array
    if (data.map && Array.isArray(data.map)) {
      for (let r = 0; r < data.map.length; r++) {
        const line = data.map[r];
        for (let c = 0; c < line.length; c++) {
          const char = line[c];
          let type = TILE_TYPES.EMPTY;
          if (char === 'W') type = TILE_TYPES.PLATFORM_WHITE;
          else if (char === 'R') type = TILE_TYPES.PLATFORM_RED;
          else if (char === '^') {
            this.spikes.push(new Spike(c * this.tileSize, r * this.tileSize + 10, this.tileSize, this.tileSize - 10, 'up'));
          } else if (char === 'v') {
            this.spikes.push(new Spike(c * this.tileSize, r * this.tileSize, this.tileSize, this.tileSize - 10, 'down'));
          } else if (char === '<') {
            this.spikes.push(new Spike(c * this.tileSize, r * this.tileSize, this.tileSize - 10, this.tileSize, 'left'));
          } else if (char === '>') {
            this.spikes.push(new Spike(c * this.tileSize + 10, r * this.tileSize, this.tileSize - 10, this.tileSize, 'right'));
          } else if (char === 'P') {
            this.playerSpawn = { x: c * this.tileSize + 4, y: r * this.tileSize + 4 };
            this.checkpoint = { ...this.playerSpawn };
          } else if (char === 'E') {
            this.exitPortal = new ExitPortal(c * this.tileSize + 15, r * this.tileSize + 15);
          } else if (char === 'C') {
            this.checkpoints.push(new Checkpoint(c * this.tileSize + 5, r * this.tileSize));
          }

          if (type !== TILE_TYPES.EMPTY) {
            this.setTile(c, r, type);
          }
        }
      }
    }

    // 2. Dynamic Lasers from data
    if (data.lasers) {
      for (const l of data.lasers) {
        this.lasers.push(new LaserBeam(
          l.x * this.tileSize,
          l.y * this.tileSize,
          l.length * this.tileSize,
          l.orientation,
          l.pulse || false,
          l.pulseSpeed || 0.05,
          l.startPhase || 0
        ));
      }
    }
  }

  update() {
    for (const laser of this.lasers) {
      laser.update();
    }
  }
}

// Handcrafted levels progressively introducing every mechanic
export const LEVEL_DEFINITIONS = [
  {
    name: "01 // THE VOID",
    instruction: "A / D / ARROWS to Move. SPACE / W / UP to Jump.",
    width: 32,
    height: 18,
    spawn: { x: 90, y: 390 },
    map: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "......................WWWWW.....",
      ".............WWWWW..............",
      ".............................E..",
      ".....P......................WWWW",
      "WWWWWWWWWW...WWWWWWWWWWWWWWWWWWW",
      "WWWWWWWWWW...WWWWWWWWWWWWWWWWWWW",
      "................................",
      "................................",
    ]
  },
  {
    name: "02 // THE RED SHIFT",
    instruction: "Press SHIFT / J / X / C to SWAP COLOR. White stands on White, Red stands on Red!",
    width: 32,
    height: 18,
    spawn: { x: 90, y: 390 },
    map: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................RRRRR...........",
      "................................",
      ".........WWWWW..................",
      ".............................E..",
      "....P.......................WWWW",
      "WWWWWWWW...............WWWWWWWWW",
      "WWWWWWWW...............WWWWWWWWW",
      "................................",
      "................................",
    ]
  },
  {
    name: "03 // LETHAL GEOMETRY",
    instruction: "Red Spikes KILL White Form. Switch to RED Form to ABSORB hazards as fuel!",
    width: 32,
    height: 18,
    spawn: { x: 90, y: 390 },
    map: [
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "................................",
      "....P........................E..",
      "WWWWWWW....................WWWWW",
      "WWWWWWW^^^^^^^^^^^^^^^^^^^^WWWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "................................",
      "................................",
    ]
  },
  {
    name: "04 // BINARY DROP",
    instruction: "Drop through White floor by turning RED mid-air, then swap back to land!",
    width: 32,
    height: 18,
    spawn: { x: 90, y: 150 },
    map: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W..............................W",
      "W..............................W",
      "W..............................W",
      "W...P..........................W",
      "WWWWWWWWWWWWWW.................W",
      "W..............................W",
      "W............RRRRRRRRRRRR......W",
      "W..............................W",
      "W..............................W",
      "W........WWWWWWWWWWWWWWWW......W",
      "W..............................W",
      "W..............................W",
      "W............................E.W",
      "W...........................WWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "................................",
      "................................",
    ]
  },
  {
    name: "05 // LASER SIEVE",
    instruction: "Red Lasers vaporize White! Jump, switch to RED mid-air to phase through, land safely.",
    width: 36,
    height: 18,
    spawn: { x: 90, y: 390 },
    lasers: [
      { x: 12, y: 6, length: 7, orientation: 'vertical', pulse: false },
      { x: 22, y: 6, length: 7, orientation: 'vertical', pulse: false },
    ],
    map: [
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "............W.........W.............",
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "....................................",
      "....P.................C..........E..",
      "WWWWWWW.....WWWWW...WWWWW.....WWWWWW",
      "WWWWWWW^^^^^WWWWW^^^WWWWW^^^^^WWWWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "....................................",
      "....................................",
    ]
  },
  {
    name: "06 // ALTERNATING ASCENT",
    instruction: "Rapid rhythm climbing! Alternating White & Red steps test your mid-air reflex.",
    width: 32,
    height: 24,
    spawn: { x: 90, y: 600 },
    map: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W.............................EW",
      "W..........................WWWWW",
      "W...................RRRRR......W",
      "W..............................W",
      "W............WWWWW.............W",
      "W..............................W",
      "W......RRRRR...................W",
      "W..............................W",
      "W............WWWWW.............W",
      "W..............................W",
      "W...................RRRRR......W",
      "W..............................W",
      "W............WWWWW.............W",
      "W..............................W",
      "W......RRRRR...................W",
      "W..............................W",
      "W............WWWWW.............W",
      "W...P..........................W",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "................................",
      "................................",
      "................................",
    ]
  },
  {
    name: "07 // HAZARD SURFER",
    instruction: "Lethal floor of Spikes and Lasers is your FUEL! Ride the red energy!",
    width: 40,
    height: 18,
    spawn: { x: 90, y: 390 },
    lasers: [
      { x: 18, y: 7, length: 6, orientation: 'horizontal', pulse: true, pulseSpeed: 0.06 },
      { x: 28, y: 6, length: 6, orientation: 'horizontal', pulse: true, pulseSpeed: 0.08, startPhase: Math.PI },
    ],
    map: [
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "........................................",
      "..................RRRRR.................",
      "............WWWWW.......................",
      "........................................",
      "....P...................C............E..",
      "WWWWWWW.................WWWW.......WWWWW",
      "WWWWWWW^^^^^^^^^^^^^^^^^WWWW^^^^^^^WWWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "........................................",
      "........................................",
    ]
  },
  {
    name: "08 // LUMEN CORE",
    instruction: "Final Gauntlet: Mid-air drops, laser sieves, and binary mastery!",
    width: 44,
    height: 22,
    spawn: { x: 90, y: 150 },
    lasers: [
      { x: 16, y: 4, length: 6, orientation: 'vertical', pulse: false },
      { x: 28, y: 9, length: 6, orientation: 'vertical', pulse: false },
    ],
    map: [
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "W..........................................W",
      "W...P......................................W",
      "WWWWWWWWWWWWWWWWWW.........................W",
      "W..........................................W",
      "W.................RRRRRRRRRRRR.............W",
      "W..........................................W",
      "W..............................WWWWWWWWWW..W",
      "W..........................................W",
      "W..............WWWWWWWWWWWW................W",
      "W..........................................W",
      "W......RRRRRRRRRRRRRRRRRRRRRR..............W",
      "W..........................................W",
      "W..............................WWWWWWWW....W",
      "W..........................................W",
      "W........................................E.W",
      "W.......................................WWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      "............................................",
      "............................................",
      "............................................",
    ]
  }
];
