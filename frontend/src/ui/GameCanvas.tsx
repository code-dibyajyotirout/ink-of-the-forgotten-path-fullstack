/**
 * GameCanvas — React wrapper for the Three.js game engine.
 * Mounts the canvas element and manages the GameEngine lifecycle.
 * Includes a cinematic loading screen that fades once the engine is ready.
 */
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { GameEngine } from "@/engine/GameEngine";
import { HUD } from "@/ui/HUD";
import { useGameStore } from "@/stores/gameStore";
import { PROFESSIONS } from "@/data/professions";

/**
 * Dynamic Crosshair — turns red and expands when aim-assist locks onto an enemy.
 */
function CrosshairOverlay() {
  const isLocked = useGameStore((s) => s.aimAssistLocked);
  const targetName = useGameStore((s) => s.aimAssistTargetName);
  const isAiming = useGameStore((s) => s.isAiming);
  const isMounted = useGameStore((s) => s.dragon.isMounted);

  if (isMounted || isAiming) return null;

  const color = isLocked ? "rgba(239, 68, 68, 0.95)" : "rgba(255, 255, 255, 0.7)";
  const dotColor = isLocked ? "rgba(239, 68, 68, 1)" : "rgba(255, 255, 255, 0.9)";
  const size = isLocked ? 26 : 20;
  const dotSize = isLocked ? 5 : 3;
  const thickness = isLocked ? 2 : 1.5;

  return (
    <div className="crosshair-overlay">
      <div className="crosshair-h" style={{
        width: `${size}px`, height: `${thickness}px`, background: color,
        boxShadow: isLocked ? `0 0 8px ${color}` : "none",
      }} />
      <div className="crosshair-v" style={{
        width: `${thickness}px`, height: `${size}px`, background: color,
        boxShadow: isLocked ? `0 0 8px ${color}` : "none",
      }} />
      <div className="crosshair-dot" style={{
        width: `${dotSize}px`, height: `${dotSize}px`, background: dotColor,
        boxShadow: isLocked ? `0 0 12px ${dotColor}, 0 0 4px ${dotColor}` : "none",
      }} />
      {/* Aim-assist target diamond brackets */}
      {isLocked && (
        <div className="crosshair-lock-ring" />
      )}
      {/* Target name label */}
      {isLocked && targetName && (
        <div className="crosshair-target-name">{targetName}</div>
      )}
    </div>
  );
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [awakeningBanner, setAwakeningBanner] = useState<{
    name: string;
    kanji: string;
    archetype: string;
    weaponArt: string;
  } | null>(null);

  const isCinematicIntroActive = useGameStore((s) => s.cinematicIntroActive);

  const handleSkipIntro = useCallback(() => {
    engineRef.current?.skipCinematicIntro();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCinematicIntroActive) {
        handleSkipIntro();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCinematicIntroActive, handleSkipIntro]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine();
    engine.init(canvasRef.current);
    engine.start();
    engineRef.current = engine;

    // Check if player just transitioned from the flashback awakening
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const isAwaken = urlParams.get("awaken") === "1" || sessionStorage.getItem("trigger_awakening") === "1";
      if (isAwaken) {
        sessionStorage.removeItem("trigger_awakening");
        // Clean URL to prevent recurring awakening loops
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}
        const profId = useGameStore.getState().player.profession || "sword_sage";
        const prof = PROFESSIONS[profId];

        const bannerTimer = setTimeout(() => {
          setAwakeningBanner({
            name: prof.name,
            kanji: prof.kanji,
            archetype: prof.weaponArchetype,
            weaponArt: prof.chargedSkillName,
          });
          setTimeout(() => {
            setAwakeningBanner(null);
          }, 3500);
        }, 50);
        return () => clearTimeout(bannerTimer);
      }
    }

    // Request pointer lock on click for continuous 360-degree mouse look
    const canvas = canvasRef.current;
    const handleClick = () => {
      if (document.pointerLockElement === canvas) return;
      if (!document.contains(canvas)) {
        canvas.focus();
        return;
      }
      try {
        const promise = canvas.requestPointerLock?.() as any;
        if (promise && promise.catch) {
          promise.catch((err: any) => {
            // Transient rejection (e.g. rate limit, rapid clicking) — do not permanently disable
            console.debug("Pointer lock request deferred:", err?.message || err);
          });
        }
      } catch (e) {
        console.debug("Pointer lock invocation error:", e);
      }
      canvas.focus();
      window.focus();
      // Resume gameplay movement if paused without an active modal
      if (useGameStore.getState().ui.isPaused) {
        useGameStore.getState().setPaused(false);
      }
    };
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousedown", handleClick);
    canvas.addEventListener("pointerdown", handleClick);

    // Initial autofocus
    canvas.focus();
    window.focus();

    // Prevent context menu
    const handleContextMenu = (e: Event) => e.preventDefault();
    canvas.addEventListener("contextmenu", handleContextMenu);

    // Fade out loading screen after engine is initialized
    (window as any).__gameStore = useGameStore;
    (window as any).__forceReady = () => {
      setFadeOut(true);
      setIsLoading(false);
    };

    const loadTimer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setIsLoading(false), 800);
    }, 1200);

    const handleViewportResize = () => {
      engine.onResize();
    };
    window.addEventListener("resize", handleViewportResize);
    window.addEventListener("orientationchange", handleViewportResize);
    document.addEventListener("fullscreenchange", handleViewportResize);

    return () => {
      clearTimeout(loadTimer);
      window.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("orientationchange", handleViewportResize);
      document.removeEventListener("fullscreenchange", handleViewportResize);
      engine.dispose();
      engineRef.current = null;
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousedown", handleClick);
      canvas.removeEventListener("pointerdown", handleClick);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  const getFPS = useCallback(() => {
    return engineRef.current?.getFPS() ?? 0;
  }, []);

  const onSetTimeOfDay = useCallback((hour: number) => {
    engineRef.current?.setTimeOfDay(hour);
  }, []);

  const onSetTimeSpeed = useCallback((speed: number) => {
    engineRef.current?.setTimeSpeed(speed);
  }, []);

  return (
    <div className="game-viewport">
      <canvas ref={canvasRef} className="game-canvas" tabIndex={0} />
      {!isLoading && <HUD getFPS={getFPS} onSetTimeOfDay={onSetTimeOfDay} onSetTimeSpeed={onSetTimeSpeed} />}

      {/* Center Crosshair — Dynamic: turns red when aim-assist locks a target */}
      {!isLoading && (
        <CrosshairOverlay />
      )}

      {/* 3D Awakening Descent Cinematic Banner */}
      {awakeningBanner && (
        <div className="awakening-cinema-banner">
          <div className="banner-pulse-bg" />
          <span className="banner-super-badge">THE RELIC AWAKENS · 天命神兵覺醒</span>
          <h1 className="banner-weapon-title">
            <span className="banner-kanji">{awakeningBanner.kanji}</span> {awakeningBanner.name}
          </h1>
          <p className="banner-archetype">{awakeningBanner.archetype}</p>
          <div className="banner-art-tag">
            <span className="art-label">AWAKENED ART:</span> {awakeningBanner.weaponArt}
          </div>
        </div>
      )}

      {/* Cinematic Intro Letterbox Bars & Skip Button */}
      {isCinematicIntroActive && (
        <div className="cinematic-intro-overlay">
          <div className="cinema-bar cinema-bar-top" />
          <div className="cinema-bar cinema-bar-bottom" />
          <button
            className="cinema-skip-btn"
            onClick={handleSkipIntro}
            title="Skip Cinematic Sequence"
          >
            <span>Skip Cinematic</span>
            <kbd>ESC</kbd>
          </button>
        </div>
      )}

      {/* Loading Screen */}
      {isLoading && (
        <div className={`game-loading-screen ${fadeOut ? "fade-out" : ""}`}>
          <div className="loading-content">
            <div className="loading-kanji">墨</div>
            <div className="loading-title">Ink of the Forgotten Path</div>
            <div className="loading-bar-container">
              <div className="loading-bar-fill" />
            </div>
            <div className="loading-hint">Preparing the ink wash world...</div>
          </div>
        </div>
      )}

      <style>{`
        .game-viewport {
          position: fixed !important;
          inset: 0 !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          width: 100dvw !important;
          height: 100dvh !important;
          overflow: hidden !important;
          background: #000;
          z-index: 1;
        }

        .game-canvas {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          cursor: crosshair;
        }

        .crosshair-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 50;
          mix-blend-mode: difference;
        }

        .crosshair-h {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.15s ease, background 0.15s ease;
        }

        .crosshair-v {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: height 0.15s ease, background 0.15s ease;
        }

        .crosshair-dot {
          position: absolute;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.15s ease, height 0.15s ease, background 0.15s ease;
        }

        .crosshair-lock-ring {
          position: absolute;
          width: 32px;
          height: 32px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          border: 1.5px solid rgba(239, 68, 68, 0.85);
          border-radius: 2px;
          animation: lockRingSpin 2.5s linear infinite;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
        }

        @keyframes lockRingSpin {
          0% { transform: translate(-50%, -50%) rotate(45deg) scale(1); }
          50% { transform: translate(-50%, -50%) rotate(225deg) scale(1.08); }
          100% { transform: translate(-50%, -50%) rotate(405deg) scale(1); }
        }

        .crosshair-target-name {
          position: absolute;
          top: calc(50% + 28px);
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(239, 68, 68, 0.9);
          text-shadow: 0 0 8px rgba(239, 68, 68, 0.5), 0 1px 3px rgba(0, 0, 0, 0.8);
          white-space: nowrap;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }

        .game-loading-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.8s ease-out;
        }

        .game-loading-screen.fade-out {
          opacity: 0;
          pointer-events: none;
        }

        .loading-content {
          text-align: center;
          color: #ccc;
          font-family: "Noto Serif", "Georgia", serif;
        }

        .loading-kanji {
          font-size: 72px;
          color: #888;
          margin-bottom: 16px;
          animation: ink-pulse 1.5s ease-in-out infinite alternate;
        }

        .loading-title {
          font-size: 22px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #999;
          margin-bottom: 32px;
        }

        .loading-bar-container {
          width: 200px;
          height: 3px;
          background: #333;
          margin: 0 auto 20px;
          border-radius: 2px;
          overflow: hidden;
        }

        .loading-bar-fill {
          height: 100%;
          background: #888;
          width: 0%;
          animation: loading-progress 1.2s ease-out forwards;
        }

        .loading-hint {
          font-size: 13px;
          color: #555;
          font-style: italic;
        }

        @keyframes ink-pulse {
          0% { opacity: 0.4; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1.05); }
        }

        @keyframes loading-progress {
          0% { width: 0%; }
          50% { width: 60%; }
          100% { width: 100%; }
        }

        /* ─── 3D Awakening Cinema Banner ─── */
        .awakening-cinema-banner {
          position: fixed;
          top: 15%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 999;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px 44px;
          background: rgba(10, 14, 24, 0.88);
          border: 2px solid #f59e0b;
          border-radius: 12px;
          box-shadow: 0 0 50px rgba(245, 158, 11, 0.5), 0 20px 40px rgba(0,0,0,0.8);
          backdrop-filter: blur(12px);
          animation: awakeningBannerEntry 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both,
                     awakeningBannerExit 0.8s ease-in 3.4s forwards;
          pointer-events: none;
          text-align: center;
        }

        @keyframes awakeningBannerEntry {
          from { transform: translateX(-50%) scale(0.6) translateY(-40px); opacity: 0; filter: blur(10px); }
          to { transform: translateX(-50%) scale(1) translateY(0); opacity: 1; filter: blur(0); }
        }

        @keyframes awakeningBannerExit {
          from { opacity: 1; transform: translateX(-50%) scale(1); }
          to { opacity: 0; transform: translateX(-50%) scale(1.08) translateY(-20px); filter: blur(8px); }
        }

        .banner-super-badge {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #fbbf24;
          text-shadow: 0 0 12px rgba(251, 191, 36, 0.8);
        }

        .banner-weapon-title {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
          margin: 0;
          letter-spacing: 2px;
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
        }

        .banner-kanji {
          color: #f59e0b;
          font-family: serif;
          font-size: 38px;
          margin-right: 6px;
        }

        .banner-archetype {
          font-size: 13px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0;
          font-weight: 700;
        }

        .banner-art-tag {
          margin-top: 6px;
          padding: 4px 14px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          color: #f8fafc;
        }

        .art-label {
          color: #fbbf24;
          margin-right: 4px;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .cinematic-intro-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 999;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .cinema-bar {
          width: 100%;
          height: 8.5vh;
          background: #000000;
          pointer-events: auto;
          box-shadow: 0 0 24px rgba(0, 0, 0, 0.9);
          animation: cinemaBarSlide 0.8s ease-out;
        }

        @keyframes cinemaBarSlide {
          from { opacity: 0; transform: scaleY(0); }
          to { opacity: 1; transform: scaleY(1); }
        }

        .cinema-skip-btn {
          position: absolute;
          top: 10.5vh;
          right: 24px;
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          color: #f8fafc;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        }

        .cinema-skip-btn:hover {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(245, 158, 11, 0.6);
          color: #fbbf24;
          transform: translateY(-1px);
        }

        .cinema-skip-btn kbd {
          padding: 2px 6px;
          font-size: 10px;
          font-family: monospace;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
