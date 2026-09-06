# Level generator: creates White/Red platforms on independent collision layers,
# renders platforms in strict 3 colors with 1-bit dithered ghost states,
# and instantiates hazards, checkpoints, and portals.
class_name Level
extends Node2D

const Constants = preload("res://scripts/Constants.gd")
const Spike = preload("res://scripts/Spike.gd")
const LaserBeam = preload("res://scripts/LaserBeam.gd")
const Checkpoint = preload("res://scripts/Checkpoint.gd")
const ExitPortal = preload("res://scripts/ExitPortal.gd")

signal portal_reached

var level_name: String = ""
var instruction: String = ""
var spawn_position: Vector2 = Vector2(90, 390)
var level_width: int = 32
var level_height: int = 18

var white_tiles: Dictionary = {} # Vector2i -> true
var red_tiles: Dictionary = {}   # Vector2i -> true

var white_body: StaticBody2D
var red_body: StaticBody2D
var bounds_body: StaticBody2D

var player_form: Constants.Form = Constants.Form.WHITE

func load_level(level_dict: Dictionary) -> void:
	level_name = level_dict.get("name", "SECTOR")
	instruction = level_dict.get("instruction", "")
	level_width = level_dict.get("width", 32)
	level_height = level_dict.get("height", 18)
	spawn_position = level_dict.get("spawn", Vector2(90, 390))

	# Clear previous
	for child in get_children():
		child.queue_free()

	white_tiles.clear()
	red_tiles.clear()

	# Create Static Bodies for White and Red platforms
	white_body = StaticBody2D.new()
	white_body.name = "WhitePlatforms"
	white_body.collision_layer = Constants.LAYER_WHITE_PLATFORM
	white_body.collision_mask = 0
	add_child(white_body)

	red_body = StaticBody2D.new()
	red_body.name = "RedPlatforms"
	red_body.collision_layer = Constants.LAYER_RED_PLATFORM
	red_body.collision_mask = 0
	add_child(red_body)

	# World Boundaries (Layer 1)
	bounds_body = StaticBody2D.new()
	bounds_body.name = "WorldBounds"
	bounds_body.collision_layer = Constants.LAYER_BOUNDS
	bounds_body.collision_mask = 0
	add_child(bounds_body)
	_build_world_bounds()

	# Parse ASCII Map
	var map_lines: Array = level_dict.get("map", [])
	for r in range(map_lines.size()):
		var line = String(map_lines[r])
		for c in range(line.length()):
			var char = line[c]
			var tile_pos = Vector2i(c, r)
			var world_pos = Vector2(c * Constants.TILE_SIZE, r * Constants.TILE_SIZE)

			match char:
				'W':
					white_tiles[tile_pos] = true
					_add_tile_collision(white_body, world_pos)
				'R':
					red_tiles[tile_pos] = true
					_add_tile_collision(red_body, world_pos)
				'^':
					_spawn_spike(world_pos, "up")
				'v':
					_spawn_spike(world_pos, "down")
				'<':
					_spawn_spike(world_pos, "left")
				'>':
					_spawn_spike(world_pos, "right")
				'C':
					_spawn_checkpoint(world_pos + Vector2(Constants.TILE_SIZE * 0.5, Constants.TILE_SIZE))
				'E':
					_spawn_portal(world_pos + Vector2(Constants.TILE_SIZE * 0.5, Constants.TILE_SIZE * 0.5))
				'P':
					spawn_position = world_pos + Vector2(Constants.TILE_SIZE * 0.5, Constants.TILE_SIZE * 0.5)

	# Spawn Defined Lasers
	if level_dict.has("lasers"):
		for ldata in level_dict["lasers"]:
			_spawn_laser(ldata)

	# Connect form change signal to update platform rendering
	if not GameManager.form_changed.is_connected(_on_form_changed):
		GameManager.form_changed.connect(_on_form_changed)

	queue_redraw()

func _add_tile_collision(body: StaticBody2D, pos: Vector2) -> void:
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(Constants.TILE_SIZE, Constants.TILE_SIZE)
	col.shape = rect
	col.position = pos + Vector2(Constants.TILE_SIZE * 0.5, Constants.TILE_SIZE * 0.5)
	body.add_child(col)

func _build_world_bounds() -> void:
	var total_w = level_width * Constants.TILE_SIZE
	var total_h = level_height * Constants.TILE_SIZE

	# Left Wall
	_add_wall_segment(Vector2(-15, total_h * 0.5), Vector2(30, total_h * 2))
	# Right Wall
	_add_wall_segment(Vector2(total_w + 15, total_h * 0.5), Vector2(30, total_h * 2))
	# Ceiling
	_add_wall_segment(Vector2(total_w * 0.5, -15), Vector2(total_w * 2, 30))

func _add_wall_segment(pos: Vector2, size: Vector2) -> void:
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = size
	col.shape = rect
	col.position = pos
	bounds_body.add_child(col)

func _spawn_spike(pos: Vector2, orient: String) -> void:
	var spike = Spike.new()
	spike.orientation = orient
	spike.position = pos
	add_child(spike)

func _spawn_laser(ldata: Dictionary) -> void:
	var laser = LaserBeam.new()
	laser.position = Vector2(ldata["x"] * Constants.TILE_SIZE + Constants.TILE_SIZE * 0.5, ldata["y"] * Constants.TILE_SIZE)
	laser.length_tiles = ldata["length"]
	laser.orientation = ldata.get("orientation", "vertical")
	laser.is_pulsing = ldata.get("pulse", false)
	laser.pulse_speed = ldata.get("pulse_speed", 3.5)
	laser.phase = ldata.get("start_phase", 0.0)
	add_child(laser)

func _spawn_checkpoint(pos: Vector2) -> void:
	var cp = Checkpoint.new()
	cp.position = pos
	add_child(cp)

func _spawn_portal(pos: Vector2) -> void:
	var portal = ExitPortal.new()
	portal.position = pos
	portal.portal_entered.connect(_on_portal_entered)
	add_child(portal)

func _on_portal_entered() -> void:
	AudioManager.play_win()
	portal_reached.emit()

func _on_form_changed(new_form: Constants.Form) -> void:
	player_form = new_form
	queue_redraw()

func _draw() -> void:
	var ts = Constants.TILE_SIZE
	var is_white_form = (player_form == Constants.Form.WHITE)

	# 1. Draw White Platforms
	for tile_coord in white_tiles.keys():
		var rect = Rect2(tile_coord.x * ts, tile_coord.y * ts, ts, ts)
		if is_white_form:
			# Solid White block with crisp Black inner border
			draw_rect(rect, Constants.COLOR_WHITE, true)
			draw_rect(rect, Constants.COLOR_BLACK, false, 1.0)
		else:
			# Ghost White state: Strict 1-bit geometric checkerboard pattern
			_draw_dither_tile(rect, Constants.COLOR_WHITE)

	# 2. Draw Red Platforms
	for tile_coord in red_tiles.keys():
		var rect = Rect2(tile_coord.x * ts, tile_coord.y * ts, ts, ts)
		if not is_white_form:
			# Solid Red block with crisp Black inner border
			draw_rect(rect, Constants.COLOR_RED, true)
			draw_rect(rect, Constants.COLOR_BLACK, false, 1.0)
		else:
			# Ghost Red state: Strict 1-bit geometric checkerboard pattern
			_draw_dither_tile(rect, Constants.COLOR_RED)

# Strict 1-bit dither: alternating pure color pixels, zero transparency
func _draw_dither_tile(r: Rect2, col: Color) -> void:
	# Crisp outline
	draw_rect(r, col, false, 1.0)
	# Geometric 1-bit stipple lines
	var step = 4.0
	for y in range(int(r.position.y + 2), int(r.position.y + r.size.y - 2), int(step)):
		for x in range(int(r.position.x + 2), int(r.position.x + r.size.x - 2), int(step)):
			if (int(x / step) + int(y / step)) % 2 == 0:
				draw_rect(Rect2(x, y, 2, 2), col, true)
