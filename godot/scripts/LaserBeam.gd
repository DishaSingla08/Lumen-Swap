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

var anim_time: float = 0.0

func _process(delta: float) -> void:
	anim_time += delta
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
	
	# Emitter mounts (Solid White with Black contrast edge)
	if is_vert:
		draw_rect(Rect2(-8, -4, 16, 4), Constants.COLOR_WHITE)
		draw_rect(Rect2(-8, -4, 16, 4), Constants.COLOR_BLACK, false, 1.0)
		draw_rect(Rect2(-8, total_len, 16, 4), Constants.COLOR_WHITE)
		draw_rect(Rect2(-8, total_len, 16, 4), Constants.COLOR_BLACK, false, 1.0)
	else:
		draw_rect(Rect2(-4, -8, 4, 16), Constants.COLOR_WHITE)
		draw_rect(Rect2(-4, -8, 4, 16), Constants.COLOR_BLACK, false, 1.0)
		draw_rect(Rect2(total_len, -8, 4, 16), Constants.COLOR_WHITE)
		draw_rect(Rect2(total_len, -8, 4, 16), Constants.COLOR_BLACK, false, 1.0)
	
	if is_active:
		# Procedural crackling zigzag lightning bolt (matching Panels 2 & 3)
		var seg_len = 16.0
		var num_segs = int(total_len / seg_len)
		var pts = PackedVector2Array()
		pts.append(Vector2.ZERO)
		
		for i in range(1, num_segs):
			var dist = i * seg_len
			# Crackle offset based on segment index and time
			var crackle = sin(anim_time * 30.0 + i * 2.5) * 7.0
			if is_vert:
				pts.append(Vector2(crackle, dist))
			else:
				pts.append(Vector2(dist, crackle))
		
		var end_pt = Vector2(0, total_len) if is_vert else Vector2(total_len, 0)
		pts.append(end_pt)
		
		# Outer Red Lightning Arc (thickness 5)
		draw_polyline(pts, Constants.COLOR_RED, 5.0, true)
		# Inner Intense White Core Arc (thickness 2)
		draw_polyline(pts, Constants.COLOR_WHITE, 2.0, true)
		
		# Occasional crackle branch fork
		if num_segs > 3:
			var mid_idx = num_segs / 2
			var branch_start = pts[mid_idx]
			var branch_end = branch_start + (Vector2(10.0, 8.0) if is_vert else Vector2(8.0, 10.0))
			draw_line(branch_start, branch_end, Constants.COLOR_RED, 2.0)
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
