import talentData from '../data/talents.json';
import type { ClassKey } from '../data/classes';

export const MAX_TALENT_POINTS = 51;
export const POINTS_PER_TIER = 5;

export interface Talent {
  id: number;
  name: string;
  icon: string;
  row: number;
  col: number;
  maxRank: number;
  ranks: string[];
  requires: { id: number; qty: number } | null;
  ability: { details: string[]; requiresText: string | null } | null;
}

export interface TalentTree {
  id: number;
  name: string;
  role: number;
  talents: Talent[];
}

/** Ranks keyed by talent id. Missing = 0. */
export type TalentRanks = Record<number, number>;

export const TALENT_TREES = talentData.classes as Record<ClassKey, TalentTree[]>;

const talentIndex = new Map<number, { tree: TalentTree; talent: Talent }>();
for (const trees of Object.values(TALENT_TREES)) {
  for (const tree of trees) {
    for (const talent of tree.talents) talentIndex.set(talent.id, { tree, talent });
  }
}

export const findTalent = (id: number) => talentIndex.get(id);

export const pointsInTree = (tree: TalentTree, ranks: TalentRanks) =>
  tree.talents.reduce((sum, t) => sum + (ranks[t.id] ?? 0), 0);

export const totalPoints = (trees: TalentTree[], ranks: TalentRanks) =>
  trees.reduce((sum, tree) => sum + pointsInTree(tree, ranks), 0);

/** Returns why a rank can't be added, or null if it can. */
export function addBlockedReason(trees: TalentTree[], tree: TalentTree, talent: Talent, ranks: TalentRanks): string | null {
  const current = ranks[talent.id] ?? 0;
  if (current >= talent.maxRank) return 'Max rank';
  const needed = talent.row * POINTS_PER_TIER;
  const spent = pointsInTree(tree, ranks);
  if (spent < needed) return `Requires ${needed} points in ${tree.name} talents`;
  if (talent.requires) {
    const req = findTalent(talent.requires.id)?.talent;
    if (req && (ranks[req.id] ?? 0) < talent.requires.qty) {
      return `Requires ${talent.requires.qty} point${talent.requires.qty > 1 ? 's' : ''} in ${req.name}`;
    }
  }
  if (totalPoints(trees, ranks) >= MAX_TALENT_POINTS) return 'No talent points remaining';
  return null;
}

/** Returns why a rank can't be removed, or null if it can. */
export function removeBlockedReason(tree: TalentTree, talent: Talent, ranks: TalentRanks): string | null {
  const current = ranks[talent.id] ?? 0;
  if (current <= 0) return 'No points spent';

  const dependant = tree.talents.find((t) => t.requires?.id === talent.id && (ranks[t.id] ?? 0) > 0);
  if (dependant) return `${dependant.name} depends on this talent`;

  // After removing, every talent with points must still have enough points spent in lower tiers.
  const next = { ...ranks, [talent.id]: current - 1 };
  const byRow = new Array<number>(7).fill(0);
  for (const t of tree.talents) byRow[t.row] += next[t.id] ?? 0;
  let below = 0;
  for (let row = 0; row < byRow.length; row++) {
    if (byRow[row] > 0 && below < row * POINTS_PER_TIER) {
      return `Talents in tier ${row + 1} need ${row * POINTS_PER_TIER} points spent above them`;
    }
    below += byRow[row];
  }
  return null;
}

/**
 * Level needed to have `points` talent points. Points normally start at level 10; the
 * Legacy "Talented" node moves that start earlier by one level per rank.
 */
export const requiredLevel = (points: number, talentedRank = 0) =>
  points <= 0 ? null : points + 9 - talentedRank;

/** Compact per-tree string: one base-36 digit per talent in row/col order, trailing zeros trimmed. */
export function encodeTalents(trees: TalentTree[], ranks: TalentRanks): string {
  const parts = trees.map((tree) => tree.talents.map((t) => (ranks[t.id] ?? 0).toString(36)).join('').replace(/0+$/, ''));
  return parts.join('-').replace(/-+$/, '');
}

/** Decodes and re-validates by replaying ranks in tier order, so hand-edited URLs can't produce illegal builds. */
export function decodeTalents(trees: TalentTree[], encoded: string): TalentRanks {
  const wanted: TalentRanks = {};
  encoded.split('-').forEach((part, i) => {
    const tree = trees[i];
    if (!tree) return;
    [...part].forEach((ch, j) => {
      const talent = tree.talents[j];
      const n = parseInt(ch, 36);
      if (talent && n > 0) wanted[talent.id] = Math.min(n, talent.maxRank);
    });
  });

  const ranks: TalentRanks = {};
  for (const tree of trees) {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const talent of tree.talents) {
        while ((ranks[talent.id] ?? 0) < (wanted[talent.id] ?? 0) && !addBlockedReason(trees, tree, talent, ranks)) {
          ranks[talent.id] = (ranks[talent.id] ?? 0) + 1;
          progressed = true;
        }
      }
    }
  }
  return ranks;
}
