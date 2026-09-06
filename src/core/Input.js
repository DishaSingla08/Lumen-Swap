// Cross-platform input manager: Keyboard, Gamepad, and Touch
export class InputManager {
  constructor() {
    this.keys = new Map();
    this.justPressedKeys = new Set();
    this.justReleasedKeys = new Set();

    this.touchControls = {
      left: false,
      right: false,
      jump: false,
      swap: false,
    };
    this.touchJustPressed = {
      jump: false,
      swap: false,
    };

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

      const keysToRegister = [e.code];
      if (e.key) {
        keysToRegister.push(e.key.toLowerCase());
        keysToRegister.push(e.key.toUpperCase());
      }

      for (const k of keysToRegister) {
        if (!this.keys.get(k)) {
          this.justPressedKeys.add(k);
        }
        this.keys.set(k, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      const keysToUnregister = [e.code];
      if (e.key) {
        keysToUnregister.push(e.key.toLowerCase());
        keysToUnregister.push(e.key.toUpperCase());
      }

      for (const k of keysToUnregister) {
        this.keys.set(k, false);
        this.justReleasedKeys.add(k);
      }
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.justPressedKeys.clear();
      this.justReleasedKeys.clear();
      for (const k in this.touchControls) this.touchControls[k] = false;
      for (const k in this.touchJustPressed) this.touchJustPressed[k] = false;
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
    // Clear one-frame transient triggers
    this.justPressedKeys.clear();
    this.justReleasedKeys.clear();
    this.touchJustPressed.jump = false;
    this.touchJustPressed.swap = false;

    // Poll Gamepad if available
    if (this.gamepadIndex !== null && navigator.getGamepads) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        this.prevGamepadButtons = gp.buttons.map(b => b.pressed);
      }
    }
  }

  isKeyDown(...codes) {
    for (const code of codes) {
      if (this.keys.get(code)) return true;
    }
    return false;
  }

  isKeyJustPressed(...codes) {
    for (const code of codes) {
      if (this.justPressedKeys.has(code)) return true;
    }
    return false;
  }

  isKeyJustReleased(...codes) {
    for (const code of codes) {
      if (this.justReleasedKeys.has(code)) return true;
    }
    return false;
  }

  getGamepad() {
    if (this.gamepadIndex !== null && navigator.getGamepads) {
      return navigator.getGamepads()[this.gamepadIndex];
    }
    return null;
  }

  // --- High-Level Action Helpers ---

  get moveLeft() {
    const key = this.isKeyDown('KeyA', 'a', 'A', 'ArrowLeft');
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
    const key = this.isKeyDown('KeyD', 'd', 'D', 'ArrowRight');
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
    // W key, Space, or ArrowUp
    const key = this.isKeyJustPressed('KeyW', 'w', 'W', 'Space', ' ', 'ArrowUp');
    const touch = this.touchJustPressed.jump;
    let gp = false;
    const pad = this.getGamepad();
    if (pad && this.prevGamepadButtons.length) {
      gp = pad.buttons[0]?.pressed && !this.prevGamepadButtons[0];
    }
    return key || touch || gp;
  }

  get jumpHeld() {
    const key = this.isKeyDown('KeyW', 'w', 'W', 'Space', ' ', 'ArrowUp');
    const touch = this.touchControls.jump;
    let gp = false;
    const pad = this.getGamepad();
    if (pad) {
      gp = pad.buttons[0]?.pressed;
    }
    return key || touch || gp;
  }

  get jumpJustReleased() {
    const key = this.isKeyJustReleased('KeyW', 'w', 'W', 'Space', ' ', 'ArrowUp');
    const touch = !this.touchControls.jump;
    let gp = false;
    const pad = this.getGamepad();
    if (pad && this.prevGamepadButtons.length) {
      gp = !pad.buttons[0]?.pressed && this.prevGamepadButtons[0];
    }
    return key || touch || gp;
  }

  get swapJustPressed() {
    const key = this.isKeyJustPressed(
      'ShiftLeft', 'ShiftRight', 'Shift',
      'KeyJ', 'j', 'J',
      'KeyX', 'x', 'X',
      'KeyC', 'c', 'C',
      'Enter'
    );
    const touch = this.touchJustPressed.swap;
    let gp = false;
    const pad = this.getGamepad();
    if (pad && this.prevGamepadButtons.length) {
      gp = (pad.buttons[1]?.pressed && !this.prevGamepadButtons[1]) ||
           (pad.buttons[2]?.pressed && !this.prevGamepadButtons[2]) ||
           (pad.buttons[4]?.pressed && !this.prevGamepadButtons[4]) ||
           (pad.buttons[5]?.pressed && !this.prevGamepadButtons[5]);
    }
    return key || touch || gp;
  }

  get resetJustPressed() {
    return this.isKeyJustPressed('KeyR', 'r', 'R');
  }

  get pauseJustPressed() {
    const key = this.isKeyJustPressed('Escape', 'KeyP', 'p', 'P');
    let gp = false;
    const pad = this.getGamepad();
    if (pad && this.prevGamepadButtons.length) {
      gp = pad.buttons[9]?.pressed && !this.prevGamepadButtons[9];
    }
    return key || gp;
  }

  get editorJustPressed() {
    return this.isKeyJustPressed('KeyE', 'e', 'E');
  }

  // --- Mobile Touch Wiring ---
  setTouch(action, isPressed) {
    if (this.touchControls.hasOwnProperty(action)) {
      if (isPressed && !this.touchControls[action]) {
        if (this.touchJustPressed.hasOwnProperty(action)) {
          this.touchJustPressed[action] = true;
        }
      }
      this.touchControls[action] = isPressed;
    }
  }
}

export const Input = new InputManager();
