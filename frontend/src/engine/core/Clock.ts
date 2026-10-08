/**
 * Clock — High-resolution game timer with fixed-timestep support.
 * Handles delta time calculation, FPS tracking, and pause/resume.
 */
export class Clock {
  private lastTime: number = 0;
  private _delta: number = 0;
  private _elapsed: number = 0;
  private _fps: number = 0;
  private _frameCount: number = 0;
  private _fpsTimer: number = 0;
  private _paused: boolean = false;

  get delta(): number {
    return this._delta;
  }

  get elapsed(): number {
    return this._elapsed;
  }

  get fps(): number {
    return this._fps;
  }

  get paused(): boolean {
    return this._paused;
  }

  start(): void {
    this.lastTime = performance.now() / 1000;
    this._frameCount = 0;
    this._fpsTimer = 0;
  }

  tick(): number {
    const now = performance.now() / 1000;
    this._delta = this._paused ? 0 : Math.min(now - this.lastTime, 0.1); // Cap at 100ms
    this.lastTime = now;

    if (!this._paused) {
      this._elapsed += this._delta;
    }

    // FPS calculation
    this._frameCount++;
    this._fpsTimer += this._delta;
    if (this._fpsTimer >= 1.0) {
      this._fps = this._frameCount;
      this._frameCount = 0;
      this._fpsTimer -= 1.0;
    }

    return this._delta;
  }

  pause(): void {
    this._paused = true;
  }

  resume(): void {
    this._paused = false;
    this.lastTime = performance.now() / 1000;
  }

  toggle(): void {
    if (this._paused) this.resume();
    else this.pause();
  }
}
