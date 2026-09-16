import { addBlockedReason, POINTS_PER_TIER, pointsInTree, type Talent, type TalentRanks, type TalentTree } from '../lib/talents';
import { PointNode, type NodeState } from './PointNode';

const CELL = 44;
const GAP = 18;
const PITCH = CELL + GAP;
const COLS = 4;

interface Props {
  trees: TalentTree[];
  tree: TalentTree;
  ranks: TalentRanks;
  /** Validated against the latest state by the owner, so rapid clicks can't overspend. */
  onChange: (talent: Talent, delta: 1 | -1) => void;
  onReset: () => void;
}

const center = (row: number, col: number) => ({ x: col * PITCH + CELL / 2, y: row * PITCH + CELL / 2 });

export function TalentTreeView({ trees, tree, ranks, onChange, onReset }: Props) {
  const spent = pointsInTree(tree, ranks);
  const rows = Math.max(...tree.talents.map((t) => t.row)) + 1;
  const width = COLS * PITCH - GAP;
  const height = rows * PITCH - GAP;
  const byId = new Map(tree.talents.map((t) => [t.id, t]));

  const stateOf = (t: Talent, blocked: string | null): NodeState => {
    const rank = ranks[t.id] ?? 0;
    if (rank >= t.maxRank) return 'max';
    if (rank > 0) return 'partial';
    return blocked ? 'locked' : 'available';
  };

  return (
    <section className="tree">
      <header className="tree-header">
        <h3>{tree.name}</h3>
        <span className="tree-points">{spent}</span>
        <button type="button" className="link-button" onClick={onReset} disabled={spent === 0}>
          Reset
        </button>
      </header>
      <div className="talent-grid" style={{ width, height }}>
        <svg className="tree-edges" width={width} height={height} aria-hidden>
          {tree.talents.map((t) => {
            const req = t.requires && byId.get(t.requires.id);
            if (!req) return null;
            const from = center(req.row, req.col);
            const to = center(t.row, t.col);
            const active = (ranks[req.id] ?? 0) >= t.requires!.qty;
            // Horizontal first, then down: matches how the in-game arrows bend.
            const d = from.y === to.y ? `M${from.x} ${from.y}H${to.x}` : `M${from.x} ${from.y}H${to.x}V${to.y}`;
            return <path key={t.id} d={d} className={active ? 'edge edge-active' : 'edge'} />;
          })}
        </svg>
        {tree.talents.map((t) => {
          const rank = ranks[t.id] ?? 0;
          const addReason = addBlockedReason(trees, tree, t, ranks);
          const requirement = addReason === 'Max rank' ? null : addReason;
          return (
            <PointNode
              key={t.id}
              icon={t.icon}
              name={t.name}
              rank={rank}
              maxRank={t.maxRank}
              state={stateOf(t, requirement)}
              style={{ left: t.col * PITCH, top: t.row * PITCH }}
              onAdd={() => onChange(t, 1)}
              onRemove={() => onChange(t, -1)}
              tooltip={{
                title: t.name,
                meta: `Rank ${rank}/${t.maxRank} · Tier ${t.row + 1} (${t.row * POINTS_PER_TIER} pts)`,
                details: t.ability ? [...t.ability.details, ...(t.ability.requiresText ? [t.ability.requiresText] : [])] : undefined,
                requirement,
                current: t.ranks[Math.max(rank, 1) - 1],
                currentLabel: t.ability ? 'Ability' : 'Passive',
                next: rank > 0 && rank < t.maxRank ? t.ranks[rank] : undefined,
                hint: rank > 0 ? 'Click to add · Right-click to remove' : 'Click to learn',
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
