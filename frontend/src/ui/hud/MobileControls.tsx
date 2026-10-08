"use client";

import React from "react";
import { useGameStore } from "@/stores/gameStore";
import { JoystickState } from "./hooks/useTouchControls";
import {
  AxeIcon,
  DragonIcon,
  EyeIcon,
  ShieldIcon,
  WingLeapIcon,
  QiDashIcon,
  SwordSlashIcon,
} from "./HudIcons";

interface MobileControlsProps {
  isTouchDevice: boolean;
  joystick?: JoystickState | null;
  moveJoystick?: JoystickState | null;
  lookJoystick?: JoystickState | null;
  triggerAction: (action: string, held: boolean) => void;
  isEditingLayout?: boolean;
}

export function MobileControls({
  isTouchDevice,
  joystick,
  moveJoystick,
  lookJoystick,
  triggerAction,
  isEditingLayout = false,
}: MobileControlsProps) {
  const executionPrompt = useGameStore((s) => s.ui.executionPrompt);
  const targetCanExecute = useGameStore((s) => s.ui.targetEnemy?.canExecute);
  const canExecute = !!executionPrompt || !!targetCanExecute;
  const mobileHUD = useGameStore((s) => s.settings.mobileHUD);

  if (!isTouchDevice && !isEditingLayout) return null;

  const isLeftHanded = mobileHUD.handedness === "left";
  const activeMove = moveJoystick || joystick;

  const renderKnobTransform = (j: JoystickState) => {
    const dx = j.currX - j.startX;
    const dy = j.currY - j.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = 32;
    if (dist === 0) return "translate(0px, 0px)";
    const factor = Math.min(maxR, dist) / dist;
    return `translate(${dx * factor}px, ${dy * factor}px)`;
  };

  // ─── Button Cluster Dynamic Inline Styles ───
  const clusterStyle: React.CSSProperties = {
    bottom: `${mobileHUD.bottomOffset}px`,
    [isLeftHanded ? "left" : "right"]: `${mobileHUD.sideOffset}px`,
    [isLeftHanded ? "right" : "left"]: "auto",
    transform: `scale(${mobileHUD.scale})`,
    transformOrigin: isLeftHanded ? "bottom left" : "bottom right",
    gap: `${mobileHUD.spacing}px`,
    opacity: mobileHUD.opacity,
  };

  // Fixed Joystick Style (when user chooses fixed pad over floating)
  const fixedJoyStyle: React.CSSProperties = {
    position: "fixed",
    bottom: `${mobileHUD.joystickBottomOffset}px`,
    [isLeftHanded ? "right" : "left"]: `${mobileHUD.joystickSideOffset}px`,
    [isLeftHanded ? "left" : "right"]: "auto",
    transform: `scale(${mobileHUD.joystickScale})`,
    transformOrigin: isLeftHanded ? "bottom right" : "bottom left",
  };

  return (
    <div className={`hud-mobile-controls ${isEditingLayout ? "layout-editor-active" : ""}`}>
      {/* 1. Left Virtual Joystick (WASD Movement) */}
      {mobileHUD.joystickMode === "floating" && activeMove && (
        <div
          className="hud-joystick-base hud-joystick-move"
          style={{
            left: activeMove.startX - 44,
            top: activeMove.startY - 44,
            transform: `scale(${mobileHUD.joystickScale})`,
          }}
        >
          <div
            className="hud-joystick-knob hud-knob-move"
            style={{ transform: renderKnobTransform(activeMove) }}
          />
          <div className="hud-joystick-label">MOVE</div>
        </div>
      )}

      {/* 1b. Fixed Joystick Base (Always visible if fixed mode is active) */}
      {mobileHUD.joystickMode === "fixed" && (
        <div className="hud-joystick-base hud-joystick-move hud-joystick-fixed" style={fixedJoyStyle}>
          <div
            className="hud-joystick-knob hud-knob-move"
            style={{ transform: activeMove ? renderKnobTransform(activeMove) : "translate(0px, 0px)" }}
          />
          <div className="hud-joystick-label">MOVE</div>
        </div>
      )}

      {/* 2. Right Virtual Joystick (Camera Look / Orbit) */}
      {lookJoystick && (
        <div
          className="hud-joystick-base hud-joystick-look"
          style={{
            left: lookJoystick.startX - 44,
            top: lookJoystick.startY - 44,
          }}
        >
          <div
            className="hud-joystick-knob hud-knob-look"
            style={{ transform: renderKnobTransform(lookJoystick) }}
          />
          <div className="hud-joystick-label">CAMERA</div>
        </div>
      )}

      {/* 3. Action Buttons Cluster with Customizable Position & Monochromatic Icons */}
      <div
        className={`hud-mobile-buttons hud-layout-${mobileHUD.layoutStyle} ${isLeftHanded ? "hud-left-handed" : ""}`}
        style={clusterStyle}
      >
        {/* Row 1: View / Mount / Finish / Axe */}
        <button
          className="hud-mbtn mbtn-view"
          title="Toggle FPV / POV View [V]"
          onTouchStart={(e) => {
            e.stopPropagation();
            triggerAction("TOGGLE_VIEW", false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            triggerAction("TOGGLE_VIEW", false);
          }}
        >
          <EyeIcon size={18} color="#e2e8f0" />
          {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[V]</span>}
        </button>

        <button
          className="hud-mbtn mbtn-mount"
          title="Summon / Mount Dragon [F]"
          onTouchStart={(e) => {
            e.stopPropagation();
            triggerAction("DRAGON_MOUNT", false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            triggerAction("DRAGON_MOUNT", false);
          }}
        >
          <DragonIcon size={18} color="#ffffff" glow="#ffffff" />
          {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[F]</span>}
        </button>

        {canExecute && (
          <button
            className="hud-mbtn mbtn-execute"
            title="Glory Kill Execution [G]"
            onTouchStart={(e) => {
              e.stopPropagation();
              triggerAction("EXECUTE", false);
            }}
            onClick={(e) => {
              e.stopPropagation();
              triggerAction("EXECUTE", false);
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "900", color: "#f87171" }}>KILL</span>
            {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[G]</span>}
          </button>
        )}

        <button
          className="hud-mbtn mbtn-axe"
          title="Throw / Recall Leviathan Axe [Q]"
          onTouchStart={(e) => {
            e.stopPropagation();
            triggerAction("AXE_THROW_RECALL", false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            triggerAction("AXE_THROW_RECALL", false);
          }}
        >
          <AxeIcon size={18} color="#ffffff" glow="#ffffff" />
          {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[Q]</span>}
        </button>

        {/* Row 2: Defense / Jump / Dash / Main Attack */}
        <button
          className="hud-mbtn mbtn-block"
          title="Dauntless Shield Parry / Aim [RMB]"
          onTouchStart={(e) => {
            e.stopPropagation();
            triggerAction("BLOCK", true);
            triggerAction("AIM", true);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            triggerAction("BLOCK", false);
            triggerAction("AIM", false);
          }}
        >
          <ShieldIcon size={18} color="#e2e8f0" />
          {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[RMB]</span>}
        </button>

        <button
          className="hud-mbtn mbtn-jump"
          title="Jump / Celestial Glide [SPACE]"
          onTouchStart={(e) => {
            e.stopPropagation();
            triggerAction("JUMP", true);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            triggerAction("JUMP", false);
          }}
        >
          <WingLeapIcon size={18} color="#e2e8f0" />
          {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[SPACE]</span>}
        </button>

        <button
          className="hud-mbtn mbtn-sprint"
          title="Sprint / Qinggong Dash [SHIFT]"
          onTouchStart={(e) => {
            e.stopPropagation();
            triggerAction("DODGE", true);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            triggerAction("DODGE", false);
          }}
        >
          <QiDashIcon size={18} color="#e2e8f0" />
          {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[SHIFT]</span>}
        </button>

        {/* Main Attack */}
        <button
          className="hud-mbtn mbtn-attack"
          title="Attack / Weapon Strike [LMB]"
          onTouchStart={(e) => {
            e.stopPropagation();
            triggerAction("ATTACK", true);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            triggerAction("ATTACK", false);
          }}
        >
          <SwordSlashIcon size={22} color="#ffffff" glow="#ffffff" />
          {mobileHUD.showKeyLabels && <span className="hud-mbtn-key">[LMB]</span>}
        </button>
      </div>
    </div>
  );
}
