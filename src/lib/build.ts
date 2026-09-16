// The whole build lives in the URL hash so any plan can be shared by copying the link:
//   #r=troll&c=mage&t=<talents>&l=<legacy>
import { CLASS_BY_KEY, type ClassKey } from '../data/classes';
import { RACE_BY_KEY, type RaceKey } from '../data/races';
import { decodeLegacy, encodeLegacy, type LegacyRanks } from './legacy';
import { decodeTalents, encodeTalents, TALENT_TREES, type TalentRanks } from './talents';

export interface Build {
  race: RaceKey | null;
  classKey: ClassKey | null;
  talents: TalentRanks;
  legacy: LegacyRanks;
}

export const EMPTY_BUILD: Build = { race: null, classKey: null, talents: {}, legacy: {} };

export function isCombinationAvailable(race: RaceKey | null, classKey: ClassKey | null): boolean {
  return !race || !classKey || Boolean(RACE_BY_KEY[race].classes[classKey]);
}

export function buildToHash(build: Build): string {
  const params = new URLSearchParams();
  if (build.race) params.set('r', build.race);
  if (build.classKey) {
    params.set('c', build.classKey);
    const talents = encodeTalents(TALENT_TREES[build.classKey], build.talents);
    if (talents) params.set('t', talents);
  }
  const legacy = encodeLegacy(build.legacy);
  if (legacy) params.set('l', legacy);
  const str = params.toString();
  return str ? `#${str}` : '';
}

export function hashToBuild(hash: string): Build {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const r = params.get('r');
  const c = params.get('c');
  const race = r && r in RACE_BY_KEY ? (r as RaceKey) : null;
  let classKey = c && c in CLASS_BY_KEY ? (c as ClassKey) : null;
  if (!isCombinationAvailable(race, classKey)) classKey = null;
  return {
    race,
    classKey,
    talents: classKey ? decodeTalents(TALENT_TREES[classKey], params.get('t') ?? '') : {},
    legacy: decodeLegacy(params.get('l') ?? ''),
  };
}
