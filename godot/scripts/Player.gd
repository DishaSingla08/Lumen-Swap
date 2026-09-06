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
		facing_dir = signf(move_dir)
		walk_anim_timer += delta * 12.0
	else:
		velocity.x = move_toward(velocity.x, 0.0, Constants.MOVE_DECEL * delta)
		walk_anim_timer = 0.0

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

var facing_dir: float = 1.0
var walk_anim_timer: float = 0.0

# Death shatter particles
class DeathParticle:
	var pos: Vector2
	var vel: Vector2
	var col: Color
	var life: float = 0.5

var death_particles: Array[DeathParticle] = []

func die() -> void:
	if is_dead:
		return
	is_dead = true
	AudioManager.play_death()
	GameManager.record_death()
	died.emit()
	
	# Spawn shatter particles matching infographic
	death_particles.clear()
	var col = Constants.COLOR_WHITE if current_form == Constants.Form.WHITE else Constants.COLOR_RED
	for i in range(16):
		var p = DeathParticle.new()
		p.pos = Vector2(randf_range(-8, 8), randf_range(-10, 10))
		var angle = randf() * TAU
		var spd = randf_range(80, 240)
		p.vel = Vector2(cos(angle), sin(angle)) * spd
		p.col = Constants.COLOR_RED if (i % 3 != 0) else Constants.COLOR_WHITE
		death_particles.append(p)
	
	# Delay then respawn
	await get_tree().create_timer(0.55).timeout
	var target_pos = GameManager.active_checkpoint_pos if GameManager.has_checkpoint else spawn_position
	reset_to_spawn(target_pos)

func _process(delta: float) -> void:
	if is_dead:
		for p in death_particles:
			p.pos += p.vel * delta
			p.life -= delta
		queue_redraw()

func _draw() -> void:
	# 1. Draw death explosion particles if dead
	if is_dead:
		for p in death_particles:
			if p.life > 0.0:
				draw_rect(Rect2(p.pos, Vector2(3, 3)), p.col, true)
		return


	var is_white = (current_form == Constants.Form.WHITE)
	var body_color = Constants.COLOR_WHITE if is_white else Constants.COLOR_RED

	# 2. Overcharge Energy Aura (from Panel 2) when hazard is absorbed
	if absorb_glow_timer > 0.0:
		var aura_pulse = sin(absorb_glow_timer * 25.0) * 2.0
		var aura_pts = PackedVector2Array([
			Vector2(-9 - aura_pulse, -16),
			Vector2(0, -19 - aura_pulse),
			Vector2(9 + aura_pulse, -16),
			Vector2(11 + aura_pulse, 0),
			Vector2(7 + aura_pulse, 12 + aura_pulse),
			Vector2(-7 - aura_pulse, 12 + aura_pulse),
			Vector2(-11 - aura_pulse, 0),
		])
		aura_pts.append(aura_pts[0])
		draw_polyline(aura_pts, Constants.COLOR_RED, 2.0, true)
		draw_polyline(aura_pts, Constants.COLOR_WHITE, 1.0, true)

	# 3. Draw Pixel Humanoid Hero (Head, Eye, Torso, Arms, Legs)
	var hx = 0.0
	var hy = -8.0 # head center

	# Head (10x9 rounded block)
	draw_rect(Rect2(hx - 5, hy - 5, 10, 9), body_color, true)
	# Contrast outline on head
	draw_rect(Rect2(hx - 5, hy - 5, 10, 9), Constants.COLOR_BLACK, false, 1.0)

	# Expressive eye dot facing movement direction
	var eye_x = hx + (2.0 * facing_dir)
	var eye_y = hy - 1.0
	draw_rect(Rect2(eye_x - 1, eye_y - 1, 2, 3), Constants.COLOR_BLACK, true)

	# Torso (8x7 pixel chest)
	var tx = 0.0
	var ty = 0.0
	draw_rect(Rect2(tx - 4, ty - 2, 8, 7), body_color, true)
	draw_rect(Rect2(tx - 4, ty - 2, 8, 7), Constants.COLOR_BLACK, false, 1.0)

	# Arms (animated swing when walking/jumping)
	var arm_swing = sin(walk_anim_timer) * 3.0 if is_on_floor() else -2.0
	# Front arm
	draw_rect(Rect2(tx + (3.0 * facing_dir) - 1, ty - 1 + arm_swing, 3, 5), body_color, true)
	# Back arm
	draw_rect(Rect2(tx - (3.0 * facing_dir) - 1, ty - 1 - arm_swing, 3, 5), body_color, true)

	# Legs (stride animation or airborne jump pose)
	var leg_y = ty + 5
	if not is_on_floor():
		# Jump pose: legs bent outward
		draw_rect(Rect2(-4, leg_y, 3, 4), body_color, true)
		draw_rect(Rect2(1, leg_y - 1, 3, 5), body_color, true)
	else:
		var leg_offset = sin(walk_anim_timer) * 3.0
		# Left leg
		draw_rect(Rect2(-4, leg_y, 3, 5 + leg_offset), body_color, true)
		# Right leg
		draw_rect(Rect2(1, leg_y, 3, 5 - leg_offset), body_color, true)
