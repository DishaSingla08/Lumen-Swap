# Main controller: Manages level flow, player lifecycle, camera tracking,
# HUD stats, menu modals, and strict 3-color UI presentation
class_name Main
extends Node2D

const Constants = preload("res://scripts/Constants.gd")
const LevelData = preload("res://scripts/LevelData.gd")
const Level = preload("res://scripts/Level.gd")
const Player = preload("res://scripts/Player.gd")

@onready var level_container: Node2D = $LevelContainer
@onready var camera: Camera2D = $Camera2D

# HUD Elements
@onready var hud_layer: CanvasLayer = $HUDLayer
@onready var level_name_lbl: Label = $HUDLayer/TopBar/LevelName
@onready var form_badge_lbl: Label = $HUDLayer/TopBar/FormBadge
@onready var lumen_bar: ProgressBar = $HUDLayer/TopBar/LumenContainer/LumenBar
@onready var lumen_val_lbl: Label = $HUDLayer/TopBar/LumenContainer/LumenVal
@onready var deaths_lbl: Label = $HUDLayer/TopBar/Deaths
@onready var timer_lbl: Label = $HUDLayer/TopBar/Timer
@onready var hint_lbl: Label = $HUDLayer/BottomHint

# Overlays
@onready var menu_overlay: Control = $UILayer/MenuOverlay
@onready var sector_overlay: Control = $UILayer/SectorOverlay
@onready var pause_overlay: Control = $UILayer/PauseOverlay
@onready var victory_overlay: Control = $UILayer/VictoryOverlay
@onready var sector_grid: GridContainer = $UILayer/SectorOverlay/Card/GridContainer

var current_level: Level = null
var player: Player = null
var player_scene = preload("res://scenes/Player.tscn")

func _ready() -> void:
	# Connect GameManager Signals
	GameManager.state_changed.connect(_on_state_changed)
	GameManager.level_changed.connect(_load_sector)
	GameManager.form_changed.connect(_update_form_badge)
	GameManager.lumen_changed.connect(_update_lumen_display)
	GameManager.stats_updated.connect(_update_stats_display)

	_build_sector_select_grid()
	_setup_ui_buttons()

	# Start in Menu State
	GameManager.set_state(GameManager.State.MENU)

func _process(delta: float) -> void:
	if GameManager.current_state == GameManager.State.PLAYING:
		# Quick Restart
		if Input.is_action_just_pressed("restart"):
			if player:
				player.reset_to_spawn(GameManager.active_checkpoint_pos if GameManager.has_checkpoint else player.spawn_position)
		
		# Pause Menu
		if Input.is_action_just_pressed("pause"):
			GameManager.set_state(GameManager.State.PAUSED)
			
		# Smooth camera tracking player
		if player and is_instance_valid(player):
			var target_pos = player.global_position
			camera.global_position = camera.global_position.lerp(target_pos, 10.0 * delta)
	elif GameManager.current_state == GameManager.State.PAUSED:
		if Input.is_action_just_pressed("pause"):
			GameManager.set_state(GameManager.State.PLAYING)

func _setup_ui_buttons() -> void:
	# Menu Buttons
	var btn_start = $UILayer/MenuOverlay/Card/VBox/BtnStart
	btn_start.pressed.connect(func(): GameManager.start_game(0))

	var btn_sectors = $UILayer/MenuOverlay/Card/VBox/BtnSectors
	btn_sectors.pressed.connect(func():
		menu_overlay.visible = false
		sector_overlay.visible = true
	)

	var btn_close_sectors = $UILayer/SectorOverlay/Card/BtnCloseSectors
	btn_close_sectors.pressed.connect(func():
		sector_overlay.visible = false
		menu_overlay.visible = true
	)

	# Pause Buttons
	var btn_resume = $UILayer/PauseOverlay/Card/VBox/BtnResume
	btn_resume.pressed.connect(func(): GameManager.set_state(GameManager.State.PLAYING))

	var btn_restart = $UILayer/PauseOverlay/Card/VBox/BtnRestart
	btn_restart.pressed.connect(func():
		GameManager.set_state(GameManager.State.PLAYING)
		if player:
			player.reset_to_spawn(player.spawn_position)
	)

	var btn_quit_menu = $UILayer/PauseOverlay/Card/VBox/BtnQuitMenu
	btn_quit_menu.pressed.connect(func(): GameManager.set_state(GameManager.State.MENU))

	# Victory Buttons
	var btn_replay = $UILayer/VictoryOverlay/Card/VBox/BtnReplay
	btn_replay.pressed.connect(func(): GameManager.start_game(0))

	var btn_victory_menu = $UILayer/VictoryOverlay/Card/VBox/BtnVictoryMenu
	btn_victory_menu.pressed.connect(func(): GameManager.set_state(GameManager.State.MENU))

func _build_sector_select_grid() -> void:
	for child in sector_grid.get_children():
		child.queue_free()

	for i in range(LevelData.LEVELS.size()):
		var def = LevelData.LEVELS[i]
		var btn = Button.new()
		btn.text = def["name"]
		btn.custom_minimum_size = Vector2(180, 45)
		_apply_3color_button_style(btn)
		var lvl_idx = i
		btn.pressed.connect(func():
			sector_overlay.visible = false
			GameManager.start_game(lvl_idx)
		)
		sector_grid.add_child(btn)

func _load_sector(idx: int) -> void:
	if idx >= LevelData.LEVELS.size():
		# Victory! All sectors cleared
		_trigger_victory()
		return

	var def = LevelData.LEVELS[idx]

	# Clean up previous level
	if current_level:
		current_level.queue_free()

	# Create new level
	current_level = Level.new()
	level_container.add_child(current_level)
	current_level.load_level(def)
	current_level.portal_reached.connect(_on_level_portal_reached)

	# Spawn or reset player
	if not player:
		player = player_scene.instantiate()
		add_child(player)

	player.initialize_spawn(current_level.spawn_position)
	camera.global_position = player.global_position

	# Update HUD Labels
	level_name_lbl.text = def["name"]
	hint_lbl.text = def.get("instruction", "")
	_update_form_badge(player.current_form)

func _on_level_portal_reached() -> void:
	var next_idx = GameManager.current_level_index + 1
	if next_idx < LevelData.LEVELS.size():
		GameManager.current_level_index = next_idx
		GameManager.has_checkpoint = false
		_load_sector(next_idx)
	else:
		_trigger_victory()

func _trigger_victory() -> void:
	GameManager.set_state(GameManager.State.VICTORY)
	var final_time_lbl = $UILayer/VictoryOverlay/Card/VBox/FinalTime
	var final_deaths_lbl = $UILayer/VictoryOverlay/Card/VBox/FinalDeaths
	final_time_lbl.text = "FINAL TIME: " + GameManager.format_time(GameManager.elapsed_time)
	final_deaths_lbl.text = "TOTAL DEATHS: %d" % GameManager.total_deaths

func _on_state_changed(new_state: GameManager.State) -> void:
	menu_overlay.visible = (new_state == GameManager.State.MENU)
	sector_overlay.visible = false
	pause_overlay.visible = (new_state == GameManager.State.PAUSED)
	victory_overlay.visible = (new_state == GameManager.State.VICTORY)
	hud_layer.visible = (new_state == GameManager.State.PLAYING or new_state == GameManager.State.PAUSED)

func _update_form_badge(form: Constants.Form) -> void:
	if form == Constants.Form.WHITE:
		form_badge_lbl.text = "WHITE FORM // SOLID: WHITE"
		form_badge_lbl.add_theme_color_override("font_color", Constants.COLOR_BLACK)
		var style = StyleBoxFlat.new()
		style.bg_color = Constants.COLOR_WHITE
		style.border_color = Constants.COLOR_BLACK
		style.set_border_width_all(1)
		form_badge_lbl.add_theme_stylebox_override("normal", style)
	else:
		form_badge_lbl.text = "RED FORM // SOLID: RED"
		form_badge_lbl.add_theme_color_override("font_color", Constants.COLOR_WHITE)
		var style = StyleBoxFlat.new()
		style.bg_color = Constants.COLOR_RED
		style.border_color = Constants.COLOR_WHITE
		style.set_border_width_all(1)
		form_badge_lbl.add_theme_stylebox_override("normal", style)

func _update_lumen_display(cur: float, max_val: float) -> void:
	var pct = int((cur / max_val) * 100.0)
	lumen_bar.value = pct
	lumen_val_lbl.text = "%d%%" % pct

func _update_stats_display(deaths: int, elapsed_seconds: float) -> void:
	deaths_lbl.text = "DEATHS: %d" % deaths
	timer_lbl.text = GameManager.format_time(elapsed_seconds)

func _apply_3color_button_style(btn: Button) -> void:
	btn.add_theme_color_override("font_color", Constants.COLOR_WHITE)
	btn.add_theme_color_override("font_hover_color", Constants.COLOR_RED)
	btn.add_theme_color_override("font_focus_color", Constants.COLOR_RED)
	var style = StyleBoxFlat.new()
	style.bg_color = Constants.COLOR_BLACK
	style.border_color = Constants.COLOR_WHITE
	style.set_border_width_all(2)
	btn.add_theme_stylebox_override("normal", style)
	
	var hover = StyleBoxFlat.new()
	hover.bg_color = Constants.COLOR_BLACK
	hover.border_color = Constants.COLOR_RED
	hover.set_border_width_all(2)
	btn.add_theme_stylebox_override("hover", hover)
	btn.add_theme_stylebox_override("focus", hover)
