"use client";

import { useGameStore } from "@/stores/gameStore";
import { useState } from "react";
import { MERIDIAN_BRANCHES, MERIDIAN_NODES } from "@/data/professions";

export function MeridiansOverlay() {
  const showMeridians = useGameStore((s) => s.ui.showMeridians);
  const toggle = useGameStore((s) => s.toggleMeridians);
  const unlockNode = useGameStore((s) => s.unlockMeridianNode);
  const meridianStones = useGameStore((s) => s.player.meridianStones);
  const meridians = useGameStore((s) => s.player.meridians);

  const [activeBranch, setActiveBranch] = useState<string>("heart");

  if (!showMeridians) return null;

  // Filter nodes for the current branch
  const branchNodes = MERIDIAN_NODES.filter((n) => n.branch === activeBranch);

  return (
    <div className="hud-menu-modal-backdrop" onClick={() => toggle()}>
      <div className="hud-menu-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="hud-menu-modal-header">
          <div className="hud-menu-modal-title">經絡 JEWEL OF MERIDIANS</div>
          <button className="hud-menu-close-btn" onClick={() => toggle()}>&times;</button>
        </div>

        <div className="hud-menu-modal-body">
          <div className="hud-meridian-columns">
            {/* Sidebar list of branches */}
            <div className="hud-meridian-tabs">
              <div style={{ padding: "16px 20px", fontSize: "11px", color: "#666", borderBottom: "1px solid #111" }}>
                MERIDIAN STONES: <span style={{ color: "#fff", fontWeight: "bold" }}>{meridianStones} Stones</span>
              </div>
              {Object.entries(MERIDIAN_BRANCHES).map(([key, branch]) => {
                // Count unlocked nodes in this branch
                const unlockedCount = meridians.filter(
                  (n) => MERIDIAN_NODES.find((def) => def.id === n.id)?.branch === key && n.unlocked
                ).length;
                const totalInBranch = MERIDIAN_NODES.filter((n) => n.branch === key).length;

                return (
                  <button
                    key={key}
                    className={`hud-meridian-tab-btn ${activeBranch === key ? "hud-meridian-tab-active" : ""}`}
                    onClick={() => setActiveBranch(key)}
                  >
                    <span>{branch.kanji} {branch.name}</span>
                    <span style={{ fontSize: "10px", opacity: 0.6 }}>{unlockedCount}/{totalInBranch}</span>
                  </button>
                );
              })}
            </div>

            {/* Main content area displaying nodes in branch */}
            <div className="hud-meridian-nodes-content">
              <div>
                <h3 style={{ textTransform: "uppercase", letterSpacing: "2px" }}>
                  {MERIDIAN_BRANCHES[activeBranch as keyof typeof MERIDIAN_BRANCHES].name} Branch Inflow
                </h3>
                <p style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                  Unlock consecutive meridian nodes to rebuild your channels and increase stats.
                </p>
              </div>

              {branchNodes.map((nodeDef) => {
                const unlockedNode = meridians.find((n) => n.id === nodeDef.id);
                const currentLvl = unlockedNode?.level || 0;
                const isMax = currentLvl >= nodeDef.maxLevel;

                // Check prerequisite
                let prereqMet = true;
                let prereqName = "";
                if (nodeDef.prerequisite) {
                  const prereqDef = MERIDIAN_NODES.find((n) => n.id === nodeDef.prerequisite);
                  const unlockedPrereq = meridians.find((n) => n.id === nodeDef.prerequisite);
                  prereqMet = !!(unlockedPrereq && unlockedPrereq.unlocked);
                  prereqName = prereqDef?.name || "";
                }

                const canAfford = meridianStones >= nodeDef.cost;
                const canUpgrade = prereqMet && !isMax && canAfford;

                return (
                  <div
                    key={nodeDef.id}
                    className={`hud-meridian-node-row ${!prereqMet ? "hud-node-locked" : ""}`}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ background: "#222", padding: "2px 6px", fontSize: "10px" }}>T{nodeDef.tier}</span>
                        <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                          {nodeDef.kanji} {nodeDef.name}
                        </span>
                        <span style={{ fontSize: "11px", opacity: 0.5 }}>
                          Lvl {currentLvl}/{nodeDef.maxLevel}
                        </span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#aaa", marginTop: "6px" }}>
                        {nodeDef.description} (Current bonus: +{currentLvl * nodeDef.bonusPerLevel})
                      </div>
                      {!prereqMet && (
                        <div style={{ fontSize: "10px", color: "#883333", marginTop: "4px" }}>
                          Requires: {prereqName}
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        className="hud-node-detail-btn"
                        disabled={!canUpgrade}
                        onClick={() => unlockNode(nodeDef.id)}
                      >
                        {isMax ? "MAXED" : `UPGRADE (${nodeDef.cost} Stones)`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
