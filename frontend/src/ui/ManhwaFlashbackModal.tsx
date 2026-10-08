/**
 * ManhwaFlashbackModal — Cinematic Korean/Murim action webtoon flashback reader
 * with real-time motion graphics animation engine (speedlines, drifting embers,
 * dynamic sword qi slash beams, particle vortex, and 3D reality shatter dive).
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ProfessionDef } from "@/data/professions";

interface ManhwaFlashbackModalProps {
  weapon: ProfessionDef;
  onComplete: () => void;
  onSkip?: () => void;
  isReplay?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  type: "ember" | "ink" | "spark";
}

interface SlashBeam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  color: string;
  width: number;
}

interface GlassShard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  points: number[][];
  color: string;
  alpha: number;
}

export function ManhwaFlashbackModal({
  weapon,
  onComplete,
  onSkip,
  isReplay = false,
}: ManhwaFlashbackModalProps) {
  const panels = weapon.manhwaFlashback || [];
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [isAwakening, setIsAwakening] = useState(false);
  const [isDivingTo3D, setIsDivingTo3D] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [screenShake, setScreenShake] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const particlesRef = useRef<Particle[]>([]);
  const slashesRef = useRef<SlashBeam[]>([]);
  const shardsRef = useRef<GlassShard[]>([]);

  const activePanel = panels[currentPanelIndex] || panels[0];
  const isLastPanel = currentPanelIndex === panels.length - 1;
  const themeColor = weapon.weaponColor || "#f59e0b";

  // Trigger brief screen shake and slash beam
  const triggerImpact = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 350);

    // Spawn 1-2 dynamic sword qi slashes
    if (canvasRef.current) {
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;
      const angle = Math.random() * Math.PI;
      const cx = w / 2 + (Math.random() - 0.5) * (w * 0.4);
      const cy = h / 2 + (Math.random() - 0.5) * (h * 0.4);
      const length = Math.max(w, h) * 1.2;

      slashesRef.current.push({
        x1: cx - Math.cos(angle) * length * 0.5,
        y1: cy - Math.sin(angle) * length * 0.5,
        x2: cx + Math.cos(angle) * length * 0.5,
        y2: cy + Math.sin(angle) * length * 0.5,
        progress: 0,
        color: activePanel?.visualTheme?.accentColor || themeColor,
        width: Math.random() * 6 + 4,
      });
    }
  }, [activePanel, themeColor]);

  // Awaken & Reality Shatter into 3D World
  const triggerAwakeningAndDive = useCallback(() => {
    if (isAwakening) return;
    setIsAwakening(true);
    triggerImpact();

    // Spawn 3D shattered glass shards
    if (canvasRef.current) {
      const w = canvasRef.current.width;
      const h = canvasRef.current.height;
      const shards: GlassShard[] = [];
      const count = 36;
      for (let i = 0; i < count; i++) {
        const rad = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 6;
        const pts: number[][] = [];
        const numPts = 3 + Math.floor(Math.random() * 3);
        const shardSize = Math.random() * 60 + 25;
        for (let p = 0; p < numPts; p++) {
          const a = (p / numPts) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          const r = shardSize * (0.5 + Math.random() * 0.5);
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        shards.push({
          x: w / 2 + (Math.random() - 0.5) * 100,
          y: h / 2 + (Math.random() - 0.5) * 100,
          vx: Math.cos(rad) * speed,
          vy: Math.sin(rad) * speed,
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.15,
          size: shardSize,
          points: pts,
          color: Math.random() > 0.4 ? themeColor : "#ffffff",
          alpha: 1.0,
        });
      }
      shardsRef.current = shards;
    }

    // Phase 1: Shockwave & reality fracture (400ms)
    setTimeout(() => {
      setIsDivingTo3D(true);
    }, 450);

    // Phase 2: Hyperspace dive into 3D world (1050ms)
    setTimeout(() => {
      onComplete();
    }, 1100);
  }, [isAwakening, triggerImpact, onComplete, themeColor]);

  // Handle panel navigation
  const handleNext = useCallback(() => {
    if (isLastPanel) {
      triggerAwakeningAndDive();
    } else {
      setCurrentPanelIndex((idx) => idx + 1);
      triggerImpact();
    }
  }, [isLastPanel, triggerImpact, triggerAwakeningAndDive]);

  const handlePrev = useCallback(() => {
    if (currentPanelIndex > 0) {
      setCurrentPanelIndex((idx) => idx - 1);
      triggerImpact();
    }
  }, [currentPanelIndex, triggerImpact]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(() => {
      if (currentPanelIndex < panels.length - 1) {
        handleNext();
      } else {
        setAutoPlay(false);
      }
    }, 4200);
    return () => clearTimeout(timer);
  }, [autoPlay, currentPanelIndex, panels.length, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.code === "Escape") {
        e.preventDefault();
        if (onSkip) onSkip();
        else onComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onSkip, onComplete]);

  // ─── Motion Graphics Canvas Engine ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Initialize particles
    const particles: Particle[] = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2.0 - 0.5,
        size: Math.random() * 3.5 + 1.2,
        alpha: Math.random() * 0.7 + 0.3,
        color: Math.random() > 0.5 ? themeColor : "#f8fafc",
        type: Math.random() > 0.4 ? "ember" : "ink",
      });
    }
    particlesRef.current = particles;

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // 1. Dynamic Animated Radial Speedlines
      const numLines = isAwakening ? 64 : 32;
      const lineLen = Math.max(width, height) * 0.8;
      ctx.save();
      ctx.lineWidth = isAwakening ? 2.5 : 1.2;

      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2 + Math.sin(time * 2 + i) * 0.04;
        const distOffset = 180 + (Math.sin(time * 5 + i * 3) * 60 + 60);
        const x1 = cx + Math.cos(angle) * distOffset;
        const y1 = cy + Math.sin(angle) * distOffset;
        const x2 = cx + Math.cos(angle) * lineLen;
        const y2 = cy + Math.sin(angle) * lineLen;

        ctx.strokeStyle = isAwakening
          ? `rgba(245, 158, 11, ${0.15 + (Math.sin(time * 10 + i) + 1) * 0.15})`
          : `rgba(255, 255, 255, ${0.04 + (Math.sin(time * 4 + i) + 1) * 0.04})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Drifting Qi Embers & Ink Splatters
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.globalAlpha = p.alpha * (0.6 + Math.sin(time * 3 + p.x) * 0.4);
        if (p.type === "ember") {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Ink droplet with fluid elongation
          ctx.fillStyle = "#020617";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 1.5, p.size * 0.8, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 3. Dynamic Sword Qi Laser Slashes (劍氣)
      for (let s = slashesRef.current.length - 1; s >= 0; s--) {
        const slash = slashesRef.current[s];
        slash.progress += 0.045;

        if (slash.progress >= 1.0) {
          slashesRef.current.splice(s, 1);
          continue;
        }

        ctx.save();
        const curAlpha = Math.sin(slash.progress * Math.PI);
        ctx.globalAlpha = curAlpha;
        ctx.shadowColor = slash.color;
        ctx.shadowBlur = 24;

        // Core bright slash beam
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = slash.width * (1 - slash.progress * 0.5);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(slash.x1, slash.y1);
        ctx.lineTo(slash.x2, slash.y2);
        ctx.stroke();

        // Outer chromatic aura
        ctx.strokeStyle = slash.color;
        ctx.lineWidth = slash.width * 2.2;
        ctx.beginPath();
        ctx.moveTo(slash.x1, slash.y1);
        ctx.lineTo(slash.x2, slash.y2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Shattered Reality Glass Fragments (During 3D Dive)
      if (shardsRef.current.length > 0) {
        for (let g = 0; g < shardsRef.current.length; g++) {
          const sh = shardsRef.current[g];
          sh.x += sh.vx;
          sh.y += sh.vy;
          sh.rot += sh.vRot;
          sh.alpha = Math.max(0, sh.alpha - 0.012);

          ctx.save();
          ctx.translate(sh.x, sh.y);
          ctx.rotate(sh.rot);
          ctx.globalAlpha = sh.alpha;
          ctx.shadowColor = sh.color;
          ctx.shadowBlur = 12;

          ctx.fillStyle = "rgba(10, 15, 25, 0.75)";
          ctx.strokeStyle = sh.color;
          ctx.lineWidth = 1.5;

          ctx.beginPath();
          sh.points.forEach(([px, py], i) => {
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [themeColor, isAwakening]);

  if (!activePanel) return null;

  return (
    <div
      className={`manhwa-overlay ${screenShake ? "screen-shake" : ""} ${
        isAwakening ? "awakening-mode" : ""
      } ${isDivingTo3D ? "hyperspace-dive" : ""}`}
      style={
        {
          "--theme-color": themeColor,
          "--mood-color": activePanel.visualTheme.moodColor,
          "--accent-color": activePanel.visualTheme.accentColor,
        } as React.CSSProperties
      }
    >
      {/* Dynamic 60fps Motion Graphics Canvas */}
      <canvas ref={canvasRef} className="manhwa-motion-canvas" />

      {/* Screen Vignette and Halftone Texture */}
      <div className="halftone-overlay" />
      <div className="cinematic-vignette" />

      {/* Top Header Bar */}
      <header className="manhwa-header">
        <div className="header-left">
          <span className="weapon-badge-icon">{weapon.icon}</span>
          <div className="header-titles">
            <span className="chapter-badge">{activePanel.chapterBadge}</span>
            <h2 className="weapon-header-name">
              {weapon.name}{" "}
              <span className="kanji-sub">({weapon.kanji})</span>
            </h2>
          </div>
        </div>

        <div className="header-actions">
          <button
            className={`btn-header-ghost ${autoPlay ? "active" : ""}`}
            onClick={() => setAutoPlay(!autoPlay)}
            title="Auto-advance panels"
          >
            {autoPlay ? "Auto: ON" : "Auto: OFF"}
          </button>
          <button
            className="btn-header-skip"
            onClick={onSkip || triggerAwakeningAndDive}
          >
            {isReplay ? "Close Memory" : "Skip to 3D World"}
          </button>
        </div>
      </header>

      {/* Main Comic Panel Frame */}
      <div className="manhwa-stage">
        <div
          key={activePanel.id}
          className="comic-panel-frame"
          style={{ background: activePanel.visualTheme.bgGradient }}
        >
          {/* Panel Header Strip */}
          <div className="panel-header-strip">
            <span className="panel-number">
              EPISODE #{activePanel.order} OF {panels.length}
            </span>
            <span className="panel-scene-title">{activePanel.sceneTitle}</span>
          </div>

          {/* Graphic Artwork Illustration with Ken-Burns Motion */}
          <div className="panel-artwork ken-burns-active">
            <PanelGraphic
              type={activePanel.visualTheme.artIllustration}
              accent={activePanel.visualTheme.accentColor}
            />

            {/* Kinetic Onomatopoeia SFX Decal */}
            {activePanel.sfx && (
              <div
                className={`manhwa-sfx-container sfx-${activePanel.sfx.style} sfx-kinetic-entry`}
              >
                <div className="sfx-korean">{activePanel.sfx.korean}</div>
                <div className="sfx-english">{activePanel.sfx.english}</div>
              </div>
            )}
          </div>

          {/* Narration & Speech Bubbles */}
          <div className="panel-narrative-box">
            {activePanel.narrationLines.map((line, idx) => (
              <p key={idx} className="narration-line">
                {line}
              </p>
            ))}

            {activePanel.dialogue && (
              <div
                className={`speech-bubble ${
                  activePanel.dialogue.isShout ? "shout-bubble" : ""
                }`}
              >
                <div className="speech-speaker">{activePanel.dialogue.speaker}</div>
                <div className="speech-text">
                  &ldquo;{activePanel.dialogue.text}&rdquo;
                </div>
              </div>
            )}
          </div>

          {/* Episode Progress Pips */}
          <div className="panel-progress-strip">
            {panels.map((p, idx) => (
              <button
                key={p.id}
                className={`progress-pill ${idx === currentPanelIndex ? "active" : ""}`}
                onClick={() => {
                  setCurrentPanelIndex(idx);
                  triggerImpact();
                }}
                aria-label={`Jump to episode ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Comic Navigation Bar */}
      <footer className="manhwa-footer">
        <button
          className="nav-btn btn-prev"
          onClick={handlePrev}
          disabled={currentPanelIndex === 0}
        >
          Previous Panel
        </button>

        <div className="footer-center-hint">
          <span>
            {isLastPanel
              ? "CLIMAX: AWAKEN THE WEAPON AND DIVE INTO THE 3D BATTLEFIELD"
              : "Press [Space] or click Next to advance weapon lore"}
          </span>
        </div>

        <button
          className={`nav-btn btn-next ${isLastPanel ? "btn-awaken-pulse" : ""}`}
          onClick={handleNext}
        >
          {isLastPanel ? "AWAKEN BLADE & DIVE TO 3D WORLD" : "Next Panel"}
        </button>
      </footer>

      <style>{`
        .manhwa-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: #030712;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
          transition: filter 0.5s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .screen-shake {
          animation: cameraShake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }

        @keyframes cameraShake {
          10%, 90% { transform: translate3d(-3px, 0, 0) scale(1.005); }
          20%, 80% { transform: translate3d(5px, 2px, 0); }
          30%, 50%, 70% { transform: translate3d(-6px, -3px, 0); }
          40%, 60% { transform: translate3d(6px, 3px, 0); }
        }

        .awakening-mode {
          filter: brightness(1.8) contrast(1.4);
        }

        .hyperspace-dive {
          transform: scale(2.8);
          opacity: 0;
          filter: brightness(4) blur(10px);
          transition: transform 0.9s cubic-bezier(0.7, 0, 0.84, 0), opacity 0.8s ease, filter 0.8s ease;
          pointer-events: none;
        }

        /* ─── Motion Graphics Canvas ─── */
        .manhwa-motion-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
        }

        .halftone-overlay {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 0);
          background-size: 6px 6px;
          pointer-events: none;
          z-index: 1;
        }

        .cinematic-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, transparent 30%, rgba(2, 6, 23, 0.9) 100%);
          pointer-events: none;
          z-index: 1;
        }

        /* ─── Header ─── */
        .manhwa-header {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 28px;
          background: rgba(10, 15, 26, 0.85);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .weapon-badge-icon {
          font-size: 26px;
          filter: drop-shadow(0 0 10px var(--theme-color));
        }

        .header-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .chapter-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
          color: var(--accent-color);
          text-transform: uppercase;
        }

        .weapon-header-name {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
          letter-spacing: 1px;
          color: #f8fafc;
        }

        .kanji-sub {
          font-family: serif;
          color: var(--accent-color);
          font-size: 15px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .btn-header-ghost {
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-header-ghost.active {
          background: rgba(245, 158, 11, 0.2);
          border-color: #f59e0b;
          color: #fbbf24;
        }

        .btn-header-skip {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: #f8fafc;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-header-skip:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: #fff;
        }

        /* ─── Comic Stage ─── */
        .manhwa-stage {
          position: relative;
          z-index: 5;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 30px;
          min-height: 0;
        }

        .comic-panel-frame {
          position: relative;
          width: 100%;
          max-width: 900px;
          height: 100%;
          max-height: 600px;
          border: 2px solid rgba(255, 255, 255, 0.25);
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.15);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: panelPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes panelPopIn {
          from { transform: scale(0.96) translateY(10px); opacity: 0.2; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .panel-header-strip {
          display: flex;
          justify-content: space-between;
          padding: 10px 18px;
          background: rgba(0, 0, 0, 0.6);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .panel-scene-title {
          color: #f8fafc;
        }

        .panel-artwork {
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .ken-burns-active {
          animation: kenBurnsZoom 8s ease-out infinite alternate;
        }

        @keyframes kenBurnsZoom {
          from { transform: scale(1); }
          to { transform: scale(1.06); }
        }

        /* ─── Kinetic Onomatopoeia SFX ─── */
        .manhwa-sfx-container {
          position: absolute;
          right: 32px;
          bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-shadow: 0 0 25px rgba(0,0,0,0.9), 0 0 15px var(--accent-color);
          transform: rotate(-4deg);
          pointer-events: none;
        }

        .sfx-kinetic-entry {
          animation: sfxSlam 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }

        @keyframes sfxSlam {
          0% { transform: scale(2.2) rotate(12deg); opacity: 0; filter: blur(6px); }
          70% { transform: scale(0.92) rotate(-6deg); opacity: 1; filter: blur(0); }
          100% { transform: scale(1) rotate(-4deg); opacity: 1; }
        }

        .sfx-korean {
          font-size: 52px;
          font-weight: 900;
          letter-spacing: 4px;
          line-height: 1;
          color: #f8fafc;
          -webkit-text-stroke: 2px #000;
        }

        .sfx-english {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--accent-color);
          -webkit-text-stroke: 1px #000;
        }

        /* ─── Narrative Box ─── */
        .panel-narrative-box {
          padding: 16px 22px;
          background: rgba(3, 7, 18, 0.85);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .narration-line {
          font-size: 14px;
          line-height: 1.6;
          color: #e2e8f0;
          margin: 0;
          font-style: italic;
          border-left: 3px solid var(--accent-color);
          padding-left: 12px;
        }

        .speech-bubble {
          background: rgba(255, 255, 255, 0.95);
          color: #020617;
          border-radius: 8px;
          padding: 10px 14px;
          max-width: 480px;
          align-self: flex-start;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }

        .shout-bubble {
          border: 2px dashed #dc2626;
          background: #fff;
          transform: rotate(-1deg);
        }

        .speech-speaker {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #b45309;
          margin-bottom: 2px;
        }

        .speech-text {
          font-size: 13px;
          font-weight: 700;
          line-height: 1.4;
        }

        /* ─── Progress Strip ─── */
        .panel-progress-strip {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          background: rgba(0,0,0,0.5);
        }

        .progress-pill {
          width: 28px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .progress-pill.active {
          background: var(--accent-color);
          width: 44px;
          box-shadow: 0 0 10px var(--accent-color);
        }

        /* ─── Footer Navigation ─── */
        .manhwa-footer {
          position: relative;
          z-index: 10;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: rgba(10, 15, 26, 0.9);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-prev {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #cbd5e1;
        }

        .btn-prev:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
        }

        .btn-prev:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .footer-center-hint {
          font-size: 12px;
          font-weight: 700;
          color: #94a3b8;
          text-align: center;
        }

        .btn-next {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          color: #000;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
        }

        .btn-next:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(245, 158, 11, 0.5);
        }

        .btn-awaken-pulse {
          background: linear-gradient(135deg, #ef4444, #f59e0b) !important;
          color: #fff !important;
          animation: awakenPulseBtn 1.2s infinite alternate !important;
          box-shadow: 0 0 25px rgba(239, 68, 68, 0.6) !important;
        }

        @keyframes awakenPulseBtn {
          from { transform: scale(1); box-shadow: 0 0 15px rgba(245, 158, 11, 0.4); }
          to { transform: scale(1.05); box-shadow: 0 0 35px rgba(239, 68, 68, 0.8); }
        }

        @media (max-width: 768px) {
          .comic-panel-frame { max-height: 480px; }
          .sfx-korean { font-size: 36px; }
          .sfx-english { font-size: 16px; }
          .manhwa-header { padding: 10px 16px; }
          .manhwa-footer { padding: 12px 16px; }
          .footer-center-hint { display: none; }
        }
      `}</style>
    </div>
  );
}

// ─── Procedural Graphic Artwork Illustrations ───

function PanelGraphic({ type, accent }: { type: string; accent: string }) {
  if (type === "blade_ground") {
    return (
      <svg className="art-svg" viewBox="0 0 600 360" fill="none">
        <defs>
          <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <filter id="glowEffect">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Mountain ridge silhouette */}
        <polygon points="0,260 120,200 240,240 380,180 500,230 600,190 600,360 0,360" fill="#090d16" />
        <polygon points="0,290 180,240 340,280 480,230 600,270 600,360 0,360" fill="#04070e" />

        {/* Ground debris lines */}
        <line x1="140" y1="290" x2="460" y2="290" stroke="#1e293b" strokeWidth="2" />
        <line x1="200" y1="310" x2="400" y2="310" stroke="#1e293b" strokeWidth="1" />

        {/* Giant Greatsword Thrust into the Ground */}
        <g transform="rotate(-18 300 220)">
          {/* Blade shadow & glow */}
          <polygon points="295,40 305,40 307,240 300,280 293,240" fill="url(#bladeGrad)" filter="url(#glowEffect)" />
          {/* Fuller line */}
          <line x1="300" y1="60" x2="300" y2="230" stroke={accent} strokeWidth="2" opacity="0.8" />
          {/* Tsuba guard */}
          <rect x="280" y="36" width="40" height="8" rx="2" fill="#d97706" />
          {/* Wrapped Hilt */}
          <rect x="296" y="-30" width="8" height="66" rx="2" fill="#1e293b" />
          <circle cx="300" cy="-32" r="5" fill="#d97706" />
        </g>
      </svg>
    );
  }

  if (type === "demon_silhouette" || type === "army_clash") {
    return (
      <svg className="art-svg" viewBox="0 0 600 360" fill="none">
        <defs>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        {/* Jagged cliff */}
        <polygon points="40,360 140,210 220,250 360,190 480,240 600,160 600,360" fill="#020617" />

        {/* Demonic Horned Silhouette */}
        <path
          d="M 280 180 C 270 140, 260 110, 240 90 C 255 105, 270 125, 285 150 C 290 120, 310 120, 315 150 C 330 125, 345 105, 360 90 C 340 110, 330 140, 320 180 Z"
          fill="#0a0a0f"
        />
        <circle cx="300" cy="185" r="26" fill="#0a0a0f" />
        <ellipse cx="300" cy="240" rx="42" ry="55" fill="#0a0a0f" />

        {/* Glowing Demonic Eyes */}
        <circle cx="292" cy="182" r="4" fill="#ef4444" />
        <circle cx="308" cy="182" r="4" fill="#ef4444" />
        <circle cx="292" cy="182" r="14" fill="url(#eyeGlow)" />
        <circle cx="308" cy="182" r="14" fill="url(#eyeGlow)" />
      </svg>
    );
  }

  if (type === "awakening_eyes" || type === "celestial_seal") {
    return (
      <svg className="art-svg" viewBox="0 0 600 360" fill="none">
        <defs>
          <filter id="sealGlow">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Concentric Martial Runic Circle */}
        <circle cx="300" cy="180" r="110" stroke={accent} strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
        <circle cx="300" cy="180" r="90" stroke={accent} strokeWidth="2" opacity="0.8" />
        <circle cx="300" cy="180" r="70" stroke={accent} strokeWidth="1" strokeDasharray="12 6" opacity="0.5" />

        {/* Bagua Octagon Trigram lines */}
        <polygon points="300,95 360,120 385,180 360,240 300,265 240,240 215,180 240,120" stroke="#f8fafc" strokeWidth="1" opacity="0.4" />

        {/* Central Awakening Core Eye */}
        <ellipse cx="300" cy="180" rx="50" ry="24" stroke="#ffffff" strokeWidth="2.5" filter="url(#sealGlow)" />
        <circle cx="300" cy="180" r="14" fill={accent} />
        <circle cx="300" cy="180" r="6" fill="#ffffff" />
      </svg>
    );
  }

  // Default: shattered chains
  return (
    <svg className="art-svg" viewBox="0 0 600 360" fill="none">
      <defs>
        <linearGradient id="chainGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* Broken chain links */}
      <g stroke="url(#chainGrad)" strokeWidth="6" strokeLinecap="round">
        <path d="M 60 180 C 100 160, 140 200, 180 180" />
        <path d="M 200 170 C 230 150, 250 170, 270 160" />
        {/* Shatter sparks */}
        <circle cx="280" cy="160" r="3" fill="#fbbf24" />
        <circle cx="290" cy="150" r="2" fill="#fbbf24" />
        <circle cx="310" cy="170" r="3" fill="#fbbf24" />
        <path d="M 330 190 C 350 210, 380 180, 410 200" />
        <path d="M 430 190 C 470 170, 510 210, 550 180" />
      </g>
    </svg>
  );
}
