// Cross-platform input manager: Keyboard, Gamepad, and Touch
export class InputManager {
  constructor() {
    this.keys = new Map();
    this.prevKeys = new Map();

    this.touchControls = {
      left: false,
      right: false,
      jump: false,
      swap: false,
    };
    this.prevTouchControls = { ...this.touchControls };

    this.gamepadIndex = null;
    this.prevGamepadButtons = [];

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scrolling on space/arrow keys while playing
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.prevKeys.clear();
      for (const k in this.touchControls) this.touchControls[k] = false;
    });

    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  update() {
    // Save current states as previous before next frame
    this.prevKeys = new Map(this.keys);
    this.prevTouchControls = { ...this.touchControls };

    // Poll Gamepad if available
    if (this.gamepadIndex !== null && navigator.getGamepads) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        this.prevGamepadButtons = gp.buttons.map(b => b.pressed);
      }
    }
  }

  isKeyDown(code) {
    return !!this.keys.get(code);
  }

  isKeyJustPressed(code) {
    return !!this.keys.get(code) && !this.prevKeys.get(code);
  }

  isKeyJustReleased(code) {
    return !this.keys.get(code) && !!this.prevKeys.get(code);
  }

  getGamepad() {
    if (this.gamepadIndex !== null && navigator.getGamepads) {
      return navigator.getGamepads()[this.gamepadIndex];
    }
    return null;
  }

  // --- High-Level Action Helpers ---

  get moveLeft() {
    const key = this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft');
    const touch = this.touchControls.left;
    let gp = false;
    const pad = this.getGamepad();
    if (pad) {
      const stick = pad.axes[0] < -0.3;
      const dpad = pad.buttons[14]?.pressed;
      gp = stick || dpad;
    }
    return key || touch || gp;
  }

  get moveRight() {
    const key = this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight');
    const touch = this.touchControls.right;
    let gp = false;
    const pad = this.getGamepad();
    if (pad) {
      const stick = pad.axes[0] > 0.3;
      const dpad = pad.buttons[15]?.pressed;
      gp = stick || dpad;
    }
    return key || touch || gp;
  }

  get jumpJustPressed() {
    const key = this.isKeyJustPressed('Space') || this.isKeyJustPressed('KeyW') || this.isKeyJustPressed('ArrowUp');
    const touch = this.touchControls.jump && !this.prevTouchControls.jump;
    let gp = false;
    const pad = this.getGamepad();
    if (pad && this.prevGamepadButtons.length) {
      // Button 0 is 'A' (Xbox) / 'Cross' (PlayStation)
      gp = pad.buttons[0]?.pressed && !this.prevGamepadButtons[0];
    }
    return key || touch || gp;
  }

  get jumpHeld() {
    const key = this.isKeyDown('Space') || this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp');
    const touch = this.touchControls.jump;
    let gp = false;
    const pad = this.getGamepad();
    if (pad) {
      gp = pad.buttons[0]?.pressed;
    }
    return key || touch || gp;
  }

  get jumpJustReleased() {
    const key = this.isKeyJustReleased('Space') || this.isKeyJustReleased('KeyW') || this.isKeyJustReleased('ArrowUp');
    const touch = !this.touchControls.jump && this.prevTouchControls.jump;
    let gp = false;
    const pad = this.getGamepad();
    if (pad && this.prevGamepadButtons.length) {
      gp = !pad.buttons[0]?.pressed && this.prevGamepadButtons[0];
    }
    return key || touch || gp;
  }

  get swapJustPressed() {
    const key = (
      this.isKeyJustPressed('ShiftLeft') ||
      this.isKeyJustPressed('ShiftRight') ||
      this.isKeyJustPressed('KeyJ') ||
      this.isKeyJustPressed('KeyX') ||
      this.isKeyJustPressed('KeyC') ||
      this.isKeyJustPressed('KeyK') ||
      this.isKeyJustPressed('Enter')
    );
    const touch = this.touchControls.swap && !this.prevTouchControls.swap;
    let gp = false;
    const pad = this.getGamepad();
    if (pad && this.prevGamepadButtons.length) {
      // Button 1 (B), 2 (X), 4 (L1), 5 (R1)
      const pressedNow = pad.buttons[1]?.pressed || pad.buttons[2]?.pressed || pad.buttons[4]?.pressed || pad.buttons[5]?.pressed;
      const pressedPrev = this.prevGamepadButtons[1] || this.prevGamepadButtons[2] || this.prevGamepadButtons[4] || this.prevGamepadButtons[5];
      gp = pressedNow && !pressedPrev;
    }
    return key || touch || gp;
  }

  get resetJustPressed() {
    return this.isKeyJustPressed('KeyR');
  }

  get pauseJustPressed() {
    return this.isKeyJustPressed('Escape') || this.isKeyJustPressed('KeyP');
  }

  get editorJustPressed() {
    return this.isKeyJustPressed('KeyE');
  }
}

export const Input = new InputManager();
