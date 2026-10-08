/**
 * Title Screen — The main menu of "Ink of the Forgotten Path".
 * Features animated ink wash reveal, menu options, and save slot management.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveManager, type SaveSlotInfo } from "@/systems/SaveManager";
import { useGameStore } from "@/stores/gameStore";
import "./home.css";

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${((i * 17 + 23) % 97) + 1.5}%`,
  top: `${((i * 31 + 47) % 95) + 2.5}%`,
  animationDelay: `${((i * 7) % 80) / 10}s`,
  animationDuration: `${6 + ((i * 11) % 80) / 10}s`,
  width: `${2 + (i % 5)}px`,
  height: `${2 + (i % 5)}px`,
  opacity: 0.15 + (i % 6) * 0.05,
}));

export default function TitleScreen() {
  const router = useRouter();
  const [menuState, setMenuState] = useState<"main" | "load" | "settings">("main");
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const [animReady, setAnimReady] = useState(false);
  const [titleReady, setTitleReady] = useState(false);
  const [menuReady, setMenuReady] = useState(false);

  const settings = useGameStore((s) => s.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);

  useEffect(() => {
    // Staggered reveal animation
    setTimeout(() => setAnimReady(true), 300);
    setTimeout(() => setTitleReady(true), 800);
    setTimeout(() => setMenuReady(true), 1500);

    // Load save slot info
    saveManager.getSlotInfo().then(setSlots);
  }, []);

  const handleNewGame = useCallback(() => {
    router.push("/create");
  }, [router]);

  const handleLoadGame = useCallback(async () => {
    setMenuState("load");
    const info = await saveManager.getSlotInfo();
    setSlots(info);
  }, []);

  const handleLoadSlot = useCallback(async (slot: number) => {
    const success = await saveManager.loadFromSlot(slot);
    if (success) {
      router.push("/game");
    }
  }, [router]);

  const handleImport = useCallback(async () => {
    const success = await saveManager.triggerImportDialog(0);
    if (success) {
      const info = await saveManager.getSlotInfo();
      setSlots(info);
    }
  }, []);

  return (
    <div className="title-screen">
      {/* Background ink wash effect */}
      <div className="title-bg">
        <div className={`ink-wash ${animReady ? "reveal" : ""}`} />
        <div className="ink-noise" />
        {/* Floating ink particles */}
        {animReady && (
          <>
            {PARTICLES.map((p, i) => (
              <div
                key={i}
                className="ink-particle"
                style={{
                  left: p.left,
                  top: p.top,
                  animationDelay: p.animationDelay,
                  animationDuration: p.animationDuration,
                  width: p.width,
                  height: p.height,
                  opacity: p.opacity,
                }}
              />
            ))}
          </>
        )}
        {/* Ink drip line */}
        <div className={`ink-drip-line ${animReady ? "drip" : ""}`} />
      </div>

      {/* Main content */}
      <div className="title-content">
        {/* Game title */}
        <div className={`title-block ${titleReady ? "visible" : ""}`}>
          <h1 className="title-main">
            <span className="title-kanji">墨</span>
            <span className="title-text">Ink of the</span>
            <span className="title-text title-text-large">Forgotten Path</span>
          </h1>
          <p className="title-subtitle">— A Murim Tale —</p>
        </div>

        {/* Menu */}
        <div className={`title-menu ${menuReady ? "visible" : ""}`}>
          {menuState === "main" && (
            <div className="menu-main">
              <button className="menu-btn" onClick={handleNewGame}>
                <span className="menu-btn-char">新</span>
                <span>New Journey</span>
              </button>
              <button className="menu-btn" onClick={handleLoadGame}>
                <span className="menu-btn-char">続</span>
                <span>Continue</span>
              </button>
              <button className="menu-btn" onClick={handleImport}>
                <span className="menu-btn-char">入</span>
                <span>Import Save</span>
              </button>
              <button className="menu-btn" onClick={() => setMenuState("settings")}>
                <span className="menu-btn-char">設</span>
                <span>Settings</span>
              </button>
              <button className="menu-btn" onClick={() => router.push("/recruiter")}>
                <span className="menu-btn-char">評</span>
                <span>Evaluation Portal</span>
              </button>
            </div>
          )}

          {menuState === "load" && (
            <div className="menu-load">
              <h2 className="menu-section-title">Select Save</h2>
              {slots.map((slot) => (
                <button
                  key={slot.slot}
                  className={`save-slot ${slot.exists ? "save-slot-active" : ""}`}
                  onClick={() => slot.exists && handleLoadSlot(slot.slot)}
                  disabled={!slot.exists}
                >
                  <span className="save-slot-num">Slot {slot.slot + 1}</span>
                  {slot.exists && slot.meta ? (
                    <div className="save-slot-info">
                      <span>Ch.{slot.meta.chapter} · {slot.meta.realm}</span>
                      <span className="save-slot-time">{slot.meta.playtimeFormatted}</span>
                    </div>
                  ) : (
                    <span className="save-slot-empty">— Empty —</span>
                  )}
                </button>
              ))}
              <button className="menu-btn menu-btn-back" onClick={() => setMenuState("main")}>
                ← Back
              </button>
            </div>
          )}

          {menuState === "settings" && (
            <div className="menu-settings" style={{ minWidth: "320px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <h2 className="menu-section-title">Settings / 設定</h2>

              {/* Pixelation size */}
              <div className="settings-item" style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--ink-light)", letterSpacing: "2px", fontWeight: "600" }}>
                  Resolution / 像素大小
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[1, 2, 3, 4].map((size) => {
                    const labels: Record<number, string> = { 1: "1x Clear", 2: "2x Fine", 3: "3x Default", 4: "4x Retro" };
                    return (
                      <button
                        key={size}
                        style={{
                          flex: 1,
                          fontSize: "11px",
                          fontWeight: "600",
                          padding: "10px 4px",
                          background: settings.pixelSize === size ? "rgba(34, 211, 238, 0.15)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${settings.pixelSize === size ? "var(--accent-cyan)" : "rgba(255,255,255,0.05)"}`,
                          color: settings.pixelSize === size ? "var(--ink-white)" : "var(--ink-light)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontFamily: "var(--font-sans)",
                          transition: "var(--transition-smooth)",
                          boxShadow: settings.pixelSize === size ? "0 0 12px rgba(34, 211, 238, 0.2)" : "none"
                        }}
                        onClick={() => updateSettings({ pixelSize: size })}
                      >
                        {labels[size]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dithering Strength */}
              <div className="settings-item" style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", textTransform: "uppercase", color: "var(--ink-light)", letterSpacing: "2px", fontWeight: "600" }}>
                  <span>Dither Strength / 抖動強度</span>
                  <span style={{ color: "var(--accent-gold)" }}>{Math.round(settings.ditherStrength * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.3"
                  step="0.01"
                  value={settings.ditherStrength}
                  style={{ accentColor: "var(--accent-gold)", cursor: "pointer", height: "4px" }}
                  onChange={(e) => updateSettings({ ditherStrength: parseFloat(e.target.value) })}
                />
              </div>

              {/* Audio Volume */}
              <div className="settings-item" style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", textTransform: "uppercase", color: "var(--ink-light)", letterSpacing: "2px", fontWeight: "600" }}>
                  <span>Audio Volume / 音量大小</span>
                  <span style={{ color: "var(--accent-gold)" }}>{Math.round(settings.audioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={settings.audioVolume}
                  style={{ accentColor: "var(--accent-gold)", cursor: "pointer", height: "4px" }}
                  onChange={(e) => updateSettings({ audioVolume: parseFloat(e.target.value) })}
                />
              </div>

              <button
                className="menu-btn menu-btn-back"
                onClick={() => setMenuState("main")}
                style={{ marginTop: "16px", width: "100%" }}
              >
                ← Return to Menu
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`title-footer ${menuReady ? "visible" : ""}`}>
          <span>Your Data, Your Journey</span>
        </div>
      </div>
    </div>
  );
}
