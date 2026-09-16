import { useEffect, useState } from 'react';
import { CLASS_BY_KEY, type ClassKey } from './data/classes';
import type { RaceKey } from './data/races';
import { LegacyTreeView } from './components/LegacyTreeView';
import { Picker } from './components/Picker';
import { Summary } from './components/Summary';
import { TalentTreeView } from './components/TalentTreeView';
import { TooltipProvider } from './components/Tooltip';
import { buildToHash, EMPTY_BUILD, hashToBuild, isCombinationAvailable, type Build } from './lib/build';
import {
  addBlockedReason as legacyAddBlocked,
  LEGACY,
  LEGACY_CAP,
  removeBlockedReason as legacyRemoveBlocked,
  totalSpent as legacySpent,
  type LegacyNode,
  type LegacyTree,
} from './lib/legacy';
import {
  addBlockedReason as talentAddBlocked,
  MAX_TALENT_POINTS,
  removeBlockedReason as talentRemoveBlocked,
  TALENT_TREES,
  totalPoints,
  type Talent,
  type TalentTree,
} from './lib/talents';

const withoutKeys = (ranks: Record<number, number>, ids: number[]) => {
  const next = { ...ranks };
  for (const id of ids) delete next[id];
  return next;
};

const step = (ranks: Record<number, number>, id: number, delta: 1 | -1) => {
  const value = (ranks[id] ?? 0) + delta;
  return value > 0 ? { ...ranks, [id]: value } : withoutKeys(ranks, [id]);
};

export default function App() {
  const [build, setBuild] = useState<Build>(() => hashToBuild(window.location.hash));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hash = buildToHash(build);
    if (hash !== window.location.hash) history.replaceState(null, '', hash || window.location.pathname + window.location.search);
  }, [build]);

  useEffect(() => {
    const onHash = () => setBuild(hashToBuild(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectRace = (race: RaceKey) =>
    setBuild((b) => {
      const keepClass = isCombinationAvailable(race, b.classKey);
      return { ...b, race, classKey: keepClass ? b.classKey : null, talents: keepClass ? b.talents : {} };
    });

  const selectClass = (classKey: ClassKey) =>
    setBuild((b) =>
      b.classKey === classKey
        ? b
        : { ...b, classKey, race: isCombinationAvailable(b.race, classKey) ? b.race : null, talents: {} },
    );

  // Rules are checked inside the updater against the latest build, not the rendered one,
  // so several clicks landing before a re-render can't overspend points.
  const changeTalent = (tree: TalentTree, talent: Talent, delta: 1 | -1) =>
    setBuild((b) => {
      const classTrees = b.classKey ? TALENT_TREES[b.classKey] : [];
      if (!classTrees.includes(tree)) return b;
      const blocked =
        delta > 0
          ? talentAddBlocked(classTrees, tree, talent, b.talents)
          : talentRemoveBlocked(tree, talent, b.talents);
      return blocked ? b : { ...b, talents: step(b.talents, talent.id, delta) };
    });

  const changeLegacy = (tree: LegacyTree, node: LegacyNode, delta: 1 | -1) =>
    setBuild((b) => {
      const blocked =
        delta > 0 ? legacyAddBlocked(tree, node, b.legacy) : legacyRemoveBlocked(node, b.legacy);
      return blocked ? b : { ...b, legacy: step(b.legacy, node.id, delta) };
    });

  const trees = build.classKey ? TALENT_TREES[build.classKey] : [];
  const cls = build.classKey ? CLASS_BY_KEY[build.classKey] : null;
  const talentPoints = totalPoints(trees, build.talents);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <TooltipProvider>
      <div className="app" style={cls ? ({ '--class-color': cls.color } as React.CSSProperties) : undefined}>
        <header className="topbar">
          <h1>
            WoW: Forever <span>Character Planner</span>
          </h1>
          <div className="topbar-actions">
            <button type="button" className="button" onClick={copyLink}>
              {copied ? 'Link copied' : 'Copy build link'}
            </button>
            <button type="button" className="button button-ghost" onClick={() => setBuild(EMPTY_BUILD)}>
              Reset all
            </button>
          </div>
        </header>

        <main className="layout">
          <div className="planner">
            <section className="panel">
              <h2 className="panel-title">
                <span className="step">1</span> Race &amp; class
              </h2>
              <Picker race={build.race} classKey={build.classKey} onRace={selectRace} onClass={selectClass} />
            </section>

            <section className="panel">
              <h2 className="panel-title">
                <span className="step">2</span> Talents
                <span className="panel-points">
                  {MAX_TALENT_POINTS - talentPoints} points left
                </span>
              </h2>
              {cls ? (
                <div className="trees">
                  {trees.map((tree) => (
                    <TalentTreeView
                      key={tree.id}
                      trees={trees}
                      tree={tree}
                      ranks={build.talents}
                      onChange={(talent, delta) => changeTalent(tree, talent, delta)}
                      onReset={() => setBuild((b) => ({ ...b, talents: withoutKeys(b.talents, tree.talents.map((t) => t.id)) }))}
                    />
                  ))}
                </div>
              ) : (
                <p className="empty">Pick a class to open its talent trees.</p>
              )}
            </section>

            <section className="panel">
              <h2 className="panel-title">
                <span className="step">3</span> Legacy
                <span className="panel-points">{LEGACY_CAP - legacySpent(build.legacy)} points left</span>
              </h2>
              <p className="panel-intro">Account-wide Legacy points shared by all your characters, spread across three trees.</p>
              <div className="trees">
                {LEGACY.trees.map((tree) => (
                  <LegacyTreeView
                    key={tree.id}
                    tree={tree}
                    ranks={build.legacy}
                    onChange={(node, delta) => changeLegacy(tree, node, delta)}
                    onReset={() => setBuild((b) => ({ ...b, legacy: withoutKeys(b.legacy, tree.nodes.map((n) => n.id)) }))}
                  />
                ))}
              </div>
            </section>

            <footer className="credits">
              Data from Wowhead's{' '}
              <a href="https://www.wowhead.com/forever/talent-calc" target="_blank" rel="noreferrer">talent calculator</a>,{' '}
              <a href="https://www.wowhead.com/forever/legacy-calculator" target="_blank" rel="noreferrer">Legacy calculator</a> and{' '}
              <a href="https://www.wowhead.com/forever/guide/new-race-class-combinations" target="_blank" rel="noreferrer">racials guide</a>.
              WoW: Forever is unreleased, so all of this is subject to change. Left-click to add a point; right-click, shift-click or long-press to
              remove one.
            </footer>
          </div>

          <Summary build={build} />
        </main>
      </div>
    </TooltipProvider>
  );
}
