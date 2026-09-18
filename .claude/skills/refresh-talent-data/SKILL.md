---
name: refresh-talent-data
description: Re-pull the WoW Forever talent and Legacy data from Wowhead, cross-check it against Icy Veins, and work out which differences are real. Use this whenever the user asks to refresh, re-sync, update, re-check or "take another look at" the talent trees, Legacy trees, or the Wowhead/Icy Veins data behind this planner — and also when the sync script itself is failing or producing suspicious output, since the usual cause is Wowhead moving a field rather than a bug in the app.
---

# Refreshing the Forever talent data

Wowhead is re-datamining Forever throughout the beta, so this data goes stale on its own. The
job is not just "run the sync" — it's to tell the difference between the trees genuinely
changing and Wowhead quietly reshaping its payload, because both show up as a large diff and
only one of them should be committed.

Wowhead is the source of truth. Icy Veins is a second opinion used to catch the case where one
of the two sites is behind.

## The loop

Run these from the repo root:

```sh
npm run sync-data       # re-pull from Wowhead into src/data/*.json
npm run diff-data       # what actually changed vs. the committed data
npm run check-icyveins  # where Icy Veins disagrees (exits 1 if it does)
npm test && npm run build
```

Then adjudicate what the middle two printed, update the README's "Known differences" list, and
report what moved. Each step is expanded below.

### 1. Sync

`npm run sync-data` takes about a minute: two bulk payloads plus one tooltip request per talent
(469 of them, eight at a time).

If it throws, read the error before assuming the endpoint is down. The bulk payloads are one
enormous line, so a crash dumps ~250KB of JSON into the terminal and buries the actual message.
Capture stderr and read the end of it:

```sh
node scripts/sync-wowhead.mjs 2>/tmp/sync.err; tr '\n' '\v' < /tmp/sync.err | tail -c 800 | tr '\v' '\n'
```

A `SyntaxError ... after JSON at position N` means Wowhead appended something new after the
payload and the extractor needs to account for it. Fetch the response and look at the boundary
rather than guessing:

```sh
curl -sS -A "$UA" "https://nether.wowhead.com/forever/data/talents-classic?dv=19" -o /tmp/talents.raw
grep -oE 'WH\.[A-Za-z.]+\(' /tmp/talents.raw | sort | uniq -c
```

Two notes on fetching: `nether.wowhead.com` serves these endpoints to `curl` fine as long as a
browser User-Agent is set, but `www.wowhead.com` sits behind Cloudflare and will 403 — use
WebFetch for the human-facing pages.

### 2. Read the diff, and check it for the shape of a parser failure

`npm run diff-data` groups the change by talent id: added, removed, renamed, moved, rank text,
and ability details. Compare that against what a datamine plausibly does.

A real beta change touches a handful of talents in a few trees — a tree reshuffled, some
numbers retuned, a talent renamed. **A whole category changing at once is almost always the
script, not the game.** The clearest example already happened: Wowhead dropped the `cost` field
from the bulk payload and moved that data to the per-spell tooltip endpoint, and the sync
faithfully recorded all 83 abilities as passives. Nothing errored. `diff-data` warns on that
specific shape, but apply the same suspicion to any category that moves as a block.

When a field looks like it vanished, check a single spell's tooltip before concluding the data
is gone — Wowhead tends to relocate things rather than delete them:

```sh
curl -sS -A "$UA" "https://nether.wowhead.com/forever/tooltip/spell/5570" | head -c 600
```

### 3. Cross-check Icy Veins

`npm run check-icyveins` compares our trees against
`static.icy-veins.com/json/forever-talent-calculator/<class>.json` by grid position, and reports
name, max rank, icon and prerequisite differences. It writes nothing — differences are a
prompt to look, not a failure, and it is normal for a few to stand while one site catches up.

To adjudicate one, decide which site is stale rather than which is "right":

- **Only on Wowhead.** Fetch the talent's spell tooltip. If it resolves to a real spell with a
  coherent description, Wowhead has datamined something Icy Veins hasn't yet. Keep ours.
- **Only on Icy Veins, or different text/ranks.** Check the Wowhead calculator page and the
  Icy Veins one, and prefer whichever reflects the current beta build. If Wowhead is behind,
  note it in the README rather than hand-editing `talents.json` — the next sync would overwrite
  the edit anyway.
- **Prerequisite disagreements.** A prerequisite must sit in the same row or above the talent
  that needs it. An arrow pointing at a lower row is a bug on whichever site drew it.
- **Cosmetic noise** (a stray character in an icon name, a tree called by its internal name) is
  Icy Veins' own data quirk. Record it and move on.

Record every difference you decided to live with in the README's "Known differences" list, with
one line on why — otherwise the next run re-investigates the same three things from scratch.

### 4. Verify and report

`npm test` covers the rules engine and URL round-trip; `npm run build` type-checks. Both are
quick and both should pass before committing, since a tree that changed shape can break point
totals.

Then tell the user what actually moved in game terms — which talents appeared, disappeared or
got renamed — rather than line counts. That's the part they care about.

## Where the data comes from

| Source | Endpoint | Used for |
| --- | --- | --- |
| Wowhead talents | `nether.wowhead.com/forever/data/talents-classic?dv=19` | trees, rows/cols, ranks, prerequisites |
| Wowhead tooltips | `nether.wowhead.com/forever/tooltip/spell/<id>` | cost / range / cast / cooldown, form requirements |
| Wowhead Legacy | `nether.wowhead.com/forever/data/legacy-calculator?dv=2` | Legacy trees, nodes, edges |
| Icy Veins | `static.icy-veins.com/json/forever-talent-calculator/<class>.json` | cross-check only |

Both Wowhead endpoints answer with a script, not JSON: one `WH.setPageData("key", {...});` call
followed by unrelated `WH.Gatherer.addData(...)` tooltip blocks. `scripts/sync-wowhead.mjs`
brace-matches the first object rather than slicing to the last `}` in the file, which is what
broke when the Gatherer blocks first appeared.

Icy Veins lays each tree out as a flat array of 4-column grid cells with `null` for empty ones,
so `index / 4` is the row and `index % 4` the column — the same coordinates Wowhead uses. It
keeps the client's internal tree names (`Shadow Magic`, `Elemental Combat`) where we and Wowhead
use the in-game ones; `scripts/check-icyveins.mjs` holds that alias list. Icy Veins has no
Legacy calculator, so the Legacy trees have no second source.

## Classifying abilities vs. passives

The summary panel splits talents into abilities and passives, which depends entirely on the
tooltip parse in `scripts/sync-wowhead.mjs`. The rule: a talent is an ability when its tooltip
lists a **resource cost or a cast time**. A range or a cooldown alone is not enough — Wowhead
shows a range on some purely passive talents (Improved Aspect of the Monkey has "100 yd range"
and does nothing castable), and it has never shown a cooldown without a cast line.

If you touch that parser, the count of abilities is the number to watch: it was 83 before and
after the tooltip migration, and a drift of more than a few is worth explaining. Two habits that
keep it honest:

- Split tooltip HTML on block tags only. Inline `<span>`s colour parts of a single line — a
  range renders as `<span>20</span> - <span>40</span> yd range` and must not be split into three
  details.
- Wowhead prints `Talent`, `Level 60` and `Rank 1` labels in the same header region as the real
  detail lines; they are filtered out by name, so a new label will need adding to that list.

The parser throws if a "detail" line runs past 60 characters, on the theory that the spell
description has leaked in and a loud failure beats silently storing prose.

## Things that will look like regressions but aren't

- **`20% of base mana` instead of `162 Mana`.** The tooltip endpoint doesn't resolve percentage
  costs to a level-60 number the way the old bulk payload did. Nothing to fix.
- **A `Renamed` pair that swaps two names.** Wowhead sometimes corrects which talent id holds
  which name; the tree is unchanged.
- **`syncedAt` churn in `legacy.json`.** Every sync rewrites the timestamp. If that line is the
  only change, the Legacy trees didn't move.
