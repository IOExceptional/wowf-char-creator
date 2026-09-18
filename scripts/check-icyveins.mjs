// Cross-checks src/data/talents.json (synced from Wowhead) against Icy Veins' talent
// calculator data. Both sites build their trees from the same client, so any difference means
// one of them is stale — usually Icy Veins lagging a Wowhead refresh, occasionally the reverse.
// This only reports; deciding who is right is a judgement call, so nothing is written.
import { readFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const SOURCE = (classKey) => `https://static.icy-veins.com/json/forever-talent-calculator/${classKey}.json`;
const CLASSES = ['druid', 'hunter', 'mage', 'paladin', 'priest', 'rogue', 'shaman', 'warlock', 'warrior'];

// Icy Veins lays each tree out as a flat grid of this many columns, nulls for empty cells.
const GRID_COLS = 4;
// Icy Veins keeps the client's internal tree names where we (and Wowhead) use the in-game ones.
const TREE_ALIASES = { 'Shadow Magic': 'Shadow', 'Elemental Combat': 'Elemental' };

const talentData = JSON.parse(await readFile(new URL('../src/data/talents.json', import.meta.url), 'utf8'));

async function fetchClass(classKey) {
  const res = await fetch(SOURCE(classKey), { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${SOURCE(classKey)} -> HTTP ${res.status}`);
  return res.json();
}

const differences = [];
const note = (classKey, tree, text) => differences.push(`${classKey}/${tree}: ${text}`);

for (const classKey of CLASSES) {
  const theirs = await fetchClass(classKey);
  const ours = Object.fromEntries(talentData.classes[classKey].map((tree) => [tree.name, tree]));

  for (const group of theirs.talentGroups) {
    const treeName = TREE_ALIASES[group.name] ?? group.name;
    const tree = ours[treeName];
    if (!tree) {
      note(classKey, treeName, `tree is missing from our data (Icy Veins calls it "${group.name}")`);
      continue;
    }
    if (group.talents.length % GRID_COLS) {
      note(classKey, treeName, `Icy Veins grid is ${group.talents.length} cells, not a multiple of ${GRID_COLS} — layout changed`);
      continue;
    }

    const theirCells = new Map();
    group.talents.forEach((t, i) => t && theirCells.set(`${Math.floor(i / GRID_COLS)},${i % GRID_COLS}`, t));
    const ourCells = new Map(tree.talents.map((t) => [`${t.row},${t.col}`, t]));
    const byId = new Map(tree.talents.map((t) => [t.id, t.name]));

    for (const [pos, their] of theirCells) {
      const our = ourCells.get(pos);
      if (!our) {
        note(classKey, treeName, `${their.name} (${pos}) is on Icy Veins but not in our data`);
        continue;
      }
      if (our.name !== their.name) note(classKey, treeName, `${pos}: we call it "${our.name}", Icy Veins "${their.name}"`);
      if (our.maxRank !== their.maxRank) note(classKey, treeName, `${their.name}: max rank ${our.maxRank} vs Icy Veins ${their.maxRank}`);
      if (our.icon !== their.icon) note(classKey, treeName, `${their.name}: icon "${our.icon}" vs Icy Veins "${their.icon}"`);

      const ourReq = our.requires ? byId.get(our.requires.id) ?? `talent ${our.requires.id}` : null;
      const theirReq = their.requiredTalent?.name ?? null;
      if (ourReq !== theirReq) {
        note(classKey, treeName, `${their.name}: needs ${ourReq ?? 'nothing'}, Icy Veins says ${theirReq ?? 'nothing'}`);
      }
    }
    for (const [pos, our] of ourCells) {
      if (!theirCells.has(pos)) note(classKey, treeName, `${our.name} (${pos}) is in our data but not on Icy Veins`);
    }
  }
}

const ourTotal = Object.values(talentData.classes).flat().reduce((sum, tree) => sum + tree.talents.length, 0);
console.log(`Checked ${ourTotal} talents from ${talentData.syncedAt} against Icy Veins.`);
if (!differences.length) {
  console.log('No differences.');
} else {
  console.log(`\n${differences.length} difference${differences.length > 1 ? 's' : ''}:`);
  for (const d of differences) console.log(`  - ${d}`);
  console.log('\nOne of the two sites is behind. Check the talent on both before changing anything.');
  process.exitCode = 1;
}
