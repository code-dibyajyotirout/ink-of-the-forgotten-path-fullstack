"use client";

import React, { useState, useRef, useCallback } from "react";
import { useGameStore, type MobileHUDConfig } from "@/stores/gameStore";
import { MoveIcon, RefreshIcon, CheckIcon } from "./HudIcons";

interface InteractiveHudEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InteractiveHudEditor({ isOpen, onClose }: InteractiveHudEditorProps) {
  const mobileHUD = useGameStore((s) => s.settings.mobileHUD);
  const setMobileHUD = useGameStore((s) => s.setMobileHUD);
  const resetMobileHUD = useGameStore((s) => s.resetMobileHUD);

  const [isDraggingCluster, setIsDraggingCluster] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startSide: number; startBottom: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCluster(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startSide: mobileHUD.sideOffset,
      startBottom: mobileHUD.bottomOffset,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [mobileHUD.sideOffset, mobileHUD.bottomOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingCluster || !dragStartRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;

    // Invert delta depending on left vs right handedness
    const sideDelta = mobileHUD.handedness === "left" ? dx : -dx;
    // Y goes down, so pulling up increases bottom offset
    const bottomDelta = -dy;

    const newSide = Math.max(8, Math.min(220, Math.round(dragStartRef.current.startSide + sideDelta)));
    const newBottom = Math.max(8, Math.min(220, Math.round(dragStartRef.current.startBottom + bottomDelta)));

    setMobileHUD({
      sideOffset: newSide,
      bottomOffset: newBottom,
    });
  }, [isDraggingCluster, mobileHUD.handedness, setMobileHUD]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDraggingCluster) {
      setIsDraggingCluster(false);
      dragStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  }, [isDraggingCluster]);

  const toggleHandedness = useCallback(() => {
    setMobileHUD({
      handedness: mobileHUD.handedness === "left" ? "right" : "left",
    });
  }, [mobileHUD.handedness, setMobileHUD]);

  const adjustScale = useCallback((delta: number) => {
    const next = Math.max(0.75, Math.min(1.35, parseFloat((mobileHUD.scale + delta).toFixed(2))));
    setMobileHUD({ scale: next });
  }, [mobileHUD.scale, setMobileHUD]);

  const cycleStyle = useCallback(() => {
    const styles: MobileHUDConfig["layoutStyle"][] = ["grid", "arc", "compact"];
    const currIdx = styles.indexOf(mobileHUD.layoutStyle);
    const next = styles[(currIdx + 1) % styles.length];
    setMobileHUD({ layoutStyle: next });
  }, [mobileHUD.layoutStyle, setMobileHUD]);

  if (!isOpen) return null;

  const isLeftHanded = mobileHUD.handedness === "left";

  return (
    <div className="hud-interactive-editor-backdrop" onClick={onClose}>
      {/* Top Floating Control Toolbar */}
      <div className="hud-editor-toolbar" onClick={(e) => e.stopPropagation()}>
        <div className="hud-editor-tag">
          <MoveIcon size={14} color="#38bdf8" />
          <span>EDIT MOBILE HUD LAYOUT</span>
        </div>

        <div className="hud-editor-actions">
          <button
            type="button"
            className="hud-editor-btn"
            onClick={toggleHandedness}
            title="Swap between Right-Handed and Left-Handed mode"
          >
            {isLeftHanded ? "LEFT HANDED" : "RIGHT HANDED"}
          </button>

          <button
            type="button"
            className="hud-editor-btn"
            onClick={cycleStyle}
            title="Cycle layout style (Grid, Arc, Compact)"
          >
            STYLE: {mobileHUD.layoutStyle.toUpperCase()}
          </button>

          <div className="hud-editor-scale-group">
            <button
              type="button"
              className="hud-editor-btn-small"
              onClick={() => adjustScale(-0.05)}
              title="Decrease button size"
            >
              −
            </button>
            <span className="hud-editor-scale-label">{Math.round(mobileHUD.scale * 100)}%</span>
            <button
              type="button"
              className="hud-editor-btn-small"
              onClick={() => adjustScale(0.05)}
              title="Increase button size"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="hud-editor-btn btn-reset"
            onClick={resetMobileHUD}
            title="Reset to default layout"
          >
            <RefreshIcon size={12} /> RESET
          </button>

          <button
            type="button"
            className="hud-editor-btn btn-save"
            onClick={onClose}
            title="Save and finish editing"
          >
            <CheckIcon size={14} /> SAVE &amp; EXIT
          </button>
        </div>
      </div>

      {/* Draggable Bounding Box overlay over the button cluster */}
      <div
        className={`hud-draggable-box ${isDraggingCluster ? "is-active" : ""}`}
        style={{
          bottom: `${mobileHUD.bottomOffset - 12}px`,
          [isLeftHanded ? "left" : "right"]: `${mobileHUD.sideOffset - 12}px`,
          [isLeftHanded ? "right" : "left"]: "auto",
          transform: `scale(${mobileHUD.scale})`,
          transformOrigin: isLeftHanded ? "bottom left" : "bottom right",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hud-box-handle">
          <MoveIcon size={16} color="#38bdf8" />
          <span>DRAG WITH THUMB TO POSITION</span>
        </div>
        <div className="hud-box-coords">
          Side: {mobileHUD.sideOffset}px · Bottom: {mobileHUD.bottomOffset}px
        </div>
      </div>
    </div>
  );
}
