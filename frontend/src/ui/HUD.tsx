/**
 * HUD — In-game heads-up display showing health, qi, stamina, stance, and FPS.
 * Modular Next.js UI root orchestrating isolated subcomponents from ./hud.
 */
"use client";

import { useGameStore } from "@/stores/gameStore";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveManager } from "@/systems/SaveManager";
import "./hud/HUD.css";

import {
  type HUDProps,
  type BeforeInstallPromptEvent,
  BossHealthBar,
  TargetEnemyBar,
  BattleBannerWidget,
  ExecutionPromptOverlay,
  ComboStyleWidget,
  DamagePopupsLayer,
  DeathScreenOverlay,
  PlayerVitals,
  DragonCompanionPanel,
  QinggongStaminaArc,
  FlightReticle,
  ChapterQuestBanner,
  CombatActionBar,
  InteractionPrompt,
  DialogueWindow,
  MeridiansOverlay,
  InventoryOverlay,
  ControlsModal,
  CloudTransferModal,
  MobileControls,
  SettingsPanel,
  InteractiveHudEditor,
  useCloudSaveTransfer,
  useTouchControls,
  DragonIcon,
  GamepadIcon,
  CloudIcon,
  SaveIcon,
  EyeIcon,
  EyeOffIcon,
  DownloadIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
} from "./hud/index";

export function HUD({ getFPS, onSetTimeOfDay, onSetTimeSpeed }: HUDProps & { onSetTimeOfDay?: (h: number) => void; onSetTimeSpeed?: (s: number) => void }) {
  const router = useRouter();

  // High-level UI and state selectors
  const showMeridians = useGameStore((s) => s.ui.showMeridians);
  const showInventory = useGameStore((s) => s.ui.showInventory);
  const showDialogue = useGameStore((s) => s.ui.showDialogue);
  const isMounted = useGameStore((s) => s.dragon.isMounted);
  const dragonMomentum = useGameStore((s) => s.dragonMomentum);
  const prologuePhase = useGameStore((s) => s.prologuePhase);
  const revivePlayer = useGameStore((s) => s.revivePlayer);

  const toggleMeridians = useGameStore((s) => s.toggleMeridians);
  const toggleInventory = useGameStore((s) => s.toggleInventory);
  const setPaused = useGameStore((s) => s.setPaused);

  const timeOfDay = useGameStore((s) => s.settings.timeOfDay);
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay);
  const isNight = timeOfDay < 5.5 || timeOfDay >= 19.5;

  const toggleDayNight = useCallback(() => {
    const nextHour = isNight ? 6.2 : 20.5;
    setTimeOfDay(nextHour);
    onSetTimeOfDay?.(nextHour);
    useGameStore.getState().setBattleBanner(
      nextHour === 20.5
        ? "NIGHTFALL — Starlit Midnight Moon Framed over Ocean Gate"
        : "DAWN — Golden Sunrise Framed over Ocean Gate",
      3.0
    );
  }, [isNight, setTimeOfDay, onSetTimeOfDay]);

  const handleSaveAndQuit = useCallback(async () => {
    await saveManager.saveToSlot(1);
    router.push("/");
  }, [router]);

  const [fps, setFPS] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissFlightGuide, setDismissFlightGuide] = useState(false);
  const [isImmersionMode, setIsImmersionMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInteractiveEditor, setShowInteractiveEditor] = useState(false);

  // Modular custom hooks for touch input and cloud save transfer
  const { isTouchDevice, moveJoystick, lookJoystick, triggerAction } = useTouchControls();
  const {
    showTransferModal,
    setShowTransferModal,
    transferStatus,
    conflictData,
    handleExportSave,
    handleCopyShareLink,
    handleImportClick,
    handleResolveConflict,
  } = useCloudSaveTransfer();

  // Global Key Handlers: 'N' for day/night toggle, 'Escape' to pause and toggle Settings
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "KeyN") {
        toggleDayNight();
      }
      if (e.key === "Escape" || e.code === "Escape") {
        // If an overlay modal is open, Escape closes it
        if (showSettings) {
          setShowSettings(false);
          setPaused(false);
          return;
        }
        if (showHelpModal) {
          setShowHelpModal(false);
          setPaused(false);
          return;
        }
        if (showInteractiveEditor) {
          setShowInteractiveEditor(false);
          setPaused(false);
          return;
        }
        if (showTransferModal) {
          setShowTransferModal(false);
          setPaused(false);
          return;
        }

        // In normal gameplay, Esc lets the browser release pointer lock for hover cursor mode.
        // The game continues running normally in real-time (not frozen), with zero mouse-look rotation.
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleDayNight, showSettings, showHelpModal, showInteractiveEditor, showTransferModal, setShowTransferModal, setPaused]);

  // PWA Install prompt listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // FPS Timer
  useEffect(() => {
    if (!getFPS) return;
    const interval = setInterval(() => {
      setFPS(getFPS());
    }, 500);
    return () => clearInterval(interval);
  }, [getFPS]);

  // Keyboard toggle for Controls Guide [H], Meridians [M], Inventory [I], and Immersion [F1]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDialogue) return;
      const code = e.code || "";
      const keyLower = e.key ? e.key.toLowerCase() : "";

      if (code === "F1") {
        e.preventDefault();
        setIsImmersionMode((prev) => !prev);
      } else if (code === "KeyH" || keyLower === "h") {
        e.preventDefault();
        setShowHelpModal((prev) => !prev);
        document.exitPointerLock?.();
      } else if (code === "KeyM" || keyLower === "m") {
        e.preventDefault();
        toggleMeridians();
        if (!showMeridians) {
          document.exitPointerLock?.();
        }
      } else if (code === "KeyI" || keyLower === "i") {
        e.preventDefault();
        toggleInventory();
        if (!showInventory) {
          document.exitPointerLock?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDialogue, showMeridians, showInventory, toggleMeridians, toggleInventory]);

  return (
    <div className={`hud-container ${showMeridians || showInventory ? "hud-menu-active" : ""} ${isImmersionMode ? "hud-immersion-active" : ""}`}>
      {/* Flight Control Tutorial Overlay (Sleek, dismissible minimal tip) */}
      {prologuePhase === "first_flight" && !dismissFlightGuide && (
        <div className="hud-flight-guide-minimal">
          <div className="flight-guide-min-content">
            <span className="flight-guide-badge">
              <DragonIcon size={12} color="#2dd4bf" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} />
              FIRST FLIGHT
            </span>
            <div className="flight-guide-min-keys">
              <span><kbd>RMB</kbd> Aim</span>
              <span><kbd>LMB / Q</kbd> Throw</span>
              <span><kbd>Shift</kbd> Boost</span>
              <span><kbd>Alt / A·D×2</kbd> Roll</span>
              <span><kbd>Space / C</kbd> Alt</span>
              <span><kbd>V</kbd> POV</span>
              <span><kbd>F</kbd> Dismount</span>
            </div>
          </div>
          <button
            className="flight-guide-dismiss-btn"
            onClick={() => setDismissFlightGuide(true)}
            title="Dismiss Tutorial"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Center: Active Chapter & Quest & Zone Indicator */}
      <ChapterQuestBanner />

      {/* Top-left: Vitals (HP, QI, ST, RAGE) */}
      <PlayerVitals />

      {/* Dragon Companion HUD — visible when mounted */}
      <DragonCompanionPanel />

      {/* Precision Flight Aim Reticle & Aim Assist Lock */}
      <FlightReticle />

      {/* Dragon Momentum Buff Indicator */}
      {dragonMomentum && (
        <div className="hud-dragon-momentum">
          <DragonIcon size={13} color="#fbbf24" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
          <span>DRAGON MOMENTUM — 3× DAMAGE</span>
        </div>
      )}

      {/* Bottom-left: Master Dragon Sword Arsenal & Actions */}
      <CombatActionBar />

      {/* Martial Arts Curved Stamina Arc HUD (Ground only) */}
      {!isMounted && <QinggongStaminaArc />}

      {/* Top-right: Minimalist Navigation Pill Dock & FPS */}
      <div className="hud-min-topright-dock">
        {deferredPrompt && (
          <button
            className="hud-min-dock-btn"
            onClick={handleInstallClick}
            title="Install PWA"
          >
            <DownloadIcon size={13} color="#4ade80" />
          </button>
        )}
        <button
          className={`hud-min-dock-btn ${showMeridians ? "dock-active" : ""}`}
          onClick={() => {
            toggleMeridians();
            if (!showMeridians) document.exitPointerLock?.();
          }}
          title="Meridians [M]"
        >
          <span className="dock-icon">經</span>
          <span className="dock-hint">M</span>
        </button>
        <button
          className={`hud-min-dock-btn ${showInventory ? "dock-active" : ""}`}
          onClick={() => {
            toggleInventory();
            if (!showInventory) document.exitPointerLock?.();
          }}
          title="Inventory & Stats [I]"
        >
          <span className="dock-icon">包</span>
          <span className="dock-hint">I</span>
        </button>
        <button
          className={`hud-min-dock-btn ${showHelpModal ? "dock-active" : ""}`}
          onClick={() => {
            setShowHelpModal((prev) => !prev);
            document.exitPointerLock?.();
          }}
          title="Controls Guide [H]"
        >
          <GamepadIcon size={13} color="currentColor" />
          <span className="dock-hint">H</span>
        </button>
        <button
          className="hud-min-dock-btn"
          onClick={() => setShowTransferModal(true)}
          title="Cloud Save & Sync"
        >
          <CloudIcon size={13} color="#38bdf8" />
        </button>
        <button
          className={`hud-min-dock-btn ${isImmersionMode ? "dock-immersion-active" : ""}`}
          onClick={() => setIsImmersionMode((prev) => !prev)}
          title={isImmersionMode ? "Exit Immersion Mode [F1]" : "Minimalist Immersion Mode [F1]"}
        >
          {isImmersionMode ? (
            <EyeOffIcon size={13} color="#fbbf24" />
          ) : (
            <EyeIcon size={13} color="currentColor" />
          )}
        </button>
        <button
          className="hud-min-dock-btn"
          onClick={toggleDayNight}
          title={isNight ? "Switch to Scenic Sunrise [N]" : "Switch to Midnight Starlight [N]"}
        >
          {isNight ? (
            <MoonIcon size={13} color="#93c5fd" />
          ) : (
            <SunIcon size={13} color="#fbbf24" />
          )}
          <span className="dock-hint">N</span>
        </button>
        <button
          className={`hud-min-dock-btn ${showSettings ? "dock-active" : ""}`}
          onClick={() => {
            setShowSettings((prev) => {
              const next = !prev;
              setPaused(next);
              if (next) {
                try {
                  document.exitPointerLock?.();
                } catch (_) {}
              }
              return next;
            });
          }}
          title="Settings"
        >
          <SettingsIcon size={13} color="currentColor" />
        </button>
        <button
          className="hud-min-dock-btn dock-quit"
          onClick={handleSaveAndQuit}
          title="Save & Return to Title"
        >
          <SaveIcon size={12} color="#f87171" />
        </button>
        <span className="hud-min-fps-tag">{fps} FPS</span>
      </div>

      {/* Boss Health Bar */}
      <BossHealthBar />

      {/* Target Two-Tier Health & Stun Bar */}
      <TargetEnemyBar />

      {/* Battle Announcement Banner */}
      <BattleBannerWidget />

      {/* Finisher Execution Prompt */}
      <ExecutionPromptOverlay />

      {/* Dynamic Combo Style Rank Widget */}
      <ComboStyleWidget />

      {/* Floating Damage Popups Overlay */}
      <DamagePopupsLayer />

      {/* Reincarnation Defeat Screen */}
      <DeathScreenOverlay
        revivePlayer={revivePlayer}
        handleSaveAndQuit={handleSaveAndQuit}
      />

      {/* Contextual Interaction Prompt */}
      <InteractionPrompt />

      {/* Narrative Dialogue Overlay */}
      <DialogueWindow />

      {/* Character & Meridian Menu Overlays */}
      <MeridiansOverlay />
      <InventoryOverlay />

      {/* Save File Transfer Modal */}
      <CloudTransferModal
        isOpen={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setPaused(false);
        }}
        onExportSave={handleExportSave}
        onCopyShareLink={handleCopyShareLink}
        onImportClick={handleImportClick}
        transferStatus={transferStatus}
        conflictData={conflictData}
        onResolveConflict={handleResolveConflict}
      />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          setPaused(false);
        }}
        onSetTimeOfDay={onSetTimeOfDay}
        onSetTimeSpeed={onSetTimeSpeed}
        onOpenLiveLayoutEditor={() => setShowInteractiveEditor(true)}
      />

      {/* Interactive Mobile HUD Layout Drag Editor */}
      <InteractiveHudEditor
        isOpen={showInteractiveEditor}
        onClose={() => {
          setShowInteractiveEditor(false);
          setPaused(false);
        }}
      />

      {/* Controls & Codex Help Modal */}
      <ControlsModal
        isOpen={showHelpModal}
        onClose={() => {
          setShowHelpModal(false);
          setPaused(false);
        }}
      />

      {/* Mobile controls overlay with dual controllers */}
      <MobileControls
        isTouchDevice={isTouchDevice}
        moveJoystick={moveJoystick}
        lookJoystick={lookJoystick}
        triggerAction={triggerAction}
        isEditingLayout={showInteractiveEditor}
      />
    </div>
  );
}
