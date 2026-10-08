/**
 * Character Creation — Monochromatic & Minimalist Relic Weapon Selection.
 * The Dragon Sword is unlocked; remaining relics are locked and marked "COMING SOON".
 */
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";
import {
  PROFESSIONS,
  type ProfessionId,
} from "@/data/professions";
import { ManhwaFlashbackModal } from "@/ui/ManhwaFlashbackModal";
import "./create.css";

const WEAPON_IDS: ProfessionId[] = [
  "sword_sage",
  "iron_guardian",
  "fist_cultivator",
  "shadow_archer",
  "ink_scribe",
];

const UNLOCKED_WEAPON_ID: ProfessionId = "sword_sage";

const COMPANION_DATA: Record<
  ProfessionId,
  {
    numeral: string;
    tag: string;
    kanjiShort: string;
    affinity: string;
    wyrmTitle: string;
    wyrmDesc: string;
    dashSkill: string;
    diveSkill: string;
  }
> = {
  sword_sage: {
    numeral: "01",
    tag: "HARMONIST",
    kanjiShort: "龍劍",
    affinity: "Balanced · Aerial Reach",
    wyrmTitle: "Bonded Wyrm: Veyros (天道共鳴)",
    wyrmDesc: "Harmonist Tidewalker Dragon · Jade Scales & Gold Crest",
    dashSkill: "Piercing Dash Cleave",
    diveSkill: "Dragon Momentum 3× Plunge Slam",
  },
  iron_guardian: {
    numeral: "02",
    tag: "VANGUARD",
    kanjiShort: "貫日",
    affinity: "Hyper-Armor · Defense",
    wyrmTitle: "Bonded Wyrm: Veyros (玄武戰鎧)",
    wyrmDesc: "Abyssal Bastion Wyrm · Obsidian Plates & Adamantine Horn",
    dashSkill: "Bastion Shield Charge",
    diveSkill: "Iron Meteor Anchor Slam",
  },
  fist_cultivator: {
    numeral: "03",
    tag: "ASURA",
    kanjiShort: "金剛",
    affinity: "Stagger · Kinetic Shockwave",
    wyrmTitle: "Bonded Wyrm: Veyros (赤炎龍魂)",
    wyrmDesc: "Asura Kinetic Wyrm · Molten Core & Thunderous Claws",
    dashSkill: "Flash Vajra Strike",
    diveSkill: "Asura Bedrock Seismic Drop",
  },
  shadow_archer: {
    numeral: "04",
    tag: "SHADOW",
    kanjiShort: "雙牙",
    affinity: "Blink-Step · Lethal Bleed",
    wyrmTitle: "Bonded Wyrm: Veyros (幽冥暗影)",
    wyrmDesc: "Eclipse Phantom Wyrm · Midnight Scales & Void Mist",
    dashSkill: "Shadow Step Decapitation",
    diveSkill: "Twin Fang Aerial Corkscrew",
  },
  ink_scribe: {
    numeral: "05",
    tag: "SCRIBE",
    kanjiShort: "萬象",
    affinity: "Zone Sealing · Reality Ink",
    wyrmTitle: "Bonded Wyrm: Veyros (太極墨龍)",
    wyrmDesc: "Ancestral Monochrome Wyrm · Floating Ink Swords & Qi Sealing",
    dashSkill: "Ink Inscription Brush Cleave",
    diveSkill: "Cosmic Script Celestial Detonation",
  },
};

// ─── Pure Monochromatic Vector Icons ───

function RelicIcon({ id, className = "relic-svg" }: { id: ProfessionId; className?: string }) {
  switch (id) {
    case "sword_sage":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
          <path d="M13 19l2 2 4-4-2-2" />
          <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
          <path d="M11 5L9 3 5 7l2 2" />
        </svg>
      );
    case "iron_guardian":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M8 8l4-6 4 6" />
          <path d="M6 11c0 3 2.5 5 6 5s6-2 6-5" />
          <path d="M9 22h6" />
        </svg>
      );
    case "fist_cultivator":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v3" />
          <path d="M14 9V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v7" />
          <path d="M10 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path d="M6 14v-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a7 7 0 0 0 7 7h3a7 7 0 0 0 7-7v-6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2" />
          <path d="M8 15h8" />
        </svg>
      );
    case "shadow_archer":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 21l6-6" />
          <path d="M4 14l6-6L8 6 6 4 4 6l2 2-2 6z" />
          <path d="M19 3l-6 6" />
          <path d="M20 10l-6 6 2 2 2 2 2-2-2-2 2-6z" />
        </svg>
      );
    case "ink_scribe":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 2l4 4-11 11H7v-4L18 2z" />
          <path d="M7 17l-4 5h5l-1-5" />
          <path d="M15 5l4 4" />
        </svg>
      );
  }
}

function WyrmDragonIcon({ className = "wyrm-svg" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14c2-4 6-6 10-5 3 1 5 4 6 7" />
      <path d="M3 20c4-2 8-1 12 1" />
      <path d="M15 4c2-1 4 0 5 2l-3 2" />
      <circle cx="16.5" cy="8.5" r="1" fill="currentColor" />
      <path d="M18 11l3-1-1 3" />
      <path d="M7 11c1-3 3-5 6-6" />
    </svg>
  );
}

function QiSparkIcon({ className = "spark-svg" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 6.9 6.9 2.4-6.9 2.4L12 21l-2.4-6.9L2.7 11.3l6.9-2.4L12 2z" />
    </svg>
  );
}

function LockIcon({ className = "lock-svg" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export default function CharacterCreation() {
  const router = useRouter();
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  // Flashback modal states
  const [showFlashback, setShowFlashback] = useState(false);
  const [flashbackIsAwakeningFlow, setFlashbackIsAwakeningFlow] = useState(false);

  const resetGame = useGameStore((s) => s.resetGame);
  const loadState = useGameStore((s) => s.loadState);

  const finalizeGameEntry = useCallback((triggerAwakening = false) => {
    const prof = PROFESSIONS[UNLOCKED_WEAPON_ID];

    // 1. Reset game state
    resetGame();

    // 2. Compute starting stats based on chosen weapon
    const baseHealth = 100 + prof.stats.healthBonus;
    const baseQi = 50 + prof.stats.qiBonus;
    const baseStamina = 100 + prof.stats.staminaBonus;

    // 3. Initialize fresh player state (neutral alignment, forged through choices)
    loadState({
      player: {
        position: [0, 4.3, 0],
        rotation: [0, 0, 0],
        realm: "mortal",
        meridians: [],
        alignment: { righteous: 0, demonic: 0 },
        inventory: [],
        masteryLevels: {},
        qiEssence: 0,
        meridianStones: 0,
        memoriesCollected: [],
        deathLocations: {},
        consecutiveParries: 0,
        secretPowersDiscovered: [],
        stance: "flowing_wind",
        profession: UNLOCKED_WEAPON_ID,
        reincarnationPurpose: null,
        health: { current: baseHealth, max: baseHealth },
        qi: { current: baseQi, max: baseQi },
        stamina: { current: baseStamina, max: baseStamina },
        equippedTechniques: [prof.signatureTechnique, null, null, null],
      },
      story: {
        chapter: 1,
        completedQuests: [],
        activeQuests: [],
        dialogueFlags: {},
        pathChoices: [],
      },
    });

    if (triggerAwakening) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("trigger_awakening", "1");
      }
      router.push("/game?awaken=1");
    } else {
      router.push("/game");
    }
  }, [resetGame, loadState, router]);

  // Card click: Unlocked weapon enters directly ("Select & Go"); locked cards show Coming Soon toast
  const handleCardClick = useCallback((id: ProfessionId) => {
    if (id !== UNLOCKED_WEAPON_ID) {
      const weaponName = PROFESSIONS[id].weaponName.replace(/ \(.*\)/, "");
      setLockedNotice(`${weaponName} is locked — Coming Soon. The Dragon Sword is currently unlocked.`);
      setTimeout(() => setLockedNotice(null), 3000);
      return;
    }
    finalizeGameEntry(true);
  }, [finalizeGameEntry]);

  const startAwakeningFlashback = useCallback(() => {
    setFlashbackIsAwakeningFlow(true);
    setShowFlashback(true);
  }, []);

  const activeWeapon = PROFESSIONS[UNLOCKED_WEAPON_ID];
  const activeCompanion = COMPANION_DATA[UNLOCKED_WEAPON_ID];

  return (
    <div className="creation-screen">
      <div className="creation-bg" />

      <main className="creation-phase weapon-phase">
        {/* Monochromatic Minimalist Header */}
        <header className="phase-header">
          <span className="phase-badge">THE DROWNED EPOCH · 潮汐餘燼</span>
          <h1 className="phase-title">Awakening of the Ancestral Relics</h1>
          <p className="phase-subtitle">
            Centuries after the Great Drowning, the blind Oracle&apos;s Qi Cocoon cracks in the silver dawn. Wield <strong>The Dragon Sword</strong> to awaken Veyros — remaining ancestral relics arrive in future epochs.
          </p>
        </header>

        {/* ─── Relic Cards Deck: The Weapon Selection Grid with One Open & Rest Coming Soon ─── */}
        <section className="relic-cards-deck" aria-label="Relic Weapon Cards">
          {WEAPON_IDS.map((id) => {
            const prof = PROFESSIONS[id];
            const data = COMPANION_DATA[id];
            const isUnlocked = id === UNLOCKED_WEAPON_ID;

            return (
              <div
                key={id}
                role="button"
                tabIndex={isUnlocked ? 0 : -1}
                className={`relic-card-btn ${isUnlocked ? "selected" : "is-locked"}`}
                onClick={() => handleCardClick(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(id);
                  }
                }}
                aria-disabled={!isUnlocked}
                title={isUnlocked ? "Click to Select & Go directly into the world" : `${prof.weaponName} — Coming Soon`}
              >
                <div className="card-top-row">
                  <span className="card-numeral">{data.numeral}</span>
                  <span className={`card-tag ${!isUnlocked ? "card-tag-locked" : ""}`}>
                    {isUnlocked ? "UNLOCKED" : "COMING SOON"}
                  </span>
                </div>

                <div className="card-glyph-container">
                  <span className="card-kanji-watermark">{data.kanjiShort}</span>
                  <div className="card-icon-frame">
                    <RelicIcon id={id} className="card-relic-svg" />
                  </div>
                  {!isUnlocked && (
                    <div className="card-lock-badge" title="Relic in development">
                      <LockIcon className="card-lock-svg" />
                    </div>
                  )}
                </div>

                <div className="card-meta">
                  <h3 className="card-weapon-name">{prof.weaponName.replace(/ \(.*\)/, "")}</h3>
                  <span className="card-archetype">{isUnlocked ? data.affinity : "Relic Sealed"}</span>
                </div>

                <div className="card-indicator">
                  <span className={`card-status-dot ${!isUnlocked ? "is-locked-dot" : ""}`} />
                  <span className={`card-status-text ${isUnlocked ? "is-selected-action" : "is-locked-text"}`}>
                    {isUnlocked ? "SELECT & GO ->" : "COMING SOON"}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Temporary Locked Relic Feedback Notice */}
        {lockedNotice && (
          <div className="locked-relic-toast" role="alert">
            <LockIcon className="toast-lock-svg" />
            <span>{lockedNotice}</span>
          </div>
        )}

        {/* ─── Detailed Weapon Inspection Layout (The Unlocked Dragon Sword) ─── */}
        <div className="weapon-layout">
          {/* Left panel: Relic & Companion Wyrm Card */}
          <div className="weapon-list">
            <div className="relic-showcase-card">
              <div className="relic-icon-circle">
                <RelicIcon id={UNLOCKED_WEAPON_ID} className="showcase-relic-svg" />
              </div>
              <div className="relic-meta">
                <span className="relic-kanji">{activeWeapon.weaponKanji}</span>
                <h2 className="relic-name">{activeWeapon.weaponName}</h2>
                <span className="relic-archetype">{activeWeapon.weaponArchetype}</span>
              </div>
              <p className="relic-lore-quote">
                &ldquo;{activeWeapon.loreQuote}&rdquo;
              </p>

              <div className="companion-bond-box">
                <div className="companion-icon-box">
                  <WyrmDragonIcon className="companion-wyrm-svg" />
                </div>
                <div className="companion-info">
                  <strong className="companion-title">{activeCompanion.wyrmTitle}</strong>
                  <span className="companion-sub">{activeCompanion.wyrmDesc}</span>
                </div>
              </div>

              <div className="alignment-note-box">
                <span className="alignment-badge">ALIGNMENT SYSTEM</span>
                <p className="alignment-desc">
                  Your destiny is unwritten. Righteous Harmony (+Mercy/Purification) vs Demonic Wrath (+Execution/Power) emerges organically through choices in the Drowned Epoch.
                </p>
              </div>
            </div>
          </div>

          {/* Right panel: Combat Arts & Attributes */}
          <div className="weapon-showcase">
            <div className="showcase-top">
              <div className="showcase-header">
                <span className="showcase-kanji-big">{activeCompanion.kanjiShort}</span>
                <div>
                  <h2 className="showcase-title">
                    {activeWeapon.weaponName} — Combat Arts
                  </h2>
                  <span className="showcase-subtitle">{activeWeapon.name} · {activeWeapon.weaponArchetype}</span>
                </div>
              </div>

              <p className="showcase-desc">
                {activeWeapon.description}
              </p>
            </div>

            {/* Combat Variations Preview */}
            <div className="combat-variations-box">
              <h3 className="variations-title">
                <QiSparkIcon className="variations-spark-svg" /> Martial Variations &amp; Technique Arts
              </h3>
              <div className="variation-grid">
                <div className="variation-item">
                  <span className="variation-badge">COMBO</span>
                  <strong className="variation-label">Attack String:</strong>
                  <span className="variation-val">{activeWeapon.comboNames[activeWeapon.comboNames.length - 1] || "Dragon Execution"}</span>
                </div>
                <div className="variation-item">
                  <span className="variation-badge">HOLD LMB</span>
                  <strong className="variation-label">Divine Art:</strong>
                  <span className="variation-val">{activeWeapon.chargedSkillName}</span>
                </div>
                <div className="variation-item">
                  <span className="variation-badge">SHIFT + LMB</span>
                  <strong className="variation-label">Flash-Step:</strong>
                  <span className="variation-val">{activeCompanion.dashSkill}</span>
                </div>
                <div className="variation-item">
                  <span className="variation-badge">SPACE + LMB</span>
                  <strong className="variation-label">Aerial Dive:</strong>
                  <span className="variation-val">{activeCompanion.diveSkill}</span>
                </div>
              </div>
            </div>

            {/* Stat Gauges */}
            <div className="stats-container">
              <h3 className="stats-title">Relic Attributes</h3>
              <div className="stats-grid">
                <StatBar label="PWR" value={activeWeapon.stats.attackPowerMod * 70} max={100} />
                <StatBar label="SPD" value={activeWeapon.stats.attackSpeedMod * 70} max={100} />
                <StatBar label="RNG" value={activeWeapon.stats.rangeMod * 35} max={100} />
                <StatBar label="CRT" value={activeWeapon.stats.critChanceMod * 70} max={100} />
                <StatBar label="DEF" value={activeWeapon.stats.blockPowerMod * 70} max={100} />
                <StatBar label="HP" value={100 + activeWeapon.stats.healthBonus} max={140} />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="showcase-actions">
              <button
                type="button"
                className="btn-awaken-main"
                onClick={startAwakeningFlashback}
                title="Awaken the blade and experience the cinematic memory flashback"
              >
                AWAKEN ANCESTRAL BLADE (CINEMATIC) -&gt;
              </button>
              <button
                type="button"
                className="btn-quick-start"
                onClick={() => finalizeGameEntry(true)}
                title="Enter 3D Drowned Epoch world directly with The Dragon Sword"
              >
                SELECT &amp; GO DIRECTLY (SKIP STORY) -&gt;
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Full-Screen Chronicle Flashback Modal ─── */}
      {showFlashback && (
        <ManhwaFlashbackModal
          weapon={PROFESSIONS[UNLOCKED_WEAPON_ID]}
          onComplete={() => {
            setShowFlashback(false);
            if (flashbackIsAwakeningFlow) {
              finalizeGameEntry(true);
            }
          }}
          onSkip={() => {
            setShowFlashback(false);
            if (flashbackIsAwakeningFlow) {
              finalizeGameEntry(true);
            }
          }}
          isReplay={!flashbackIsAwakeningFlow}
        />
      )}
    </div>
  );
}

// ─── Stat Bar Helper ──────────────────────────────────────────

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-value">{Math.round(value)}</span>
    </div>
  );
}
