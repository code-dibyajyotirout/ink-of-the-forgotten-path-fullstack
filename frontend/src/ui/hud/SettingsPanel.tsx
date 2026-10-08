"use client";

import { useGameStore } from "@/stores/gameStore";
import { useState, useCallback, useEffect } from "react";
import {
  VolumeIcon,
  SunIcon,
  MoonIcon,
  KeyboardIcon,
  SmartphoneIcon,
  RefreshIcon,
  MoveIcon,
  CheckIcon,
} from "./HudIcons";
import {
  CONFIGURABLE_ACTIONS,
  formatKeyDisplay,
  loadSavedKeyMap,
  saveKeyMap,
  resetKeyMap,
  updateActionKey,
  getKeyCodeForAction,
  type ActionCategory,
} from "@/systems/KeybindingsManager";
import { GameAction } from "@/engine/input/GameAction";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSetTimeOfDay?: (hour: number) => void;
  onSetTimeSpeed?: (speed: number) => void;
  onOpenLiveLayoutEditor?: () => void;
}

type SettingsTab = "audio" | "pc_controls" | "mobile_hud";

export function SettingsPanel({
  isOpen,
  onClose,
  onSetTimeOfDay,
  onSetTimeSpeed,
  onOpenLiveLayoutEditor,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("audio");

  // Audio & World state
  const audioVolume = useGameStore((s) => s.settings.audioVolume);
  const bgmVolume = useGameStore((s) => s.settings.bgmVolume);
  const sfxVolume = useGameStore((s) => s.settings.sfxVolume);
  const timeOfDay = useGameStore((s) => s.settings.timeOfDay);
  const timeSpeed = useGameStore((s) => s.settings.timeSpeed);

  const setAudioVolume = useGameStore((s) => s.setAudioVolume);
  const setBgmVolume = useGameStore((s) => s.setBgmVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay);
  const setTimeSpeed = useGameStore((s) => s.setTimeSpeed);

  // Mobile HUD state
  const mobileHUD = useGameStore((s) => s.settings.mobileHUD);
  const setMobileHUD = useGameStore((s) => s.setMobileHUD);
  const resetMobileHUD = useGameStore((s) => s.resetMobileHUD);

  // PC Keybindings state
  const [keyMap, setKeyMap] = useState<Record<string, GameAction>>(() => loadSavedKeyMap());
  const [rebindingAction, setRebindingAction] = useState<GameAction | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | "All">("All");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Listen for keypress when user is rebinding a key
  useEffect(() => {
    if (!rebindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels rebinding
      if (e.code === "Escape" || e.key === "Escape") {
        setRebindingAction(null);
        return;
      }

      const { updatedMap, conflictAction } = updateActionKey(keyMap, rebindingAction, e.code);
      setKeyMap(updatedMap);
      saveKeyMap(updatedMap);
      setRebindingAction(null);

      const actionMeta = CONFIGURABLE_ACTIONS.find((a) => a.action === rebindingAction);
      const actionName = actionMeta?.name || rebindingAction;
      const keyLabel = formatKeyDisplay(e.code);

      if (conflictAction) {
        const conflictMeta = CONFIGURABLE_ACTIONS.find((a) => a.action === conflictAction);
        const conflictName = conflictMeta?.name || conflictAction;
        setFeedbackToast(`Bound [${keyLabel}] to ${actionName}. (${conflictName} unassigned)`);
      } else {
        setFeedbackToast(`Bound [${keyLabel}] to ${actionName}.`);
      }

      setTimeout(() => setFeedbackToast(null), 3000);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [rebindingAction, keyMap]);

  const handleResetKeybindings = useCallback(() => {
    const fresh = resetKeyMap();
    setKeyMap(fresh);
    setFeedbackToast("All keyboard switches reset to defaults.");
    setTimeout(() => setFeedbackToast(null), 3000);
  }, []);

  const handleTimeOfDay = useCallback((hour: number) => {
    setTimeOfDay(hour);
    onSetTimeOfDay?.(hour);
  }, [setTimeOfDay, onSetTimeOfDay]);

  const handleTimeSpeed = useCallback((speed: number) => {
    setTimeSpeed(speed);
    onSetTimeSpeed?.(speed);
  }, [setTimeSpeed, onSetTimeSpeed]);

  const formatHour = (h: number): string => {
    const hr = Math.floor(h) % 24;
    const min = Math.floor((h % 1) * 60);
    const ampm = hr >= 12 ? "PM" : "AM";
    const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${displayHr}:${min.toString().padStart(2, "0")} ${ampm}`;
  };

  const getPhaseLabel = (h: number): string => {
    if (h >= 5.5 && h < 7.5) return "DAWN";
    if (h >= 7.5 && h < 17) return "DAY";
    if (h >= 17 && h < 20) return "DUSK";
    return "NIGHT";
  };

  const getPhaseColor = (h: number): string => {
    if (h >= 5.5 && h < 7.5) return "#f0c27f";
    if (h >= 7.5 && h < 17) return "#5ba3d9";
    if (h >= 17 && h < 20) return "#e8956b";
    return "#8ecae6";
  };

  if (!isOpen) return null;

  const filteredActions = CONFIGURABLE_ACTIONS.filter(
    (a) => selectedCategory === "All" || a.category === selectedCategory
  );

  return (
    <div className="hud-settings-backdrop" onClick={onClose}>
      <div className="hud-settings-panel hud-settings-modal-wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hud-settings-header">
          <div className="hud-settings-title">
            <span>SETTINGS &amp; CONTROLS</span>
          </div>
          <button className="hud-settings-close" onClick={onClose} title="Close Settings">&times;</button>
        </div>

        {/* Tab Navigation */}
        <div className="hud-settings-tabs" role="tablist">
          <button
            type="button"
            className={`hud-tab-btn ${activeTab === "audio" ? "active" : ""}`}
            onClick={() => setActiveTab("audio")}
            role="tab"
            aria-selected={activeTab === "audio"}
          >
            <VolumeIcon size={13} />
            <span>AUDIO &amp; WORLD</span>
          </button>

          <button
            type="button"
            className={`hud-tab-btn ${activeTab === "pc_controls" ? "active" : ""}`}
            onClick={() => setActiveTab("pc_controls")}
            role="tab"
            aria-selected={activeTab === "pc_controls"}
          >
            <KeyboardIcon size={14} />
            <span>PC KEYBOARD</span>
          </button>

          <button
            type="button"
            className={`hud-tab-btn ${activeTab === "mobile_hud" ? "active" : ""}`}
            onClick={() => setActiveTab("mobile_hud")}
            role="tab"
            aria-selected={activeTab === "mobile_hud"}
          >
            <SmartphoneIcon size={13} />
            <span>MOBILE HUD</span>
          </button>
        </div>

        {/* Feedback Toast */}
        {feedbackToast && (
          <div className="hud-settings-toast">
            <CheckIcon size={13} color="#22c55e" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* ════════════ TAB 1: AUDIO & WORLD ════════════ */}
        {activeTab === "audio" && (
          <div className="hud-settings-tab-content">
            {/* Audio Volumes */}
            <div className="hud-settings-section">
              <div className="hud-settings-section-label">
                <VolumeIcon size={12} color="#94a3b8" />
                <span>AUDIO LEVELS</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Master Volume</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                />
                <span className="hud-settings-value">{Math.round(audioVolume * 100)}%</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Music (BGM)</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                />
                <span className="hud-settings-value">{Math.round(bgmVolume * 100)}%</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Combat Sound (SFX)</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                />
                <span className="hud-settings-value">{Math.round(sfxVolume * 100)}%</span>
              </div>
            </div>

            {/* Time of Day */}
            <div className="hud-settings-section">
              <div className="hud-settings-section-label">
                {timeOfDay >= 6 && timeOfDay < 19 ? (
                  <SunIcon size={12} color="#fbbf24" />
                ) : (
                  <MoonIcon size={12} color="#8ecae6" />
                )}
                <span>TIME &amp; ATMOSPHERE</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Celestial Hour</label>
                <input
                  type="range"
                  className="hud-settings-slider hud-slider-time"
                  min="0"
                  max="23.99"
                  step="0.25"
                  value={timeOfDay}
                  onChange={(e) => handleTimeOfDay(parseFloat(e.target.value))}
                />
                <span className="hud-settings-value" style={{ color: getPhaseColor(timeOfDay), minWidth: "72px" }}>
                  {formatHour(timeOfDay)}
                </span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Phase Presets</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                  <span className="hud-settings-phase-badge" style={{ color: getPhaseColor(timeOfDay), borderColor: getPhaseColor(timeOfDay) }}>
                    {getPhaseLabel(timeOfDay)}
                  </span>
                  {[
                    { label: "Dawn", hour: 6.0 },
                    { label: "Noon", hour: 12.0 },
                    { label: "Dusk", hour: 18.5 },
                    { label: "Night", hour: 22.0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`hud-speed-btn ${Math.abs(timeOfDay - preset.hour) < 1.5 ? "speed-active" : ""}`}
                      style={{ padding: "3px 9px", fontSize: "11px" }}
                      onClick={() => handleTimeOfDay(preset.hour)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Flow Speed</label>
                <div className="hud-settings-speed-btns">
                  {[
                    { label: "Pause", value: 0 },
                    { label: "1×", value: 1 },
                    { label: "3×", value: 3 },
                    { label: "10×", value: 10 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      className={`hud-speed-btn ${timeSpeed === opt.value ? "speed-active" : ""}`}
                      onClick={() => handleTimeSpeed(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ TAB 2: PC KEYBOARD SWITCHES ════════════ */}
        {activeTab === "pc_controls" && (
          <div className="hud-settings-tab-content">
            <div className="hud-settings-section-header-row">
              <span className="hud-settings-section-desc">
                Click any key pill to remap your keyboard switch. Press <strong>[ESC]</strong> to cancel.
              </span>
              <button
                type="button"
                className="hud-reset-defaults-btn"
                onClick={handleResetKeybindings}
                title="Reset all keyboard keys to default configuration"
              >
                <RefreshIcon size={12} /> RESET DEFAULTS
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="hud-kb-category-filter">
              {(["All", "Movement", "Combat", "Flight & Mounting", "Skills & View"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`hud-filter-pill ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Keybindings Table / List */}
            <div className="hud-keybindings-list">
              {filteredActions.map((meta) => {
                const currentCode = getKeyCodeForAction(keyMap, meta.action);
                const isRebinding = rebindingAction === meta.action;

                return (
                  <div key={meta.action} className="hud-kb-row">
                    <div className="hud-kb-info">
                      <strong className="hud-kb-name">{meta.name}</strong>
                      <span className="hud-kb-desc">{meta.description}</span>
                    </div>

                    <button
                      type="button"
                      className={`hud-kb-key-btn ${isRebinding ? "is-rebinding" : ""}`}
                      onClick={() => setRebindingAction(isRebinding ? null : meta.action)}
                      title={`Click to reassign key for ${meta.name}`}
                    >
                      {isRebinding ? "PRESS KEY..." : `[ ${formatKeyDisplay(currentCode)} ]`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════ TAB 3: MOBILE HUD & POSITION ════════════ */}
        {activeTab === "mobile_hud" && (
          <div className="hud-settings-tab-content">
            <div className="hud-settings-section-header-row">
              <span className="hud-settings-section-desc">
                Customize touch button positions, layout styles, and scale to fit your hands.
              </span>
              <button
                type="button"
                className="hud-reset-defaults-btn"
                onClick={resetMobileHUD}
                title="Reset mobile HUD layout to default configuration"
              >
                <RefreshIcon size={12} /> RESET LAYOUT
              </button>
            </div>

            {/* Interactive Live Drag Button */}
            <button
              type="button"
              className="hud-interactive-launch-btn"
              onClick={() => {
                onClose();
                onOpenLiveLayoutEditor?.();
              }}
              title="Enter full-screen drag mode to position buttons with your thumb"
            >
              <MoveIcon size={16} />
              <span>ENTER ON-SCREEN DRAG REPOSITION MODE</span>
            </button>

            {/* Handedness & Layout Presets */}
            <div className="hud-settings-section">
              <div className="hud-settings-section-label">
                <SmartphoneIcon size={12} color="#94a3b8" />
                <span>HANDEDNESS &amp; STYLE</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Handedness</label>
                <div className="hud-settings-speed-btns">
                  <button
                    type="button"
                    className={`hud-speed-btn ${mobileHUD.handedness === "right" ? "speed-active" : ""}`}
                    onClick={() => setMobileHUD({ handedness: "right" })}
                  >
                    RIGHT HANDED
                  </button>
                  <button
                    type="button"
                    className={`hud-speed-btn ${mobileHUD.handedness === "left" ? "speed-active" : ""}`}
                    onClick={() => setMobileHUD({ handedness: "left" })}
                  >
                    LEFT HANDED
                  </button>
                </div>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Layout Style</label>
                <div className="hud-settings-speed-btns">
                  <button
                    type="button"
                    className={`hud-speed-btn ${mobileHUD.layoutStyle === "grid" ? "speed-active" : ""}`}
                    onClick={() => setMobileHUD({ layoutStyle: "grid" })}
                  >
                    GRID 4×2
                  </button>
                  <button
                    type="button"
                    className={`hud-speed-btn ${mobileHUD.layoutStyle === "arc" ? "speed-active" : ""}`}
                    onClick={() => setMobileHUD({ layoutStyle: "arc" })}
                  >
                    THUMB ARC
                  </button>
                  <button
                    type="button"
                    className={`hud-speed-btn ${mobileHUD.layoutStyle === "compact" ? "speed-active" : ""}`}
                    onClick={() => setMobileHUD({ layoutStyle: "compact" })}
                  >
                    COMPACT
                  </button>
                </div>
              </div>
            </div>

            {/* Position Sliders */}
            <div className="hud-settings-section">
              <div className="hud-settings-section-label">
                <MoveIcon size={12} color="#94a3b8" />
                <span>BUTTON CLUSTER POSITION &amp; SCALE</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Side Offset</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="8"
                  max="160"
                  step="2"
                  value={mobileHUD.sideOffset}
                  onChange={(e) => setMobileHUD({ sideOffset: parseInt(e.target.value, 10) })}
                />
                <span className="hud-settings-value">{mobileHUD.sideOffset}px</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Bottom Offset</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="8"
                  max="160"
                  step="2"
                  value={mobileHUD.bottomOffset}
                  onChange={(e) => setMobileHUD({ bottomOffset: parseInt(e.target.value, 10) })}
                />
                <span className="hud-settings-value">{mobileHUD.bottomOffset}px</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Button Scale</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="0.75"
                  max="1.35"
                  step="0.05"
                  value={mobileHUD.scale}
                  onChange={(e) => setMobileHUD({ scale: parseFloat(e.target.value) })}
                />
                <span className="hud-settings-value">{Math.round(mobileHUD.scale * 100)}%</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Button Spacing</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="4"
                  max="24"
                  step="1"
                  value={mobileHUD.spacing}
                  onChange={(e) => setMobileHUD({ spacing: parseInt(e.target.value, 10) })}
                />
                <span className="hud-settings-value">{mobileHUD.spacing}px</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">HUD Opacity</label>
                <input
                  type="range"
                  className="hud-settings-slider"
                  min="0.4"
                  max="1.0"
                  step="0.05"
                  value={mobileHUD.opacity}
                  onChange={(e) => setMobileHUD({ opacity: parseFloat(e.target.value) })}
                />
                <span className="hud-settings-value">{Math.round(mobileHUD.opacity * 100)}%</span>
              </div>
            </div>

            {/* Movement Joystick Settings */}
            <div className="hud-settings-section">
              <div className="hud-settings-section-label">
                <span>MOVEMENT JOYSTICK MODE</span>
              </div>

              <div className="hud-settings-row">
                <label className="hud-settings-label">Joystick Mode</label>
                <div className="hud-settings-speed-btns">
                  <button
                    type="button"
                    className={`hud-speed-btn ${mobileHUD.joystickMode === "floating" ? "speed-active" : ""}`}
                    onClick={() => setMobileHUD({ joystickMode: "floating" })}
                  >
                    FLOATING TOUCH
                  </button>
                  <button
                    type="button"
                    className={`hud-speed-btn ${mobileHUD.joystickMode === "fixed" ? "speed-active" : ""}`}
                    onClick={() => setMobileHUD({ joystickMode: "fixed" })}
                  >
                    FIXED PAD
                  </button>
                </div>
              </div>

              {mobileHUD.joystickMode === "fixed" && (
                <>
                  <div className="hud-settings-row">
                    <label className="hud-settings-label">Joy Side</label>
                    <input
                      type="range"
                      className="hud-settings-slider"
                      min="15"
                      max="150"
                      step="5"
                      value={mobileHUD.joystickSideOffset}
                      onChange={(e) => setMobileHUD({ joystickSideOffset: parseInt(e.target.value, 10) })}
                    />
                    <span className="hud-settings-value">{mobileHUD.joystickSideOffset}px</span>
                  </div>

                  <div className="hud-settings-row">
                    <label className="hud-settings-label">Joy Bottom</label>
                    <input
                      type="range"
                      className="hud-settings-slider"
                      min="15"
                      max="150"
                      step="5"
                      value={mobileHUD.joystickBottomOffset}
                      onChange={(e) => setMobileHUD({ joystickBottomOffset: parseInt(e.target.value, 10) })}
                    />
                    <span className="hud-settings-value">{mobileHUD.joystickBottomOffset}px</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
