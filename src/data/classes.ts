export type ClassKey = 'druid' | 'hunter' | 'mage' | 'paladin' | 'priest' | 'rogue' | 'shaman' | 'warlock' | 'warrior';

export interface ClassInfo {
  key: ClassKey;
  name: string;
  color: string;
  icon: string;
}

export const CLASSES: ClassInfo[] = [
  { key: 'druid', name: 'Druid', color: '#FF7C0A', icon: 'classicon_druid' },
  { key: 'hunter', name: 'Hunter', color: '#AAD372', icon: 'classicon_hunter' },
  { key: 'mage', name: 'Mage', color: '#3FC7EB', icon: 'classicon_mage' },
  { key: 'paladin', name: 'Paladin', color: '#F48CBA', icon: 'classicon_paladin' },
  { key: 'priest', name: 'Priest', color: '#FFFFFF', icon: 'classicon_priest' },
  { key: 'rogue', name: 'Rogue', color: '#FFF468', icon: 'classicon_rogue' },
  { key: 'shaman', name: 'Shaman', color: '#0070DD', icon: 'classicon_shaman' },
  { key: 'warlock', name: 'Warlock', color: '#8788EE', icon: 'classicon_warlock' },
  { key: 'warrior', name: 'Warrior', color: '#C69B6D', icon: 'classicon_warrior' },
];

export const CLASS_BY_KEY = Object.fromEntries(CLASSES.map((c) => [c.key, c])) as Record<ClassKey, ClassInfo>;
