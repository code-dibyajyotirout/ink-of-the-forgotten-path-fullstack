import { vi } from 'vitest';

// Mock howler
vi.mock('howler', () => {
  return {
    Howl: vi.fn().mockImplementation(() => {
      return {
        play: vi.fn(),
        stop: vi.fn(),
        volume: vi.fn(),
        pos: vi.fn(),
        pannerAttr: vi.fn(),
      };
    }),
    Howler: {
      volume: vi.fn(),
      mute: vi.fn(),
    },
  };
});

// Mock browser / DOM APIs needed by Three.js and the game engine
class MockAudioContext {
  currentTime = 0;
  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    };
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        connect: vi.fn(),
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  destination = {};
}

global.window.AudioContext = MockAudioContext as any;
(global.window as any).webkitAudioContext = MockAudioContext;

// Mock canvas and WebGL context
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId) => {
  if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
    return {
      getParameter: vi.fn(),
      getExtension: vi.fn(),
      createProgram: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(),
      getShaderInfoLog: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(),
      getProgramInfoLog: vi.fn(),
      useProgram: vi.fn(),
      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      depthFunc: vi.fn(),
      blendFunc: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texParameteri: vi.fn(),
      texImage2D: vi.fn(),
    };
  }
  return null;
});

// Mock requestPointerLock on canvas
HTMLCanvasElement.prototype.requestPointerLock = vi.fn().mockImplementation(() => {
  return Promise.resolve();
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
