// Pulls the WoW: Forever talent + Legacy calculator data from Wowhead's public data
// endpoints and normalises it into src/data/*.json.
//
// Wowhead notes the trees are based on BlizzCon testing and will be refreshed once the
// beta client is datamined, so re-run `npm run sync-data` whenever that happens.
import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const SOURCES = {
  talents: 'https://nether.wowhead.com/forever/data/talents-classic?dv=19',
  legacy: 'https://nether.wowhead.com/forever/data/legacy-calculator?dv=2',
};

// Wowhead's internal tree names -> [class key, display name]. Order within each class
// matches the in-game / Wowhead calculator left-to-right order.
const TREES = [
  ['DruidBalance', 'druid', 'Balance'],
  ['DruidFeralCombat', 'druid', 'Feral Combat'],
  ['DruidRestoration', 'druid', 'Restoration'],
  ['HunterBeastMastery', 'hunter', 'Beast Mastery'],
  ['HunterMarksmanship', 'hunter', 'Marksmanship'],
  ['HunterSurvival', 'hunter', 'Survival'],
  ['MageArcane', 'mage', 'Arcane'],
  ['MageFire', 'mage', 'Fire'],
  ['MageFrost', 'mage', 'Frost'],
  ['PaladinHoly', 'paladin', 'Holy'],
  ['PaladinProtection', 'paladin', 'Protection'],
  ['PaladinCombat', 'paladin', 'Retribution'],
  ['PriestDiscipline', 'priest', 'Discipline'],
  ['PriestHoly', 'priest', 'Holy'],
  ['PriestShadow', 'priest', 'Shadow'],
  ['RogueAssassination', 'rogue', 'Assassination'],
  ['RogueCombat', 'rogue', 'Combat'],
  ['RogueSubtlety', 'rogue', 'Subtlety'],
  ['ShamanElementalCombat', 'shaman', 'Elemental'],
  ['ShamanEnhancement', 'shaman', 'Enhancement'],
  ['ShamanRestoration', 'shaman', 'Restoration'],
  ['WarlockCurses', 'warlock', 'Affliction'],
  ['WarlockSummoning', 'warlock', 'Demonology'],
  ['WarlockDestruction', 'warlock', 'Destruction'],
  ['WarriorArms', 'warrior', 'Arms'],
  ['WarriorFury', 'warrior', 'Fury'],
  ['WarriorProtection', 'warrior', 'Protection'],
];

async function fetchPageData(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  // Payload is `WH.setPageData("key", {...});`
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error(`${url} -> unexpected payload`);
  return JSON.parse(text.slice(start, end + 1));
}

function normaliseTalents(raw) {
  const byName = Object.fromEntries(Object.values(raw.trees).map((t) => [t.description, t]));
  const classes = {};
  for (const [internal, classKey, name] of TREES) {
    const tree = byName[internal];
    if (!tree) throw new Error(`Talent tree ${internal} missing from Wowhead data`);
    const talents = Object.values(raw.talents[tree.id])
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map((t) => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        row: t.row,
        col: t.col,
        maxRank: t.ranks.length,
        ranks: t.ranks.map((_, i) => t.descriptions[i + 1] ?? ''),
        requires: t.requires.length ? { id: t.requires[0].id, qty: t.requires[0].qty } : null,
        // Talents that teach a castable ability carry cost/range/cast lines; everything else is passive.
        ability: t.cost ? { details: t.cost, requiresText: t.requiresText ?? null } : null,
      }));
    (classes[classKey] ??= []).push({ id: tree.id, name, role: tree.role, talents });
  }
  return classes;
}

function normaliseLegacy(raw) {
  return {
    build: raw.build,
    cap: raw.cap,
    trees: raw.trees.map((t) => ({
      id: t.id,
      name: t.name,
      blurb: t.blurb,
      edges: t.edges.map((e) => ({ from: e.from, to: e.to, type: e.type })),
      nodes: t.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        icon: n.icon,
        x: n.x,
        y: n.y,
        maxRank: n.maxRanks,
        locked: n.locked,
        requiredSpent: n.requiredSpent,
        castMs: n.castMs,
        cooldownMs: n.cdMs,
        ranks: n.ranks,
      })),
    })),
  };
}

const [talents, legacy] = await Promise.all([fetchPageData(SOURCES.talents), fetchPageData(SOURCES.legacy)]);
const syncedAt = new Date().toISOString();

await writeFile(
  new URL('../src/data/talents.json', import.meta.url),
  JSON.stringify({ syncedAt, source: SOURCES.talents, classes: normaliseTalents(talents) }, null, 1) + '\n',
);
await writeFile(
  new URL('../src/data/legacy.json', import.meta.url),
  JSON.stringify({ syncedAt, source: SOURCES.legacy, ...normaliseLegacy(legacy) }, null, 1) + '\n',
);
console.log(`Synced talents + legacy data at ${syncedAt}`);
