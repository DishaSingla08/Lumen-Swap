# ExitPortal interactive goal on Layer 5 (Interactive)
class_name ExitPortal
extends Area2D

const Constants = preload("res://scripts/Constants.gd")

signal portal_entered

var anim_time: float = 0.0

func _ready() -> void:
	collision_layer = Constants.LAYER_INTERACTIVE
	collision_mask = 0
	
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(32, 32)
	col.shape = rect
	add_child(col)

func _process(delta: float) -> void:
	anim_time += delta
	queue_redraw()

func trigger() -> void:
	portal_entered.emit()

func _draw() -> void:
	var r1 = anim_time * 2.0
	var r2 = -anim_time * 2.8
	
	# Outer rotating square (White)
	_draw_rotated_square(Vector2.ZERO, 30.0, r1, Constants.COLOR_WHITE, false)
	
	# Inner rotating diamond (Red)
	_draw_rotated_square(Vector2.ZERO, 20.0, r2, Constants.COLOR_RED, false)
	
	# Central Core (Solid White)
	draw_rect(Rect2(-4, -4, 8, 8), Constants.COLOR_WHITE)
	# Center pinpoint (Black)
	draw_rect(Rect2(-1, -1, 2, 2), Constants.COLOR_BLACK)

func _draw_rotated_square(pos: Vector2, s: float, angle: float, col: Color, filled: bool) -> void:
	var half = s * 0.5
	var corners = [
		Vector2(-half, -half).rotated(angle) + pos,
		Vector2(half, -half).rotated(angle) + pos,
		Vector2(half, half).rotated(angle) + pos,
		Vector2(-half, half).rotated(angle) + pos,
	]
	var pts = PackedVector2Array(corners)
	if filled:
		draw_colored_polygon(pts, col)
	else:
		pts.append(corners[0])
		draw_polyline(pts, col, 2.0, true)
