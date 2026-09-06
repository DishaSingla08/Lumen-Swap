// Core game constants adhering strictly to Black (#000000), White (#FFFFFF), and Red (#FF0000)
export const COLORS = {
  BLACK: '#000000',
  WHITE: '#FFFFFF',
  RED: '#FF0000',
  // Faint ghost / UI accent shades within the 3-color spectrum
  WHITE_GHOST: 'rgba(255, 255, 255, 0.25)',
  RED_GHOST: 'rgba(255, 0, 0, 0.3)',
  RED_GLOW: 'rgba(255, 0, 0, 0.6)',
  WHITE_GLOW: 'rgba(255, 255, 255, 0.6)',
  DARK_RED: '#550000',
  DARK_GRAY: '#222222',
};

export const FORMS = {
  WHITE: 'WHITE',
  RED: 'RED',
};

export const TILE_TYPES = {
  EMPTY: 0,
  PLATFORM_WHITE: 1,
  PLATFORM_RED: 2,
  SPIKE_RED: 3,
  LASER_V_RED: 4,
  LASER_H_RED: 5,
  ENERGY_ORB: 6,
  CHECKPOINT: 7,
  EXIT_PORTAL: 8,
};

export const PHYSICS = {
  GRAVITY: 0.58,
  MAX_FALL_SPEED: 13,
  MOVE_ACCEL: 0.8,
  MOVE_DECEL: 0.72,
  MAX_RUN_SPEED: 4.8,
  JUMP_IMPULSE: -10.8,
  VARIABLE_JUMP_FALL_MULTIPLIER: 0.5, // Released jump button cuts upward velocity
  COYOTE_TIME: 7, // Frames player can jump after walking off a ledge
  JUMP_BUFFER: 6, // Frames jump press is remembered before landing
  WALL_SLIDE_SPEED: 2.2,
  WALL_JUMP_X: 5.5,
  WALL_JUMP_Y: -9.5,
  SWAP_COOLDOWN_FRAMES: 8,
  MAX_LUMEN: 100,
  LUMEN_RECHARGE_RATE: 25, // Amount gained per hazard absorb
  LUMEN_DECAY_RATE: 3.5, // Optional energy drain in Red form if enabled
};

export const CANVAS_SIZE = {
  WIDTH: 960,
  HEIGHT: 540,
  TILE_SIZE: 30,
};
