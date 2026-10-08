/**
 * AudioManager — Handles spatial/flat SFX and background music.
 * Uses Howler.js for playing audio assets.
 * Implements a Web Audio API synthesizer fallback if files are missing or loading fails,
 * ensuring the game is never silent and maintains zero-dependency client-side runtime.
 */
import { Howl } from "howler";
import { useGameStore } from "@/stores/gameStore";

// ─── Synth Fallback ───────────────────────────────────────────────

class SynthFallback {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    // Context is created lazily on first user interaction
  }

  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private initCtx() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master chain: masterGain -> destination (smooth 50ms ramp-in prevents any initial click/tuck)
      this.masterGain = this.ctx.createGain();
      const vol = useGameStore.getState().settings.audioVolume;
      this.masterGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);
      this.masterGain.connect(this.ctx.destination);

      this.initAmbientSoundscape();
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  private initAmbientSoundscape(): void {
    if (!this.ctx || !this.masterGain) return;

    // 6-second noise buffer with circular crossfade windowing (zero click, zero helicopter looping artifact)
    const bufferSize = this.ctx.sampleRate * 6;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.032;
      b6 = white * 0.115926;
    }

    // Circular crossfade window to ensure completely smooth, natural wind without rotor blade rhythm
    const fadeLen = Math.floor(this.ctx.sampleRate * 0.5);
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const smooth = 0.5 * (1 - Math.cos(Math.PI * t));
      output[i] = output[i] * smooth + output[bufferSize - fadeLen + i] * (1 - smooth);
    }

    // High-speed aerial flight wind rush channel — lowpass filter for smooth rushing air (no mechanical bandpass buzz)
    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(0.5, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    windSource.start();
  }

  updateVolume() {
    if (!this.masterGain || !this.ctx) return;
    const vol = useGameStore.getState().settings.audioVolume;
    this.masterGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.04);
  }

  private bgmInterval: number | null = null;
  private bgmTheme: "peaceful" | "flight" | "combat" = "peaceful";

  startBGM(theme: "peaceful" | "flight" | "combat" = "peaceful") {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;
    if (this.bgmInterval) {
      this.setBGMTheme(theme);
      return;
    }

    this.bgmTheme = theme;

    // Harmonious ancient flute / bell frequencies (relaxing Asian pentatonic scale)
    const peacefulNotes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    const flightNotes = [196.00, 246.94, 293.66, 392.00, 493.88, 587.33];
    const combatNotes = [130.81, 155.56, 174.61, 196.00, 233.08];

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      const notes =
        this.bgmTheme === "combat"
          ? combatNotes
          : this.bgmTheme === "flight"
          ? flightNotes
          : peacefulNotes;

      const freq = notes[Math.floor(Math.random() * notes.length)];
      osc.type = this.bgmTheme === "combat" ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(freq, t);

      const vol = this.bgmTheme === "combat" ? 0.035 : 0.022;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (this.bgmTheme === "combat" ? 0.9 : 2.8));

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + (this.bgmTheme === "combat" ? 1.0 : 2.9));
    }, 2800);
  }

  setBGMTheme(theme: "peaceful" | "flight" | "combat") {
    this.bgmTheme = theme;
  }

  setFlightWindSpeed(speed: number): void {
    if (!this.ctx || !this.windGain || !this.windFilter) return;
    const now = this.ctx.currentTime;
    if (speed > 10) {
      const norm = Math.min(1.0, (speed - 10) / 32);
      this.windGain.gain.setTargetAtTime(0.015 + norm * 0.12, now, 0.2);
      this.windFilter.frequency.setTargetAtTime(280 + norm * 1400, now, 0.2);
    } else {
      this.windGain.gain.setTargetAtTime(0.0, now, 0.35);
    }
  }

  setUnderwater(_isUnderwater: boolean): void {
    // Underwater diving removed per user request — gameplay focused exclusively above hill & sky
  }

  playWhaleSong(): void {
    // Droning sub-bass hum removed per user request: keeping pure relaxing ocean surf and gentle ambient tones
  }

  stopBGM() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  /** Play a synthesised sword slash sound */
  playSlash() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Play a synthesised parry metallic clash */
  playParry() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // High metal chime (frequency combo)
    const freqs = [800, 1200, 1500, 2000];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      const amp = idx === 0 ? 0.25 : 0.12;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  /** Play a synthesised block thud */
  playBlock() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.1);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Play a synthesised step sound (smooth attack, zero click) */
  playStep() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.setValueAtTime(40, now + 0.05);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /** Play a synthesised boss sound ripple */
  playRipple() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.42);
  }

  /** Play a synthesised dodge sound */
  playDodge() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Play Where Winds Meet Qinggong spring leap whoosh */
  playJump() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.22);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  /** Play Qinggong Sky Step / Double Jump ethereal wind kick */
  playAirStep() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Play Qinggong Wind Gliding gentle breeze whistling */
  playGlide() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(420, now + 0.15);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  /**
   * Play soothing, whisper-soft organic landing cushion — zero pitch drop, zero tuck, zero click.
   * Gives a gentle rustle of alpine grass underfoot.
   */
  playSoftLanding() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Ultra-soft organic meadow/grass cushion — zero bass kick, zero pitch drop, zero tuck/click
    const duration = 0.22;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02; // soft pinkish filter
      data[i] = lastOut;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  }

  /**
   * Play heavy meteor dive impact — deep organic low-end rumble with smooth attack
   * (Harsh 260Hz sawtooth crack/tuck eliminated per user request for a soothing, satisfying impact).
   */
  playDiveImpact() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Sub-bass heavy thump with smooth attack ramp
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.5);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.38, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.52);

    // Warm low-mid resonance for weight (mellow triangle wave, zero harsh sawtooth click)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(150, now);
    osc2.frequency.exponentialRampToValueAtTime(45, now + 0.28);

    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.14, now + 0.025);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.3);
  }

  /**
   * Soothing ambient harmonic soundscape — peaceful pentatonic tones with soft breathing.
   * Completely replaces the 250Hz helicopter drone.
   */
  playWindAmbient(): (() => void) | null {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return null;

    const now = this.ctx.currentTime;
    // Harmonious soothing chord pad: peaceful, meditative ocean atmosphere
    const chordNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
    const chordFreqs = [174.61, 220.00, 261.63, 329.63];

    chordFreqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Very gentle volume
      const targetGain = idx === 0 ? 0.012 : 0.008;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 2.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      chordNodes.push({ osc, gain });
    });

    // Slow organic LFO volume modulation for gentle wave breathing
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.12, now); // ultra-slow 8-second ocean surge
    lfoGain.gain.setValueAtTime(0.003, now);
    lfo.connect(lfoGain);

    chordNodes.forEach(({ gain }) => {
      lfoGain.connect(gain.gain);
    });
    lfo.start(now);

    return () => {
      const stopTime = this.ctx ? this.ctx.currentTime : now;
      try {
        lfo.stop(stopTime + 1.5);
      } catch {}
      chordNodes.forEach(({ osc, gain }) => {
        try {
          gain.gain.linearRampToValueAtTime(0.0001, stopTime + 1.5);
          osc.stop(stopTime + 1.6);
        } catch {}
      });
    };
  }
}

// ─── AudioManager Class ──────────────────────────────────────────

// ─── Available Audio Assets ──────────────────────────────────────
const AVAILABLE_AUDIO_FILES = new Set<string>([
  // No files loaded in project public/ directory yet.
  // Add paths here to enable real audio loading (e.g. "/audio/bamboo_ambient.ogg").
]);

// ─── AudioManager Class ──────────────────────────────────────────

export class AudioManager {
  private bgm: Howl | null = null;
  private sfxMap: Map<string, Howl> = new Map();
  private synth: SynthFallback;
  private activeWindStop: (() => void) | null = null;

  constructor() {
    this.synth = new SynthFallback();
    
    if (typeof window !== "undefined") {
      // Monitor volume setting changes
      useGameStore.subscribe((state) => {
        const vol = state.settings.audioVolume;
        this.updateVolume(vol);
      });
    }
  }

  private updateVolume(vol: number) {
    if (this.bgm) {
      this.bgm.volume(vol);
    }
    this.sfxMap.forEach((howl) => howl.volume(vol));
    this.synth.updateVolume();
  }

  /**
   * Play background music. Falls back to wind synthesis if file missing.
   */
  playBGM(url: string): void {
    if (typeof window === "undefined") return;

    // Stop current BGM
    this.stopBGM();

    const vol = useGameStore.getState().settings.audioVolume;

    // Avoid 404 network request spam if file is not in assets list
    if (!AVAILABLE_AUDIO_FILES.has(url)) {
      setTimeout(() => {
        if (!this.activeWindStop) {
          this.activeWindStop = this.synth.playWindAmbient();
        }
      }, 0);
      return;
    }

    this.bgm = new Howl({
      src: [url],
      loop: true,
      volume: vol,
      html5: true, // stream large files
      onloaderror: () => {
        console.warn(`[AudioManager] Failed to load BGM ${url}. Activating synth wind ambient.`);
        if (!this.activeWindStop) {
          this.activeWindStop = this.synth.playWindAmbient();
        }
      },
    });

    this.bgm.play();
  }

  stopBGM(): void {
    if (this.bgm) {
      this.bgm.stop();
      this.bgm = null;
    }
    if (this.activeWindStop) {
      this.activeWindStop();
      this.activeWindStop = null;
    }
    this.synth.stopBGM();
  }

  /**
   * Play flat sound effect.
   */
  playSFX(name: string, url?: string): void {
    if (typeof window === "undefined") return;

    const vol = useGameStore.getState().settings.audioVolume;

    // Handle synth fallbacks directly if no url, or url is not in assets list
    if (!url || !AVAILABLE_AUDIO_FILES.has(url)) {
      this.playSynthSFX(name);
      return;
    }

    let howl = this.sfxMap.get(name);
    if (!howl) {
      howl = new Howl({
        src: [url],
        volume: vol,
        onloaderror: () => {
          console.warn(`[AudioManager] SFX ${name} load failed. Falling back to synthesiser.`);
          this.playSynthSFX(name);
        },
      });
      this.sfxMap.set(name, howl);
    }

    howl.play();
  }

  private playSynthSFX(name: string) {
    // Normalise name (e.g. if path was passed like "/audio/impact.ogg")
    let sfxKey = name.toLowerCase();
    if (sfxKey.includes("soft_landing") || sfxKey.includes("landing") || sfxKey.includes("touchdown")) sfxKey = "soft_landing";
    else if (sfxKey.includes("slash")) sfxKey = "slash";
    else if (sfxKey.includes("deflect") || sfxKey.includes("parry")) sfxKey = "parry";
    else if (sfxKey.includes("dive") || sfxKey.includes("slam")) sfxKey = "dive_impact";
    else if (sfxKey.includes("airstep") || sfxKey.includes("double_jump")) sfxKey = "air_step";
    else if (sfxKey.includes("glide")) sfxKey = "glide";
    else if (sfxKey.includes("jump") || sfxKey.includes("spring")) sfxKey = "jump";
    else if (sfxKey.includes("block") || sfxKey.includes("impact")) sfxKey = "block";
    else if (sfxKey.includes("dodge") || sfxKey.includes("dash")) sfxKey = "dodge";
    else if (sfxKey.includes("step")) sfxKey = "step";
    else if (sfxKey.includes("ripple")) sfxKey = "ripple";

    switch (sfxKey) {
      case "soft_landing":
        this.synth.playSoftLanding();
        break;
      case "slash":
      case "attack":
        this.synth.playSlash();
        break;
      case "parry":
        this.synth.playParry();
        break;
      case "block":
        this.synth.playBlock();
        break;
      case "step":
      case "footstep":
        this.synth.playStep();
        break;
      case "ripple":
      case "boss_ripple":
        this.synth.playRipple();
        break;
      case "dodge":
      case "dash":
        this.synth.playDodge();
        break;
      case "jump":
        this.synth.playJump();
        break;
      case "air_step":
        this.synth.playAirStep();
        break;
      case "glide":
        this.synth.playGlide();
        break;
      case "dive_impact":
        this.synth.playDiveImpact();
        break;
      default:
        // Default minor thud
        this.synth.playBlock();
    }
  }

  /**
   * Play 3D spatial sound effect at a coordinate relative to camera.
   */
  playSpatialSFX(name: string, url: string, position: [number, number, number]): void {
    if (typeof window === "undefined") return;

    if (!AVAILABLE_AUDIO_FILES.has(url)) {
      this.playSynthSFX(name);
      return;
    }

    const vol = useGameStore.getState().settings.audioVolume;

    // Howler spatial audio support
    const howl = new Howl({
      src: [url],
      volume: vol,
      onloaderror: () => {
        // Fall back to synthesiser
        this.playSynthSFX(name);
      },
    });

    const id = howl.play();
    // Set 3D position (x, y, z)
    howl.pos(position[0], position[1], position[2], id);
    howl.pannerAttr({
      panningModel: "HRTF",
      refDistance: 1,
      maxDistance: 100,
      rolloffFactor: 1.5,
      coneInnerAngle: 360,
      coneOuterAngle: 360,
      coneOuterGain: 0,
    }, id);
  }

  /**
   * Start dynamic ambient background music.
   */
  startBGM(theme: "peaceful" | "flight" | "combat" = "peaceful"): void {
    this.synth.startBGM(theme);
  }

  /**
   * Smoothly crossfade BGM theme based on player state.
   */
  setBGMTheme(theme: "peaceful" | "flight" | "combat"): void {
    this.synth.setBGMTheme(theme);
  }

  /**
   * Modulate flight wind rushing audio based on player airspeed.
   */
  setFlightWindSpeed(speed: number): void {
    this.synth.setFlightWindSpeed(speed);
  }

  /**
   * Apply low-pass acoustic muffling when diving underwater.
   */
  setUnderwater(isUnderwater: boolean): void {
    this.synth.setUnderwater(isUnderwater);
  }

  /**
   * Play deep resonant synthetic whale song for breaching whales.
   */
  playWhaleSong(): void {
    this.synth.playWhaleSong();
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
