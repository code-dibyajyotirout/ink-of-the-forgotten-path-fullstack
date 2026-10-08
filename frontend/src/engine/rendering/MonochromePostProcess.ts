/**
 * MonochromePostProcess — TSL & GLSL powered post-processing pipeline.
 * Applies pixelation → edge detection → Bayer dithering → B&W threshold → ink fog,
 * plus battle screen effects: hit chromatic displacement, parry flash inversion, and speed lines.
 */
import * as THREE from "three";

export interface MonochromeSettings {
  /** Pixel grid size (lower = more pixelated). Range: 1-8 */
  pixelSize: number;
  /** Dithering strength. Range: 0-1 */
  ditherStrength: number;
  /** B&W threshold. Range: 0-1 */
  threshold: number;
  /** Edge detection strength. Range: 0-2 */
  edgeStrength: number;
  /** Edge color darkness. Range: 0-1 (0=black, 1=white) */
  edgeColor: number;
  /** Fog near distance */
  fogNear: number;
  /** Fog far distance */
  fogFar: number;
  /** Whether fog fades to white (true) or black (false) */
  fogToWhite: boolean;
  /** Enable dithering */
  ditherEnabled: boolean;
  /** Enable edge detection */
  edgesEnabled: boolean;
  /** Ink Rendering Mode: 0=B&W, 1=Red, 2=Grey, 3=Color */
  inkMode?: number;
}

const DEFAULT_SETTINGS: MonochromeSettings = {
  pixelSize: 1,
  ditherStrength: 0.0,
  threshold: 0.5,
  edgeStrength: 0.8,
  edgeColor: 0.0,
  fogNear: 35,
  fogFar: 180,
  fogToWhite: false,
  ditherEnabled: false,
  edgesEnabled: true,
  inkMode: 0,
};

// 4x4 Bayer dithering matrix (normalized 0-1)
const BAYER_4X4 = [
  0 / 16, 8 / 16, 2 / 16, 10 / 16,
  12 / 16, 4 / 16, 14 / 16, 6 / 16,
  3 / 16, 11 / 16, 1 / 16, 9 / 16,
  15 / 16, 7 / 16, 13 / 16, 5 / 16,
];

export class MonochromePostProcess {
  private renderTarget: THREE.WebGLRenderTarget;
  private quad: THREE.Mesh;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  settings: MonochromeSettings;
  private bayerTexture: THREE.DataTexture;

  // Dynamic Battle Visual Screen Timers
  private parryFlashTimer: number = 0;
  private speedLinesIntensity: number = 0;
  private chromaticTimer: number = 0;
  private totalTime: number = 0;

  // God of War / Where Winds Meet: Post-Processing State
  private vignetteIntensity: number = 0.0; // Disabled to eliminate top/bottom edge blackness
  private bloomIntensity: number = 0.35;    // Metallic sword glint & lantern bloom
  private radialBlurAmount: number = 0;     // Dodge roll blur

  private static _scratchSunPos = new THREE.Vector3(22, 45, 25);
  private static _scratchSunProj = new THREE.Vector3();

  constructor(
    private renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    settings?: Partial<MonochromeSettings>
  ) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
    });
    this.renderTarget.depthTexture = new THREE.DepthTexture();

    // Bayer texture
    const bayerData = new Float32Array(BAYER_4X4);
    this.bayerTexture = new THREE.DataTexture(
      bayerData,
      4,
      4,
      THREE.RedFormat,
      THREE.FloatType
    );
    this.bayerTexture.wrapS = THREE.RepeatWrapping;
    this.bayerTexture.wrapT = THREE.RepeatWrapping;
    this.bayerTexture.minFilter = THREE.NearestFilter;
    this.bayerTexture.magFilter = THREE.NearestFilter;
    this.bayerTexture.needsUpdate = true;

    // Full-screen quad shader material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        tBayer: { value: this.bayerTexture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uPixelSize: { value: this.settings.pixelSize },
        uDitherStrength: { value: this.settings.ditherStrength },
        uThreshold: { value: this.settings.threshold },
        uEdgeStrength: { value: this.settings.edgeStrength },
        uEdgeColor: { value: this.settings.edgeColor },
        uFogNear: { value: this.settings.fogNear },
        uFogFar: { value: this.settings.fogFar },
        uFogToWhite: { value: this.settings.fogToWhite ? 1.0 : 0.0 },
        uDitherEnabled: { value: this.settings.ditherEnabled ? 1.0 : 0.0 },
        uEdgesEnabled: { value: this.settings.edgesEnabled ? 1.0 : 0.0 },
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 200.0 },
        uInkMode: { value: this.settings.inkMode ?? 0 },
        uParryFlash: { value: 0.0 },
        uSpeedLines: { value: 0.0 },
        uChromaticOffset: { value: 0.0 },
        uTime: { value: 0.0 },
        uVignette: { value: 0.0 },
        uBloom: { value: 0.35 },
        uRadialBlur: { value: 0.0 },
        uSunScreenPos: { value: new THREE.Vector2(0.5, 0.5) },
        uSunOnScreen: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform sampler2D tBayer;
        uniform vec2 uResolution;
        uniform float uPixelSize;
        uniform float uDitherStrength;
        uniform float uThreshold;
        uniform float uEdgeStrength;
        uniform float uEdgeColor;
        uniform float uFogNear;
        uniform float uFogFar;
        uniform float uFogToWhite;
        uniform float uDitherEnabled;
        uniform float uEdgesEnabled;
        uniform float uCameraNear;
        uniform float uCameraFar;
        uniform float uInkMode;
        uniform float uParryFlash;
        uniform float uSpeedLines;
        uniform float uChromaticOffset;
        uniform float uTime;
        uniform float uVignette;
        uniform float uBloom;
        uniform float uRadialBlur;
        uniform vec2 uSunScreenPos;
        uniform float uSunOnScreen;

        varying vec2 vUv;

        float getLuminance(vec3 c) {
          return dot(c, vec3(0.299, 0.587, 0.114));
        }

        float linearizeDepth(float d) {
          float z = d * 2.0 - 1.0;
          return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
        }

        // Pseudo-random noise for speed lines
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          // Chromatic aberration offset (hit impact feedback)
          vec2 offset = vec2(uChromaticOffset * 0.008, 0.0);
          vec2 uvR = vUv + offset;
          vec2 uvB = vUv - offset;

          vec2 pixelCoord = uPixelSize > 1.05 ? floor(vUv * uResolution / uPixelSize) * uPixelSize / uResolution : vUv;
          vec2 sampleR = uPixelSize > 1.05 ? floor(uvR * uResolution / uPixelSize) * uPixelSize / uResolution : uvR;
          vec2 sampleB = uPixelSize > 1.05 ? floor(uvB * uResolution / uPixelSize) * uPixelSize / uResolution : uvB;
          vec3 colorR = texture2D(tDiffuse, sampleR).rgb;
          vec3 colorG = texture2D(tDiffuse, pixelCoord).rgb;
          vec3 colorB = texture2D(tDiffuse, sampleB).rgb;
          
          vec3 color = vec3(colorR.r, colorG.g, colorB.b);
          float lum = getLuminance(color);

          // 2. Edge detection (delicate silhouette definition)
          float edgeMask = 0.0;
          if (uEdgesEnabled > 0.5) {
            vec2 texel = 1.0 / uResolution;
            float tl = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(-texel.x, texel.y)).r);
            float t  = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(0.0, texel.y)).r);
            float tr = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(texel.x, texel.y)).r);
            float l  = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(-texel.x, 0.0)).r);
            float r  = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(texel.x, 0.0)).r);
            float bl = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(-texel.x, -texel.y)).r);
            float b  = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(0.0, -texel.y)).r);
            float br = linearizeDepth(texture2D(tDepth, pixelCoord + vec2(texel.x, -texel.y)).r);

            float sobelX = -tl - 2.0*l - bl + tr + 2.0*r + br;
            float sobelY = -tl - 2.0*t - tr + bl + 2.0*b + br;
            
            float depthGradient = sqrt(sobelX*sobelX + sobelY*sobelY);
            edgeMask = smoothstep(0.4, 1.2, depthGradient * uEdgeStrength);
          }

          // 3. Depth & Atmospheric Mountain Fog
          float depth = linearizeDepth(texture2D(tDepth, pixelCoord).r);
          float fogFactor = smoothstep(uFogNear, uFogFar, depth);

          // 4. Output according to Mode
          vec4 finalColor;
          if (uInkMode > 2.5) {
            // Full Color Mode
            vec3 styled = mix(color, vec3(lum), 0.05);
            styled = mix(styled, vec3(0.01, 0.01, 0.02), edgeMask * 0.75);
            finalColor = vec4(styled, 1.0);
          } else if (uInkMode > 1.5) {
            // Gentle Grey Mode
            float dither = (texture2D(tBayer, mod(floor(vUv * uResolution), 4.0) / 4.0).r - 0.5) * 0.1;
            float bw = step(0.5, lum + dither);
            finalColor = vec4(mix(vec3(0.25), vec3(0.7), bw), 1.0);
          } else if (uInkMode > 0.5) {
            // Red Ink Mode
            float dither = (texture2D(tBayer, mod(floor(vUv * uResolution), 4.0) / 4.0).r - 0.5) * 0.1;
            float bw = step(0.5, lum + dither);
            finalColor = vec4(mix(vec3(0.08, 0.0, 0.0), vec3(0.9, 0.1, 0.1), bw), 1.0);
          } else {
            // ─── Where Winds Meet (燕云十六声) Wuxia Cinematic Grading ───
            vec3 styled = color;

            // Natural foliage jade enhancement
            if (styled.g > styled.r * 1.05 && styled.g > styled.b * 1.05) {
              styled.g = mix(styled.g, styled.g * 1.12, 0.6);
            }

            // Atmospheric Mountain Inscattering:
            // Directional sun scatter glow towards sun position
            float sunAlign = dot(normalize(vUv - 0.5), normalize(uSunScreenPos - 0.5));
            float sunPower = clamp(uSunOnScreen, 0.05, 1.0);
            vec3 mountainMistSky = vec3(0.70, 0.82, 0.95); // mountain morning azure
            vec3 nightMist = vec3(0.05, 0.08, 0.16);        // midnight celestial mist
            vec3 baseMist = mix(nightMist, mountainMistSky, sunPower);
            vec3 sunMistGlow = vec3(1.0, 0.92, 0.76);     // golden morning sunbeam glow
            vec3 inscatterColor = mix(baseMist, sunMistGlow, clamp(sunAlign * 0.5 + 0.5, 0.0, 1.0) * sunPower);
            styled = mix(styled, inscatterColor, fogFactor * 0.58);

            // Subtle, elegant calligraphic silhouette accent along silhouettes
            styled = mix(styled, styled * 0.68, edgeMask * 0.4);

            // Filmic contrast curve (lifted warm shadows, rich golden highlights)
            styled = pow(max(vec3(0.0), styled), vec3(0.95, 0.98, 1.03));

            finalColor = vec4(styled, 1.0);
          }

          // 5. Volumetric God Rays (燕云日光丁达尔光束)
          if (uSunOnScreen > 0.5) {
            vec2 rayDelta = (vUv - uSunScreenPos) * 0.025;
            vec2 raySample = vUv;
            float rayAccum = 0.0;
            for (int r = 0; r < 10; r++) {
              raySample -= rayDelta;
              if (raySample.x >= 0.0 && raySample.x <= 1.0 && raySample.y >= 0.0 && raySample.y <= 1.0) {
                float dSample = linearizeDepth(texture2D(tDepth, raySample).r);
                if (dSample > uFogFar * 0.55) {
                  rayAccum += (1.0 - float(r) * 0.09);
                }
              }
            }
            float godRayDist = length(vUv - uSunScreenPos);
            float godRayFade = smoothstep(1.2, 0.0, godRayDist);
            vec3 godRayLight = vec3(1.0, 0.90, 0.72) * (rayAccum / 10.0) * 0.32 * godRayFade;
            finalColor.rgb += godRayLight;
          }

          // 6. Parry Flash Screen Inversion
          if (uParryFlash > 0.001) {
            vec3 inverted = vec3(1.0) - finalColor.rgb;
            finalColor.rgb = mix(finalColor.rgb, inverted, uParryFlash);
          }

          // 7. Specular Bloom / Metallic Gleam
          if (uBloom > 0.01) {
            float luma = dot(finalColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 bloomColor = finalColor.rgb * smoothstep(0.68, 1.0, luma) * uBloom * 1.4;
            finalColor.rgb += bloomColor;
          }

          // 8. Speed Lines (Heavy Slashes)
          if (uSpeedLines > 0.01) {
            vec2 dir = vUv - vec2(0.5);
            float dist = length(dir);
            float angle = atan(dir.y, dir.x);
            float lineNoise = step(0.65, hash(vec2(floor(angle * 30.0), floor(uTime * 15.0))));
            float speedLineMask = smoothstep(0.25, 0.6, dist) * lineNoise * uSpeedLines;
            finalColor.rgb = mix(finalColor.rgb, vec3(0.02), speedLineMask * 0.65);
          }

          // 9. Radial Blur (Dodge roll motion blur)
          if (uRadialBlur > 0.01) {
            vec2 dir2 = vUv - vec2(0.5);
            float blurDist = length(dir2);
            vec3 blurred = finalColor.rgb;
            float blurStrength = uRadialBlur * 0.015;
            for (int i = 1; i <= 5; i++) {
              float t = float(i) * blurStrength;
              blurred += texture2D(tDiffuse, vUv - dir2 * t).rgb;
            }
            blurred /= 6.0;
            finalColor.rgb = mix(finalColor.rgb, blurred, smoothstep(0.15, 0.5, blurDist) * uRadialBlur);
          }

          // 10. Cinematic Wuxia Vignette
          if (uVignette > 0.01) {
            vec2 vigUv = vUv * (1.0 - vUv.yx);
            float vig = vigUv.x * vigUv.y * 15.0;
            vig = pow(vig, 0.3 * uVignette);
            finalColor.rgb *= vig;
          }

          gl_FragColor = finalColor;
        }
      `,
      depthTest: false,
      depthWrite: false,
    });

    // Setup fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, this.material);
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadScene.add(this.quad);
  }

  /**
   * Trigger screen parry flash.
   */
  triggerParryFlash(): void {
    this.parryFlashTimer = 0.18; // 180ms flash
  }

  /**
   * Set speed lines intensity with duration.
   */
  triggerSpeedLines(duration: number = 0.35): void {
    this.speedLinesIntensity = 1.0;
    setTimeout(() => {
      this.speedLinesIntensity = 0.0;
    }, duration * 1000);
  }

  setSpeedLines(intensity: number): void {
    this.speedLinesIntensity = Math.min(1.0, Math.max(0.0, intensity));
  }

  /**
   * Trigger hit chromatic vibration.
   */
  triggerChromaticImpact(intensity: number = 1.0): void {
    this.chromaticTimer = 0.18 * intensity;
  }

  /**
   * Set combat vignette intensity (0 = none, 1 = heavy darkening).
   */
  setVignette(intensity: number): void {
    this.vignetteIntensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Set bloom glow intensity.
   */
  setBloom(intensity: number): void {
    this.bloomIntensity = Math.max(0, Math.min(2, intensity));
  }

  /**
   * Set radial blur (0-1). Call with camera's radialBlurIntensity.
   */
  setRadialBlur(amount: number): void {
    this.radialBlurAmount = Math.max(0, Math.min(1, amount));
  }

  /**
   * Render the scene through the Wuxia cinematic post-processing pipeline.
   */
  render(scene: THREE.Scene, camera: THREE.Camera, dt: number = 0.016): void {
    this.totalTime += dt;
    this.material.uniforms.uTime.value = this.totalTime;

    // Decay Screen Timers
    if (this.parryFlashTimer > 0) {
      this.parryFlashTimer -= dt;
      this.material.uniforms.uParryFlash.value = Math.max(0.0, this.parryFlashTimer / 0.18);
    } else {
      this.material.uniforms.uParryFlash.value = 0.0;
    }

    if (this.chromaticTimer > 0) {
      this.chromaticTimer -= dt;
      this.material.uniforms.uChromaticOffset.value = Math.max(0.0, this.chromaticTimer / 0.18);
    } else {
      this.material.uniforms.uChromaticOffset.value = 0.0;
    }

    this.material.uniforms.uSpeedLines.value = this.speedLinesIntensity;
    this.material.uniforms.uVignette.value = this.vignetteIntensity;
    this.material.uniforms.uBloom.value = this.bloomIntensity;
    this.material.uniforms.uRadialBlur.value = this.radialBlurAmount;

    // Update camera uniforms
    if (camera instanceof THREE.PerspectiveCamera) {
      this.material.uniforms.uCameraNear.value = camera.near;
      this.material.uniforms.uCameraFar.value = camera.far;

      // Project sun position to screen space for Where Winds Meet god rays
      MonochromePostProcess._scratchSunProj.copy(MonochromePostProcess._scratchSunPos).project(camera);
      this.material.uniforms.uSunScreenPos.value.set(
        (MonochromePostProcess._scratchSunProj.x + 1) * 0.5,
        (MonochromePostProcess._scratchSunProj.y + 1) * 0.5
      );
      this.material.uniforms.uSunOnScreen.value = MonochromePostProcess._scratchSunProj.z < 1.0 ? 1.0 : 0.0;
    }

    // Render scene to color render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);

    // Apply post-processing
    this.material.uniforms.tDiffuse.value = this.renderTarget.texture;
    this.material.uniforms.tDepth.value = this.renderTarget.depthTexture || null;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  /**
   * Update render target size on window resize.
   */
  setSize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
  }

  /**
   * Update settings at runtime.
   */
  updateSettings(settings: Partial<MonochromeSettings>): void {
    Object.assign(this.settings, settings);
    const u = this.material.uniforms;
    u.uPixelSize.value = this.settings.pixelSize;
    u.uDitherStrength.value = this.settings.ditherStrength;
    u.uThreshold.value = this.settings.threshold;
    u.uEdgeStrength.value = this.settings.edgeStrength;
    u.uEdgeColor.value = this.settings.edgeColor;
    u.uFogNear.value = this.settings.fogNear;
    u.uFogFar.value = this.settings.fogFar;
    u.uFogToWhite.value = this.settings.fogToWhite ? 1.0 : 0.0;
    u.uDitherEnabled.value = this.settings.ditherEnabled ? 1.0 : 0.0;
    u.uEdgesEnabled.value = this.settings.edgesEnabled ? 1.0 : 0.0;
    if (this.settings.inkMode !== undefined) {
      u.uInkMode.value = this.settings.inkMode;
    }
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
    this.bayerTexture.dispose();
  }
}
