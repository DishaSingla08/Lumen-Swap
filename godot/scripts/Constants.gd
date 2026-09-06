# Global constants for Lumen Swap adhering strictly to 3 colors:
# Black (#000000), White (#FFFFFF), and Red (#FF0000)
class_name Constants
extends RefCounted

# Strict 3-Color Palette - ZERO intermediate or blended shades
const COLOR_BLACK = Color(0.0, 0.0, 0.0, 1.0) # #000000
const COLOR_WHITE = Color(1.0, 1.0, 1.0, 1.0) # #FFFFFF
const COLOR_RED   = Color(1.0, 0.0, 0.0, 1.0) # #FF0000

enum Form {
	WHITE,
	RED
}

enum TileType {
	EMPTY = 0,
	PLATFORM_WHITE = 1,
	PLATFORM_RED = 2,
	SPIKE_RED = 3,
	LASER_V_RED = 4,
	LASER_H_RED = 5,
	ENERGY_ORB = 6,
	CHECKPOINT = 7,
	EXIT_PORTAL = 8
}

# Collision 2D Layer Bits
# Layer 1 = World Bounds / Neutral Solids (mask 1)
# Layer 2 = White Platforms (mask 2)
# Layer 3 = Red Platforms (mask 4)
# Layer 4 = Hazards: Spikes, Lasers (mask 8)
# Layer 5 = Interactive: Checkpoints, Exit Portals (mask 16)
const LAYER_BOUNDS = 1
const LAYER_WHITE_PLATFORM = 2
const LAYER_RED_PLATFORM = 4
const LAYER_HAZARD = 8
const LAYER_INTERACTIVE = 16

# Physics parameters calibrated for 60 FPS delta
const GRAVITY = 1150.0
const MAX_FALL_SPEED = 600.0
const MOVE_ACCEL = 1600.0
const MOVE_DECEL = 1400.0
const MAX_RUN_SPEED = 240.0
const JUMP_IMPULSE = -420.0
const VARIABLE_JUMP_FALL_MULTIPLIER = 0.5
const COYOTE_TIME = 0.12 # seconds
const JUMP_BUFFER = 0.10 # seconds
const SWAP_COOLDOWN = 0.12 # seconds

const MAX_LUMEN = 100.0
const LUMEN_RECHARGE_RATE = 25.0
const LUMEN_DECAY_RATE = 4.0 # energy drain in Red form if enabled

const VIEWPORT_WIDTH = 960
const VIEWPORT_HEIGHT = 540
const TILE_SIZE = 30
