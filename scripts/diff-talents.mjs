// Summarises what `npm run sync-data` changed, by comparing the working copy of
// src/data/talents.json against the last committed one. A raw `git diff` of that file is
// hundreds of reformatted lines; this says which talents actually moved.
//
// Usage: node scripts/diff-talents.mjs [git-ref]   (default ref: HEAD)
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const ref = process.argv[2] ?? 'HEAD';
const PATH = 'src/data/talents.json';

const current = JSON.parse(await readFile(new URL(`../${PATH}`, import.meta.url), 'utf8'));
let committed;
try {
  committed = JSON.parse(execFileSync('git', ['show', `${ref}:${PATH}`], { encoding: 'utf8', maxBuffer: 1 << 28 }));
} catch {
  console.error(`Could not read ${PATH} at ${ref}. Is this a git checkout with that ref?`);
  process.exit(2);
}

// Talent ids are stable across syncs, so they key the comparison; row/col/name can all move.
function index(data) {
  const byId = new Map();
  for (const [classKey, trees] of Object.entries(data.classes)) {
    for (const tree of trees) {
      for (const talent of tree.talents) byId.set(talent.id, { classKey, tree: tree.name, talent });
    }
  }
  return byId;
}

const before = index(committed);
const after = index(current);
const where = (e) => `${e.classKey}/${e.tree}`;

const added = [...after].filter(([id]) => !before.has(id));
const removed = [...before].filter(([id]) => !after.has(id));
const moved = [];
const renamed = [];
const retext = [];
const abilityGained = [];
const abilityLost = [];
const abilityChanged = [];

for (const [id, now] of after) {
  const was = before.get(id);
  if (!was) continue;
  const a = was.talent;
  const b = now.talent;
  if (a.name !== b.name) renamed.push([was, now]);
  if (a.row !== b.row || a.col !== b.col || was.tree !== now.tree) moved.push([was, now]);
  if (JSON.stringify(a.ranks) !== JSON.stringify(b.ranks) || a.maxRank !== b.maxRank) retext.push([was, now]);
  if (!a.ability && b.ability) abilityGained.push([was, now]);
  else if (a.ability && !b.ability) abilityLost.push([was, now]);
  else if (a.ability && b.ability && JSON.stringify(a.ability) !== JSON.stringify(b.ability)) abilityChanged.push([was, now]);
}

const section = (title, rows, render) => {
  if (!rows.length) return;
  console.log(`\n${title} (${rows.length})`);
  for (const row of rows) console.log(`  ${render(row)}`);
};

console.log(`${PATH}: ${committed.syncedAt} (${ref}) -> ${current.syncedAt} (working copy)`);
console.log(`${before.size} talents -> ${after.size}`);

section('Added', added, ([, e]) => `${where(e)} r${e.talent.row}c${e.talent.col} ${e.talent.name} (max ${e.talent.maxRank})`);
section('Removed', removed, ([, e]) => `${where(e)} r${e.talent.row}c${e.talent.col} ${e.talent.name}`);
section('Renamed', renamed, ([was, now]) => `${where(now)}: ${was.talent.name} -> ${now.talent.name}`);
section('Moved', moved, ([was, now]) => `${now.talent.name}: ${where(was)} r${was.talent.row}c${was.talent.col} -> ${where(now)} r${now.talent.row}c${now.talent.col}`);
section('Rank text or max rank changed', retext, ([, now]) => `${where(now)} ${now.talent.name}`);
section('Now an ability', abilityGained, ([, now]) => `${where(now)} ${now.talent.name}: ${now.talent.ability.details.join(', ')}`);
section('No longer an ability', abilityLost, ([was]) => `${where(was)} ${was.talent.name}: was ${was.talent.ability.details.join(', ')}`);
section('Ability details changed', abilityChanged, ([was, now]) =>
  `${where(now)} ${now.talent.name}\n      was ${was.talent.ability.details.join(', ')} | ${was.talent.ability.requiresText ?? 'no requirement'}` +
  `\n      now ${now.talent.ability.details.join(', ')} | ${now.talent.ability.requiresText ?? 'no requirement'}`);

// A real datamine moves a handful of talents. A whole category flipping at once is the
// signature of a parser that silently stopped finding a field, which is much easier to miss.
const abilitiesBefore = [...before.values()].filter((e) => e.talent.ability).length;
const abilitiesAfter = [...after.values()].filter((e) => e.talent.ability).length;
console.log(`\nAbilities: ${abilitiesBefore} -> ${abilitiesAfter} (the rest are passives)`);
if (abilitiesBefore && !abilitiesAfter) {
  console.log('WARNING: every ability became a passive. Wowhead almost certainly moved the cast/cost');
  console.log('         data again rather than deleting it — check the parser before committing.');
} else if (abilitiesBefore && Math.abs(abilitiesAfter - abilitiesBefore) > abilitiesBefore / 4) {
  console.log('WARNING: the ability count moved by more than a quarter. That is a lot for one datamine —');
  console.log('         confirm a few tooltips by hand before trusting it.');
}
