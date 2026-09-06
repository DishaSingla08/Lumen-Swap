// Main game loop, state management, and HUD for Lumen Swap
import { COLORS, FORMS, CANVAS_SIZE } from './core/Constants.js';
import { Audio } from './core/Audio.js';
import { Input } from './core/Input.js';
import { ParticleSystem } from './core/Particles.js';
import { PhysicsEngine } from './core/Physics.js';
import { Renderer } from './core/Renderer.js';
import { Player } from './entities/Player.js';
import { Level, LEVEL_DEFINITIONS } from './levels/LevelData.js';
import { LevelEditor } from './editor/LevelEditor.js';

const STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_WON: 'GAME_WON',
  EDITOR: 'EDITOR',
};

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.canvas.width = CANVAS_SIZE.WIDTH;
    this.canvas.height = CANVAS_SIZE.HEIGHT;

    this.renderer = new Renderer(this.canvas);
    this.physics = new PhysicsEngine();
    this.particles = new ParticleSystem();

    this.currentLevelIndex = 0;
    this.level = null;
    this.player = null;

    this.state = STATES.MENU;
    this.editor = new LevelEditor(this.canvas);

    // Stats
    this.deaths = 0;
    this.totalDeaths = 0;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.isTimerRunning = false;
    this.customLevel = null;

    // UI Cache
    this.hudElements = {
      levelName: document.getElementById('hud-level-name'),
      formBadge: document.getElementById('hud-form-badge'),
      lumenBar: document.getElementById('hud-lumen-bar'),
      lumenVal: document.getElementById('hud-lumen-value'),
      timer: document.getElementById('hud-timer'),
      deaths: document.getElementById('hud-deaths'),
      hint: document.getElementById('hud-hint'),
      menuOverlay: document.getElementById('menu-overlay'),
      pauseOverlay: document.getElementById('pause-overlay'),
      victoryOverlay: document.getElementById('victory-overlay'),
      editorToolbar: document.getElementById('editor-toolbar'),
      levelSelectModal: document.getElementById('level-select-modal'),
    };

    this.initLevel(this.currentLevelIndex);
    this.bindUI();
    this.setupTouchControls();

    // Start Main Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  initLevel(index) {
    this.currentLevelIndex = index;
    const def = LEVEL_DEFINITIONS[index];
    this.level = new Level(def);
    this.player = new Player(this.level.playerSpawn.x, this.level.playerSpawn.y);
    this.particles.reset();
    this.updateHUD();
  }

  startCustomLevel(customLevel) {
    this.customLevel = customLevel;
    this.level = customLevel;
    this.player = new Player(this.level.playerSpawn.x, this.level.playerSpawn.y);
    this.particles.reset();
    this.state = STATES.PLAYING;
    this.hideAllOverlays();
    this.updateHUD();
  }

  bindUI() {
    // Audio Unlock on first interaction
    const unlockAudio = () => {
      Audio.ensureContext();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    // Start Button
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.startGame();
    });

    // Level Select Button
    document.getElementById('btn-open-levels')?.addEventListener('click', () => {
      this.openLevelSelect();
    });
    document.getElementById('btn-close-levels')?.addEventListener('click', () => {
      this.hudElements.levelSelectModal.classList.add('hidden');
    });

    // Editor Button
    document.getElementById('btn-open-editor')?.addEventListener('click', () => {
      this.openEditor();
    });

    // Pause / Resume
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.resumeGame();
    });
    document.getElementById('btn-restart-level')?.addEventListener('click', () => {
      this.restartCurrentLevel();
      this.resumeGame();
    });
    document.getElementById('btn-exit-to-menu')?.addEventListener('click', () => {
      this.returnToMenu();
    });

    // Victory Screen Buttons
    document.getElementById('btn-victory-replay')?.addEventListener('click', () => {
      this.totalDeaths = 0;
      this.elapsedTime = 0;
      this.initLevel(0);
      this.startGame();
    });
    document.getElementById('btn-victory-menu')?.addEventListener('click', () => {
      this.returnToMenu();
    });

    // Audio & Music Toggles
    const muteBtn = document.getElementById('btn-toggle-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const muted = Audio.toggleMute();
        muteBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
        muteBtn.classList.toggle('off', muted);
      });
    }

    const musicBtn = document.getElementById('btn-toggle-music');
    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        const enabled = Audio.toggleMusic();
        musicBtn.textContent = enabled ? 'PULSE: ON' : 'PULSE: OFF';
        musicBtn.classList.toggle('off', !enabled);
      });
    }

    // Editor Toolbar Actions
    const toolBtns = document.querySelectorAll('.editor-tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.editor.currentTool = btn.dataset.tool;
      });
    });

    document.getElementById('btn-editor-play')?.addEventListener('click', () => {
      const customLvl = this.editor.toLevel();
      this.startCustomLevel(customLvl);
    });

    document.getElementById('btn-editor-clear')?.addEventListener('click', () => {
      if (confirm('Clear custom grid?')) this.editor.clear();
    });

    document.getElementById('btn-editor-export')?.addEventListener('click', () => {
      const json = this.editor.exportJSON();
      navigator.clipboard.writeText(json).then(() => {
        alert('Level JSON copied to clipboard!');
      }).catch(() => {
        prompt('Copy your level JSON:', json);
      });
    });

    document.getElementById('btn-editor-import')?.addEventListener('click', () => {
      const json = prompt('Paste level JSON here:');
      if (json && this.editor.importJSON(json)) {
        alert('Level successfully imported!');
      } else if (json) {
        alert('Invalid JSON format!');
      }
    });

    document.getElementById('btn-editor-exit')?.addEventListener('click', () => {
      this.returnToMenu();
    });

    // Render Level Selection Grid
    this.populateLevelSelect();
  }

  setupTouchControls() {
    const bindTouch = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      const setPressed = (val) => {
        Input.touchControls[key] = val;
      };
      el.addEventListener('touchstart', (e) => { e.preventDefault(); setPressed(true); });
      el.addEventListener('touchend', (e) => { e.preventDefault(); setPressed(false); });
      el.addEventListener('mousedown', (e) => { e.preventDefault(); setPressed(true); });
      el.addEventListener('mouseup', (e) => { e.preventDefault(); setPressed(false); });
      el.addEventListener('mouseleave', (e) => { setPressed(false); });
    };

    bindTouch('touch-left', 'left');
    bindTouch('touch-right', 'right');
    bindTouch('touch-jump', 'jump');
    bindTouch('touch-swap', 'swap');
  }

  populateLevelSelect() {
    const grid = document.getElementById('level-select-grid');
    if (!grid) return;
    grid.innerHTML = '';

    LEVEL_DEFINITIONS.forEach((lvl, idx) => {
      const card = document.createElement('button');
      card.className = 'level-card-btn';
      card.innerHTML = `
        <span class="level-num">${(idx + 1).toString().padStart(2, '0')}</span>
        <span class="level-title">${lvl.name.split('//')[1] || lvl.name}</span>
      `;
      card.addEventListener('click', () => {
        this.initLevel(idx);
        this.hudElements.levelSelectModal.classList.add('hidden');
        this.startGame();
      });
      grid.appendChild(card);
    });
  }

  startGame() {
    this.state = STATES.PLAYING;
    this.hideAllOverlays();
    this.isTimerRunning = true;
    this.startTime = performance.now() - this.elapsedTime;
    Audio.ensureContext();
  }

  pauseGame() {
    if (this.state !== STATES.PLAYING) return;
    this.state = STATES.PAUSED;
    this.hudElements.pauseOverlay.classList.remove('hidden');
  }

  resumeGame() {
    this.state = STATES.PLAYING;
    this.hudElements.pauseOverlay.classList.add('hidden');
    this.startTime = performance.now() - this.elapsedTime;
  }

  returnToMenu() {
    this.state = STATES.MENU;
    this.hideAllOverlays();
    this.hudElements.menuOverlay.classList.remove('hidden');
    this.isTimerRunning = false;
  }

  openLevelSelect() {
    this.hudElements.levelSelectModal.classList.remove('hidden');
  }

  openEditor() {
    this.state = STATES.EDITOR;
    this.hideAllOverlays();
    this.hudElements.editorToolbar.classList.remove('hidden');
  }

  hideAllOverlays() {
    this.hudElements.menuOverlay.classList.add('hidden');
    this.hudElements.pauseOverlay.classList.add('hidden');
    this.hudElements.victoryOverlay.classList.add('hidden');
    this.hudElements.editorToolbar.classList.add('hidden');
    this.hudElements.levelSelectModal.classList.add('hidden');
  }

  restartCurrentLevel() {
    this.deaths++;
    this.totalDeaths++;
    this.player.reset(this.level.checkpoint.x, this.level.checkpoint.y);
    this.updateHUD();
  }

  killPlayer() {
    if (this.player.isDead) return;
    this.player.isDead = true;
    this.deaths++;
    this.totalDeaths++;

    Audio.playDeath();
    this.particles.emitDeath(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      this.player.getColor()
    );
    this.renderer.triggerShake(9);
    this.renderer.triggerFlash(COLORS.RED, 0.4);

    // Fast snappy respawn at checkpoint
    setTimeout(() => {
      this.player.reset(this.level.checkpoint.x, this.level.checkpoint.y);
      this.updateHUD();
    }, 280);
  }

  nextLevel() {
    Audio.playLevelClear();
    this.particles.emitSwap(this.player.x, this.player.y, false);
    this.renderer.triggerFlash(COLORS.WHITE, 0.5);

    if (this.customLevel) {
      alert('Custom level complete!');
      this.openEditor();
      return;
    }

    if (this.currentLevelIndex + 1 < LEVEL_DEFINITIONS.length) {
      this.initLevel(this.currentLevelIndex + 1);
    } else {
      // Victory!
      this.state = STATES.GAME_WON;
      this.isTimerRunning = false;
      this.showVictoryScreen();
    }
  }

  showVictoryScreen() {
    this.hideAllOverlays();
    document.getElementById('final-time').textContent = this.formatTime(this.elapsedTime);
    document.getElementById('final-deaths').textContent = this.totalDeaths.toString();
    this.hudElements.victoryOverlay.classList.remove('hidden');
  }

  updateHUD() {
    const isWhite = this.player.form === FORMS.WHITE;

    // Form Badge
    if (this.hudElements.formBadge) {
      this.hudElements.formBadge.textContent = isWhite ? 'WHITE FORM // SOLID: WHITE' : 'RED FORM // SOLID: RED';
      this.hudElements.formBadge.className = isWhite ? 'badge-white' : 'badge-red';
    }

    // Level Name & Instruction
    if (this.hudElements.levelName) {
      this.hudElements.levelName.textContent = this.level.name;
    }
    if (this.hudElements.hint) {
      this.hudElements.hint.textContent = this.level.instruction || '';
    }

    // Deaths
    if (this.hudElements.deaths) {
      this.hudElements.deaths.textContent = `DEATHS: ${this.totalDeaths}`;
    }

    // Lumen Energy
    if (this.hudElements.lumenBar) {
      this.hudElements.lumenBar.style.width = `${this.player.lumen}%`;
    }
    if (this.hudElements.lumenVal) {
      this.hudElements.lumenVal.textContent = `${Math.round(this.player.lumen)}%`;
    }
  }

  formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
  }

  loop(currentTime) {
    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.isTimerRunning && this.state === STATES.PLAYING) {
      this.elapsedTime = performance.now() - this.startTime;
      if (this.hudElements.timer) {
        this.hudElements.timer.textContent = this.formatTime(this.elapsedTime);
      }
    }

    // Input poll
    Input.update();

    if (this.state === STATES.PLAYING) {
      // Pause shortcut
      if (Input.pauseJustPressed) {
        this.pauseGame();
      }

      // Reset level shortcut
      if (Input.resetJustPressed) {
        this.killPlayer();
      }

      // Check form swap flash
      const prevForm = this.player.form;

      // Update Player
      this.player.update(Input, this.particles);

      if (prevForm !== this.player.form) {
        this.renderer.triggerShake(4);
        this.renderer.triggerFlash(this.player.form === FORMS.RED ? COLORS.RED : COLORS.WHITE, 0.25);
        this.updateHUD();
      }

      // Update Level & Lasers
      this.level.update();

      // Physics collisions
      this.physics.update(this.player, this.level, this.particles, () => this.killPlayer());

      // Particles
      this.particles.update();
      if (this.level.exitPortal) {
        this.particles.emitPortalPulse(this.level.exitPortal.x, this.level.exitPortal.y);
      }

      // Level completion
      if (this.level.isCompleted) {
        this.nextLevel();
      }

      // Camera & Render
      this.renderer.updateCamera(this.player, this.level);
      this.renderer.render(this.player, this.level, this.particles, currentTime);

      // HUD meter refresh
      if (this.hudElements.lumenBar) {
        this.hudElements.lumenBar.style.width = `${this.player.lumen}%`;
      }
      if (this.hudElements.lumenVal) {
        this.hudElements.lumenVal.textContent = `${Math.round(this.player.lumen)}%`;
      }
    } else if (this.state === STATES.EDITOR) {
      if (Input.isKeyJustPressed('KeyT')) {
        const customLvl = this.editor.toLevel();
        this.startCustomLevel(customLvl);
      }
      this.editor.draw();
    } else if (this.state === STATES.PAUSED) {
      if (Input.pauseJustPressed) {
        this.resumeGame();
      }
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
