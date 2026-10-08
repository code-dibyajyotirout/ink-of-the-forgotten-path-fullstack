/**
 * OneEuroFilter implementation for high-frequency signal processing and jitter reduction.
 * Implements the 1 Euro Filter algorithm (Casiez, Roussel, & Vogel, CHI 2012)
 * for noisy sensor data (e.g. webcam skeletal landmarks, spatial cursor tracking).
 */

class LowPassFilter {
  private alpha: number = 0;
  private s: number | null = null;

  constructor(alpha: number = 0, initVal: number | null = null) {
    this.setAlpha(alpha);
    this.s = initVal;
  }

  public setAlpha(alpha: number): void {
    if (alpha <= 0 || alpha > 1) {
      this.alpha = 0.5;
    } else {
      this.alpha = alpha;
    }
  }

  public filter(val: number): number {
    if (this.s === null) {
      this.s = val;
      return val;
    }
    this.s = this.alpha * val + (1.0 - this.alpha) * this.s;
    return this.s;
  }

  public filterWithAlpha(val: number, alpha: number): number {
    this.setAlpha(alpha);
    return this.filter(val);
  }

  public hasLastRawValue(): boolean {
    return this.s !== null;
  }

  public last(): number {
    return this.s ?? 0;
  }

  public reset(): void {
    this.s = null;
  }
}

export interface OneEuroFilterConfig {
  minCutoff: number; // Minimum cutoff frequency in Hz (default: 1.0)
  beta: number;      // Speed coefficient (default: 0.007)
  dCutoff: number;   // Cutoff frequency for derivative in Hz (default: 1.0)
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;

  constructor(
    config: Partial<OneEuroFilterConfig> = {}
  ) {
    this.minCutoff = config.minCutoff ?? 1.0;
    this.beta = config.beta ?? 0.007;
    this.dCutoff = config.dCutoff ?? 1.0;

    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  /**
   * Filter an incoming scalar value at timestamp t (in seconds).
   */
  public filter(val: number, timestamp?: number): number {
    const t = timestamp ?? performance.now() / 1000;

    if (this.lastTime === null) {
      this.lastTime = t;
      return this.xFilter.filter(val);
    }

    const dt = Math.max(t - this.lastTime, 1e-5);
    this.lastTime = t;

    // Estimate derivative
    const prevRaw = this.xFilter.last();
    const dVal = (val - prevRaw) / dt;
    const edVal = this.dxFilter.filterWithAlpha(dVal, this.alpha(this.dCutoff, dt));

    // Dynamic cutoff calculation based on speed
    const cutoff = this.minCutoff + this.beta * Math.abs(edVal);

    return this.xFilter.filterWithAlpha(val, this.alpha(cutoff, dt));
  }

  public reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
  }
}

/**
 * Multi-dimensional 3D OneEuroFilter for vector tracking.
 */
export class OneEuroFilter3D {
  private filterX: OneEuroFilter;
  private filterY: OneEuroFilter;
  private filterZ: OneEuroFilter;

  constructor(config: Partial<OneEuroFilterConfig> = {}) {
    this.filterX = new OneEuroFilter(config);
    this.filterY = new OneEuroFilter(config);
    this.filterZ = new OneEuroFilter(config);
  }

  public filter(coords: { x: number; y: number; z: number }, timestamp?: number): { x: number; y: number; z: number } {
    return {
      x: this.filterX.filter(coords.x, timestamp),
      y: this.filterY.filter(coords.y, timestamp),
      z: this.filterZ.filter(coords.z, timestamp),
    };
  }

  public reset(): void {
    this.filterX.reset();
    this.filterY.reset();
    this.filterZ.reset();
  }
}
