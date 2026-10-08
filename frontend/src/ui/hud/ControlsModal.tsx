"use client";

interface ControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ControlsModal({ isOpen, onClose }: ControlsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="hud-menu-modal-backdrop">
      <div className="hud-menu-modal-box cloud-save-modal" style={{ maxWidth: "580px" }}>
        <div className="hud-menu-modal-header">
          <h2 className="hud-menu-modal-title">Controls & Technique Codex</h2>
          <button className="hud-menu-close-btn" style={{ fontSize: "20px" }} onClick={onClose}>&times;</button>
        </div>
        <div className="hud-menu-modal-body" style={{ color: "#eee", fontFamily: "inherit" }}>
          <div className="controls-guide-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
            <div>
              <h4 style={{ borderBottom: "1px solid #444", paddingBottom: "5px", color: "#ddaa44" }}>Basic Movement & Combat</h4>
              <p style={{ margin: "6px 0" }}><strong>Move:</strong> W / A / S / D (or Arrow Keys)</p>
              <p style={{ margin: "6px 0" }}><strong>Light Combo:</strong> Left Click (5-Hit Chain)</p>
              <p style={{ margin: "6px 0" }}><strong>Charged Weapon Art:</strong> Hold Left Click</p>
              <p style={{ margin: "6px 0" }}><strong>Deflect / Parry:</strong> Right Click</p>
              <p style={{ margin: "6px 0" }}><strong>24-Move Bloom / Leviathan Axe:</strong> Key Q</p>
              <p style={{ margin: "6px 0" }}><strong>Glory Kill Execution:</strong> Key G (Stunned Enemy / R3)</p>
              <p style={{ margin: "6px 0" }}><strong>Mount / Dismount Dragon:</strong> Key F</p>
              <p style={{ margin: "6px 0" }}><strong>Dragon Barrel Roll:</strong> Alt or Double-Tap A / D</p>
              <p style={{ margin: "6px 0" }}><strong>Floral Hook Pull:</strong> Key T</p>
            </div>
            <div>
              <h4 style={{ borderBottom: "1px solid #444", paddingBottom: "5px", color: "#38bdf8" }}>Celestial Qinggong Traversal</h4>
              <p style={{ margin: "6px 0" }}><strong>Spring Leap:</strong> Space (Ground)</p>
              <p style={{ margin: "6px 0" }}><strong>Sky Step / Double Jump:</strong> Space (in Air)</p>
              <p style={{ margin: "6px 0" }}><strong>Wind Gliding:</strong> Hold Space (in Air)</p>
              <p style={{ margin: "6px 0" }}><strong>Qinggong Air Dash:</strong> Left Shift (in Air)</p>
              <p style={{ margin: "6px 0" }}><strong>Meteor Dive Slam:</strong> Left Click (in Air)</p>
              <p style={{ margin: "6px 0" }}><strong>Wall Rebound:</strong> Space against Walls</p>
              <p style={{ margin: "6px 0" }}><strong>Rooftop Traversal:</strong> Land & sprint on any roof/balcony</p>
            </div>
          </div>

          <div className="combat-tutorial-tip" style={{ backgroundColor: "#222", padding: "12px", borderRadius: "6px", borderLeft: "4px solid #ddaa44", marginBottom: "15px" }}>
            <strong style={{ color: "#ddaa44" }}>Deflection / Parry Mechanic:</strong>
            <p style={{ margin: "5px 0 0 0", fontSize: "0.9em", lineHeight: "1.4" }}>
              Right-click at the exact moment an enemy strikes to <strong>Deflect</strong>. Perfect deflection staggers the enemy, prevents damage, and instantly builds <strong>+25 Qi</strong>.
            </p>
          </div>

          <div className="techniques-explanation">
            <h4 style={{ color: "#ddaa44", borderBottom: "1px solid #444", paddingBottom: "5px" }}>Special Qi Techniques [Keys 1-4]</h4>
            <p style={{ fontSize: "0.9em", lineHeight: "1.4", margin: "5px 0" }}>
              Cast equipped slot techniques by pressing digit keys <strong>1, 2, 3, or 4</strong>. Each active technique consumes <strong>20 Qi</strong>.
            </p>
            <div style={{ marginTop: "10px" }}>
              <p style={{ margin: "4px 0", fontSize: "0.85em" }}><strong>Phantom Blade (Sword Sage):</strong> Spins sword dealing 55 damage to nearby enemies.</p>
              <p style={{ margin: "4px 0", fontSize: "0.85em" }}><strong>Iron Wall (Iron Guardian):</strong> Creates a golden barrier for 3 seconds of invulnerability.</p>
              <p style={{ margin: "4px 0", fontSize: "0.85em" }}><strong>Meridian Strike (Fist Cultivator):</strong> Stuns nearby enemies for 2.5 seconds.</p>
              <p style={{ margin: "4px 0", fontSize: "0.85em" }}><strong>Ink Arrow (Shadow Archer):</strong> Fires a high-damage precision seeking projectile.</p>
              <p style={{ margin: "4px 0", fontSize: "0.85em" }}><strong>Ink Seal (Ink Scribe):</strong> Lays a ground seal slowing enemies within it by 60%.</p>
            </div>
          </div>
        </div>
        <div className="hud-menu-modal-footer" style={{ textAlign: "right", marginTop: "15px" }}>
          <button className="cloud-action-btn cancel-btn" onClick={onClose}>Close Guide</button>
        </div>
      </div>
    </div>
  );
}
