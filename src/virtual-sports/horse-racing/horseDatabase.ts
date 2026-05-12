export interface HorseProfile {
  name: string;
  silkPrimary: string;
  silkSecondary: string;
}

export interface JockeyName {
  short: string;        // e.g., "F. Martinez"
}

export const HORSE_POOL: HorseProfile[] = [
  { name: 'Thunder Strike',  silkPrimary: '#1d4ed8', silkSecondary: '#FFFFFF' },
  { name: 'Silver Bullet',   silkPrimary: '#94a3b8', silkSecondary: '#0F172A' },
  { name: 'Royal Knight',    silkPrimary: '#7e22ce', silkSecondary: '#FFD700' },
  { name: 'Midnight Storm',  silkPrimary: '#0f172a', silkSecondary: '#facc15' },
  { name: 'Lightning Bolt',  silkPrimary: '#facc15', silkSecondary: '#000000' },
  { name: 'Golden Arrow',    silkPrimary: '#d97706', silkSecondary: '#FFFFFF' },
  { name: 'Dark Prince',     silkPrimary: '#1e293b', silkSecondary: '#dc2626' },
  { name: 'Iron Heart',      silkPrimary: '#475569', silkSecondary: '#fbbf24' },
  { name: 'Wild Spirit',     silkPrimary: '#16a34a', silkSecondary: '#FFFFFF' },
  { name: 'Crimson Comet',   silkPrimary: '#dc2626', silkSecondary: '#FFFFFF' },
  { name: 'Sky Runner',      silkPrimary: '#0ea5e9', silkSecondary: '#FFFFFF' },
  { name: 'Emerald Dancer',  silkPrimary: '#10b981', silkSecondary: '#000000' },
  { name: 'Desert Wind',     silkPrimary: '#b45309', silkSecondary: '#FFFFFF' },
  { name: 'Ocean Breeze',    silkPrimary: '#0d9488', silkSecondary: '#FFFFFF' },
  { name: 'Mountain King',   silkPrimary: '#52525b', silkSecondary: '#fbbf24' },
  { name: 'Crystal Vision',  silkPrimary: '#ec4899', silkSecondary: '#FFFFFF' },
  { name: 'Shadow Hunter',   silkPrimary: '#000000', silkSecondary: '#10b981' },
  { name: 'Bright Star',     silkPrimary: '#fde047', silkSecondary: '#1d4ed8' },
  { name: 'Phantom Echo',    silkPrimary: '#a21caf', silkSecondary: '#FFFFFF' },
  { name: 'Iron Fist',       silkPrimary: '#374151', silkSecondary: '#dc2626' },
];

export const JOCKEYS: JockeyName[] = [
  { short: 'F. Martinez' },
  { short: 'J. Rodriguez' },
  { short: 'K. Smith' },
  { short: 'P. Murray' },
  { short: 'L. Chen' },
  { short: 'A. Dupont' },
  { short: 'R. Kavanagh' },
  { short: 'D. Mitchell' },
  { short: 'O. Walsh' },
  { short: 'T. Hayes' },
  { short: 'S. Nakamura' },
  { short: 'V. Petrov' },
];

export const RACE_TYPES = ['sprint', 'medium', 'long'] as const;
export type RaceType = (typeof RACE_TYPES)[number];

export const RACE_TYPE_META: Record<RaceType, { label: string; distance: string; baseSeconds: number; weights: { speed: number; accel: number; stamina: number } }> = {
  sprint:  { label: 'Sprint',           distance: '5 furlongs', baseSeconds: 58,  weights: { speed: 0.65, accel: 0.25, stamina: 0.10 } },
  medium:  { label: 'Mile',             distance: '1 mile',     baseSeconds: 96,  weights: { speed: 0.45, accel: 0.20, stamina: 0.35 } },
  long:    { label: 'Distance',         distance: '1¾ miles',   baseSeconds: 168, weights: { speed: 0.25, accel: 0.10, stamina: 0.65 } },
};
