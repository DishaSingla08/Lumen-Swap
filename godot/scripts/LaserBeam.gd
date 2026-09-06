# LaserBeam hazard on Layer 4 (Hazards)
# Lethal to White Form, absorbs into fuel in Red Form
class_name LaserBeam
extends Area2D

const Constants = preload("res://scripts/Constants.gd")

@export var length_tiles: int = 6
@export var orientation: String = "vertical" # "vertical" or "horizontal"
@export var is_pulsing: bool = false
@export var pulse_speed: float = 3.5
@export var phase: float = 0.0

var beam_thickness: float = 6.0
var is_active: bool = true
var last_absorb_time: float = 0.0

var col_shape: CollisionShape2D

func _ready() -> void:
	collision_layer = Constants.LAYER_HAZARD
	collision_mask = 0
	
	col_shape = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	var total_len = length_tiles * Constants.TILE_SIZE
	
	if orientation == "vertical":
		rect.size = Vector2(beam_thickness, total_len)
		col_shape.position = Vector2(0, total_len * 0.5)
	else:
		rect.size = Vector2(total_len, beam_thickness)
		col_shape.position = Vector2(total_len * 0.5, 0)
		
	col_shape.shape = rect
	add_child(col_shape)

func _process(delta: float) -> void:
	if is_pulsing:
		phase += pulse_speed * delta
		var active_now = sin(phase) > -0.2
		if active_now != is_active:
			is_active = active_now
			col_shape.set_deferred("disabled", !is_active)
	queue_redraw()

func _draw() -> void:
	var total_len = length_tiles * Constants.TILE_SIZE
	var is_vert = (orientation == "vertical")
	
	# Emitter mounts (Solid White)
	if is_vert:
		draw_rect(Rect2(-8, -4, 16, 4), Constants.COLOR_WHITE)
		draw_rect(Rect2(-8, total_len, 16, 4), Constants.COLOR_WHITE)
	else:
		draw_rect(Rect2(-4, -8, 4, 16), Constants.COLOR_WHITE)
		draw_rect(Rect2(total_len, -8, 4, 16), Constants.COLOR_WHITE)
	
	if is_active:
		var start_p = Vector2.ZERO
		var end_p = Vector2(0, total_len) if is_vert else Vector2(total_len, 0)
		
		# Outer Red Beam (thickness 6)
		draw_line(start_p, end_p, Constants.COLOR_RED, beam_thickness)
		# Inner Intense White Core (thickness 2)
		draw_line(start_p, end_p, Constants.COLOR_WHITE, 2.0)
	else:
		# Inactive warning state: 1-bit dashed Red line
		var segment_len = 8.0
		var num_segs = int(total_len / segment_len)
		for i in range(0, num_segs, 2):
			var s = i * segment_len
			var e = minf((i + 1) * segment_len, total_len)
			if is_vert:
				draw_line(Vector2(0, s), Vector2(0, e), Constants.COLOR_RED, 1.0)
			else:
				draw_line(Vector2(s, 0), Vector2(e, 0), Constants.COLOR_RED, 1.0)
