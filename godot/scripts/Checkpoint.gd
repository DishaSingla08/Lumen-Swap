# Checkpoint interactive beacon on Layer 5 (Interactive)
class_name Checkpoint
extends Area2D

const Constants = preload("res://scripts/Constants.gd")

signal activated(pos: Vector2)

var is_activated: bool = false
var anim_time: float = 0.0

func _ready() -> void:
	collision_layer = Constants.LAYER_INTERACTIVE
	collision_mask = 0
	
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(24, 32)
	col.shape = rect
	col.position = Vector2(0, -16)
	add_child(col)

func _process(delta: float) -> void:
	anim_time += delta
	queue_redraw()

func trigger() -> void:
	if not is_activated:
		is_activated = true
		AudioManager.play_checkpoint()
		activated.emit(global_position)
		queue_redraw()

func _draw() -> void:
	# Minimalist antenna mast (Pure White)
	draw_rect(Rect2(-2, -26, 4, 26), Constants.COLOR_WHITE)
	
	# Base pedestal
	draw_rect(Rect2(-8, -4, 16, 4), Constants.COLOR_WHITE)
	
	# Floating Rhombus Beacon Node
	var float_y = sin(anim_time * 4.0) * 3.0 if is_activated else 0.0
	var diamond_center = Vector2(0, -32 + float_y)
	
	var pts = PackedVector2Array([
		diamond_center + Vector2(0, -6),
		diamond_center + Vector2(6, 0),
		diamond_center + Vector2(0, 6),
		diamond_center + Vector2(-6, 0),
	])
	
	if is_activated:
		# Solid White node with Black contrast core
		draw_colored_polygon(pts, Constants.COLOR_WHITE)
		draw_rect(Rect2(diamond_center.x - 2, diamond_center.y - 2, 4, 4), Constants.COLOR_BLACK)
	else:
		# Dormant outline wireframe in White
		pts.append(pts[0])
		draw_polyline(pts, Constants.COLOR_WHITE, 1.5, true)
