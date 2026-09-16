import { describe, expect, it } from 'vitest';
import { buildToHash, hashToBuild } from './build';
import * as legacy from './legacy';
import * as talents from './talents';

const mage = talents.TALENT_TREES.mage;
const [arcane] = mage;
const tier = (tree: talents.TalentTree, row: number) => tree.talents.filter((t) => t.row === row);

/** Fill tier-1 talents of a tree until `points` are spent. */
function spendTier1(tree: talents.TalentTree, points: number): talents.TalentRanks {
  const ranks: talents.TalentRanks = {};
  for (const t of tier(tree, 0)) {
    while (points > 0 && (ranks[t.id] ?? 0) < t.maxRank) {
      ranks[t.id] = (ranks[t.id] ?? 0) + 1;
      points--;
    }
  }
  expect(points).toBe(0);
  return ranks;
}

describe('talent rules', () => {
  it('has three trees for every class', () => {
    for (const trees of Object.values(talents.TALENT_TREES)) expect(trees).toHaveLength(3);
  });

  it('gates tiers behind 5 points per row', () => {
    const tier2 = tier(arcane, 1)[0];
    expect(talents.addBlockedReason(mage, arcane, tier2, {})).toMatch(/Requires 5 points/);
    expect(talents.addBlockedReason(mage, arcane, tier2, spendTier1(arcane, 5))).toBeNull();
  });

  it('refuses removals that strand higher tiers', () => {
    const ranks = spendTier1(arcane, 5);
    const tier2 = tier(arcane, 1)[0];
    ranks[tier2.id] = 1;
    const tier1 = tier(arcane, 0).find((t) => ranks[t.id])!;
    expect(talents.removeBlockedReason(arcane, tier1, ranks)).toMatch(/tier 2/);
    expect(talents.removeBlockedReason(arcane, tier2, ranks)).toBeNull();
  });

  it('enforces talent prerequisites', () => {
    const withReq = mage.flatMap((tree) => tree.talents.map((t) => ({ tree, t }))).find(({ t }) => t.requires)!;
    const { tree, t } = withReq;
    // Put enough points into lower tiers of the same tree (ignoring the prerequisite itself).
    const ranks: talents.TalentRanks = {};
    let needed = t.row * talents.POINTS_PER_TIER;
    for (const other of tree.talents) {
      if (other.row >= t.row || other.id === t.requires!.id) continue;
      while (needed > 0 && (ranks[other.id] ?? 0) < other.maxRank && !talents.addBlockedReason(mage, tree, other, ranks)) {
        ranks[other.id] = (ranks[other.id] ?? 0) + 1;
        needed--;
      }
    }
    expect(talents.addBlockedReason(mage, tree, t, ranks)).toMatch(/Requires/);
  });

  it('caps total points at 51', () => {
    const ranks: talents.TalentRanks = {};
    for (const tree of mage) {
      for (const t of tree.talents) {
        while (!talents.addBlockedReason(mage, tree, t, ranks)) ranks[t.id] = (ranks[t.id] ?? 0) + 1;
      }
    }
    expect(talents.totalPoints(mage, ranks)).toBe(talents.MAX_TALENT_POINTS);
  });

  it('computes required level with the Talented legacy node', () => {
    expect(talents.requiredLevel(0)).toBeNull();
    expect(talents.requiredLevel(1)).toBe(10);
    expect(talents.requiredLevel(51)).toBe(60);
    expect(talents.requiredLevel(51, 5)).toBe(55);
  });
});

describe('legacy rules', () => {
  const [professions] = legacy.LEGACY.trees;
  const root = professions.nodes.find((n) => n.requiredSpent === 0 && !n.locked)!;

  it('shares a 16 point cap across trees', () => {
    expect(legacy.LEGACY_CAP).toBe(16);
  });

  it('requires points spent in the tree', () => {
    const gated = professions.nodes.find((n) => n.requiredSpent === 5 && !professions.edges.some((e) => e.to === n.id))!;
    expect(legacy.addBlockedReason(professions, gated, {})).toMatch(/Requires 5 points/);
    expect(legacy.addBlockedReason(professions, gated, { [root.id]: 5 })).toBeNull();
  });

  it('blocks locked placeholder nodes', () => {
    const locked = professions.nodes.find((n) => n.locked)!;
    expect(legacy.addBlockedReason(professions, locked, {})).toMatch(/Not yet implemented/);
  });

  it('refuses removals that strand dependants', () => {
    const edge = professions.edges.find((e) => !professions.nodes.find((n) => n.id === e.from)!.locked)!;
    const from = professions.nodes.find((n) => n.id === edge.from)!;
    const to = professions.nodes.find((n) => n.id === edge.to)!;
    // Max out the tier-0 nodes so spend gates are satisfied and only the edge matters.
    const ranks: legacy.LegacyRanks = { [from.id]: 1, [to.id]: 1 };
    for (const n of professions.nodes.filter((n) => n.requiredSpent === 0 && !n.locked)) ranks[n.id] = n.maxRank;
    // If `from` is the only way to satisfy `to`, removing it must fail.
    expect(legacy.removeBlockedReason(from, ranks)).toMatch(/depends/);
    expect(legacy.removeBlockedReason(to, ranks)).toBeNull();
  });
});

describe('build hash', () => {
  it('round-trips a build', () => {
    const talentRanks = spendTier1(arcane, 5);
    const b = { race: 'troll' as const, classKey: 'mage' as const, talents: talentRanks, legacy: { [legacy.LEGACY.trees[1].nodes[1].id]: 3 } };
    expect(hashToBuild(buildToHash(b))).toEqual(b);
  });

  it('drops invalid race/class combos and illegal ranks', () => {
    const b = hashToBuild('#r=tauren&c=mage&t=5555555');
    expect(b.race).toBe('tauren');
    expect(b.classKey).toBeNull();
    const illegal = hashToBuild('#c=mage&t=0000000000009');
    expect(talents.totalPoints(mage, illegal.talents)).toBe(0);
  });
});
