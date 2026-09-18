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
npm run sync-data  # re-pull talent + Legacy data from Wowhead
npm run diff-data  # summarise what the last sync changed, vs. the committed data
npm run check-icyveins   # diff the synced talents against Icy Veins; exits 1 if they disagree
```

## Data

| Data | Source | How it updates |
| --- | --- | --- |
| Talent trees | [Wowhead talent calc](https://www.wowhead.com/forever/talent-calc) → `nether.wowhead.com/forever/data/talents-classic` | `npm run sync-data` → `src/data/talents.json` |
| Ability cost/cast lines | `nether.wowhead.com/forever/tooltip/spell/<id>`, one call per talent | same sync, folded into `talents.json` |
| Legacy trees | [Wowhead Legacy calc](https://www.wowhead.com/forever/legacy-calculator) → `nether.wowhead.com/forever/data/legacy-calculator` | `npm run sync-data` → `src/data/legacy.json` |
| Races, racials, combos | [Wowhead racials guide](https://www.wowhead.com/forever/guide/new-race-class-combinations) | Hand-maintained in `src/data/races.ts` |
| Talent cross-check | [Icy Veins talent calculator](https://www.icy-veins.com/wow-forever/talent-calculator) → `static.icy-veins.com/json/forever-talent-calculator/<class>.json` | `npm run check-icyveins` (reports only, writes nothing) |

Wowhead is the source of truth; Icy Veins is a second opinion. Both build their trees from the same client, so `npm run check-icyveins` flags the cases where one of them is behind — which happens often while the beta is being datamined. Differences are expected, not failures: look the talent up on both sites before changing anything. Icy Veins has no Legacy calculator, so the Legacy trees have no cross-check.

Known differences as of the last sync, all of them Icy Veins being wrong or behind:

- **Improved Serpent Sting** (Marksmanship, row 3) is on Wowhead as [spell 19464](https://www.wowhead.com/forever/spell=19464) but missing from Icy Veins' tree.
- **Nature's Majesty** (Balance): Icy Veins draws its prerequisite arrow the wrong way round, pointing at Nature's Splendor a row *below* it.
- **Devouring Contagion** (Shadow): Icy Veins' icon name has a stray trailing hyphen.

A talent counts as an *ability* when its tooltip lists a resource cost or a cast time; a range or a cooldown on its own isn't enough, since Wowhead shows those on some purely passive talents too. Wowhead no longer resolves percentage costs to a number at level 60, so a few abilities read e.g. "20% of base mana" rather than "162 Mana". The racials guide doesn't label passives, so those flags and some racial icons (where the guide had none) are best guesses in `races.ts`. Icons are loaded from Wowhead's CDN (`wow.zamimg.com`).
