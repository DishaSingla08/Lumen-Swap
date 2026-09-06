// In-game visual Level Editor for custom 3-color puzzle platformer designs
import { TILE_TYPES, COLORS, CANVAS_SIZE } from '../core/Constants.js';
import { Level } from '../levels/LevelData.js';

export class LevelEditor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileSize = CANVAS_SIZE.TILE_SIZE;

    this.cols = 32;
    this.rows = 18;

    this.grid = new Uint8Array(this.cols * this.rows);
    this.spikes = []; // { c, r, dir }
    this.lasers = []; // { c, r, len, orientation }
    this.playerSpawn = { c: 3, r: 12 };
    this.exitPortal = { c: 28, r: 12 };

    this.currentTool = 'PLATFORM_WHITE'; // 'PLATFORM_WHITE', 'PLATFORM_RED', 'SPIKE_UP', 'LASER_V', 'SPAWN', 'PORTAL', 'ERASE'
    this.isMouseDown = false;
    this.mouseCol = 0;
    this.mouseRow = 0;

    this.initDefaultGround();
    this.bindMouseEvents();
  }

  initDefaultGround() {
    for (let c = 0; c < this.cols; c++) {
      this.setGridTile(c, 14, TILE_TYPES.PLATFORM_WHITE);
      this.setGridTile(c, 15, TILE_TYPES.PLATFORM_WHITE);
    }
  }

  bindMouseEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE.WIDTH / rect.width;
      const scaleY = CANVAS_SIZE.HEIGHT / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      this.mouseCol = Math.floor(mouseX / this.tileSize);
      this.mouseRow = Math.floor(mouseY / this.tileSize);

      if (this.isMouseDown) {
        this.applyTool(this.mouseCol, this.mouseRow, e.buttons === 2);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.applyTool(this.mouseCol, this.mouseRow, e.button === 2);
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  setGridTile(c, r, type) {
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      this.grid[r * this.cols + c] = type;
    }
  }

  getGridTile(c, r) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return TILE_TYPES.EMPTY;
    return this.grid[r * this.cols + c];
  }

  applyTool(c, r, isRightClick = false) {
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;

    if (isRightClick || this.currentTool === 'ERASE') {
      this.setGridTile(c, r, TILE_TYPES.EMPTY);
      this.spikes = this.spikes.filter(s => !(s.c === c && s.r === r));
      this.lasers = this.lasers.filter(l => !(l.c === c && l.r === r));
      return;
    }

    if (this.currentTool === 'PLATFORM_WHITE') {
      this.setGridTile(c, r, TILE_TYPES.PLATFORM_WHITE);
    } else if (this.currentTool === 'PLATFORM_RED') {
      this.setGridTile(c, r, TILE_TYPES.PLATFORM_RED);
    } else if (this.currentTool === 'SPIKE_UP') {
      this.setGridTile(c, r, TILE_TYPES.EMPTY);
      this.spikes = this.spikes.filter(s => !(s.c === c && s.r === r));
      this.spikes.push({ c, r, dir: 'up' });
    } else if (this.currentTool === 'LASER_V') {
      this.lasers = this.lasers.filter(l => !(l.c === c && l.r === r));
      this.lasers.push({ c, r, len: 6, orientation: 'vertical' });
    } else if (this.currentTool === 'SPAWN') {
      this.playerSpawn = { c, r };
    } else if (this.currentTool === 'PORTAL') {
      this.exitPortal = { c, r };
    }
  }

  clear() {
    this.grid.fill(TILE_TYPES.EMPTY);
    this.spikes = [];
    this.lasers = [];
    this.initDefaultGround();
  }

  toLevel() {
    const map = [];
    for (let r = 0; r < this.rows; r++) {
      let rowChars = '';
      for (let c = 0; c < this.cols; c++) {
        const tile = this.getGridTile(c, r);
        const spike = this.spikes.find(s => s.c === c && s.r === r);

        if (c === this.playerSpawn.c && r === this.playerSpawn.r) {
          rowChars += 'P';
        } else if (c === this.exitPortal.c && r === this.exitPortal.r) {
          rowChars += 'E';
        } else if (spike) {
          rowChars += '^';
        } else if (tile === TILE_TYPES.PLATFORM_WHITE) {
          rowChars += 'W';
        } else if (tile === TILE_TYPES.PLATFORM_RED) {
          rowChars += 'R';
        } else {
          rowChars += '.';
        }
      }
      map.push(rowChars);
    }

    const levelData = {
      name: 'CUSTOM LEVEL',
      instruction: 'Custom user level created in Lumen Swap Level Editor',
      width: this.cols,
      height: this.rows,
      spawn: { x: this.playerSpawn.c * this.tileSize, y: this.playerSpawn.r * this.tileSize },
      map: map,
      lasers: this.lasers.map(l => ({
        x: l.c,
        y: l.r,
        length: l.len,
        orientation: l.orientation,
      })),
    };

    return new Level(levelData);
  }

  exportJSON() {
    const levelData = {
      name: 'CUSTOM LEVEL',
      width: this.cols,
      height: this.rows,
      playerSpawn: this.playerSpawn,
      exitPortal: this.exitPortal,
      grid: Array.from(this.grid),
      spikes: this.spikes,
      lasers: this.lasers,
    };
    return JSON.stringify(levelData, null, 2);
  }

  importJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      this.cols = data.width || 32;
      this.rows = data.height || 18;
      this.grid = new Uint8Array(data.grid);
      this.playerSpawn = data.playerSpawn || { c: 2, r: 12 };
      this.exitPortal = data.exitPortal || { c: 28, r: 12 };
      this.spikes = data.spikes || [];
      this.lasers = data.lasers || [];
      return true;
    } catch (e) {
      console.error('Invalid level JSON', e);
      return false;
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, CANVAS_SIZE.WIDTH, CANVAS_SIZE.HEIGHT);

    // 1. Grid lines
    ctx.strokeStyle = '#181818';
    ctx.lineWidth = 1;
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * this.tileSize, 0);
      ctx.lineTo(c * this.tileSize, this.rows * this.tileSize);
      ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * this.tileSize);
      ctx.lineTo(this.cols * this.tileSize, r * this.tileSize);
      ctx.stroke();
    }

    // 2. Tiles
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.getGridTile(c, r);
        const x = c * this.tileSize;
        const y = r * this.tileSize;
        const s = this.tileSize;

        if (tile === TILE_TYPES.PLATFORM_WHITE) {
          ctx.fillStyle = COLORS.WHITE;
          ctx.fillRect(x, y, s, s);
          ctx.strokeStyle = COLORS.BLACK;
          ctx.strokeRect(x, y, s, s);
        } else if (tile === TILE_TYPES.PLATFORM_RED) {
          ctx.fillStyle = COLORS.RED;
          ctx.fillRect(x, y, s, s);
          ctx.strokeStyle = COLORS.BLACK;
          ctx.strokeRect(x, y, s, s);
        }
      }
    }

    // 3. Spikes
    for (const spike of this.spikes) {
      ctx.fillStyle = COLORS.RED;
      const x = spike.c * this.tileSize;
      const y = spike.r * this.tileSize;
      const s = this.tileSize;
      ctx.beginPath();
      ctx.moveTo(x, y + s);
      ctx.lineTo(x + s / 2, y + 8);
      ctx.lineTo(x + s, y + s);
      ctx.closePath();
      ctx.fill();
    }

    // 4. Lasers
    for (const laser of this.lasers) {
      const lx = laser.c * this.tileSize + 15;
      const ly = laser.r * this.tileSize;
      const len = laser.len * this.tileSize;
      ctx.strokeStyle = COLORS.RED;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly + len);
      ctx.stroke();
    }

    // 5. Player Spawn (White Square with "P")
    ctx.strokeStyle = COLORS.WHITE;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.playerSpawn.c * this.tileSize + 4, this.playerSpawn.r * this.tileSize + 4, 22, 22);
    ctx.fillStyle = COLORS.WHITE;
    ctx.font = '12px monospace';
    ctx.fillText('P', this.playerSpawn.c * this.tileSize + 10, this.playerSpawn.r * this.tileSize + 19);

    // 6. Exit Portal (Red Diamond with "E")
    ctx.strokeStyle = COLORS.RED;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.exitPortal.c * this.tileSize + 4, this.exitPortal.r * this.tileSize + 4, 22, 22);
    ctx.fillStyle = COLORS.RED;
    ctx.font = '12px monospace';
    ctx.fillText('E', this.exitPortal.c * this.tileSize + 10, this.exitPortal.r * this.tileSize + 19);

    // 7. Hover cursor box
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.mouseCol * this.tileSize, this.mouseRow * this.tileSize, this.tileSize, this.tileSize);
  }
}
