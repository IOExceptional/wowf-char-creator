// Legacy point rules, mirroring Wowhead's LegacyCalculator engine:
//  - `cap` points shared across all three trees
//  - a node needs `requiredSpent` points already spent in its own tree
//  - an incoming edge needs points in its source node (type 3 edges: all sources; others: any source)
//  - removing a point is only allowed if the remaining build can still be purchased in some order
import legacyData from '../data/legacy.json';

export interface LegacyNode {
  id: number;
  name: string;
  icon: string;
  x: number;
  y: number;
  maxRank: number;
  locked: boolean;
  requiredSpent: number;
  castMs: number;
  cooldownMs: number;
  ranks: string[];
}

export interface LegacyTree {
  id: number;
  name: string;
  blurb: string;
  edges: { from: number; to: number; type: number }[];
  nodes: LegacyNode[];
}

export type LegacyRanks = Record<number, number>;

const EDGE_ALL_REQUIRED = 3;

export const LEGACY = legacyData as unknown as { build: string; cap: number; syncedAt: string; trees: LegacyTree[] };
export const LEGACY_CAP = LEGACY.cap;

const nodeById = new Map<number, LegacyNode>();
for (const tree of LEGACY.trees) for (const node of tree.nodes) nodeById.set(node.id, node);

export const TALENTED_NODE_ID = LEGACY.trees.flatMap((t) => t.nodes).find((n) => n.name === 'Talented')?.id;

export const spentInTree = (tree: LegacyTree, ranks: LegacyRanks) =>
  tree.nodes.reduce((sum, n) => sum + (ranks[n.id] ?? 0), 0);

export const totalSpent = (ranks: LegacyRanks) => LEGACY.trees.reduce((sum, t) => sum + spentInTree(t, ranks), 0);

/** Structural requirements only (ignores rank cap and point cap). */
function prerequisiteReason(tree: LegacyTree, node: LegacyNode, ranks: LegacyRanks): string | null {
  if (node.locked) return 'Not yet implemented';
  if (spentInTree(tree, ranks) < node.requiredSpent) return `Requires ${node.requiredSpent} points spent in ${tree.name}`;
  const incoming = tree.edges.filter((e) => e.to === node.id && nodeById.has(e.from));
  const anyOf = incoming.filter((e) => e.type !== EDGE_ALL_REQUIRED);
  if (anyOf.length && !anyOf.some((e) => (ranks[e.from] ?? 0) > 0)) {
    return `Requires a point in ${anyOf.map((e) => nodeById.get(e.from)!.name).join(' or ')}`;
  }
  const allOf = incoming.filter((e) => e.type === EDGE_ALL_REQUIRED && !((ranks[e.from] ?? 0) > 0));
  if (allOf.length) return `Requires a point in ${allOf.map((e) => nodeById.get(e.from)!.name).join(', ')}`;
  return null;
}

export function addBlockedReason(tree: LegacyTree, node: LegacyNode, ranks: LegacyRanks): string | null {
  if (!node.locked && (ranks[node.id] ?? 0) >= node.maxRank) return 'Max rank';
  return prerequisiteReason(tree, node, ranks) ?? (totalSpent(ranks) >= LEGACY_CAP ? 'No Legacy points remaining' : null);
}

/** Greedily replays the target build from empty; returns the ranks that were reachable. */
function replay(target: LegacyRanks): LegacyRanks {
  const built: LegacyRanks = {};
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const tree of LEGACY.trees) {
      for (const node of tree.nodes) {
        while ((built[node.id] ?? 0) < Math.min(target[node.id] ?? 0, node.maxRank) && !addBlockedReason(tree, node, built)) {
          built[node.id] = (built[node.id] ?? 0) + 1;
          progressed = true;
        }
      }
    }
  }
  return built;
}

export function removeBlockedReason(node: LegacyNode, ranks: LegacyRanks): string | null {
  const current = ranks[node.id] ?? 0;
  if (current <= 0) return 'No points spent';
  const next = { ...ranks, [node.id]: current - 1 };
  const built = replay(next);
  const stranded = LEGACY.trees.flatMap((t) => t.nodes).find((n) => (built[n.id] ?? 0) < (next[n.id] ?? 0));
  return stranded ? `${stranded.name} depends on this` : null;
}

/** One base-36 digit per node in data order, per tree, trailing zeros trimmed. */
export function encodeLegacy(ranks: LegacyRanks): string {
  return LEGACY.trees
    .map((t) => t.nodes.map((n) => (ranks[n.id] ?? 0).toString(36)).join('').replace(/0+$/, ''))
    .join('-')
    .replace(/-+$/, '');
}

export function decodeLegacy(encoded: string): LegacyRanks {
  const wanted: LegacyRanks = {};
  encoded.split('-').forEach((part, i) => {
    const tree = LEGACY.trees[i];
    if (!tree) return;
    [...part].forEach((ch, j) => {
      const node = tree.nodes[j];
      const n = parseInt(ch, 36);
      if (node && n > 0) wanted[node.id] = n;
    });
  });
  return replay(wanted);
}
