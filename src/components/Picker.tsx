import { CLASSES, type ClassKey } from '../data/classes';
import { RACES, RACE_BY_KEY, type Faction, type RaceKey } from '../data/races';
import { Icon } from './Icon';

interface Props {
  race: RaceKey | null;
  classKey: ClassKey | null;
  onRace: (race: RaceKey) => void;
  onClass: (classKey: ClassKey) => void;
}

const FACTIONS: { key: Faction; name: string; icon: string }[] = [
  { key: 'alliance', name: 'Alliance', icon: 'ui_allianceicon-round' },
  { key: 'horde', name: 'Horde', icon: 'ui_hordeicon-round' },
];

export function Picker({ race, classKey, onRace, onClass }: Props) {
  return (
    <div className="picker">
      <div className="picker-races">
        {FACTIONS.map((f) => (
          <div key={f.key} className={`faction faction-${f.key}`}>
            <div className="faction-label">
              <Icon name={f.icon} size="small" /> {f.name}
            </div>
            <div className="choice-row">
              {RACES.filter((r) => r.faction === f.key).map((r) => {
                const availability = classKey ? r.classes[classKey] : true;
                return (
                  <button
                    key={r.key}
                    type="button"
                    className="choice"
                    aria-pressed={race === r.key}
                    data-unavailable={!availability || undefined}
                    title={!availability ? `${r.name} can't be a ${classKey}; picking it clears your class` : undefined}
                    onClick={() => onRace(r.key)}
                  >
                    <Icon name={r.icon} size="medium" />
                    <span>{r.name}</span>
                    {availability === 'new' && <em className="badge-new">New</em>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="picker-classes">
        <div className="faction-label">Class</div>
        <div className="choice-row">
          {CLASSES.map((c) => {
            const availability = race ? RACE_BY_KEY[race].classes[c.key] : true;
            return (
              <button
                key={c.key}
                type="button"
                className="choice"
                style={{ '--class-color': c.color } as React.CSSProperties}
                aria-pressed={classKey === c.key}
                data-unavailable={!availability || undefined}
                title={!availability ? `Not available to ${RACE_BY_KEY[race!].name}; picking it clears your race` : undefined}
                onClick={() => onClass(c.key)}
              >
                <Icon name={c.icon} size="medium" />
                <span className="class-name">{c.name}</span>
                {availability === 'new' && <em className="badge-new">New</em>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
