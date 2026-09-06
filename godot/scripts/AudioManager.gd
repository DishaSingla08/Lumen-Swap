# Autoload AudioManager: Zero-dependency procedural sound synthesis in pure GDScript
extends Node

var players: Array[AudioStreamPlayer] = []
const POOL_SIZE = 8
var player_idx = 0

var sound_cache = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in range(POOL_SIZE):
		var p = AudioStreamPlayer.new()
		add_child(p)
		players.append(p)
	
	_pregenerate_sounds()

func _play_stream(stream: AudioStream, volume_db: float = 0.0) -> void:
	if stream == null:
		return
	var p = players[player_idx]
	player_idx = (player_idx + 1) % POOL_SIZE
	p.stream = stream
	p.volume_db = volume_db
	p.play()

func play_jump() -> void:
	_play_stream(sound_cache.get("jump"), -4.0)

func play_land() -> void:
	_play_stream(sound_cache.get("land"), -6.0)

func play_swap(to_red: bool) -> void:
	if to_red:
		_play_stream(sound_cache.get("swap_red"), -3.0)
	else:
		_play_stream(sound_cache.get("swap_white"), -3.0)

func play_absorb() -> void:
	_play_stream(sound_cache.get("absorb"), -2.0)

func play_death() -> void:
	_play_stream(sound_cache.get("death"), 0.0)

func play_checkpoint() -> void:
	_play_stream(sound_cache.get("checkpoint"), -3.0)

func play_win() -> void:
	_play_stream(sound_cache.get("win"), 0.0)

# Generate 16-bit Mono AudioStreamWAV samples procedurally
func _pregenerate_sounds() -> void:
	sound_cache["jump"] = _gen_frequency_sweep(280.0, 620.0, 0.12, 0.9, "square")
	sound_cache["land"] = _gen_frequency_sweep(140.0, 60.0, 0.08, 0.8, "sine")
	sound_cache["swap_red"] = _gen_frequency_sweep(340.0, 880.0, 0.09, 0.9, "saw")
	sound_cache["swap_white"] = _gen_frequency_sweep(880.0, 440.0, 0.09, 0.9, "sine")
	sound_cache["absorb"] = _gen_frequency_sweep(400.0, 1100.0, 0.18, 0.9, "sine", true)
	sound_cache["death"] = _gen_noise_burst(0.35)
	sound_cache["checkpoint"] = _gen_arpeggio([440.0, 554.37, 659.25], 0.08)
	sound_cache["win"] = _gen_arpeggio([440.0, 554.37, 659.25, 880.0], 0.14)

func _create_wav(pcm_data: PackedByteArray, sample_rate: int = 22050) -> AudioStreamWAV:
	var wav = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = sample_rate
	wav.stereo = false
	wav.data = pcm_data
	return wav

func _gen_frequency_sweep(start_freq: float, end_freq: float, duration: float, volume: float, wave_type: String, harmonic: bool = false) -> AudioStreamWAV:
	var sample_rate = 22050
	var num_samples = int(sample_rate * duration)
	var bytes = PackedByteArray()
	bytes.resize(num_samples * 2)

	var phase = 0.0
	for i in range(num_samples):
		var t = float(i) / float(num_samples)
		var freq = lerpf(start_freq, end_freq, t)
		var delta_phase = (freq * TAU) / float(sample_rate)
		phase = fmod(phase + delta_phase, TAU)

		var s = 0.0
		if wave_type == "sine":
			s = sin(phase)
			if harmonic:
				s = s * 0.7 + sin(phase * 2.0) * 0.3
		elif wave_type == "square":
			s = 1.0 if sin(phase) >= 0.0 else -1.0
		elif wave_type == "saw":
			s = (fmod(phase, TAU) / PI) - 1.0

		var env = 1.0 - t
		var val = int(clampf(s * env * volume, -1.0, 1.0) * 32767.0)
		bytes.encode_s16(i * 2, val)

	return _create_wav(bytes, sample_rate)

func _gen_noise_burst(duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var num_samples = int(sample_rate * duration)
	var bytes = PackedByteArray()
	bytes.resize(num_samples * 2)

	var last = 0.0
	for i in range(num_samples):
		var t = float(i) / float(num_samples)
		var raw = randf_range(-1.0, 1.0)
		# Low-pass filter for punchier shatter impact
		last = lerpf(last, raw, 0.45)
		var env = (1.0 - t) * (1.0 - t)
		var val = int(clampf(last * env * 0.9, -1.0, 1.0) * 32767.0)
		bytes.encode_s16(i * 2, val)

	return _create_wav(bytes, sample_rate)

func _gen_arpeggio(freqs: Array, note_duration: float) -> AudioStreamWAV:
	var sample_rate = 22050
	var samples_per_note = int(sample_rate * note_duration)
	var total_samples = samples_per_note * freqs.size()
	var bytes = PackedByteArray()
	bytes.resize(total_samples * 2)

	var current_sample = 0
	for f in freqs:
		var phase = 0.0
		var freq = float(f)
		var delta_phase = (freq * TAU) / float(sample_rate)
		for n in range(samples_per_note):
			phase = fmod(phase + delta_phase, TAU)
			var t = float(n) / float(samples_per_note)
			var env = 1.0 - (t * 0.7)
			var s = (sin(phase) * 0.8 + sin(phase * 2.0) * 0.2) * env * 0.8
			var val = int(clampf(s, -1.0, 1.0) * 32767.0)
			bytes.encode_s16(current_sample * 2, val)
			current_sample += 1

	return _create_wav(bytes, sample_rate)
