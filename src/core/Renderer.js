// High-contrast 3-color Canvas 2D renderer adhering strictly to Black, White, and Red
import { COLORS, FORMS, TILE_TYPES, CANVAS_SIZE } from './Constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileSize = CANVAS_SIZE.TILE_SIZE;

    // Smooth camera
    this.camX = 0;
    this.camY = 0;
    this.shakeIntensity = 0;
    this.shakeDecay = 0.88;

    // Color swap shockwave flash
    this.flashColor = null;
    this.flashAlpha = 0;

    // Time counter for dash animations
    this.dashOffset = 0;
  }

  triggerShake(intensity = 6) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  triggerFlash(color, alpha = 0.35) {
    this.flashColor = color;
    this.flashAlpha = alpha;
  }

  updateCamera(player, level) {
    // Target center of screen
    const targetX = player.x + player.width / 2 - CANVAS_SIZE.WIDTH / 2;
    const targetY = player.y + player.height / 2 - CANVAS_SIZE.HEIGHT / 2;

    // Smooth lerp
    this.camX += (targetX - this.camX) * 0.12;
    this.camY += (targetY - this.camY) * 0.12;

    // Clamp camera within level bounds
    const maxCamX = Math.max(0, level.width * this.tileSize - CANVAS_SIZE.WIDTH);
    const maxCamY = Math.max(0, level.height * this.tileSize - CANVAS_SIZE.HEIGHT);
    this.camX = Math.max(0, Math.min(maxCamX, this.camX));
    this.camY = Math.max(0, Math.min(maxCamY, this.camY));

    // Shake decay
    if (this.shakeIntensity > 0.05) {
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    if (this.flashAlpha > 0.01) {
      this.flashAlpha *= 0.82;
    } else {
      this.flashAlpha = 0;
    }

    this.dashOffset = (this.dashOffset + 0.5) % 16;
  }

  render(player, level, particles, time) {
    const ctx = this.ctx;

    // 1. Clear void background (#000000)
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, CANVAS_SIZE.WIDTH, CANVAS_SIZE.HEIGHT);

    ctx.save();

    // 2. Camera transform + Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
    }

    ctx.translate(-Math.round(this.camX + shakeX), -Math.round(this.camY + shakeY));

    // 3. Render Level Geometry (Platforms with Color Phasing)
    this.renderTilemap(ctx, player, level);

    // 4. Render Hazards (Spikes, Lasers)
    for (const spike of level.spikes) {
      spike.draw(ctx);
    }
    for (const laser of level.lasers) {
      laser.draw(ctx, time);
    }

    // 5. Render Checkpoints & Exit Portal
    for (const cp of level.checkpoints) {
      cp.draw(ctx, time);
    }
    if (level.exitPortal) {
      level.exitPortal.draw(ctx, time);
    }

    // 6. Render Particles
    particles.draw(ctx);

    // 7. Render Player
    player.draw(ctx);

    ctx.restore();

    // 8. Swap Flash / Chromatic shock overlay
    if (this.flashAlpha > 0.01 && this.flashColor) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, CANVAS_SIZE.WIDTH, CANVAS_SIZE.HEIGHT);
      ctx.restore();
    }
  }

  renderTilemap(ctx, player, level) {
    const isWhiteForm = player.form === FORMS.WHITE;

    const startCol = Math.max(0, Math.floor(this.camX / this.tileSize));
    const endCol = Math.min(level.width - 1, Math.ceil((this.camX + CANVAS_SIZE.WIDTH) / this.tileSize));
    const startRow = Math.max(0, Math.floor(this.camY / this.tileSize));
    const endRow = Math.min(level.height - 1, Math.ceil((this.camY + CANVAS_SIZE.HEIGHT) / this.tileSize));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = level.getTile(c, r);
        if (!tile) continue;

        const x = c * this.tileSize;
        const y = r * this.tileSize;
        const s = this.tileSize;

        if (tile === TILE_TYPES.PLATFORM_WHITE) {
          if (isWhiteForm) {
            // Active Safe State: Bright, solid, opaque White
            ctx.fillStyle = COLORS.WHITE;
            ctx.fillRect(x, y, s, s);

            // Black inner grid accent
            ctx.strokeStyle = COLORS.BLACK;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
          } else {
            // Inactive / Ghost State: Faint, dashed outline ghost against black
            ctx.save();
            ctx.fillStyle = COLORS.WHITE_GHOST;
            ctx.fillRect(x + 2, y + 2, s - 4, s - 4);

            ctx.strokeStyle = COLORS.WHITE;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = -this.dashOffset;
            ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
            ctx.restore();
          }
        } else if (tile === TILE_TYPES.PLATFORM_RED) {
          if (!isWhiteForm) {
            // Active Red State: Bright, solid, opaque Red
            ctx.fillStyle = COLORS.RED;
            ctx.fillRect(x, y, s, s);

            // Black inner border
            ctx.strokeStyle = COLORS.BLACK;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);

            // Glowing top highlight
            ctx.fillStyle = COLORS.WHITE;
            ctx.fillRect(x + 2, y, s - 4, 2);
          } else {
            // Inactive / Ghost State: Faint, dashed outline ghost against black
            ctx.save();
            ctx.fillStyle = COLORS.RED_GHOST;
            ctx.fillRect(x + 2, y + 2, s - 4, s - 4);

            ctx.strokeStyle = COLORS.RED;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.lineDashOffset = this.dashOffset;
            ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
            ctx.restore();
          }
        }
      }
    }
  }
}
