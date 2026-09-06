// Physics and collision resolution with color phasing
import { FORMS, TILE_TYPES, CANVAS_SIZE } from './Constants.js';

export class PhysicsEngine {
  constructor() {
    this.tileSize = CANVAS_SIZE.TILE_SIZE;
  }

  // Check AABB overlap between two rectangles
  intersects(r1, r2) {
    return !(
      r2.x >= r1.x + r1.width ||
      r2.x + r2.width <= r1.x ||
      r2.y >= r1.y + r1.height ||
      r2.y + r2.height <= r1.y
    );
  }

  // Update player physics against tilemap and entities
  update(player, level, particles, onPlayerDeath) {
    if (player.isDead) return;

    // 1. Horizontal movement and collisions
    player.x += player.vx;
    this.resolveTileCollisions(player, level, true);

    // 2. Vertical movement and collisions
    player.y += player.vy;
    player.isGrounded = false;
    this.resolveTileCollisions(player, level, false);

    // 3. Fall out of world check
    const bottomLimit = level.height * this.tileSize + 60;
    if (player.y > bottomLimit) {
      onPlayerDeath();
      return;
    }

    // 4. Hazard Collisions (Spikes, Lasers)
    this.checkHazardCollisions(player, level, particles, onPlayerDeath);

    // 5. Checkpoints & Exit Portals
    this.checkInteractiveCollisions(player, level);
  }

  // Resolve tilemap collisions honoring form identity
  resolveTileCollisions(player, level, isHorizontal) {
    const isWhiteForm = player.form === FORMS.WHITE;

    const startCol = Math.floor(player.x / this.tileSize);
    const endCol = Math.floor((player.x + player.width) / this.tileSize);
    const startRow = Math.floor(player.y / this.tileSize);
    const endRow = Math.floor((player.y + player.height) / this.tileSize);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = level.getTile(c, r);
        if (!tile) continue;

        let isSolid = false;
        if (tile === TILE_TYPES.PLATFORM_WHITE && isWhiteForm) {
          isSolid = true;
        } else if (tile === TILE_TYPES.PLATFORM_RED && !isWhiteForm) {
          isSolid = true;
        }

        if (isSolid) {
          const tileRect = {
            x: c * this.tileSize,
            y: r * this.tileSize,
            width: this.tileSize,
            height: this.tileSize,
          };

          if (this.intersects(player.getBounds(), tileRect)) {
            if (isHorizontal) {
              if (player.vx > 0) {
                player.x = tileRect.x - player.width;
              } else if (player.vx < 0) {
                player.x = tileRect.x + tileRect.width;
              }
              player.vx = 0;
            } else {
              if (player.vy > 0) {
                player.y = tileRect.y - player.height;
                player.vy = 0;
                player.isGrounded = true;
              } else if (player.vy < 0) {
                player.y = tileRect.y + tileRect.height;
                player.vy = 0;
              }
            }
          }
        }
      }
    }
  }

  // Check interactions with Spikes and Lasers
  checkHazardCollisions(player, level, particles, onPlayerDeath) {
    const pBounds = player.getBounds();
    const isRedForm = player.form === FORMS.RED;

    // 1. Spikes
    for (const spike of level.spikes) {
      if (this.intersects(pBounds, spike.getBounds())) {
        if (isRedForm) {
          // Absorb red hazard!
          const now = Date.now();
          if (now - spike.lastAbsorbTime > 300) {
            spike.lastAbsorbTime = now;
            player.absorbHazard(particles);
          }
        } else {
          // Lethal to White Form
          onPlayerDeath();
          return;
        }
      }
    }

    // 2. Lasers
    for (const laser of level.lasers) {
      const lBounds = laser.getBounds();
      if (!lBounds) continue;

      if (this.intersects(pBounds, lBounds)) {
        if (isRedForm) {
          // Absorb red laser beam!
          const now = Date.now();
          if (now - laser.lastAbsorbTime > 250) {
            laser.lastAbsorbTime = now;
            player.absorbHazard(particles);
          }
        } else {
          // White Form contact with Red Laser -> Lethal!
          onPlayerDeath();
          return;
        }
      }
    }
  }

  // Check Checkpoints and Exit Portal
  checkInteractiveCollisions(player, level) {
    const pBounds = player.getBounds();

    // Checkpoints
    for (const cp of level.checkpoints) {
      if (!cp.isActivated && this.intersects(pBounds, cp.getBounds())) {
        cp.isActivated = true;
        level.setCheckpoint(cp.x, cp.y - 4);
      }
    }

    // Exit Portal
    if (level.exitPortal && this.intersects(pBounds, level.exitPortal.getBounds())) {
      level.isCompleted = true;
    }
  }
}
