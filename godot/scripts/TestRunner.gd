extends Node2D

const LevelData = preload("res://scripts/LevelData.gd")
const Level = preload("res://scripts/Level.gd")
const Player = preload("res://scripts/Player.gd")
const Constants = preload("res://scripts/Constants.gd")

func _ready() -> void:
	print("[TEST] ===================================================")
	print("[TEST] Starting Lumen Swap Automated Project Verification")
	print("[TEST] ===================================================")

	# 1. Verify 8 levels
	assert(LevelData.LEVELS.size() == 8, "Expected 8 handcrafted levels")
	print("[TEST] Total Levels: ", LevelData.LEVELS.size())

	for i in range(LevelData.LEVELS.size()):
		var def = LevelData.LEVELS[i]
		var lvl = Level.new()
		add_child(lvl)
		lvl.load_level(def)
		print("[TEST] Sector Loaded: ", def["name"], " (Width: ", lvl.level_width, ", Height: ", lvl.level_height, ")")
		assert(lvl.white_tiles.size() > 0 or lvl.red_tiles.size() > 0, "Platforms must exist")
		lvl.queue_free()

	# 2. Verify Player Instance & Mechanics
	var p_scene = preload("res://scenes/Player.tscn")
	var player: Player = p_scene.instantiate()
	add_child(player)
	player.initialize_spawn(Vector2(90, 390))

	# Form checks
	assert(player.current_form == Constants.Form.WHITE, "Default form should be WHITE")
	assert(player.collision_mask == (Constants.LAYER_BOUNDS | Constants.LAYER_WHITE_PLATFORM), "White collision mask check")
	print("[TEST] White Form Mask verified: ", player.collision_mask)

	player.swap_form()
	assert(player.current_form == Constants.Form.RED, "Swapped to RED form")
	assert(player.collision_mask == (Constants.LAYER_BOUNDS | Constants.LAYER_RED_PLATFORM), "Red collision mask check")
	print("[TEST] Red Form Mask verified: ", player.collision_mask)

	# Hazard absorption test
	player.lumen = 40.0
	player.absorb_hazard()
	assert(player.lumen == 40.0 + Constants.LUMEN_RECHARGE_RATE, "Lumen absorbed successfully")
	print("[TEST] Hazard Absorption verified: Lumen is now ", player.lumen)

	player.queue_free()

	print("[TEST] ===================================================")
	print("[TEST] ALL TESTS PASSED! STRICT 3-COLOR SYSTEM OPERATIONAL")
	print("[TEST] ===================================================")
	get_tree().quit(0)
