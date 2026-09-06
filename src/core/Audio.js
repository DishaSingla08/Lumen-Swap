// Procedural Web Audio API sound generator for Lumen Swap (0 external audio assets needed!)
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.musicEnabled = true;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.bgmInterval = null;
    this.bgmStep = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startAmbientPulse();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicEnabled && !this.isMuted ? 0.35 : 0, this.ctx.currentTime);
    }
    return this.musicEnabled;
  }

  // Color Swap sound: dynamic frequency drop / punch
  playSwap(toRed) {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = toRed ? 'sawtooth' : 'triangle';
    if (toRed) {
      // Red shift: punchy, aggressive sub-bass drop
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.14);
    } else {
      // White shift: clean, pristine upward snap
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.11);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.13);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Jump woosh
  playJump() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.14);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Landing impact
  playLand() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Absorb Red Hazard (recharge +1 / power absorption chord)
  playAbsorb() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const freqs = [330, 495, 660];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.9, now + idx * 0.02);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.02 + 0.16);

      gain.gain.setValueAtTime(0.18, now + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.2);

      // Simple lowpass filter for warmth
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.02);
      osc.stop(now + idx * 0.02 + 0.22);
    });
  }

  // Death shatter
  playDeath() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;

    // 1. Harsh square drop
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.linearRampToValueAtTime(0, now + 0.38);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.4);

    // 2. White noise burst for shatter
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.3);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + 0.32);
  }

  // Checkpoint chime
  playCheckpoint() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    [440, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.2, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.27);
    });
  }

  // Level clear triumphant chord
  playLevelClear() {
    if (!this.ctx || this.isMuted) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major chord
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.25, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.5);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.55);
    });
  }

  // Ambient procedural dark synth pulse (strictly minimalist rhythm)
  startAmbientPulse() {
    if (this.bgmInterval) clearInterval(this.bgmInterval);

    // Minimalist 4-bar bass motif [A1, A1, F1, G1]
    const bassline = [55, 55, 73.42, 55, 43.65, 43.65, 49.0, 49.0];

    this.bgmInterval = setInterval(() => {
      if (!this.ctx || this.isMuted || !this.musicEnabled) return;
      if (this.ctx.state !== 'running') return;

      const now = this.ctx.currentTime;
      const freq = bassline[this.bgmStep % bassline.length];
      this.bgmStep++;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.exponentialRampToValueAtTime(90, now + 0.35);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 0.42);
    }, 450); // ~133 BPM pulses
  }
}

export const Audio = new SoundManager();
