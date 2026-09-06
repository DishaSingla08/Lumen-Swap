# Autoload GameManager: Global game state, input bindings, speedrun timer, and stats
extends Node

signal state_changed(new_state)
signal level_changed(level_idx)
signal form_changed(new_form)
signal lumen_changed(current_lumen, max_lumen)
signal stats_updated(deaths, elapsed_seconds)

enum State {
	MENU,
	PLAYING,
	PAUSED,
	LEVEL_COMPLETE,
	VICTORY
}

var current_state: State = State.MENU
var current_level_index: int = 0
var deaths: int = 0
var total_deaths: int = 0
var elapsed_time: float = 0.0
var is_timer_active: bool = false

# Checkpoint system
var active_checkpoint_pos: Vector2 = Vector2.ZERO
var has_checkpoint: bool = false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_inputs()

func _process(delta: float) -> void:
	if is_timer_active and current_state == State.PLAYING:
		elapsed_time += delta
		stats_updated.emit(deaths, elapsed_time)

func _setup_inputs() -> void:
	_bind_action_key("move_left", [KEY_A, KEY_LEFT])
	_bind_action_key("move_right", [KEY_D, KEY_RIGHT])
	_bind_action_key("jump", [KEY_SPACE, KEY_W, KEY_UP])
	_bind_action_key("swap", [KEY_SHIFT, KEY_J, KEY_X, KEY_C, KEY_ENTER])
	_bind_action_key("restart", [KEY_R])
	_bind_action_key("pause", [KEY_ESCAPE, KEY_P])

func _bind_action_key(action_name: String, keys: Array) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	for k in keys:
		var ev1 = InputEventKey.new()
		ev1.physical_keycode = k
		InputMap.action_add_event(action_name, ev1)
		
		var ev2 = InputEventKey.new()
		ev2.keycode = k
		InputMap.action_add_event(action_name, ev2)

func start_game(level_idx: int = 0) -> void:
	current_level_index = level_idx
	deaths = 0
	total_deaths = 0
	elapsed_time = 0.0
	is_timer_active = true
	has_checkpoint = false
	set_state(State.PLAYING)
	level_changed.emit(current_level_index)

func set_state(new_state: State) -> void:
	current_state = new_state
	state_changed.emit(new_state)

func record_death() -> void:
	deaths += 1
	total_deaths += 1
	stats_updated.emit(deaths, elapsed_time)

func set_checkpoint(pos: Vector2) -> void:
	active_checkpoint_pos = pos
	has_checkpoint = true

func format_time(seconds: float) -> String:
	var total_tenths = int(seconds * 10.0)
	var tenths = total_tenths % 10
	var total_sec = int(seconds)
	var sec = total_sec % 60
	var mins = total_sec / 60
	return "%02d:%02d.%01d" % [mins, sec, tenths]
