# WoW: Forever Character Planner

A single-page planner for **World of Warcraft: Forever** that combines Wowhead's three tools into one view:

1. **Race & class**: every Forever race/class combination, with new combos marked and invalid ones greyed out
2. **Talents**: all 9 classes × 3 trees, 51 points, 5 points per tier, talent prerequisites
3. **Legacy**: the account-wide Legacy trees (16 shared points, per-tree spend gates, node prerequisites)

A sticky summary panel lists every **passive bonus** and **ability** your choices grant, grouped by source (racials, each talent tree, each Legacy tree), plus the point split and required level. The required level accounts for the Legacy *Talented* node.

The whole build is stored in the URL hash (e.g. `#r=troll&c=mage&t=…&l=…`), so **Copy build link** shares it.

Controls: click to add a point; right-click, shift-click or long-press (touch) to remove one. On touch screens, tap a node to see its tooltip.

## Development

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # rules engine + URL round-trip tests
npm run build      # static site in dist/ (relative paths, host anywhere)
```

## Data

| Data | Source | How it updates |
| --- | --- | --- |
| Talent trees | [Wowhead talent calc](https://www.wowhead.com/forever/talent-calc) → `nether.wowhead.com/forever/data/talents-classic` | `npm run sync-data` → `src/data/talents.json` |
| Legacy trees | [Wowhead Legacy calc](https://www.wowhead.com/forever/legacy-calculator) → `nether.wowhead.com/forever/data/legacy-calculator` | `npm run sync-data` → `src/data/legacy.json` |
| Races, racials, combos | [Wowhead racials guide](https://www.wowhead.com/forever/guide/new-race-class-combinations) | Hand-maintained in `src/data/races.ts` |

Forever is unreleased. Wowhead's trees come from BlizzCon testing and will be refreshed once the beta is datamined, so re-run `npm run sync-data` from time to time. A talent counts as an *ability* when Wowhead gives it cast/cost details; everything else counts as a *passive*. The racials guide doesn't label passives, so those flags and some racial icons (where the guide had none) are best guesses in `races.ts`. Icons are loaded from Wowhead's CDN (`wow.zamimg.com`).
