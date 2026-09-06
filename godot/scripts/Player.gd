# Player entity: CharacterBody2D with dynamic collision mask, form swapping,
# Lumen energy absorption, variable jump height, coyote time, and strict 3-color rendering
class_name Player
extends CharacterBody2D

const Constants = preload("res://scripts/Constants.gd")
const Checkpoint = preload("res://scripts/Checkpoint.gd")
const ExitPortal = preload("res://scripts/ExitPortal.gd")

signal died
signal form_swapped(new_form)
signal lumen_updated(current_lumen, max_lumen)

const SIZE = Vector2(22, 22)

var current_form: Constants.Form = Constants.Form.WHITE
var swap_cooldown_timer: float = 0.0
var coyote_timer: float = 0.0
var jump_buffer_timer: float = 0.0

var lumen: float = Constants.MAX_LUMEN
var is_dead: bool = false
var was_on_floor: bool = false
var spawn_position: Vector2 = Vector2.ZERO

# Squash & stretch scale
var visual_scale: Vector2 = Vector2.ONE

# Overcharge indicator frames
var absorb_glow_timer: float = 0.0
var invulnerable_timer: float = 0.0

# 1-bit Trail system
class TrailPoint:
	var pos: Vector2
	var form: Constants.Form
	var lifetime: float = 0.15

var trails: Array[TrailPoint] = []

@onready var hazard_detector: Area2D = $HazardDetector
@onready var interactive_detector: Area2D = $InteractiveDetector

func _ready() -> void:
	# Layer 1 Bounds + Layer 2 White Platform by default
	collision_layer = 1
	_apply_form_collision_mask()
	_setup_collision_shapes()
	
	hazard_detector.area_entered.connect(_on_hazard_entered)
	interactive_detector.area_entered.connect(_on_interactive_entered)

func _setup_collision_shapes() -> void:
	# Physical body collision
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = SIZE
	col.shape = rect
	add_child(col)

func initialize_spawn(pos: Vector2) -> void:
	spawn_position = pos
	reset_to_spawn(pos)

func reset_to_spawn(pos: Vector2 = spawn_position) -> void:
	global_position = pos
	velocity = Vector2.ZERO
	current_form = Constants.Form.WHITE
	_apply_form_collision_mask()
	swap_cooldown_timer = 0.0
	coyote_timer = 0.0
	jump_buffer_timer = 0.0
	lumen = Constants.MAX_LUMEN
	is_dead = false
	invulnerable_timer = 0.0
	absorb_glow_timer = 0.0
	visual_scale = Vector2.ONE
	trails.clear()
	GameManager.form_changed.emit(current_form)
	GameManager.lumen_changed.emit(lumen, Constants.MAX_LUMEN)
	queue_redraw()

func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Timers
	if swap_cooldown_timer > 0.0:
		swap_cooldown_timer -= delta
	if invulnerable_timer > 0.0:
		invulnerable_timer -= delta
	if absorb_glow_timer > 0.0:
		absorb_glow_timer -= delta

	# Red form subtle fuel drain
	if current_form == Constants.Form.RED:
		lumen = maxf(0.0, lumen - Constants.LUMEN_DECAY_RATE * delta)
		GameManager.lumen_changed.emit(lumen, Constants.MAX_LUMEN)
		if lumen <= 0.0:
			# Auto-swap back to White when out of lumen energy
			swap_form()

	# 1. Color Swap
	if Input.is_action_just_pressed("swap"):
		swap_form()

	# 2. Horizontal Input
	var move_dir = Input.get_axis("move_left", "move_right")
	if move_dir != 0:
		velocity.x = move_toward(velocity.x, move_dir * Constants.MAX_RUN_SPEED, Constants.MOVE_ACCEL * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, Constants.MOVE_DECEL * delta)

	# 3. Grounded & Coyote Time
	if is_on_floor():
		coyote_timer = Constants.COYOTE_TIME
		if not was_on_floor:
			# Land impact squash
			visual_scale = Vector2(1.3, 0.7)
			AudioManager.play_land()
	else:
		coyote_timer = maxf(0.0, coyote_timer - delta)

	was_on_floor = is_on_floor()

	# 4. Jump Buffering
	if Input.is_action_just_pressed("jump"):
		jump_buffer_timer = Constants.JUMP_BUFFER
	else:
		jump_buffer_timer = maxf(0.0, jump_buffer_timer - delta)

	# 5. Jump Execution
	if jump_buffer_timer > 0.0 and coyote_timer > 0.0:
		velocity.y = Constants.JUMP_IMPULSE
		jump_buffer_timer = 0.0
		coyote_timer = 0.0
		visual_scale = Vector2(0.7, 1.35)
		AudioManager.play_jump()

	# Variable jump height: cutting jump early
	if Input.is_action_just_released("jump") and velocity.y < 0.0:
		velocity.y *= Constants.VARIABLE_JUMP_FALL_MULTIPLIER

	# 6. Gravity
	velocity.y = move_toward(velocity.y, Constants.MAX_FALL_SPEED, Constants.GRAVITY * delta)

	# Move and slide
	move_and_slide()

	# 7. Fall out of bounds check
	if global_position.y > (Constants.VIEWPORT_HEIGHT + 100):
		die()

	# 8. Squash & stretch recovery
	visual_scale = visual_scale.lerp(Vector2.ONE, 12.0 * delta)

	# 9. Trail updates (strict 1-bit afterimages)
	if absf(velocity.x) > 150.0 or absf(velocity.y) > 200.0 or absorb_glow_timer > 0.0:
		if trails.is_empty() or trails[0].pos.distance_to(global_position) > 12.0:
			var pt = TrailPoint.new()
			pt.pos = global_position
			pt.form = current_form
			trails.insert(0, pt)
			if trails.size() > 4:
				trails.pop_back()

	for i in range(trails.size() - 1, -1, -1):
		trails[i].lifetime -= delta
		if trails[i].lifetime <= 0:
			trails.remove_at(i)

	queue_redraw()

func swap_form() -> void:
	if swap_cooldown_timer > 0.0 or is_dead:
		return

	if current_form == Constants.Form.WHITE:
		# Need at least minimal lumen to shift to Red
		if lumen <= 2.0:
			return
		current_form = Constants.Form.RED
	else:
		current_form = Constants.Form.WHITE

	swap_cooldown_timer = Constants.SWAP_COOLDOWN
	_apply_form_collision_mask()

	# Squash on swap
	visual_scale = Vector2(1.3, 0.7)
	AudioManager.play_swap(current_form == Constants.Form.RED)
	GameManager.form_changed.emit(current_form)
	queue_redraw()

func _apply_form_collision_mask() -> void:
	if current_form == Constants.Form.WHITE:
		# Collide with Layer 1 (Bounds) and Layer 2 (White Platforms)
		collision_mask = Constants.LAYER_BOUNDS | Constants.LAYER_WHITE_PLATFORM
	else:
		# Collide with Layer 1 (Bounds) and Layer 3 (Red Platforms)
		collision_mask = Constants.LAYER_BOUNDS | Constants.LAYER_RED_PLATFORM

func _on_hazard_entered(area: Area2D) -> void:
	if is_dead:
		return

	if current_form == Constants.Form.WHITE:
		die()
	else:
		# Red form absorbs red hazards!
		var now = Time.get_ticks_msec() / 1000.0
		if area.has_method("get") and "last_absorb_time" in area:
			if now - area.last_absorb_time < 0.25:
				return
			area.last_absorb_time = now

		absorb_hazard()

func absorb_hazard() -> void:
	lumen = minf(Constants.MAX_LUMEN, lumen + Constants.LUMEN_RECHARGE_RATE)
	absorb_glow_timer = 0.35
	invulnerable_timer = 0.25
	AudioManager.play_absorb()
	GameManager.lumen_changed.emit(lumen, Constants.MAX_LUMEN)
	queue_redraw()

func _on_interactive_entered(area: Area2D) -> void:
	if is_dead:
		return
	if area is Checkpoint:
		area.trigger()
		GameManager.set_checkpoint(area.global_position + Vector2(0, -10))
	elif area is ExitPortal:
		area.trigger()

func die() -> void:
	if is_dead:
		return
	is_dead = true
	AudioManager.play_death()
	GameManager.record_death()
	died.emit()
	
	# Small delay then respawn at checkpoint or spawn
	await get_tree().create_timer(0.45).timeout
	var target_pos = GameManager.active_checkpoint_pos if GameManager.has_checkpoint else spawn_position
	reset_to_spawn(target_pos)

func _draw() -> void:
	if is_dead:
		return

	# Draw 1-bit wireframe trails (pure 3-color lines)
	for t in trails:
		var rel_pos = to_local(t.pos)
		var trail_col = Constants.COLOR_WHITE if t.form == Constants.Form.WHITE else Constants.COLOR_RED
		var r = Rect2(rel_pos - SIZE * 0.5, SIZE)
		draw_rect(r, trail_col, false, 1.0)

	var half = SIZE * 0.5 * visual_scale
	var body_rect = Rect2(-half, SIZE * visual_scale)
	var is_white = (current_form == Constants.Form.WHITE)
	var body_color = Constants.COLOR_WHITE if is_white else Constants.COLOR_RED

	# Overcharge halo outline if hazard absorbed (alternating crisp lines)
	if absorb_glow_timer > 0.0:
		var halo_rect = Rect2(-half - Vector2(4, 4), (SIZE + Vector2(8, 8)) * visual_scale)
		draw_rect(halo_rect, Constants.COLOR_RED, false, 2.0)
		var inner_halo = Rect2(-half - Vector2(2, 2), (SIZE + Vector2(4, 4)) * visual_scale)
		draw_rect(inner_halo, Constants.COLOR_WHITE, false, 1.0)

	# Outer solid crisp body
	draw_rect(body_rect, body_color, true)

	# Crisp Black border/outline
	draw_rect(body_rect, Constants.COLOR_BLACK, false, 2.0)

	# Inner contrasting geometric core
	# White Form: Black core with White center pupil
	# Red Form: White core with Black center pupil
	var core_size = Vector2(6, 6) * visual_scale
	var core_color = Constants.COLOR_BLACK if is_white else Constants.COLOR_WHITE
	draw_rect(Rect2(-core_size * 0.5, core_size), core_color, true)

	var pupil_size = Vector2(2, 2) * visual_scale
	var pupil_color = Constants.COLOR_WHITE if is_white else Constants.COLOR_BLACK
	draw_rect(Rect2(-pupil_size * 0.5, pupil_size), pupil_color, true)
