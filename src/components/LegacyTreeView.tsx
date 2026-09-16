import { addBlockedReason, spentInTree, type LegacyNode, type LegacyRanks, type LegacyTree } from '../lib/legacy';
import { formatDuration } from '../lib/format';
import { PointNode, type NodeState } from './PointNode';

const CELL = 44;
const GAP = 22;
const PITCH = CELL + GAP;

interface Props {
  tree: LegacyTree;
  ranks: LegacyRanks;
  /** Validated against the latest state by the owner, so rapid clicks can't overspend. */
  onChange: (node: LegacyNode, delta: 1 | -1) => void;
  onReset: () => void;
}

/** Wowhead lays nodes out on a coarse x/y grid (steps of 750); convert that to rows/columns. */
function layout(nodes: LegacyNode[]) {
  const xs = [...new Set(nodes.map((n) => n.x))].sort((a, b) => a - b);
  const ys = [...new Set(nodes.map((n) => n.y))].sort((a, b) => a - b);
  const step = (vals: number[]) => Math.min(...vals.slice(1).map((v, i) => v - vals[i]), Infinity);
  const sx = step(xs);
  const sy = step(ys);
  const pos = new Map(
    nodes.map((n) => [
      n.id,
      { col: Number.isFinite(sx) ? Math.round((n.x - xs[0]) / sx) : 0, row: Number.isFinite(sy) ? Math.round((n.y - ys[0]) / sy) : 0 },
    ]),
  );
  const cols = Math.max(...[...pos.values()].map((p) => p.col)) + 1;
  const rows = Math.max(...[...pos.values()].map((p) => p.row)) + 1;
  return { pos, cols, rows };
}

export function LegacyTreeView({ tree, ranks, onChange, onReset }: Props) {
  const spent = spentInTree(tree, ranks);
  const { pos, cols, rows } = layout(tree.nodes);
  const width = cols * PITCH - GAP;
  const height = rows * PITCH - GAP;
  const centerOf = (id: number) => {
    const p = pos.get(id)!;
    return { x: p.col * PITCH + CELL / 2, y: p.row * PITCH + CELL / 2 };
  };

  const stateOf = (n: LegacyNode, requirement: string | null): NodeState => {
    const rank = ranks[n.id] ?? 0;
    if (n.locked) return 'placeholder';
    if (rank >= n.maxRank) return 'max';
    if (rank > 0) return 'partial';
    return requirement ? 'locked' : 'available';
  };

  return (
    <section className="tree tree-legacy">
      <header className="tree-header">
        <h3>{tree.name}</h3>
        <span className="tree-points">{spent}</span>
        <button type="button" className="link-button" onClick={onReset} disabled={spent === 0}>
          Reset
        </button>
      </header>
      <p className="tree-blurb">{tree.blurb}</p>
      <div className="talent-grid" style={{ width, height }}>
        <svg className="tree-edges" width={width} height={height} aria-hidden>
          {tree.edges.map((e) => {
            if (!pos.has(e.from) || !pos.has(e.to)) return null;
            const a = centerOf(e.from);
            const b = centerOf(e.to);
            const active = (ranks[e.from] ?? 0) > 0;
            return <path key={`${e.from}-${e.to}`} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} className={active ? 'edge edge-active' : 'edge'} />;
          })}
        </svg>
        {tree.nodes.map((n) => {
          const p = pos.get(n.id)!;
          const rank = ranks[n.id] ?? 0;
          const addReason = addBlockedReason(tree, n, ranks);
          const requirement = addReason === 'Max rank' ? null : addReason;
          const isActive = n.castMs > 0 || n.cooldownMs > 0;
          const details = isActive
            ? [n.castMs ? `${formatDuration(n.castMs)} cast` : 'Instant', ...(n.cooldownMs ? [`${formatDuration(n.cooldownMs)} cooldown`] : [])]
            : undefined;
          return (
            <PointNode
              key={n.id}
              icon={n.icon}
              name={n.name}
              rank={rank}
              maxRank={n.maxRank}
              shape="round"
              state={stateOf(n, requirement)}
              style={{ left: p.col * PITCH, top: p.row * PITCH }}
              onAdd={() => onChange(n, 1)}
              onRemove={() => onChange(n, -1)}
              tooltip={{
                title: n.locked ? 'Coming soon' : n.name,
                meta: n.locked ? undefined : `Rank ${rank}/${n.maxRank}${n.requiredSpent ? ` · Needs ${n.requiredSpent} pts in tree` : ''}`,
                details,
                requirement: n.locked ? null : requirement,
                current: n.ranks[Math.max(rank, 1) - 1],
                currentLabel: n.locked ? undefined : isActive ? 'Ability' : 'Passive',
                next: rank > 0 && rank < n.maxRank ? n.ranks[rank] : undefined,
                hint: n.locked ? undefined : rank > 0 ? 'Click to add · Right-click to remove' : 'Click to learn',
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
