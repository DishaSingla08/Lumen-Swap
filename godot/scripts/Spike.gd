# Spike hazard on Layer 4 (Hazards)
# Lethal to White Form, absorbs into fuel in Red Form
class_name Spike
extends Area2D

const Constants = preload("res://scripts/Constants.gd")

@export var orientation: String = "up" # "up", "down", "left", "right"
var size: Vector2 = Vector2(Constants.TILE_SIZE, Constants.TILE_SIZE)
var last_absorb_time: float = 0.0

func _ready() -> void:
	collision_layer = Constants.LAYER_HAZARD
	collision_mask = 0
	
	# Setup Collision Shape
	var shape = CollisionPolygon2D.new()
	var points = _get_points()
	# Inset points slightly for fair hitboxes
	var center = size * 0.5
	var inset_points = PackedVector2Array()
	for p in points:
		inset_points.append(p.move_toward(center, 2.0))
	shape.polygon = inset_points
	add_child(shape)
	queue_redraw()

func _get_points() -> PackedVector2Array:
	var w = size.x
	var h = size.y
	var pts = PackedVector2Array()
	match orientation:
		"up":
			pts.append(Vector2(0, h))
			pts.append(Vector2(w * 0.5, 0))
			pts.append(Vector2(w, h))
		"down":
			pts.append(Vector2(0, 0))
			pts.append(Vector2(w * 0.5, h))
			pts.append(Vector2(w, 0))
		"left":
			pts.append(Vector2(w, 0))
			pts.append(Vector2(0, h * 0.5))
			pts.append(Vector2(w, h))
		"right":
			pts.append(Vector2(0, 0))
			pts.append(Vector2(w, h * 0.5))
			pts.append(Vector2(0, h))
	return pts

func _draw() -> void:
	var pts = _get_points()
	# Strict 3-color: Solid Red body
	draw_colored_polygon(pts, Constants.COLOR_RED)
	# Crisp White outline tip
	var outline = pts
	outline.append(pts[0])
	draw_polyline(outline, Constants.COLOR_WHITE, 1.5, true)
