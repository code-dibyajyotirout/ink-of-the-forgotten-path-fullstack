"use client";

import { useGameStore } from "@/stores/gameStore";
import { PROFESSIONS } from "@/data/professions";

export function InventoryOverlay() {
  const showInventory = useGameStore((s) => s.ui.showInventory);
  const toggle = useGameStore((s) => s.toggleInventory);
  const profession = useGameStore((s) => s.player.profession);
  const alignment = useGameStore((s) => s.player.alignment);
  const realm = useGameStore((s) => s.player.realm);
  const qiEssence = useGameStore((s) => s.player.qiEssence);
  const healthCurrent = useGameStore((s) => s.player.health.current);
  const healthMax = useGameStore((s) => s.player.health.max);
  const staminaCurrent = useGameStore((s) => s.player.stamina.current);
  const staminaMax = useGameStore((s) => s.player.stamina.max);
  const qiCurrent = useGameStore((s) => s.player.qi.current);
  const qiMax = useGameStore((s) => s.player.qi.max);
  const stance = useGameStore((s) => s.player.stance);
  const inventory = useGameStore((s) => s.player.inventory);

  if (!showInventory) return null;

  const profName = profession ? PROFESSIONS[profession].name : "Mortal Cultivator";
  let alignmentLabel = "Neutral";
  if (alignment.righteous > alignment.demonic + 10) alignmentLabel = "Righteous Path";
  if (alignment.demonic > alignment.righteous + 10) alignmentLabel = "Demonic Path";

  return (
    <div className="hud-menu-modal-backdrop" onClick={() => toggle()}>
      <div className="hud-menu-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="hud-menu-modal-header">
          <div className="hud-menu-modal-title">道具 CHARACTER STATUS &amp; INVENTORY</div>
          <button className="hud-menu-close-btn" onClick={() => toggle()}>&times;</button>
        </div>

        <div className="hud-menu-modal-body">
          <div className="hud-inventory-columns">
            {/* Stats Left Panel */}
            <div className="hud-stats-panel">
              <h3 style={{ textTransform: "uppercase", letterSpacing: "2px" }}>Cultivator Stats</h3>
              
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="hud-stat-item">
                  <span>Profession</span>
                  <span>{profName}</span>
                </div>
                <div className="hud-stat-item">
                  <span>Realm</span>
                  <span style={{ textTransform: "uppercase" }}>{realm.replace("_", " ")}</span>
                </div>
                <div className="hud-stat-item">
                  <span>Qi Essence</span>
                  <span>{qiEssence} Qi</span>
                </div>
                <div className="hud-stat-item">
                  <span>Karma Alignment</span>
                  <span>{alignmentLabel}</span>
                </div>
                <div className="hud-stat-item">
                  <span>HP Capacity</span>
                  <span>{healthCurrent} / {healthMax}</span>
                </div>
                <div className="hud-stat-item">
                  <span>Stamina Capacity</span>
                  <span>{staminaCurrent} / {staminaMax}</span>
                </div>
                <div className="hud-stat-item">
                  <span>Qi Capacity</span>
                  <span>{qiCurrent} / {qiMax}</span>
                </div>
                <div className="hud-stat-item">
                  <span>Stance</span>
                  <span style={{ textTransform: "capitalize" }}>{stance}</span>
                </div>
              </div>
            </div>

            {/* Inventory Right Panel */}
            <div className="hud-inventory-panel">
              <h3 style={{ textTransform: "uppercase", letterSpacing: "2px", marginBottom: "16px" }}>Inventory Bag</h3>

              {inventory.length === 0 ? (
                <div style={{ color: "#555", fontSize: "12px", fontStyle: "italic", textAlign: "center", marginTop: "40px" }}>
                  Your inventory bag is currently empty.
                </div>
              ) : (
                <div className="hud-item-list">
                  {inventory.map((item) => (
                    <div key={item.id} className="hud-item-row">
                      <div>
                        <div className="hud-item-name">{item.name} <span style={{ opacity: 0.5 }}>x{item.quantity}</span></div>
                        <div className="hud-item-desc">{item.description}</div>
                      </div>
                      <div style={{ fontSize: "10px", textTransform: "uppercase", color: "#666" }}>
                        {item.type}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
