/**
 * Professions — The five martial traditions a player can choose.
 * Each defines starting stats, enhanced stance, signature technique, and lore.
 */

export type ProfessionId =
  | "sword_sage"
  | "iron_guardian"
  | "fist_cultivator"
  | "shadow_archer"
  | "ink_scribe";

export type ReincarnationPurpose = "revenge" | "peace" | "truth";

export interface ManhwaFlashbackPanel {
  id: string;
  order: number;
  chapterBadge: string;
  sceneTitle: string;
  narrationLines: string[];
  dialogue?: {
    speaker: string;
    text: string;
    isShout?: boolean;
  };
  sfx: {
    korean: string;
    english: string;
    style: "shiiing" | "boom" | "slash" | "crackle" | "whisper";
  };
  visualTheme: {
    bgGradient: string;
    moodColor: string;
    accentColor: string;
    artIllustration: "blade_ground" | "demon_silhouette" | "army_clash" | "blood_moon" | "awakening_eyes" | "celestial_seal" | "shattered_chains";
  };
}

export interface ProfessionDef {
  id: ProfessionId;
  name: string;
  kanji: string;
  subtitle: string;
  description: string;
  icon: string;

  /** Weapon Identity & Archetype */
  weaponName: string;
  weaponKanji: string;
  weaponArchetype: string;
  weaponMeshType: "odachi" | "spear" | "gauntlets" | "dual_daggers" | "brush";
  comboNames: string[];
  chargedSkillName: string;
  chargedSkillDesc: string;
  weaponColor: string;
  manhwaFlashback: ManhwaFlashbackPanel[];

  /** Starting stat modifiers (applied on top of base) */
  stats: {
    healthBonus: number;
    qiBonus: number;
    staminaBonus: number;
    attackSpeedMod: number;    // 1.0 = normal
    attackPowerMod: number;
    blockPowerMod: number;
    critChanceMod: number;
    rangeMod: number;          // 1.0 = melee, >1 = extended
    qiRegenMod: number;
    staminaRegenMod: number;
  };

  /** Which stance gets an enhancement */
  enhancedStance: "iron_body" | "flowing_wind" | "thunderclap" | "none";

  /** Starting technique ID */
  signatureTechnique: string;

  /** Parry window override in ms (default 150) */
  parryWindowMs: number;

  /** Max combo chain length (default 3) */
  maxComboChain: number;

  /** Lore flavor for the character creation screen */
  loreQuote: string;

  /** Gameplay tips shown on selection */
  playstyle: string;
}

export interface ReincarnationPurposeDef {
  id: ReincarnationPurpose;
  name: string;
  kanji: string;
  quote: string;
  description: string;
  icon: string;
  alignmentShift: { righteous: number; demonic: number };
  gameplayEffect: string;
}

// ─── Profession Definitions ─────────────────────────────────────

export const PROFESSIONS: Record<ProfessionId, ProfessionDef> = {
  sword_sage: {
    id: "sword_sage",
    name: "Sword Saint",
    kanji: "劍聖",
    subtitle: "검성",
    description: "The bonded master of Veyros. Wielder of the sacred Dragon Sword forged from an ancient wyrm's fang.",
    icon: "劍",
    weaponName: "The Dragon Sword (龍劍)",
    weaponKanji: "蒼龍破淵劍",
    weaponArchetype: "Divine Relic of the Tidewalker Clan",
    weaponMeshType: "odachi",
    comboNames: [
      "Tidewalker Fang Slash",
      "Crescent Skyward Arc",
      "Harmonic Meridian Gale",
      "Dragon Sovereign Execution"
    ],
    chargedSkillName: "Dragon-Sundering Divine Slash (龍牙破天斬)",
    chargedSkillDesc: "Channel pure dragon qi into the jade blade, unleashing a 20-meter piercing crescent wave that purges corruption and staggers foes.",
    weaponColor: "#2dd4bf",
    stats: {
      healthBonus: 10,
      qiBonus: 25,
      staminaBonus: 15,
      attackSpeedMod: 1.2,
      attackPowerMod: 1.4,
      blockPowerMod: 1.1,
      critChanceMod: 1.3,
      rangeMod: 1.6,
      qiRegenMod: 1.25,
      staminaRegenMod: 1.2,
    },
    enhancedStance: "flowing_wind",
    signatureTechnique: "phantom_blade",
    parryWindowMs: 340,
    maxComboChain: 4,
    loreQuote: "Forged from an ancient dragon's willingly shed fang, the Dragon Sword hums with the shared pulse of rider and wyrm.",
    playstyle: "Fluid high-reach draconic slashes. 4th combo finisher calls down thunderous dragon momentum. Hold Heavy to unleash the sweeping Dragon-Sundering Divine Slash.",
    manhwaFlashback: [
      {
        id: "dragon_sword_1",
        order: 1,
        chapterBadge: "THE EPOCH OF HARMONY (和諧紀元)",
        sceneTitle: "The Shared Pulse of Man and Wyrm",
        narrationLines: [
          "In the antiquity before the great oceans drowned the earth...",
          "Humanity and dragons shared qi meridians through Harmonic Bonding.",
          "From an ancient wyrm's willingly shed fang, the Tidewalkers forged the sacred Dragon Sword."
        ],
        sfx: { korean: "우웅...", english: "HUMMMM...", style: "whisper" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #042f2e 0%, #0d9488 50%, #022c22 100%)",
          moodColor: "#2dd4bf",
          accentColor: "#5eead4",
          artIllustration: "blade_ground"
        }
      },
      {
        id: "dragon_sword_2",
        order: 2,
        chapterBadge: "THE ASHSCALE CORRUPTION (蝕脈血禍)",
        sceneTitle: "The Drowning of the World",
        narrationLines: [
          "The Ashscale Cult discovered forbidden meridian corruption, turning sacred dragons into burning weapons.",
          "Civilization drowned under black Abyssal Ink as dark dragons consumed the sky.",
          "Almost all who remembered the bond of harmony were slaughtered."
        ],
        dialogue: {
          speaker: "Grand Wyrmlord",
          text: "Dragons are weapons! Nature exists only to burn for our ascension!",
          isShout: true
        },
        sfx: { korean: "콰아아아!", english: "ROAAAR!", style: "boom" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #450a0a 0%, #1c1917 50%, #0c0a09 100%)",
          moodColor: "#ef4444",
          accentColor: "#f97316",
          artIllustration: "demon_silhouette"
        }
      },
      {
        id: "dragon_sword_3",
        order: 3,
        chapterBadge: "THE ORACLE'S PROPHECY (先知神諭)",
        sceneTitle: "The Chrysalis Across Millennia",
        narrationLines: [
          "As the black flames devoured the clan, the blind Oracle wove the final seal of preservation.",
          "She enveloped the young Sword Saint and the Dragon Sword within a divine Qi Cocoon.",
          "Veyros curled his wings around the chrysalis, entering a silent slumber of eternal vigil."
        ],
        dialogue: {
          speaker: "The Oracle of the Drowned Epoch",
          text: "The world will drown in ash and shadow. But the tide always turns. Sleep, Sword Saint — the world will need you when it has forgotten freedom.",
          isShout: false
        },
        sfx: { korean: "파아아...", english: "WHISPER...", style: "whisper" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #1e1b4b 0%, #0f172a 50%, #0369a1 100%)",
          moodColor: "#38bdf8",
          accentColor: "#fbbf24",
          artIllustration: "shattered_chains"
        }
      },
      {
        id: "dragon_sword_4",
        order: 4,
        chapterBadge: "THE AWAKENING (破繭成龍)",
        sceneTitle: "Morning Sun over Endless Seas",
        narrationLines: [
          "Centuries turn to silence. The Qi Cocoon cracks in the golden dawn light.",
          "A solitary hut stands on the cliff, the warm sun rising over boundless waters with no one around.",
          "Veyros stirs beside the hearth. The Dragon Sword hums with divine energy."
        ],
        dialogue: {
          speaker: "Veyros",
          text: "Master... The tide has turned. Our sky awaits.",
          isShout: false
        },
        sfx: { korean: "콰아앙!", english: "SHATTER-SHINE!", style: "shiiing" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #075985 0%, #0d9488 50%, #fef08a 100%)",
          moodColor: "#2dd4bf",
          accentColor: "#fef08a",
          artIllustration: "awakening_eyes"
        }
      }
    ]
  },
  iron_guardian: {
    id: "iron_guardian",
    name: "Iron Guardian",
    kanji: "鐵衛",
    subtitle: "철위",
    description: "I am the mountain. Strike me and break yourself upon my steel.",
    icon: "盾",
    weaponName: "Abyssal Dragon Spear",
    weaponKanji: "淵龍貫日槍",
    weaponArchetype: "Vanguard Heavy Polearm",
    weaponMeshType: "spear",
    comboNames: [
      "Dragon Piercing Thrust",
      "Sweeping Tide Arc",
      "Whirlwind Deflecting Spin",
      "Sky-Falling Dragon Plunge"
    ],
    chargedSkillName: "Abyssal Dragon Drill (龍王穿心)",
    chargedSkillDesc: "Wind back the polearm and burst forward in a high-speed drilling charge that pierces enemy defenses and staggers bosses.",
    weaponColor: "#f59e0b",
    stats: {
      healthBonus: 40,
      qiBonus: 0,
      staminaBonus: 30,
      attackSpeedMod: 0.95,
      attackPowerMod: 1.25,
      blockPowerMod: 1.6,
      critChanceMod: 0.85,
      rangeMod: 1.8,
      qiRegenMod: 0.85,
      staminaRegenMod: 1.3,
    },
    enhancedStance: "iron_body",
    signatureTechnique: "unbreakable_stance",
    parryWindowMs: 340,
    maxComboChain: 4,
    loreQuote: "Your past self stood alone at the Iron Gate, holding back an army of ten thousand for three days and three nights.",
    playstyle: "Supreme reach and crowd control. 4th combo hit leaps into the sky and crashes down. Block and parry to turn enemy momentum into lethal thrusts.",
    manhwaFlashback: [
      {
        id: "spear_1",
        order: 1,
        chapterBadge: "THE FALLEN GENERAL",
        sceneTitle: "The Lone Vanguard at the Gate",
        narrationLines: [
          "Three thousand banners burning in the wind.",
          "An entire empire broke like waves against a single spear."
        ],
        sfx: { korean: "쿵-!!", english: "THUUD!", style: "boom" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #451a03 0%, #1c1917 60%, #000 100%)",
          moodColor: "#f59e0b",
          accentColor: "#d97706",
          artIllustration: "army_clash"
        }
      },
      {
        id: "spear_2",
        order: 2,
        chapterBadge: "THE DRAGON'S ROAR",
        sceneTitle: "Blood of a Thousand Warriors",
        narrationLines: [
          "The crimson tassel on the spearhead drank so deeply...",
          "That the iron itself turned dragon-blood red."
        ],
        dialogue: {
          speaker: "Vanguard General",
          text: "None shall pass! Even if the mountains crumble!",
          isShout: true
        },
        sfx: { korean: "콰아앙!", english: "ROAAAAR!", style: "boom" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #7f1d1d 0%, #1c1917 50%, #000 100%)",
          moodColor: "#ef4444",
          accentColor: "#f59e0b",
          artIllustration: "demon_silhouette"
        }
      },
      {
        id: "spear_3",
        order: 3,
        chapterBadge: "THE ENDLESS VOW",
        sceneTitle: "Buried Beneath Steel",
        narrationLines: [
          "He did not fall to enemies.",
          "He stood unmoving until time itself turned his flesh into stone."
        ],
        sfx: { korean: "스륵...", english: "RUSTLE...", style: "whisper" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #1c1917 0%, #0c0a09 60%, #000 100%)",
          moodColor: "#78716c",
          accentColor: "#fbbf24",
          artIllustration: "blade_ground"
        }
      },
      {
        id: "spear_4",
        order: 4,
        chapterBadge: "THE REAWAKENING",
        sceneTitle: "The Dragon Shaft Stirs",
        narrationLines: [
          "The iron seal shatters. The dragon spear thrums with thunderous qi.",
          "The General opens their eyes to a new world."
        ],
        dialogue: {
          speaker: "Abyssal Dragon",
          text: "Our oath is not finished. Rise once more."
        },
        sfx: { korean: "콰쾅!", english: "THUNDERCLAP!", style: "boom" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #b45309 0%, #0c0a09 50%, #000 100%)",
          moodColor: "#f59e0b",
          accentColor: "#fffbeb",
          artIllustration: "awakening_eyes"
        }
      }
    ]
  },
  fist_cultivator: {
    id: "fist_cultivator",
    name: "Fist Cultivator",
    kanji: "拳修",
    subtitle: "권수",
    description: "My flesh is vajra steel. Every strike shatters meridians and sunders stone.",
    icon: "拳",
    weaponName: "Asura Vajra Gauntlets",
    weaponKanji: "修羅金剛拳",
    weaponArchetype: "Spiked Demonic Gauntlets",
    weaponMeshType: "gauntlets",
    comboNames: [
      "Thunderclap Jab",
      "Vajra Bone-Breaker",
      "Asura Rushing Flurry",
      "Spinning Backfist",
      "Heaven-Shattering Uppercut"
    ],
    chargedSkillName: "Earth-Shattering Asura Stomp (崩地阿修羅)",
    chargedSkillDesc: "Smash both runic gauntlets into the bedrock, erupting an ink-fire shockwave ring that knocks all nearby foes into the air.",
    weaponColor: "#ec4899",
    stats: {
      healthBonus: 15,
      qiBonus: 25,
      staminaBonus: 20,
      attackSpeedMod: 1.45,
      attackPowerMod: 1.15,
      blockPowerMod: 0.9,
      critChanceMod: 1.2,
      rangeMod: 0.9,
      qiRegenMod: 1.6,
      staminaRegenMod: 1.15,
    },
    enhancedStance: "thunderclap",
    signatureTechnique: "meridian_strike",
    parryWindowMs: 300,
    maxComboChain: 5,
    loreQuote: "With bare fists, your past self shattered the Jade Emperor's golden throne — and the entire cultivation world trembled.",
    playstyle: "Fast, visceral, close-quarters brutality. 5-hit rapid combo ending with an explosive skyward uppercut. Qi regenerates with every successful punch.",
    manhwaFlashback: [
      {
        id: "fist_1",
        order: 1,
        chapterBadge: "THE DEMON BRAWLER",
        sceneTitle: "No Weapons Needed",
        narrationLines: [
          "They wielded sacred swords. They chanted immortal talismans.",
          "He laughed — and raised two bare fists."
        ],
        sfx: { korean: "콰직-!", english: "CRUNCH!", style: "slash" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #500724 0%, #18181b 60%, #000 100%)",
          moodColor: "#ec4899",
          accentColor: "#db2777",
          artIllustration: "demon_silhouette"
        }
      },
      {
        id: "fist_2",
        order: 2,
        chapterBadge: "SHATTERING HEAVEN",
        sceneTitle: "The Asura's Wrath",
        narrationLines: [
          "Seven mountain peaks collapsed from his shockwaves.",
          "The Jade Throne turned to golden dust before him."
        ],
        dialogue: {
          speaker: "Asura",
          text: "Your heavens are too small for my fury!",
          isShout: true
        },
        sfx: { korean: "콰콰쾅-!!", english: "BOOOOOM!", style: "boom" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #831843 0%, #1f2937 50%, #000 100%)",
          moodColor: "#f472b6",
          accentColor: "#fb7185",
          artIllustration: "army_clash"
        }
      },
      {
        id: "fist_3",
        order: 3,
        chapterBadge: "UNBROKEN WILL",
        sceneTitle: "The Bound Asura",
        narrationLines: [
          "Nine thousand spirit chains could not bow his spine.",
          "He closed his eyes, waiting for the ink of reincarnation."
        ],
        sfx: { korean: "쩌적...", english: "CREAK...", style: "whisper" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #18181b 0%, #09090b 60%, #000 100%)",
          moodColor: "#9ca3af",
          accentColor: "#f472b6",
          artIllustration: "shattered_chains"
        }
      },
      {
        id: "fist_4",
        order: 4,
        chapterBadge: "THE PULSE RESTORED",
        sceneTitle: "Fists That Break Fate",
        narrationLines: [
          "The gauntlets spark with dormant volcanic qi.",
          "A warrior awakens with blood burning like molten metal."
        ],
        dialogue: {
          speaker: "Inner Voice",
          text: "Stand up. The throne of this world is still waiting to be smashed."
        },
        sfx: { korean: "콰아아!", english: "QI ERUPTION!", style: "crackle" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #be185d 0%, #0f172a 50%, #000 100%)",
          moodColor: "#ec4899",
          accentColor: "#fff1f2",
          artIllustration: "awakening_eyes"
        }
      }
    ]
  },
  shadow_archer: {
    id: "shadow_archer",
    name: "Shadow Sovereign",
    kanji: "暗影",
    subtitle: "암영",
    description: "Dance in the dark. Strike twice before the sound of your footsteps arrives.",
    icon: "影",
    weaponName: "Shadowfang Twin Blades",
    weaponKanji: "幽影雙牙",
    weaponArchetype: "Dual Reverse-Grip Shadow Daggers",
    weaponMeshType: "dual_daggers",
    comboNames: [
      "Twin Fang Scissor Cut",
      "Phantom Stabbing Barrage",
      "Corkscrew Shadow Spin",
      "Blink-Step Decapitation"
    ],
    chargedSkillName: "Instant Shadow Execution (瞬影滅絕)",
    chargedSkillDesc: "Disappear into black ink smoke and phase directly through target enemies, leaving an X-slash explosion in your wake.",
    weaponColor: "#a855f7",
    stats: {
      healthBonus: -15,
      qiBonus: 10,
      staminaBonus: 25,
      attackSpeedMod: 1.5,
      attackPowerMod: 1.25,
      blockPowerMod: 0.65,
      critChanceMod: 1.6,
      rangeMod: 1.0,
      qiRegenMod: 1.2,
      staminaRegenMod: 1.4,
    },
    enhancedStance: "flowing_wind",
    signatureTechnique: "phantom_blade",
    parryWindowMs: 290,
    maxComboChain: 4,
    loreQuote: "They found a hundred sect leaders slain in a single moonless night. Each with twin ink marks across their throat. No one ever heard a breath.",
    playstyle: "Ultra-fast dual-wielding assassin. Rapid cross-cuts and evasive blink maneuvers. Crits deal catastrophic damage with shadow smoke bursts.",
    manhwaFlashback: [
      {
        id: "daggers_1",
        order: 1,
        chapterBadge: "THE MOONLESS NIGHT",
        sceneTitle: "A Whisper in the Pavilion",
        narrationLines: [
          "One hundred Grandmasters guarded the Crimson Pagoda.",
          "By midnight, the lanterns burned over silence."
        ],
        sfx: { korean: "슉-", english: "SHHHK!", style: "slash" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #1e1b4b 0%, #0f172a 60%, #000 100%)",
          moodColor: "#a855f7",
          accentColor: "#9333ea",
          artIllustration: "blade_ground"
        }
      },
      {
        id: "daggers_2",
        order: 2,
        chapterBadge: "THE PHANTOM BLADES",
        sceneTitle: "Faster Than Thought",
        narrationLines: [
          "Before the droplet of blood touched the floor...",
          "The Shadow Sovereign had already crossed the lake."
        ],
        dialogue: {
          speaker: "Shadow Sovereign",
          text: "You breathed. That was your final mistake.",
          isShout: false
        },
        sfx: { korean: "슉슉슉!", english: "FLASH-STEP!", style: "slash" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #3b0764 0%, #111827 50%, #000 100%)",
          moodColor: "#c084fc",
          accentColor: "#e9d5ff",
          artIllustration: "demon_silhouette"
        }
      },
      {
        id: "daggers_3",
        order: 3,
        chapterBadge: "MELTING INTO VOID",
        sceneTitle: "No Grave, No Name",
        narrationLines: [
          "No army could corner him.",
          "When the war ended, he simply melted into the midnight ink."
        ],
        sfx: { korean: "스르륵...", english: "FADE...", style: "whisper" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #18181b 0%, #020617 60%, #000 100%)",
          moodColor: "#64748b",
          accentColor: "#a855f7",
          artIllustration: "shattered_chains"
        }
      },
      {
        id: "daggers_4",
        order: 4,
        chapterBadge: "THE BLADES DRAW BLOOD",
        sceneTitle: "Twin Fangs Awaken",
        narrationLines: [
          "A shadow detaches from the wall.",
          "The Twin Blades slide silently from their sheaths."
        ],
        dialogue: {
          speaker: "Twin Blades",
          text: "Target acquired. Hunt begins once more."
        },
        sfx: { korean: "파앗!", english: "GLEAM!", style: "shiiing" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #581c87 0%, #0f172a 50%, #000 100%)",
          moodColor: "#a855f7",
          accentColor: "#f3e8ff",
          artIllustration: "awakening_eyes"
        }
      }
    ]
  },
  ink_scribe: {
    id: "ink_scribe",
    name: "Reality Scribe",
    kanji: "墨聖",
    subtitle: "묵성",
    description: "The brush paints the boundaries of existence. I rewrite reality with ink and will.",
    icon: "筆",
    weaponName: "Celestial Sovereign Brush",
    weaponKanji: "天命萬象筆",
    weaponArchetype: "Ancient Calligraphy Brush & Talismans",
    weaponMeshType: "brush",
    comboNames: [
      "Heaven's Inscription Sweep",
      "Twin Characters Cross Cleave",
      "Ink Dragon Vortex",
      "Sovereign Calligraphy Seal"
    ],
    chargedSkillName: "Cosmic Script Detonation (天地萬象印)",
    chargedSkillDesc: "Paint an ancient celestial character in mid-air, causing 6 hovering ink swords to rain down and detonate.",
    weaponColor: "#10b981",
    stats: {
      healthBonus: -5,
      qiBonus: 50,
      staminaBonus: -5,
      attackSpeedMod: 1.1,
      attackPowerMod: 1.2,
      blockPowerMod: 0.9,
      critChanceMod: 1.15,
      rangeMod: 1.6,
      qiRegenMod: 1.7,
      staminaRegenMod: 1.0,
    },
    enhancedStance: "none",
    signatureTechnique: "ink_seal",
    parryWindowMs: 290,
    maxComboChain: 4,
    loreQuote: "The Heavenly Inkwell was said to be an absolute law of the cosmos — but your past self held the brush. And rewrote the stars.",
    playstyle: "Mystic spell-blade. Flowing calligraphy swings shoot ink blades and burst into magical sigils. Deep qi reservoir.",
    manhwaFlashback: [
      {
        id: "brush_1",
        order: 1,
        chapterBadge: "THE MASTER SCRIPT",
        sceneTitle: "Writing the World's Rules",
        narrationLines: [
          "Before mountains had names, the Heavenly Inkwell stood eternal.",
          "Every living creature was merely ink penned upon silk."
        ],
        sfx: { korean: "스윽...", english: "STROKE...", style: "whisper" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #064e3b 0%, #061914 60%, #000 100%)",
          moodColor: "#10b981",
          accentColor: "#059669",
          artIllustration: "celestial_seal"
        }
      },
      {
        id: "brush_2",
        order: 2,
        chapterBadge: "THE REBELLION OF WORDS",
        sceneTitle: "Crossing Out Fate",
        narrationLines: [
          "When the Heavens commanded his clan's death...",
          "The Scribe took the Sovereign Brush and crossed out the decree of Heaven."
        ],
        dialogue: {
          speaker: "Reality Scribe",
          text: "My fate is not yours to write!",
          isShout: true
        },
        sfx: { korean: "콰아아앙!", english: "BURST!", style: "boom" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #065f46 0%, #111827 50%, #000 100%)",
          moodColor: "#34d399",
          accentColor: "#a7f3d0",
          artIllustration: "demon_silhouette"
        }
      },
      {
        id: "brush_3",
        order: 3,
        chapterBadge: "THE BROKEN INKWELL",
        sceneTitle: "The Great Shattering",
        narrationLines: [
          "He shattered the Inkwell into nine hundred fragments.",
          "The gods cursed him to forget his own name."
        ],
        sfx: { korean: "쩍-!!", english: "SHATTER!", style: "boom" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #18181b 0%, #041f17 60%, #000 100%)",
          moodColor: "#6ee7b7",
          accentColor: "#047857",
          artIllustration: "shattered_chains"
        }
      },
      {
        id: "brush_4",
        order: 4,
        chapterBadge: "THE BRUSH SOAKED IN INK",
        sceneTitle: "A New Sentence Begins",
        narrationLines: [
          "The black ink rises from the pool of oblivion.",
          "The Scribe dips the brush once more into eternity."
        ],
        dialogue: {
          speaker: "The Sovereign Brush",
          text: "Write your vengeance. Write your salvation."
        },
        sfx: { korean: "파아앗!", english: "RADIANCE!", style: "shiiing" },
        visualTheme: {
          bgGradient: "linear-gradient(180deg, #047857 0%, #022c22 50%, #000 100%)",
          moodColor: "#10b981",
          accentColor: "#ecfdf5",
          artIllustration: "awakening_eyes"
        }
      }
    ]
  },
};

// ─── Reincarnation Purposes ─────────────────────────────────────

export const REINCARNATION_PURPOSES: Record<ReincarnationPurpose, ReincarnationPurposeDef> = {
  revenge: {
    id: "revenge",
    name: "Revenge",
    kanji: "復仇",
    quote: "They destroyed everything. I will make them pay.",
    description: "Burn with fury. Power comes from rage. The demonic path opens before you — forbidden techniques, life-steal, and the strength to crush anything that stands in your way.",
    icon: "仇",
    alignmentShift: { righteous: 0, demonic: 30 },
    gameplayEffect: "Aggressive techniques unlock faster. NPCs fear you. Darker endings accessible.",
  },
  peace: {
    id: "peace",
    name: "Peace",
    kanji: "和平",
    quote: "I return not to destroy, but to restore.",
    description: "Seek harmony. Power comes from compassion. The righteous path welcomes you — healing arts, protective qi, and the ability to spare even the most wretched souls.",
    icon: "和",
    alignmentShift: { righteous: 30, demonic: 0 },
    gameplayEffect: "Healing/defensive techniques. NPCs trust you. Can spare bosses for alternate rewards.",
  },
  truth: {
    id: "truth",
    name: "Truth",
    kanji: "真理",
    quote: "I seek only to understand why it happened.",
    description: "Walk the middle path. Power comes from knowledge. Neither righteous nor demonic — see through all illusions, unlock hidden lore, and discover what really happened at the Shattering.",
    icon: "理",
    alignmentShift: { righteous: 15, demonic: 15 },
    gameplayEffect: "Unique investigator dialogue. Secret lore unlocks. Hidden true ending accessible.",
  },
};

// ─── Meridian Tree ──────────────────────────────────────────────

export type MeridianBranch = "heart" | "lung" | "liver" | "kidney" | "spleen" | "spirit";

export interface MeridianNodeDef {
  id: string;
  branch: MeridianBranch;
  tier: number; // 1-4
  name: string;
  kanji: string;
  description: string;
  bonusType: string;
  bonusPerLevel: number;
  maxLevel: number;
  cost: number; // Meridian Stones
  prerequisite?: string; // ID of required node
}

export const MERIDIAN_BRANCHES: Record<MeridianBranch, { name: string; kanji: string; color: string }> = {
  heart: { name: "Heart", kanji: "心", color: "#fff" },
  lung: { name: "Lung", kanji: "肺", color: "#ccc" },
  liver: { name: "Liver", kanji: "肝", color: "#aaa" },
  kidney: { name: "Kidney", kanji: "腎", color: "#999" },
  spleen: { name: "Spleen", kanji: "脾", color: "#777" },
  spirit: { name: "Spirit", kanji: "神", color: "#ddd" },
};

export const MERIDIAN_NODES: MeridianNodeDef[] = [
  // Heart branch (HP)
  { id: "heart_1", branch: "heart", tier: 1, name: "Iron Pulse", kanji: "鉄脈", description: "+20 Max HP", bonusType: "max_hp", bonusPerLevel: 20, maxLevel: 3, cost: 1 },
  { id: "heart_2", branch: "heart", tier: 2, name: "Blood Surge", kanji: "血潮", description: "HP regen in combat", bonusType: "hp_regen", bonusPerLevel: 1, maxLevel: 3, cost: 2, prerequisite: "heart_1" },
  { id: "heart_3", branch: "heart", tier: 3, name: "Death Defiance", kanji: "抗死", description: "Survive fatal blow with 1HP (cooldown)", bonusType: "death_resist", bonusPerLevel: 1, maxLevel: 1, cost: 4, prerequisite: "heart_2" },
  { id: "heart_4", branch: "heart", tier: 4, name: "Undying Core", kanji: "不死核", description: "+50 Max HP, +30% HP regen", bonusType: "max_hp_regen", bonusPerLevel: 50, maxLevel: 1, cost: 6, prerequisite: "heart_3" },

  // Lung branch (Stamina)
  { id: "lung_1", branch: "lung", tier: 1, name: "Breath Control", kanji: "調息", description: "+15 Max Stamina", bonusType: "max_stamina", bonusPerLevel: 15, maxLevel: 3, cost: 1 },
  { id: "lung_2", branch: "lung", tier: 2, name: "Second Wind", kanji: "再風", description: "Stamina regen speed +20%", bonusType: "stamina_regen", bonusPerLevel: 0.2, maxLevel: 3, cost: 2, prerequisite: "lung_1" },
  { id: "lung_3", branch: "lung", tier: 3, name: "Wind Step", kanji: "風歩", description: "Dodge distance +30%", bonusType: "dodge_distance", bonusPerLevel: 0.3, maxLevel: 2, cost: 4, prerequisite: "lung_2" },
  { id: "lung_4", branch: "lung", tier: 4, name: "Infinite Breath", kanji: "無限息", description: "Dodge costs 50% less stamina", bonusType: "dodge_cost", bonusPerLevel: 0.5, maxLevel: 1, cost: 6, prerequisite: "lung_3" },

  // Liver branch (Attack)
  { id: "liver_1", branch: "liver", tier: 1, name: "Sharpened Intent", kanji: "磨意", description: "Attack power +10%", bonusType: "attack_power", bonusPerLevel: 0.1, maxLevel: 3, cost: 1 },
  { id: "liver_2", branch: "liver", tier: 2, name: "Killing Edge", kanji: "殺刃", description: "Crit chance +5%", bonusType: "crit_chance", bonusPerLevel: 0.05, maxLevel: 3, cost: 2, prerequisite: "liver_1" },
  { id: "liver_3", branch: "liver", tier: 3, name: "Rending Blow", kanji: "裂撃", description: "Crits deal +50% damage", bonusType: "crit_damage", bonusPerLevel: 0.5, maxLevel: 2, cost: 4, prerequisite: "liver_2" },
  { id: "liver_4", branch: "liver", tier: 4, name: "Heaven Splitter", kanji: "裂天", description: "Every 5th hit is guaranteed crit", bonusType: "guaranteed_crit", bonusPerLevel: 1, maxLevel: 1, cost: 6, prerequisite: "liver_3" },

  // Kidney branch (Qi)
  { id: "kidney_1", branch: "kidney", tier: 1, name: "Deep Reservoir", kanji: "深池", description: "+15 Max Qi", bonusType: "max_qi", bonusPerLevel: 15, maxLevel: 3, cost: 1 },
  { id: "kidney_2", branch: "kidney", tier: 2, name: "Qi Circulation", kanji: "気循", description: "Qi regen speed +25%", bonusType: "qi_regen", bonusPerLevel: 0.25, maxLevel: 3, cost: 2, prerequisite: "kidney_1" },
  { id: "kidney_3", branch: "kidney", tier: 3, name: "Technique Mastery", kanji: "術精", description: "Technique cooldown -20%", bonusType: "tech_cooldown", bonusPerLevel: 0.2, maxLevel: 2, cost: 4, prerequisite: "kidney_2" },
  { id: "kidney_4", branch: "kidney", tier: 4, name: "Bottomless Well", kanji: "無底泉", description: "Qi costs reduced by 30%", bonusType: "qi_cost", bonusPerLevel: 0.3, maxLevel: 1, cost: 6, prerequisite: "kidney_3" },

  // Spleen branch (Defense)
  { id: "spleen_1", branch: "spleen", tier: 1, name: "Thick Skin", kanji: "厚皮", description: "Damage reduction +5%", bonusType: "damage_reduction", bonusPerLevel: 0.05, maxLevel: 3, cost: 1 },
  { id: "spleen_2", branch: "spleen", tier: 2, name: "Iron Gate", kanji: "鉄門", description: "Block power +20%", bonusType: "block_power", bonusPerLevel: 0.2, maxLevel: 3, cost: 2, prerequisite: "spleen_1" },
  { id: "spleen_3", branch: "spleen", tier: 3, name: "Poise", kanji: "安勢", description: "Stagger resistance +40%", bonusType: "poise", bonusPerLevel: 0.4, maxLevel: 2, cost: 4, prerequisite: "spleen_2" },
  { id: "spleen_4", branch: "spleen", tier: 4, name: "Adamantine Body", kanji: "金剛体", description: "Immune to stagger during attacks", bonusType: "hyper_armor", bonusPerLevel: 1, maxLevel: 1, cost: 6, prerequisite: "spleen_3" },

  // Spirit branch (Special)
  { id: "spirit_1", branch: "spirit", tier: 1, name: "Inner Sight", kanji: "内視", description: "Enemy HP bars visible", bonusType: "enemy_hp_visible", bonusPerLevel: 1, maxLevel: 1, cost: 1 },
  { id: "spirit_2", branch: "spirit", tier: 2, name: "Alignment Surge", kanji: "道潮", description: "Alignment-based technique power +15%", bonusType: "alignment_power", bonusPerLevel: 0.15, maxLevel: 3, cost: 2, prerequisite: "spirit_1" },
  { id: "spirit_3", branch: "spirit", tier: 3, name: "Domain Sense", kanji: "域感", description: "Secret Domain entrances glow faintly", bonusType: "domain_sense", bonusPerLevel: 1, maxLevel: 1, cost: 4, prerequisite: "spirit_2" },
  { id: "spirit_4", branch: "spirit", tier: 4, name: "Ink Resonance", kanji: "墨共鳴", description: "All ink effects (particles, VFX) deal passive damage to nearby enemies", bonusType: "ink_damage", bonusPerLevel: 5, maxLevel: 1, cost: 6, prerequisite: "spirit_3" },
];

// ─── Secret Domain Definitions ──────────────────────────────────

export type DomainType = "trial" | "treasure" | "ascension";

export interface SecretDomainDef {
  id: string;
  name: string;
  kanji: string;
  type: DomainType;
  description: string;
  zoneHint: string;           // Which zone it's hidden in
  discoveryMethod: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  rewards: string[];
  oneTimeOnly: boolean;
  requiredProfession?: ProfessionId; // If profession-gated
  requiredBossesDefeated?: number;
}

export const SECRET_DOMAINS: SecretDomainDef[] = [
  {
    id: "trial_hundred_blades",
    name: "Trial of a Hundred Blades",
    kanji: "百刃試練",
    type: "trial",
    description: "Survive wave after wave of phantom swordsmen. Each wave is faster, stronger, more relentless.",
    zoneHint: "bamboo_sea",
    discoveryMethod: "Hidden behind the Great Waterfall — strike the water's surface 3 times with a charged attack.",
    difficulty: 3,
    rewards: ["Phantom Sword Style (Scroll)", "Mist Cloak (Accessory)", "500 Qi Essence"],
    oneTimeOnly: false,
  },
  {
    id: "trial_iron_cage",
    name: "Trial of the Iron Cage",
    kanji: "鉄籠試練",
    type: "trial",
    description: "Locked in an ever-shrinking arena with iron beasts. The cage closes. There is no retreat.",
    zoneHint: "iron_tomb",
    discoveryMethod: "Find and activate 4 rusty levers hidden across the deepest mine level.",
    difficulty: 4,
    rewards: ["Unbreakable Armor Set", "Iron Will Technique", "800 Qi Essence"],
    oneTimeOnly: false,
  },
  {
    id: "trial_echoes",
    name: "Trial of Echoes",
    kanji: "反響試練",
    type: "trial",
    description: "Fight shadow copies of yourself from each previous chapter. They know your habits.",
    zoneHint: "jade_summit",
    discoveryMethod: "Meditate in the Hall of Mirrors for 60 real seconds without moving.",
    difficulty: 4,
    rewards: ["Past Life Technique Recovery", "Mirror Fragment (Key Item)", "Memory Surge trigger"],
    oneTimeOnly: true,
  },
  {
    id: "treasure_ink_garden",
    name: "The Ink Garden",
    kanji: "墨庭",
    type: "treasure",
    description: "A surreal space where ink has grown into a living garden. Navigate dissolving paths and ink storms to reach the center.",
    zoneHint: "bamboo_sea",
    discoveryMethod: "Plant a Black Lotus seed at the oldest tree stump. Return after defeating Chapter 1 boss.",
    difficulty: 2,
    rewards: ["Ancient Cultivation Manual (Scroll)", "Black Lotus Petal x3", "300 Qi Essence"],
    oneTimeOnly: true,
  },
  {
    id: "treasure_void_library",
    name: "The Void Library",
    kanji: "虛空書庫",
    type: "treasure",
    description: "A fragment of the original Heavenly Inkwell's library. Books float in white void. Each contains a piece of the truth.",
    zoneHint: "heavenly_gate",
    discoveryMethod: "Only visible to Ink Scribe profession. Read all 5 zone inscription stones.",
    difficulty: 3,
    rewards: ["Forbidden Technique: Reality Ink", "Inkwell Fragment Lore", "True Ending Clue"],
    oneTimeOnly: true,
    requiredProfession: "ink_scribe",
  },
  {
    id: "treasure_blood_pool",
    name: "The Eternal Pool",
    kanji: "永泉",
    type: "treasure",
    description: "A hot spring of liquified qi. Bathe to restore and enhance — but something lurks beneath.",
    zoneHint: "blood_lotus",
    discoveryMethod: "Follow the Red Girl's ghost to a hidden cave after learning her full story.",
    difficulty: 2,
    rewards: ["Permanent +10 to all base stats", "Crimson Qi Infusion", "Memory Fragment: The Red Girl's Origin"],
    oneTimeOnly: true,
  },
  {
    id: "ascension_shadow_gauntlet",
    name: "The Shadow Gauntlet",
    kanji: "影手甲",
    type: "ascension",
    description: "Face shadow versions of ALL previously defeated Calamities — simultaneously. The ultimate test.",
    zoneHint: "heavenly_gate",
    discoveryMethod: "Defeat at least 3 Calamities, then meditate at the Heavenly Gate entrance shrine.",
    difficulty: 5,
    rewards: ["Heavenly Technique (profession-specific ultimate)", "Nascent Soul fragment", "2000 Qi Essence"],
    oneTimeOnly: false,
    requiredBossesDefeated: 3,
  },
];

// ─── Secret Shortcut Powers ─────────────────────────────────────

export interface SecretPowerDef {
  id: string;
  name: string;
  kanji: string;
  triggerCondition: string;
  effect: string;
  duration?: number; // seconds, if temporary
  permanent: boolean;
  discovered: boolean; // tracking state
}

export const SECRET_POWERS: SecretPowerDef[] = [
  { id: "ink_walk", name: "Ink Walk", kanji: "墨歩", triggerCondition: "Die 10 times in the same spot", effect: "Temporarily become ink — walk through walls for 5 seconds", duration: 5, permanent: false, discovered: false },
  { id: "soul_echo", name: "Soul Echo", kanji: "魂響", triggerCondition: "Parry 3 attacks in a row perfectly", effect: "Next attack deals 5x damage with screen-shake", permanent: false, discovered: false },
  { id: "void_step", name: "Void Step", kanji: "虛歩", triggerCondition: "Dodge at the exact frame of a fatal hit", effect: "Teleport behind attacker, full heal, 3s invincibility", duration: 3, permanent: false, discovered: false },
  { id: "memory_surge", name: "Memory Surge", kanji: "記憶潮", triggerCondition: "Collect 10 past-life memories", effect: "All techniques temporarily upgraded to max mastery for 30s", duration: 30, permanent: false, discovered: false },
  { id: "ink_devour", name: "Ink Devour", kanji: "墨喰", triggerCondition: "Kill an elite using only qi techniques", effect: "Absorb their strongest technique permanently", permanent: true, discovered: false },
  { id: "ghost_meridian", name: "Ghost Meridian", kanji: "幽経", triggerCondition: "Unlock all 24 meridian nodes", effect: "Hidden 25th node — grants passive life-steal on all attacks", permanent: true, discovered: false },
  { id: "nameless_art", name: "The Nameless Art", kanji: "無名術", triggerCondition: "Reach final boss with exactly 0 net alignment (perfect neutral)", effect: "Unique final technique that rewrites the boss's existence — instant phase skip", permanent: true, discovered: false },
];
