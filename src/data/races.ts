// Transcribed from Wowhead's "All Racials and Available Class-Race Combinations in WoW: Forever"
// guide: https://www.wowhead.com/forever/guide/new-race-class-combinations
// The guide is hand-written HTML (no data endpoint), so update this file by hand when it changes.
import type { ClassKey } from './classes';

export type Faction = 'alliance' | 'horde';
export type RaceKey =
  | 'human' | 'dwarf' | 'nightelf' | 'gnome' | 'skyborne-alliance'
  | 'orc' | 'undead' | 'tauren' | 'troll' | 'skyborne-horde';

export interface Racial {
  name: string;
  description: string;
  passive: boolean;
  icon: string;
  /** Wowhead's editorial note, where the guide has one. */
  note?: string;
}

/** `true` = combination existed in Classic, `'new'` = newly available in Forever. */
export type Availability = true | 'new';

export interface RaceInfo {
  key: RaceKey;
  name: string;
  faction: Faction;
  icon: string;
  classes: Partial<Record<ClassKey, Availability>>;
  racials: Racial[];
}

const SKYBORNE_SHARED: Racial[] = [
  { name: 'Walk on Air', description: 'Glide downward through the air for 10 sec.', passive: false, icon: 'spell_magic_featherfall' },
];
const SKYBORNE_PASSIVES: Racial[] = [
  { name: 'Wind Blessed', description: '1% increased melee, ranged, and spellcasting Haste.', passive: true, icon: 'spell_nature_windfury' },
  { name: 'Elemental Insight', description: 'Damage to Elementals increased by 5%.', passive: true, icon: 'spell_nature_elementalshields' },
];
// Skyborne Mage is Alliance only and Skyborne Shaman is Horde only; everything else is shared.
const SKYBORNE_CLASSES = { druid: 'new', hunter: 'new', rogue: 'new', warrior: 'new' } as const;

export const RACES: RaceInfo[] = [
  {
    key: 'human', name: 'Human', faction: 'alliance', icon: 'race_human_male',
    classes: { hunter: 'new', mage: true, paladin: true, priest: true, rogue: true, warlock: true, warrior: true },
    racials: [
      { name: 'Will to Survive', description: 'Removes Stun effects. (Full tooltip coming soon.)', passive: false, icon: 'spell_shadow_charm' },
      { name: 'Perception', description: 'Detect Stealthed enemies for 20 sec.', passive: false, icon: 'spell_nature_sleep', note: 'A solid PvP racial for detecting Druids and Rogues.' },
      { name: 'Sword Specialization', description: 'Swords increase spell and ability Critical Chance by 2%.', passive: true, icon: 'ability_meleedamage', note: 'Increases melee damage potential for Rogues, Warriors, and Paladins.' },
      { name: 'The Human Spirit', description: 'Spirit increased by 5%.', passive: true, icon: 'inv_enchant_shardbrilliantsmall' },
    ],
  },
  {
    key: 'dwarf', name: 'Dwarf', faction: 'alliance', icon: 'race_dwarf_male',
    classes: { hunter: true, paladin: true, priest: true, rogue: true, shaman: 'new', warrior: true },
    racials: [
      { name: 'Find Treasure', description: 'Track nearby treasure. Can be used at the same time as other tracking abilities.', passive: false, icon: 'racial_dwarf_findtreasure' },
      { name: 'Big Game Hunter', description: 'Damage dealt versus Beasts increased by 5%.', passive: true, icon: 'inv_misc_pelt_bear_03' },
      { name: 'Mace Specialization', description: 'Increases critical strike chance with all spells and attacks by 1% while you have a mace or two-handed mace equipped.', passive: true, icon: 'inv_mace_01' },
      { name: 'Stoneform', description: 'Removes and grants immunity to all Bleeds, Poisons, and Diseases, and reduces Physical damage taken by 10% for 8 sec.', passive: false, icon: 'spell_shadow_unholystrength', note: 'Strong for PvP, with niche PvE use as a defensive or debuff removal.' },
    ],
  },
  {
    key: 'nightelf', name: 'Night Elf', faction: 'alliance', icon: 'race_nightelf_male',
    classes: { druid: true, hunter: true, priest: true, rogue: true, warrior: true },
    racials: [
      { name: "Elune's Light", description: 'Increases Critical Chance by 10% for 15 sec.', passive: false, icon: 'spell_holy_elunesgrace' },
      { name: 'Wisp Spirit', description: 'Transform into a wisp upon death, increasing movement speed by 75%.', passive: true, icon: 'spell_nature_wispsplode' },
      { name: 'Quickness', description: '1% increased Dodge Chance, and 2% increased Run Speed.', passive: true, icon: 'ability_racial_shadowmeld' },
      { name: 'Shadowmeld', description: 'Gain Stealth while immobile.', passive: false, icon: 'ability_ambush' },
    ],
  },
  {
    key: 'gnome', name: 'Gnome', faction: 'alliance', icon: 'race_gnome_male',
    classes: { mage: true, priest: 'new', rogue: true, warlock: true, warrior: true },
    racials: [
      { name: 'Eureka!', description: 'Reduced cost and 10% increased damage or healing on the next 3 spells or abilities.', passive: false, icon: 'inv_gizmo_02' },
      { name: 'Expansive Mind', description: 'Increases maximum resource.', passive: true, icon: 'inv_enchant_essenceeternallarge' },
      { name: 'Engineering Specialization', description: 'More reliable engineering devices.', passive: true, icon: 'inv_misc_gear_01', note: 'Engineering is a strong profession for both PvE and PvP.' },
      { name: 'Escape Artist', description: 'Brief immunity to Roots and Snares.', passive: false, icon: 'ability_rogue_trip', note: 'A good racial for PvP.' },
    ],
  },
  {
    key: 'skyborne-alliance', name: 'Skyborne (High Order)', faction: 'alliance', icon: 'spell_nature_cyclone',
    classes: { ...SKYBORNE_CLASSES, mage: 'new' },
    racials: [
      ...SKYBORNE_SHARED,
      { name: 'Read Ley Line', description: 'Activate a ley line to gain 100% increased Health and Mana regeneration.', passive: false, icon: 'spell_holy_magicalsentry' },
      ...SKYBORNE_PASSIVES,
    ],
  },
  {
    key: 'orc', name: 'Orc', faction: 'horde', icon: 'race_orc_male',
    classes: { hunter: true, mage: 'new', rogue: true, shaman: true, warlock: true, warrior: true },
    racials: [
      { name: 'Axe Specialization', description: 'Axes increase spell and ability Critical Chance.', passive: true, icon: 'inv_axe_02' },
      { name: 'Blood Fury', description: 'Increases Attack Power and Spell Power by 10% for 15 sec.', passive: false, icon: 'racial_orc_berserkerstrength', note: 'Very strong for melee DPS such as Warriors, Rogues, and Enhancement Shamans.' },
      { name: 'Shatter Curse', description: 'Immunity to Curses and Banes and reduces Magical Damage taken for 8 sec.', passive: false, icon: 'spell_holy_removecurse' },
      { name: 'Hardiness', description: 'Stun durations decreased by 20%.', passive: true, icon: 'inv_helmet_23', note: 'A strong PvP racial.' },
    ],
  },
  {
    key: 'undead', name: 'Undead', faction: 'horde', icon: 'race_scourge_male',
    classes: { mage: true, paladin: 'new', priest: true, rogue: true, warlock: true, warrior: true },
    racials: [
      { name: 'Cannibalize', description: 'Regenerates 7% of total Health and Mana every 2 sec for 10 sec. Only works on Humanoid or Undead corpses within 5 yds. Movement, actions, or damage taken cancel the effect.', passive: false, icon: 'ability_racial_cannibalize', note: 'A strong leveling ability.' },
      { name: 'Touch of the Grave', description: 'Spells and attacks have a 5% chance to drain Health from the target, up to 5% of your maximum Health.', passive: true, icon: 'spell_shadow_lifedrain' },
      { name: 'Underwater Breathing', description: 'Underwater breath lasts 300% longer than normal.', passive: true, icon: 'spell_shadow_demonbreath' },
      { name: 'Will of the Forsaken', description: 'Instantly removes all Charm, Fear, and Sleep effects.', passive: false, icon: 'spell_shadow_raisedead', note: 'A very strong ability in PvP.' },
    ],
  },
  {
    key: 'tauren', name: 'Tauren', faction: 'horde', icon: 'race_tauren_male',
    classes: { druid: true, hunter: true, shaman: true, warrior: true },
    racials: [
      { name: 'Cultivation', description: "Grow bonus herbs that don't require Herbalism to gather.", passive: true, icon: 'inv_misc_flower_01' },
      { name: 'Endurance', description: 'Total Health increased by 5% and Hit Chance increased by 1%.', passive: true, icon: 'spell_nature_unyeildingstamina' },
      { name: 'Plainsrunning', description: 'Gain increased movement speed the longer you stay moving.', passive: true, icon: 'spell_nature_swiftness' },
      { name: 'War Stomp', description: 'Stuns nearby enemies for 2 sec.', passive: false, icon: 'ability_warstomp', note: 'A good cooldown for tanks in dungeons.' },
    ],
  },
  {
    key: 'troll', name: 'Troll', faction: 'horde', icon: 'race_troll_male',
    classes: { hunter: true, mage: true, priest: true, rogue: true, shaman: true, warlock: 'new', warrior: true },
    racials: [
      { name: 'Beast Slaying', description: 'Damage to Beasts increased by 5%.', passive: true, icon: 'inv_misc_pelt_bear_ruin_02' },
      { name: 'Berserking', description: 'Increases casting and attack speed by 10% for 10 sec.', passive: false, icon: 'racial_troll_berserk', note: 'Powerful for casters, healers, and Warrior tanks in PvE.' },
      { name: 'Regeneration', description: '10% of Health regeneration continues during combat.', passive: true, icon: 'spell_nature_regenerate' },
      { name: 'Rapid Regeneration', description: 'Regenerate 50% of maximum Health over time.', passive: false, icon: 'spell_nature_rejuvenation' },
    ],
  },
  {
    key: 'skyborne-horde', name: 'Skyborne (Windshaper)', faction: 'horde', icon: 'spell_nature_cyclone',
    classes: { ...SKYBORNE_CLASSES, shaman: 'new' },
    racials: [
      ...SKYBORNE_SHARED,
      { name: 'Skysight', description: 'Receive an Elemental Blessing increasing run speed by 10%.', passive: false, icon: 'spell_nature_invisibilty' },
      ...SKYBORNE_PASSIVES,
    ],
  },
];

export const RACE_BY_KEY = Object.fromEntries(RACES.map((r) => [r.key, r])) as Record<RaceKey, RaceInfo>;
