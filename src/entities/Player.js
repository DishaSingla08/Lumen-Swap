// Player entity with color identity, physics, squash & stretch, and Lumen energy
import { COLORS, FORMS, PHYSICS } from '../core/Constants.js';
import { Audio } from '../core/Audio.js';

export class Player {
  constructor(x, y) {
    this.spawnX = x;
    this.spawnY = y;
    this.x = x;
    this.y = y;
    this.width = 22;
    this.height = 22;

    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.wasGrounded = false;

    // Active form: FORMS.WHITE or FORMS.RED
    this.form = FORMS.WHITE;
    this.swapCooldown = 0;

    // Lumen Energy
    this.lumen = 100;
    this.maxLumen = 100;
    this.lumenRechargeEffect = 0;

    // Jump mechanics (Coyote time & Jump buffer)
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;

    // Squash & Stretch
    this.scaleX = 1.0;
    this.scaleY = 1.0;

    // Trail afterimages
    this.trails = [];

    // State
    this.isDead = false;
    this.invulnerableTimer = 0;
    this.absorbedHazardRecently = 0;
    this.facingDir = 1;
    this.walkAnimTimer = 0;
  }

  reset(x = this.spawnX, y = this.spawnY) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = false;
    this.wasGrounded = false;
    this.form = FORMS.WHITE;
    this.swapCooldown = 0;
    this.lumen = 100;
    this.isDead = false;
    this.invulnerableTimer = 0;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.trails = [];
    this.absorbedHazardRecently = 0;
  }

  swapForm(particleSystem) {
    if (this.swapCooldown > 0 || this.isDead) return false;

    this.form = (this.form === FORMS.WHITE) ? FORMS.RED : FORMS.WHITE;
    this.swapCooldown = PHYSICS.SWAP_COOLDOWN_FRAMES;

    // Audio & Particles
    const isRed = this.form === FORMS.RED;
    Audio.playSwap(isRed);
    if (particleSystem) {
      particleSystem.emitSwap(this.x + this.width / 2, this.y + this.height / 2, isRed);
    }

    // Squash on swap
    this.scaleX = 1.3;
    this.scaleY = 0.7;

    return true;
  }

  absorbHazard(particleSystem) {
    // Red form absorbs red hazard!
    this.lumen = Math.min(this.maxLumen, this.lumen + PHYSICS.LUMEN_RECHARGE_RATE);
    this.lumenRechargeEffect = 18; // frames of high energy glow
    this.invulnerableTimer = 15; // safe grace window
    this.absorbedHazardRecently = 10;

    Audio.playAbsorb();
    if (particleSystem) {
      particleSystem.emitAbsorb(this.x + this.width / 2, this.y + this.height / 2, {
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
      });
    }
  }

  update(input, particleSystem) {
    if (this.isDead) return;

    if (this.swapCooldown > 0) this.swapCooldown--;
    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
    if (this.lumenRechargeEffect > 0) this.lumenRechargeEffect--;
    if (this.absorbedHazardRecently > 0) this.absorbedHazardRecently--;

    // 1. Color Swap Input
    if (input.swapJustPressed) {
      this.swapForm(particleSystem);
    }

    // 2. Horizontal Movement
    let moveDir = 0;
    if (input.moveLeft) moveDir -= 1;
    if (input.moveRight) moveDir += 1;

    if (moveDir !== 0) {
      this.vx += moveDir * PHYSICS.MOVE_ACCEL;
      if (Math.abs(this.vx) > PHYSICS.MAX_RUN_SPEED) {
        this.vx = Math.sign(this.vx) * PHYSICS.MAX_RUN_SPEED;
      }
      this.facingDir = moveDir;
      this.walkAnimTimer += 0.25;
    } else {
      this.vx *= PHYSICS.MOVE_DECEL;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
      this.walkAnimTimer = 0;
    }

    // 3. Grounded & Coyote Time
    if (this.isGrounded) {
      this.coyoteTimer = PHYSICS.COYOTE_TIME;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    // 4. Jump Buffering
    if (input.jumpJustPressed) {
      this.jumpBufferTimer = PHYSICS.JUMP_BUFFER;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer--;
    }

    // 5. Jump Execution
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.vy = PHYSICS.JUMP_IMPULSE;
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;

      // Squash and stretch for punchy jump feel
      this.scaleX = 0.7;
      this.scaleY = 1.35;

      Audio.playJump();
      if (particleSystem) {
        particleSystem.emitDust(this.x + this.width / 2, this.y + this.height, this.getColor(), 5);
      }
    }

    // Variable jump height: release early cuts upward momentum
    if (input.jumpJustReleased && this.vy < 0) {
      this.vy *= PHYSICS.VARIABLE_JUMP_FALL_MULTIPLIER;
    }

    // 6. Gravity
    this.vy += PHYSICS.GRAVITY;
    if (this.vy > PHYSICS.MAX_FALL_SPEED) {
      this.vy = PHYSICS.MAX_FALL_SPEED;
    }

    // 7. Landing impact detection
    if (!this.wasGrounded && this.isGrounded) {
      this.scaleX = 1.3;
      this.scaleY = 0.7;
      Audio.playLand();
      if (particleSystem) {
        particleSystem.emitDust(this.x + this.width / 2, this.y + this.height, this.getColor(), 4);
      }
    }
    this.wasGrounded = this.isGrounded;

    // 8. Smoothly return scale to 1.0
    this.scaleX += (1.0 - this.scaleX) * 0.18;
    this.scaleY += (1.0 - this.scaleY) * 0.18;

    // 9. Trail afterimages
    if (Math.abs(this.vx) > 3.0 || Math.abs(this.vy) > 4.0 || this.lumenRechargeEffect > 0) {
      if (this.trails.length === 0 || Math.hypot(this.x - this.trails[0].x, this.y - this.trails[0].y) > 8) {
        this.trails.unshift({
          x: this.x,
          y: this.y,
          color: this.getColor(),
          alpha: 0.5,
          scaleX: this.scaleX,
          scaleY: this.scaleY,
        });
      }
    }

    // Fade and prune trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].alpha -= 0.08;
      if (this.trails[i].alpha <= 0) {
        this.trails.splice(i, 1);
      }
    }
  }

  getColor() {
    return this.form === FORMS.WHITE ? COLORS.WHITE : COLORS.RED;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();

    // 1. Draw trails
    for (const trail of this.trails) {
      ctx.save();
      ctx.globalAlpha = trail.alpha;
      ctx.fillStyle = trail.color;
      ctx.translate(trail.x + this.width / 2, trail.y + this.height / 2);
      ctx.scale(trail.scaleX, trail.scaleY);
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }

    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    ctx.translate(centerX, centerY);
    ctx.scale(this.scaleX, this.scaleY);

    const isWhite = this.form === FORMS.WHITE;
    const bodyColor = isWhite ? COLORS.WHITE : COLORS.RED;

    // Overcharge energy aura if recently absorbed hazard (matching Panel 2)
    if (this.lumenRechargeEffect > 0) {
      ctx.save();
      const auraPulse = Math.sin(this.lumenRechargeEffect * 0.8) * 3;
      ctx.strokeStyle = COLORS.RED;
      ctx.lineWidth = 2;
      ctx.strokeRect(-this.width / 2 - 4 - auraPulse, -this.height / 2 - 4 - auraPulse, this.width + 8 + auraPulse * 2, this.height + 8 + auraPulse * 2);
      ctx.strokeStyle = COLORS.WHITE;
      ctx.lineWidth = 1;
      ctx.strokeRect(-this.width / 2 - 2, -this.height / 2 - 2, this.width + 4, this.height + 4);
      ctx.restore();
    }

    // 1. Head (10x9 rounded block)
    const hy = -6;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-5, hy - 4, 10, 9);
    ctx.strokeStyle = COLORS.BLACK;
    ctx.lineWidth = 1;
    ctx.strokeRect(-5, hy - 4, 10, 9);

    // Expressive eye dot facing movement direction
    const eyeX = this.facingDir * 2;
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(eyeX - 1, hy - 1, 2, 3);

    // 2. Torso (8x7 chest)
    const ty = 2;
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-4, ty - 2, 8, 7);
    ctx.strokeRect(-4, ty - 2, 8, 7);

    // 3. Arms (animated swing when moving)
    const armSwing = this.isGrounded ? Math.sin(this.walkAnimTimer) * 3 : -2;
    // Front arm
    ctx.fillRect(this.facingDir * 3 - 1, ty - 1 + armSwing, 3, 5);
    // Back arm
    ctx.fillRect(-this.facingDir * 3 - 1, ty - 1 - armSwing, 3, 5);

    // 4. Legs (stride or jump pose)
    const legY = ty + 5;
    if (!this.isGrounded) {
      // Airborne jump pose: legs bent
      ctx.fillRect(-4, legY, 3, 4);
      ctx.fillRect(1, legY - 1, 3, 5);
    } else {
      const legOffset = Math.sin(this.walkAnimTimer) * 3;
      // Left leg
      ctx.fillRect(-4, legY, 3, 5 + legOffset);
      // Right leg
      ctx.fillRect(1, legY, 3, 5 - legOffset);
    }

    ctx.restore();
  }
}
