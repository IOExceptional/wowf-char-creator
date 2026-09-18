// Pulls the WoW: Forever talent + Legacy calculator data from Wowhead's public data
// endpoints and normalises it into src/data/*.json.
//
// Wowhead re-datamines the trees as the beta client changes, so re-run `npm run sync-data`
// from time to time, then `npm run check-icyveins` to see whether Icy Veins agrees.
import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const SOURCES = {
  talents: 'https://nether.wowhead.com/forever/data/talents-classic?dv=19',
  legacy: 'https://nether.wowhead.com/forever/data/legacy-calculator?dv=2',
};
// Cast/cost/cooldown lines used to ride along in the talent payload as a `cost` field.
// They now only exist on the per-spell tooltip endpoint, so each talent's rank-1 spell is
// fetched separately to work out whether it teaches an ability and what its details are.
const TOOLTIP = (spellId) => `https://nether.wowhead.com/forever/tooltip/spell/${spellId}`;
const TOOLTIP_CONCURRENCY = 8;

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

// A response is a script: one `WH.setPageData("key", {...});` call followed by any number
// of unrelated `WH.Gatherer.addData(...)` tooltip blocks, so we scan for the setPageData
// call and read exactly its object rather than slicing to the last brace in the file.
function extractPageData(text, url) {
  const call = text.indexOf('WH.setPageData(');
  if (call < 0) throw new Error(`${url} -> no WH.setPageData call in payload`);
  const start = text.indexOf('{', call);
  if (start < 0) throw new Error(`${url} -> unexpected payload`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) escaped = false;
    else if (ch === '\\' && inString) escaped = true;
    else if (ch === '"') inString = !inString;
    else if (!inString && ch === '{') depth++;
    else if (!inString && ch === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error(`${url} -> unterminated WH.setPageData object`);
}

async function fetchPageData(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return extractPageData(await res.text(), url);
}

const CLASS_NAMES = new Set(TREES.map(([, classKey]) => classKey[0].toUpperCase() + classKey.slice(1)));
const stripTags = (html) =>
  html
    .replace(/<!--.*?-->/gs, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();

// A tooltip is a header table (name, optional cost / range / cast / cooldown cells, then the
// class and level gates) followed by the description table. Only the header holds the detail
// lines, so everything from the first requirement or description marker onwards is dropped.
const HEAD_END = [
  '<div class="wowhead-tooltip-requirements">',
  '<span class="wowhead-tooltip-requirements">',
  '<div class="q">',
];
// Wowhead shows a range on some purely passive talents, and a cooldown never appears without a
// cast line, so a talent only counts as an ability when it costs a resource or takes a cast.
const COST_LINE = /^[\d,.]+ (?:Mana|Rage|Energy|Focus|Runic Power)$|% of base mana$/i;
const CAST_LINE = /^(?:Instant|Channeled)$|\bsec cast\b/i;

function parseTooltip(tooltip) {
  const afterName = tooltip.slice(tooltip.indexOf('</a>') + 4);
  const cut = Math.min(...HEAD_END.map((m) => (afterName.includes(m) ? afterName.indexOf(m) : Infinity)));
  const head = Number.isFinite(cut) ? afterName.slice(0, cut) : afterName;
  // Split on block/cell boundaries only: inline tags colour parts of a single line (a range
  // like `<span>20</span> - <span>40</span> yd range`) and must not break it up.
  const details = stripTags(head.replace(/<\/?(?:table|tbody|thead|tr|td|th|div|p|br)\b[^>]*>/g, '\u0000'))
    .split('\u0000')
    .map((line) => line.trim())
    // `Talent`, `Level 60` and `Rank 1` are labels Wowhead prints alongside the detail lines.
    .filter((line) => line && !/^(?:Talent|Level \d+|Rank \d+)$/.test(line));
  // Detail lines are always short labels. Anything longer means the header/description split
  // above missed a marker and the spell's description has leaked in — fail rather than store it.
  const prose = details.find((line) => line.length > 60);
  if (prose) throw new Error(`Tooltip parsed as a detail line: "${prose}"`);
  if (!details.some((line) => COST_LINE.test(line) || CAST_LINE.test(line))) return null;

  // Form/stance gates sit in the description body, either in a requirements span or coloured red.
  const requires = [];
  for (const m of tooltip.matchAll(
    /<(?:div|span) class="wowhead-tooltip-requirements">(.*?)<\/(?:div|span)>|<span style="color: #FF2020">(.*?)<\/span>/gs,
  )) {
    const text = stripTags(m[1] ?? m[2] ?? '');
    if (!text || /^Requires level\b/.test(text)) continue;
    if (CLASS_NAMES.has(text.replace(/^Requires /, ''))) continue;
    if (!requires.includes(text)) requires.push(text);
  }

  return { details, requiresText: requires.length ? requires.join('; ') : null };
}

// Runs `fn` over `items` a few at a time so a full sync doesn't open 469 sockets at once.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

async function fetchAbilities(spellIds) {
  const unique = [...new Set(spellIds)];
  const tooltips = await mapLimit(unique, TOOLTIP_CONCURRENCY, async (id) => {
    const res = await fetch(TOOLTIP(id), { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${TOOLTIP(id)} -> HTTP ${res.status}`);
    const { tooltip } = await res.json();
    if (typeof tooltip !== 'string') throw new Error(`${TOOLTIP(id)} -> no tooltip in response`);
    return parseTooltip(tooltip);
  });
  return new Map(unique.map((id, i) => [id, tooltips[i]]));
}

async function normaliseTalents(raw) {
  const byName = Object.fromEntries(Object.values(raw.trees).map((t) => [t.description, t]));
  const spellIds = [];
  for (const [internal] of TREES) {
    const tree = byName[internal];
    if (!tree) throw new Error(`Talent tree ${internal} missing from Wowhead data`);
    for (const t of Object.values(raw.talents[tree.id])) spellIds.push(t.ranks[0]);
  }
  const abilities = await fetchAbilities(spellIds);

  const classes = {};
  for (const [internal, classKey, name] of TREES) {
    const tree = byName[internal];
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
        // Talents that teach a castable ability have cost/range/cast lines; everything else is passive.
        ability: abilities.get(t.ranks[0]) ?? null,
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
const classes = await normaliseTalents(talents);
const syncedAt = new Date().toISOString();

await writeFile(
  new URL('../src/data/talents.json', import.meta.url),
  JSON.stringify({ syncedAt, source: SOURCES.talents, classes }, null, 1) + '\n',
);
await writeFile(
  new URL('../src/data/legacy.json', import.meta.url),
  JSON.stringify({ syncedAt, source: SOURCES.legacy, ...normaliseLegacy(legacy) }, null, 1) + '\n',
);
console.log(`Synced talents + legacy data at ${syncedAt}`);
