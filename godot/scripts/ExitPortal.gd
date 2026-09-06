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
	var float_y = sin(anim_time * 4.0) * 4.0
	var center = Vector2(0, float_y)
	
	# Dual-Color Lumen Key (Panel 3): Left half White, Right half Red
	# 1. Key Bow / Head (Top Ring)
	var bow_y = center.y - 12
	# Left Half of Ring (White)
	draw_arc(Vector2(center.x, bow_y), 7.0, PI * 0.5, PI * 1.5, 16, Constants.COLOR_WHITE, 2.5)
	# Right Half of Ring (Red)
	draw_arc(Vector2(center.x, bow_y), 7.0, -PI * 0.5, PI * 0.5, 16, Constants.COLOR_RED, 2.5)
	# Inner center contrast dot
	draw_rect(Rect2(center.x - 2, bow_y - 2, 4, 4), Constants.COLOR_BLACK, true)
	
	# 2. Key Stem / Shaft
	var stem_top = bow_y + 7.0
	var stem_bot = center.y + 12.0
	# Left half of stem (White)
	draw_line(Vector2(center.x - 1, stem_top), Vector2(center.x - 1, stem_bot), Constants.COLOR_WHITE, 2.0)
	# Right half of stem (Red)
	draw_line(Vector2(center.x + 1, stem_top), Vector2(center.x + 1, stem_bot), Constants.COLOR_RED, 2.0)
	
	# 3. Key Bit / Teeth (Pointing right in Red, and subtle left notch in White)
	draw_rect(Rect2(center.x + 2, center.y + 2, 6, 3), Constants.COLOR_RED, true)
	draw_rect(Rect2(center.x + 2, center.y + 8, 4, 3), Constants.COLOR_RED, true)
	draw_rect(Rect2(center.x - 5, center.y + 5, 4, 3), Constants.COLOR_WHITE, true)
	
	# Rotating sparkle glint (pure White)
	var sparkle_angle = anim_time * 3.0
	var sp_offset = Vector2(cos(sparkle_angle), sin(sparkle_angle)) * 12.0
	draw_rect(Rect2(center.x + sp_offset.x - 1, center.y + sp_offset.y - 1, 2, 2), Constants.COLOR_WHITE, true)
