// Hazard & interactive entities: Spikes, Lasers, Checkpoints, Portals
import { COLORS } from '../core/Constants.js';

export class Spike {
  constructor(x, y, width, height, orientation = 'up') {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.orientation = orientation; // 'up', 'down', 'left', 'right'
    this.color = COLORS.RED;
    this.lastAbsorbTime = 0;
  }

  getBounds() {
    // Inset slightly for fair hitboxes
    return {
      x: this.x + 3,
      y: this.y + 3,
      width: this.width - 6,
      height: this.height - 6,
    };
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = COLORS.RED;
    ctx.strokeStyle = COLORS.WHITE;
    ctx.lineWidth = 1;

    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    ctx.beginPath();
    if (this.orientation === 'up') {
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
    } else if (this.orientation === 'down') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x + w, y);
    } else if (this.orientation === 'left') {
      ctx.moveTo(x + w, y);
      ctx.lineTo(x, y + h / 2);
      ctx.lineTo(x + w, y + h);
    } else if (this.orientation === 'right') {
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x, y + h);
    }
    ctx.closePath();
    ctx.fill();

    // Sharp white tip highlight
    ctx.stroke();
    ctx.restore();
  }
}

export class LaserBeam {
  constructor(x, y, length, orientation = 'vertical', pulse = false, pulseSpeed = 0.05, startPhase = 0) {
    this.x = x;
    this.y = y;
    this.length = length;
    this.orientation = orientation; // 'vertical' or 'horizontal'
    this.pulse = pulse;
    this.pulseSpeed = pulseSpeed;
    this.phase = startPhase;
    this.beamThickness = 6;
    this.isActive = true;
    this.lastAbsorbTime = 0;
  }

  update() {
    if (this.pulse) {
      this.phase += this.pulseSpeed;
      // Cycles on/off every ~2 seconds
      this.isActive = Math.sin(this.phase) > -0.2;
    }
  }

  getBounds() {
    if (!this.isActive) return null;
    const thickness = this.beamThickness;
    if (this.orientation === 'vertical') {
      return {
        x: this.x - thickness / 2,
        y: this.y,
        width: thickness,
        height: this.length,
      };
    } else {
      return {
        x: this.x,
        y: this.y - thickness / 2,
        width: this.length,
        height: thickness,
      };
    }
  }

  draw(ctx, time) {
    ctx.save();
    const isVert = this.orientation === 'vertical';

    // Base emitter mounts
    ctx.fillStyle = COLORS.WHITE;
    if (isVert) {
      ctx.fillRect(this.x - 8, this.y - 4, 16, 4);
      ctx.fillRect(this.x - 8, this.y + this.length, 16, 4);
    } else {
      ctx.fillRect(this.x - 4, this.y - 8, 4, 16);
      ctx.fillRect(this.x + this.length, this.y - 8, 4, 16);
    }

    if (this.isActive) {
      const flicker = 0.85 + Math.sin(time * 0.02 + this.x) * 0.15;

      // Outer Red Hazard Core
      ctx.strokeStyle = COLORS.RED;
      ctx.lineWidth = this.beamThickness * flicker;
      ctx.shadowColor = COLORS.RED;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      if (isVert) {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
      } else {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.length, this.y);
      }
      ctx.stroke();

      // Inner White Intense Core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = COLORS.WHITE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (isVert) {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
      } else {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.length, this.y);
      }
      ctx.stroke();
    } else {
      // Inactive warning indicator (faint dashed red line)
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = COLORS.DARK_RED;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (isVert) {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
      } else {
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.length, this.y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Checkpoint {
  constructor(x, y, width = 20, height = 30) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.isActivated = false;
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  draw(ctx, time) {
    ctx.save();
    const active = this.isActivated;
    ctx.fillStyle = active ? COLORS.WHITE : COLORS.DARK_GRAY;
    ctx.strokeStyle = active ? COLORS.WHITE : '#444';
    ctx.lineWidth = 2;

    // Minimalist antenna beacon
    ctx.fillRect(this.x + 8, this.y + 6, 4, 24);

    // Floating rhombus node
    const floatY = active ? Math.sin(time * 0.005) * 3 : 0;
    ctx.save();
    ctx.translate(this.x + 10, this.y + 6 + floatY);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = active ? COLORS.WHITE : '#333';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();

    ctx.restore();
  }
}

export class ExitPortal {
  constructor(x, y, width = 34, height = 34) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  draw(ctx, time) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const rot1 = time * 0.003;
    const rot2 = -time * 0.004;

    // Outer rotating square
    ctx.rotate(rot1);
    ctx.strokeStyle = COLORS.WHITE;
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -16, 32, 32);

    // Middle rotating red diamond
    ctx.rotate(rot2);
    ctx.strokeStyle = COLORS.RED;
    ctx.lineWidth = 2;
    ctx.strokeRect(-11, -11, 22, 22);

    // Inner core
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(-4, -4, 8, 8);

    ctx.restore();
  }
}
