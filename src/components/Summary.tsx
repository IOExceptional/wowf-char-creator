import { CLASS_BY_KEY } from '../data/classes';
import { RACE_BY_KEY } from '../data/races';
import type { Build } from '../lib/build';
import { LEGACY, LEGACY_CAP, spentInTree, TALENTED_NODE_ID, totalSpent as legacySpent } from '../lib/legacy';
import { MAX_TALENT_POINTS, pointsInTree, requiredLevel, TALENT_TREES } from '../lib/talents';
import { Icon } from './Icon';

interface Entry {
  key: string;
  icon: string;
  name: string;
  rank?: string;
  description: string;
  note?: string;
}

interface Group {
  source: string;
  kind: 'racial' | 'talent' | 'legacy';
  passives: Entry[];
  abilities: Entry[];
}

function collectGroups(build: Build): Group[] {
  const groups: Group[] = [];

  if (build.race) {
    const race = RACE_BY_KEY[build.race];
    const entries = race.racials.map((r) => ({ key: r.name, icon: r.icon, name: r.name, description: r.description, note: r.note }));
    groups.push({
      source: `${race.name} racials`,
      kind: 'racial',
      passives: entries.filter((_, i) => race.racials[i].passive),
      abilities: entries.filter((_, i) => !race.racials[i].passive),
    });
  }

  if (build.classKey) {
    for (const tree of TALENT_TREES[build.classKey]) {
      const group: Group = { source: `${tree.name} talents`, kind: 'talent', passives: [], abilities: [] };
      for (const t of tree.talents) {
        const rank = build.talents[t.id] ?? 0;
        if (!rank) continue;
        const entry = { key: String(t.id), icon: t.icon, name: t.name, rank: `${rank}/${t.maxRank}`, description: t.ranks[rank - 1] };
        (t.ability ? group.abilities : group.passives).push(entry);
      }
      if (group.passives.length || group.abilities.length) groups.push(group);
    }
  }

  for (const tree of LEGACY.trees) {
    const group: Group = { source: `${tree.name} Legacy`, kind: 'legacy', passives: [], abilities: [] };
    for (const n of tree.nodes) {
      const rank = build.legacy[n.id] ?? 0;
      if (!rank) continue;
      const entry = { key: String(n.id), icon: n.icon, name: n.name, rank: `${rank}/${n.maxRank}`, description: n.ranks[rank - 1] };
      (n.castMs || n.cooldownMs ? group.abilities : group.passives).push(entry);
    }
    if (group.passives.length || group.abilities.length) groups.push(group);
  }

  return groups;
}

function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="entry-list">
      {entries.map((e) => (
        <li key={e.key} className="entry">
          <Icon name={e.icon} size="small" className="entry-icon" />
          <div>
            <div className="entry-name">
              {e.name}
              {e.rank && <span className="entry-rank">{e.rank}</span>}
            </div>
            <div className="entry-desc">{e.description}</div>
            {e.note && <div className="entry-note">{e.note}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Summary({ build }: { build: Build }) {
  const race = build.race ? RACE_BY_KEY[build.race] : null;
  const cls = build.classKey ? CLASS_BY_KEY[build.classKey] : null;
  const trees = build.classKey ? TALENT_TREES[build.classKey] : [];
  const split = trees.map((t) => pointsInTree(t, build.talents));
  const talentTotal = split.reduce((a, b) => a + b, 0);
  const talentedRank = TALENTED_NODE_ID ? build.legacy[TALENTED_NODE_ID] ?? 0 : 0;
  const level = requiredLevel(talentTotal, talentedRank);
  const groups = collectGroups(build);
  const withPassives = groups.filter((g) => g.passives.length);
  const withAbilities = groups.filter((g) => g.abilities.length);

  return (
    <aside className="summary" style={cls ? ({ '--class-color': cls.color } as React.CSSProperties) : undefined}>
      <div className="summary-card">
        <div className="summary-portrait">
          {race && <Icon name={race.icon} size="large" alt={race.name} />}
          {cls && <Icon name={cls.icon} size="medium" className="summary-class-icon" alt={cls.name} />}
        </div>
        <div>
          <div className="summary-title">
            {race?.name ?? 'Any race'} <span className="class-name">{cls?.name ?? 'Any class'}</span>
          </div>
          <div className="summary-sub">
            {race ? (race.faction === 'alliance' ? 'Alliance' : 'Horde') : 'Pick a race and class to start'}
            {race && cls && race.classes[cls.key] === 'new' && <em className="badge-new">New combo</em>}
          </div>
        </div>
      </div>

      <dl className="summary-stats">
        <div>
          <dt>Talents</dt>
          <dd>{cls ? split.join(' / ') : '–'}</dd>
          <dd className="muted">{talentTotal}/{MAX_TALENT_POINTS}</dd>
        </div>
        <div>
          <dt>Legacy</dt>
          <dd>{LEGACY.trees.map((t) => spentInTree(t, build.legacy)).join(' / ')}</dd>
          <dd className="muted">{legacySpent(build.legacy)}/{LEGACY_CAP}</dd>
        </div>
        <div>
          <dt>Req. level</dt>
          <dd>{level ?? '–'}</dd>
          {talentedRank > 0 && <dd className="muted">Talented {talentedRank}</dd>}
        </div>
      </dl>

      <h2 className="summary-heading">
        Passive bonuses <span className="count">{withPassives.reduce((n, g) => n + g.passives.length, 0)}</span>
      </h2>
      {withPassives.length === 0 && <p className="empty">Choose a race, talents, or Legacy nodes and their passives appear here.</p>}
      {withPassives.map((g) => (
        <section key={g.source} className={`summary-group group-${g.kind}`}>
          <h3>{g.source}</h3>
          <EntryList entries={g.passives} />
        </section>
      ))}

      {withAbilities.length > 0 && (
        <>
          <h2 className="summary-heading">
            Abilities gained <span className="count">{withAbilities.reduce((n, g) => n + g.abilities.length, 0)}</span>
          </h2>
          {withAbilities.map((g) => (
            <section key={g.source} className={`summary-group group-${g.kind}`}>
              <h3>{g.source}</h3>
              <EntryList entries={g.abilities} />
            </section>
          ))}
        </>
      )}
    </aside>
  );
}
