// Minimalist geometric particle system strictly using Black, White, and Red
import { COLORS } from './Constants.js';

export class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'square', gravity = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.shape = shape; // 'square', 'ring', 'line', 'absorb'
    this.gravity = gravity;
    this.angle = Math.random() * Math.PI * 2;
    this.vAngle = (Math.random() - 0.5) * 0.2;
    this.target = null; // for absorb motes
  }

  update() {
    this.life--;
    this.angle += this.vAngle;

    if (this.target) {
      // Swirl inward towards target (e.g. player core on absorb)
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.vx += (dx / dist) * 1.8;
      this.vy += (dy / dist) * 1.8;
      this.vx *= 0.88;
      this.vy *= 0.88;
    } else {
      this.vy += this.gravity;
      this.vx *= 0.94;
      this.vy *= 0.94;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.shape === 'ring') {
      this.size += 2.8;
    }
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.shape === 'ring') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.shape === 'line') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
      ctx.stroke();
    } else {
      // Crisp geometric square/shard
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillStyle = this.color;
      const curSize = this.shape === 'absorb' ? this.size * alpha : this.size;
      ctx.fillRect(-curSize / 2, -curSize / 2, curSize, curSize);
    }

    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  reset() {
    this.particles = [];
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }

  // Burst on Color Swap
  emitSwap(x, y, toRed) {
    const color = toRed ? COLORS.RED : COLORS.WHITE;
    // Shockwave ring
    this.particles.push(new Particle(x, y, 0, 0, color, 4, 18, 'ring'));

    // High speed geometric fragments
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 / 16) * i + Math.random() * 0.2;
      const speed = 3.5 + Math.random() * 4.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 4;
      this.particles.push(new Particle(x, y, vx, vy, color, size, 22 + Math.random() * 10, 'square'));
    }
  }

  // Absorb Red Hazard (inward swirling motes)
  emitAbsorb(x, y, player) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 32 + Math.random() * 30;
      const spawnX = x + Math.cos(angle) * dist;
      const spawnY = y + Math.sin(angle) * dist;
      const p = new Particle(spawnX, spawnY, 0, 0, COLORS.RED, 4.5, 24, 'absorb');
      p.target = player;
      this.particles.push(p);
    }
    // Small outward shockwave
    this.particles.push(new Particle(x, y, 0, 0, COLORS.RED, 6, 14, 'ring'));
  }

  // Death shatter
  emitDeath(x, y, color) {
    // Expanding death shockwave
    this.particles.push(new Particle(x, y, 0, 0, color, 4, 25, 'ring'));

    // 28 angular shards flying outward with gravity
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2.5;
      const size = 3 + Math.random() * 5;
      this.particles.push(new Particle(x, y, vx, vy, color, size, 35 + Math.random() * 20, 'square', 0.28));
    }
  }

  // Jump / Landing dust
  emitDust(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 4;
      const vy = -Math.random() * 1.8;
      const size = 2.5 + Math.random() * 2;
      this.particles.push(new Particle(x, y, vx, vy, color, size, 14 + Math.random() * 8, 'square'));
    }
  }

  // Exit Portal passive ambient
  emitPortalPulse(x, y) {
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 18;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const vx = -Math.cos(angle) * 1.2;
      const vy = -Math.sin(angle) * 1.2;
      this.particles.push(new Particle(px, py, vx, vy, COLORS.WHITE, 2.5, 20, 'square'));
    }
  }
}
