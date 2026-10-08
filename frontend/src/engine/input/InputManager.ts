/**
 * InputManager — Unified input abstraction for keyboard, mouse, touch, and gamepad.
 * Maps physical inputs to game actions for device-agnostic gameplay.
 */

export { GameAction } from "./GameAction";
import { GameAction } from "./GameAction";

export interface InputState {
  /** Currently held actions */
  held: Set<GameAction>;
  /** Actions pressed this frame */
  justPressed: Set<GameAction>;
  /** Actions released this frame */
  justReleased: Set<GameAction>;
  /** Normalized movement vector [-1, 1] */
  moveAxis: { x: number; y: number };
  /** Normalized camera rotation delta */
  cameraAxis: { x: number; y: number };
  /** Mouse/touch position in normalized device coordinates */
  pointer: { x: number; y: number };
  /** Whether pointer is down */
  pointerDown: boolean;
  /** Double-tap barrel roll signals (consumed per frame) */
  doubleTapLeft: boolean;
  doubleTapRight: boolean;
}

import { loadSavedKeyMap } from "@/systems/KeybindingsManager";

// Default keyboard bindings
const DEFAULT_KEY_MAP: Record<string, GameAction> = {
  KeyW: GameAction.MOVE_FORWARD,
  KeyS: GameAction.MOVE_BACK,
  KeyA: GameAction.MOVE_LEFT,
  KeyD: GameAction.MOVE_RIGHT,
  ArrowUp: GameAction.MOVE_FORWARD,
  ArrowDown: GameAction.MOVE_BACK,
  ArrowLeft: GameAction.MOVE_LEFT,
  ArrowRight: GameAction.MOVE_RIGHT,
  Space: GameAction.JUMP,
  ShiftLeft: GameAction.SPRINT,
  ShiftRight: GameAction.SPRINT,
  AltLeft: GameAction.DODGE,
  KeyF: GameAction.DRAGON_MOUNT,
  KeyR: GameAction.RAGE,
  KeyT: GameAction.HYPERION_GRAPPLE,
  KeyQ: GameAction.AXE_THROW_RECALL,
  KeyE: GameAction.AXE_THROW_RECALL,
  KeyG: GameAction.EXECUTE,
  KeyV: GameAction.TOGGLE_VIEW,
  Escape: GameAction.PAUSE,
  KeyC: GameAction.STANCE_NEXT,
  Digit1: GameAction.WEAPON_1,
  Digit4: GameAction.TECHNIQUE_4,
  Tab: GameAction.LOCK_ON,
};

export class InputManager {
  private state: InputState;
  private queuedJustPressed: Set<GameAction> = new Set();
  private prevHeld: Set<GameAction>;
  private keysDown: Set<string> = new Set();
  private keyMap: Record<string, GameAction>;
  private _disposed: boolean = false;
  private boundKeybindingsHandler: EventListener | null = null;

  // Double-tap detection for barrel roll (A/D keys)
  private lastLeftTapTime: number = 0;
  private lastRightTapTime: number = 0;
  private readonly DOUBLE_TAP_WINDOW = 0.35; // seconds (relaxed for smooth, reliable execution)
  private _doubleTapLeft: boolean = false;
  private _doubleTapRight: boolean = false;

  // Mouse tracking
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDX: number = 0;
  private mouseDY: number = 0;
  private prevClientX: number | null = null;
  private prevClientY: number | null = null;
  private _pointerDown: boolean = false;
  private isPointerLocked: boolean = false;

  // Touch tracking for dual virtual joysticks (left = move, right = camera look)
  private touchMoveId: number | null = null;
  private touchMoveStart: { x: number; y: number } | null = null;
  private touchMoveCurrent: { x: number; y: number } | null = null;

  private touchLookId: number | null = null;
  private touchLookPrev: { x: number; y: number } | null = null;
  private touchLookDelta: { x: number; y: number } = { x: 0, y: 0 };

  // Bound handlers for cleanup
  private boundHandlers: {
    keydown: (e: KeyboardEvent) => void;
    keyup: (e: KeyboardEvent) => void;
    mousedown: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    touchstart: (e: TouchEvent) => void;
    touchmove: (e: TouchEvent) => void;
    touchend: (e: TouchEvent) => void;
    pointerlockchange: () => void;
    blur: () => void;
  };

  constructor(canvas: HTMLCanvasElement, keyMap?: Record<string, GameAction>) {
    this.keyMap = keyMap ?? loadSavedKeyMap();
    this.prevHeld = new Set();
    this.state = {
      held: new Set(),
      justPressed: new Set(),
      justReleased: new Set(),
      moveAxis: { x: 0, y: 0 },
      cameraAxis: { x: 0, y: 0 },
      pointer: { x: 0, y: 0 },
      pointerDown: false,
      doubleTapLeft: false,
      doubleTapRight: false,
    };

    // Bind all handlers
    this.boundHandlers = {
      keydown: this.onKeyDown.bind(this),
      keyup: this.onKeyUp.bind(this),
      mousedown: this.onMouseDown.bind(this, canvas),
      mouseup: this.onMouseUp.bind(this),
      mousemove: this.onMouseMove.bind(this, canvas),
      touchstart: this.onTouchStart.bind(this),
      touchmove: this.onTouchMove.bind(this),
      touchend: this.onTouchEnd.bind(this),
      pointerlockchange: this.onPointerLockChange.bind(this, canvas),
      blur: this.clear.bind(this),
    };

    // Register event listeners
    window.addEventListener("keydown", this.boundHandlers.keydown);
    window.addEventListener("keyup", this.boundHandlers.keyup);
    canvas.addEventListener("mousedown", this.boundHandlers.mousedown);
    window.addEventListener("mouseup", this.boundHandlers.mouseup);
    window.addEventListener("mousemove", this.boundHandlers.mousemove);
    canvas.addEventListener("touchstart", this.boundHandlers.touchstart, { passive: false });
    window.addEventListener("touchmove", this.boundHandlers.touchmove, { passive: false });
    window.addEventListener("touchend", this.boundHandlers.touchend);
    document.addEventListener("pointerlockchange", this.boundHandlers.pointerlockchange);
    window.addEventListener("blur", this.boundHandlers.blur);

    // Listen for real-time keybinding reassignments from Settings UI
    this.boundKeybindingsHandler = ((e: CustomEvent<Record<string, GameAction>>) => {
      if (e.detail) {
        this.keyMap = { ...e.detail };
      }
    }) as EventListener;
    window.addEventListener("gameKeybindingsUpdated", this.boundKeybindingsHandler);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    this.keysDown.add(e.code);
    
    // Check code first, then key mapping fallback
    let action = this.keyMap[e.code];
    if (!action && e.key) {
      const keyUpper = e.key.toUpperCase();
      action = this.keyMap[`Key${keyUpper}`] || this.keyMap[`Digit${e.key}`] || this.keyMap[e.key];
    }

    // Double-tap detection for barrel rolls (A/D)
    const now = performance.now() / 1000;
    if (action === GameAction.MOVE_LEFT) {
      if (now - this.lastLeftTapTime < this.DOUBLE_TAP_WINDOW) {
        this._doubleTapLeft = true;
      }
      this.lastLeftTapTime = now;
    } else if (action === GameAction.MOVE_RIGHT) {
      if (now - this.lastRightTapTime < this.DOUBLE_TAP_WINDOW) {
        this._doubleTapRight = true;
      }
      this.lastRightTapTime = now;
    }

    if (action) {
      this.state.held.add(action);
    }

    // Prevent Tab from switching focus
    if (e.key === "Tab") e.preventDefault();
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
    
    let action = this.keyMap[e.code];
    if (!action && e.key) {
      const keyUpper = e.key.toUpperCase();
      action = this.keyMap[`Key${keyUpper}`] || this.keyMap[`Digit${e.key}`] || this.keyMap[e.key];
    }

    if (action) {
      this.state.held.delete(action);
    }
  }

  private onMouseDown(canvas: HTMLCanvasElement, e: MouseEvent): void {
    // When pointer is not locked (hover cursor mode), mouse clicks do NOT fire combat actions
    if (!this.isPointerLocked) {
      return;
    }

    this._pointerDown = true;
    this.prevClientX = e.clientX;
    this.prevClientY = e.clientY;
    if (e.button === 0) this.state.held.add(GameAction.ATTACK);
    if (e.button === 2) {
      this.state.held.add(GameAction.AIM); // Right click is Aim Mode (ADS)
      this.state.held.add(GameAction.BLOCK); // Also deflect on timing
    }
    if (e.button === 1) this.state.held.add(GameAction.HEAVY_ATTACK); // Middle click is Heavy Attack!
  }

  private onMouseUp(e: MouseEvent): void {
    this._pointerDown = false;
    if (e.button === 0) this.state.held.delete(GameAction.ATTACK);
    if (e.button === 2) {
      this.state.held.delete(GameAction.AIM);
      this.state.held.delete(GameAction.BLOCK);
    }
    if (e.button === 1) this.state.held.delete(GameAction.HEAVY_ATTACK);
  }

  private onMouseMove(canvas: HTMLCanvasElement, e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.prevClientX = e.clientX;
    this.prevClientY = e.clientY;

    // When pointer is NOT locked (hover cursor mode), do NOT rotate camera or send mouse deltas
    if (!this.isPointerLocked) {
      this.mouseDX = 0;
      this.mouseDY = 0;
      return;
    }

    let dx = e.movementX ?? 0;
    let dy = e.movementY ?? 0;

    // Guard against giant single-frame glitch spikes on lock transitions while preserving flick accuracy
    if (Math.abs(dx) > 300) dx = Math.sign(dx) * 300;
    if (Math.abs(dy) > 300) dy = Math.sign(dy) * 300;

    // 360-degree raw mouse look: accumulate movement deltas across all axes
    this.mouseDX += dx;
    this.mouseDY += dy;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Left half of screen = movement joystick
      if (touch.clientX < window.innerWidth * 0.48) {
        if (this.touchMoveId === null) {
          this.touchMoveId = touch.identifier;
          this.touchMoveStart = { x: touch.clientX, y: touch.clientY };
          this.touchMoveCurrent = { x: touch.clientX, y: touch.clientY };
        }
      } else {
        // Right half of screen = camera view controller
        if (this.touchLookId === null) {
          this.touchLookId = touch.identifier;
          this.touchLookPrev = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchMoveId) {
        this.touchMoveCurrent = { x: touch.clientX, y: touch.clientY };
      } else if (touch.identifier === this.touchLookId && this.touchLookPrev) {
        const dx = touch.clientX - this.touchLookPrev.x;
        const dy = touch.clientY - this.touchLookPrev.y;
        this.touchLookDelta.x += dx;
        this.touchLookDelta.y += dy;
        this.touchLookPrev = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.touchMoveId) {
        this.touchMoveId = null;
        this.touchMoveStart = null;
        this.touchMoveCurrent = null;
      }
      if (touch.identifier === this.touchLookId) {
        this.touchLookId = null;
        this.touchLookPrev = null;
      }
    }
  }

  private onPointerLockChange(canvas: HTMLCanvasElement): void {
    this.isPointerLocked = document.pointerLockElement === canvas;
    this.prevClientX = null;
    this.prevClientY = null;
    if (!this.isPointerLocked) {
      this.clear();
    }
  }

  /**
   * Call once per frame before reading state.
   * Computes justPressed/justReleased and resets deltas.
   */
  poll(): InputState {
    // Compute justPressed / justReleased
    this.state.justPressed.clear();
    this.state.justReleased.clear();

    for (const action of this.state.held) {
      if (!this.prevHeld.has(action)) {
        this.state.justPressed.add(action);
      }
    }
    for (const action of this.prevHeld) {
      if (!this.state.held.has(action)) {
        this.state.justReleased.add(action);
      }
    }

    // Process queued one-shot virtual UI actions
    for (const action of this.queuedJustPressed) {
      this.state.justPressed.add(action);
    }
    this.queuedJustPressed.clear();

    // Movement axis from keyboard
    let mx = 0, my = 0;
    if (this.state.held.has(GameAction.MOVE_LEFT)) mx -= 1;
    if (this.state.held.has(GameAction.MOVE_RIGHT)) mx += 1;
    if (this.state.held.has(GameAction.MOVE_FORWARD)) my -= 1;
    if (this.state.held.has(GameAction.MOVE_BACK)) my += 1;

    // Override with touch joystick if active
    if (this.touchMoveStart && this.touchMoveCurrent) {
      const dx = this.touchMoveCurrent.x - this.touchMoveStart.x;
      const dy = this.touchMoveCurrent.y - this.touchMoveStart.y;
      const maxRadius = 60;
      mx = Math.max(-1, Math.min(1, dx / maxRadius));
      my = Math.max(-1, Math.min(1, dy / maxRadius));
    }

    // Normalize diagonal movement
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    this.state.moveAxis = { x: mx, y: my };

    // Camera axis from mouse delta + touch look delta (dual controller system)
    // Strictly zero mouse camera rotation when pointer is unlocked (hover cursor mode)
    const mouseRotScale = this.isPointerLocked ? 0.002 : 0;
    this.state.cameraAxis = {
      x: (this.mouseDX * mouseRotScale) + (this.touchLookDelta.x * 2.2 * 0.002),
      y: (this.mouseDY * mouseRotScale) + (this.touchLookDelta.y * 2.2 * 0.002),
    };
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.touchLookDelta.x = 0;
    this.touchLookDelta.y = 0;

    // Pointer
    this.state.pointer = { x: this.mouseX, y: this.mouseY };
    this.state.pointerDown = this._pointerDown;

    // Double-tap signals (consumed each frame)
    this.state.doubleTapLeft = this._doubleTapLeft;
    this.state.doubleTapRight = this._doubleTapRight;
    this._doubleTapLeft = false;
    this._doubleTapRight = false;

    // Save prev state
    this.prevHeld = new Set(this.state.held);

    return this.state;
  }

  getState(): InputState {
    return this.state;
  }

  public queueVirtualAction(action: GameAction): void {
    this.queuedJustPressed.add(action);
  }

  /**
   * Resets all held keys, axis values, and mouse deltas.
   * Useful when pausing, exiting pointer lock, or switching modals.
   */
  public clear(): void {
    this.state.held.clear();
    this.prevHeld.clear();
    this.keysDown.clear();
    this.state.justPressed.clear();
    this.state.justReleased.clear();
    this.queuedJustPressed.clear();
    this.state.moveAxis = { x: 0, y: 0 };
    this.state.cameraAxis = { x: 0, y: 0 };
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.touchLookDelta = { x: 0, y: 0 };
    this._pointerDown = false;
    this.state.pointerDown = false;
    this._doubleTapLeft = false;
    this._doubleTapRight = false;
  }

  public isLocked(): boolean {
    return this.isPointerLocked;
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    window.removeEventListener("keydown", this.boundHandlers.keydown);
    window.removeEventListener("keyup", this.boundHandlers.keyup);
    window.removeEventListener("mouseup", this.boundHandlers.mouseup);
    window.removeEventListener("mousemove", this.boundHandlers.mousemove);
    window.removeEventListener("touchmove", this.boundHandlers.touchmove);
    window.removeEventListener("touchend", this.boundHandlers.touchend);
    document.removeEventListener("pointerlockchange", this.boundHandlers.pointerlockchange);
    window.removeEventListener("blur", this.boundHandlers.blur);
    if (this.boundKeybindingsHandler) {
      window.removeEventListener("gameKeybindingsUpdated", this.boundKeybindingsHandler);
      this.boundKeybindingsHandler = null;
    }
  }
}
