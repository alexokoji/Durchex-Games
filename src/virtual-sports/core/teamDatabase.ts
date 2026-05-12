import type { Team } from './types';

// Ratings calibrated against real-world strength (50–95 scale).
// `form` is a -10..+10 short-term modifier, shuffled at runtime.
export const TEAMS: Team[] = [
  // --- Premier League ---
  { id: 'ars', name: 'Arsenal',           shortName: 'Arsenal',   abbr: 'ARS', leagueId: 'epl', country: 'England',
    primary: '#EF0107', secondary: '#FFFFFF', accent: '#063672', emblemKey: 'ars',
    ratings: { attack: 86, defense: 84, midfield: 87, pace: 85, finishing: 83, keeping: 82, form: 3 } },
  { id: 'che', name: 'Chelsea',           shortName: 'Chelsea',   abbr: 'CHE', leagueId: 'epl', country: 'England',
    primary: '#034694', secondary: '#FFFFFF', accent: '#DBA111', emblemKey: 'che',
    ratings: { attack: 81, defense: 80, midfield: 82, pace: 84, finishing: 80, keeping: 81, form: 1 } },
  { id: 'mun', name: 'Manchester United', shortName: 'Man Utd',   abbr: 'MUN', leagueId: 'epl', country: 'England',
    primary: '#DA291C', secondary: '#FBE122', accent: '#000000', emblemKey: 'mun',
    ratings: { attack: 83, defense: 79, midfield: 80, pace: 83, finishing: 84, keeping: 81, form: 0 } },
  { id: 'liv', name: 'Liverpool',         shortName: 'Liverpool', abbr: 'LIV', leagueId: 'epl', country: 'England',
    primary: '#C8102E', secondary: '#F6EB61', accent: '#00B2A9', emblemKey: 'liv',
    ratings: { attack: 89, defense: 84, midfield: 85, pace: 89, finishing: 88, keeping: 84, form: 4 } },
  { id: 'mci', name: 'Manchester City',   shortName: 'Man City',  abbr: 'MCI', leagueId: 'epl', country: 'England',
    primary: '#6CABDD', secondary: '#1C2C5B', accent: '#FFC659', emblemKey: 'mci',
    ratings: { attack: 92, defense: 87, midfield: 92, pace: 86, finishing: 90, keeping: 86, form: 5 } },
  { id: 'tot', name: 'Tottenham Hotspur', shortName: 'Tottenham', abbr: 'TOT', leagueId: 'epl', country: 'England',
    primary: '#132257', secondary: '#FFFFFF', accent: '#C8102E', emblemKey: 'tot',
    ratings: { attack: 82, defense: 76, midfield: 80, pace: 88, finishing: 83, keeping: 78, form: 2 } },
  { id: 'new', name: 'Newcastle United',  shortName: 'Newcastle', abbr: 'NEW', leagueId: 'epl', country: 'England',
    primary: '#241F20', secondary: '#FFFFFF', accent: '#00BFFF', emblemKey: 'new',
    ratings: { attack: 78, defense: 80, midfield: 78, pace: 82, finishing: 78, keeping: 80, form: 1 } },
  { id: 'whu', name: 'West Ham United',   shortName: 'West Ham',  abbr: 'WHU', leagueId: 'epl', country: 'England',
    primary: '#7A263A', secondary: '#1BB1E7', accent: '#F3D459', emblemKey: 'whu',
    ratings: { attack: 75, defense: 73, midfield: 74, pace: 76, finishing: 75, keeping: 75, form: -1 } },

  // --- La Liga ---
  { id: 'rma', name: 'Real Madrid',       shortName: 'Real Madrid', abbr: 'RMA', leagueId: 'laliga', country: 'Spain',
    primary: '#FEBE10', secondary: '#FFFFFF', accent: '#00529F', emblemKey: 'rma',
    ratings: { attack: 93, defense: 88, midfield: 90, pace: 88, finishing: 92, keeping: 88, form: 6 } },
  { id: 'bar', name: 'FC Barcelona',      shortName: 'Barcelona',   abbr: 'BAR', leagueId: 'laliga', country: 'Spain',
    primary: '#A50044', secondary: '#004D98', accent: '#FFED02', emblemKey: 'bar',
    ratings: { attack: 90, defense: 84, midfield: 91, pace: 85, finishing: 88, keeping: 84, form: 4 } },
  { id: 'atm', name: 'Atlético Madrid',   shortName: 'Atlético',    abbr: 'ATM', leagueId: 'laliga', country: 'Spain',
    primary: '#CE3524', secondary: '#FFFFFF', accent: '#272E61', emblemKey: 'atm',
    ratings: { attack: 83, defense: 86, midfield: 82, pace: 80, finishing: 81, keeping: 85, form: 2 } },
  { id: 'sev', name: 'Sevilla FC',        shortName: 'Sevilla',     abbr: 'SEV', leagueId: 'laliga', country: 'Spain',
    primary: '#D81E05', secondary: '#FFFFFF', accent: '#B58840', emblemKey: 'sev',
    ratings: { attack: 76, defense: 75, midfield: 76, pace: 75, finishing: 74, keeping: 76, form: -1 } },
  { id: 'val', name: 'Valencia CF',       shortName: 'Valencia',    abbr: 'VAL', leagueId: 'laliga', country: 'Spain',
    primary: '#EE3524', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'val',
    ratings: { attack: 73, defense: 72, midfield: 73, pace: 74, finishing: 72, keeping: 73, form: 0 } },
  { id: 'rso', name: 'Real Sociedad',     shortName: 'Sociedad',    abbr: 'RSO', leagueId: 'laliga', country: 'Spain',
    primary: '#0067B1', secondary: '#FFFFFF', accent: '#FFD602', emblemKey: 'rso',
    ratings: { attack: 76, defense: 77, midfield: 78, pace: 75, finishing: 75, keeping: 76, form: 1 } },

  // --- Bundesliga ---
  { id: 'bay', name: 'Bayern Munich',     shortName: 'Bayern',      abbr: 'BAY', leagueId: 'bunds', country: 'Germany',
    primary: '#DC052D', secondary: '#FFFFFF', accent: '#0066B2', emblemKey: 'bay',
    ratings: { attack: 91, defense: 87, midfield: 89, pace: 86, finishing: 90, keeping: 88, form: 5 } },
  { id: 'bvb', name: 'Borussia Dortmund', shortName: 'Dortmund',    abbr: 'BVB', leagueId: 'bunds', country: 'Germany',
    primary: '#FDE100', secondary: '#000000', accent: '#FFFFFF', emblemKey: 'bvb',
    ratings: { attack: 85, defense: 78, midfield: 82, pace: 87, finishing: 84, keeping: 80, form: 2 } },
  { id: 'rbl', name: 'RB Leipzig',        shortName: 'Leipzig',     abbr: 'RBL', leagueId: 'bunds', country: 'Germany',
    primary: '#DD0741', secondary: '#FFFFFF', accent: '#001F47', emblemKey: 'rbl',
    ratings: { attack: 82, defense: 80, midfield: 81, pace: 85, finishing: 81, keeping: 80, form: 2 } },
  { id: 'lev', name: 'Bayer Leverkusen',  shortName: 'Leverkusen',  abbr: 'LEV', leagueId: 'bunds', country: 'Germany',
    primary: '#E32221', secondary: '#000000', accent: '#FFFFFF', emblemKey: 'lev',
    ratings: { attack: 86, defense: 83, midfield: 85, pace: 85, finishing: 84, keeping: 82, form: 4 } },
  { id: 'sge', name: 'Eintracht Frankfurt', shortName: 'Frankfurt', abbr: 'SGE', leagueId: 'bunds', country: 'Germany',
    primary: '#000000', secondary: '#FFFFFF', accent: '#E1000F', emblemKey: 'sge',
    ratings: { attack: 76, defense: 75, midfield: 76, pace: 76, finishing: 75, keeping: 75, form: 0 } },

  // --- Serie A ---
  { id: 'juv', name: 'Juventus',          shortName: 'Juventus',    abbr: 'JUV', leagueId: 'seriea', country: 'Italy',
    primary: '#000000', secondary: '#FFFFFF', accent: '#FFD700', emblemKey: 'juv',
    ratings: { attack: 83, defense: 84, midfield: 82, pace: 79, finishing: 82, keeping: 85, form: 1 } },
  { id: 'mil', name: 'AC Milan',          shortName: 'Milan',       abbr: 'MIL', leagueId: 'seriea', country: 'Italy',
    primary: '#FB090B', secondary: '#000000', accent: '#FFFFFF', emblemKey: 'mil',
    ratings: { attack: 84, defense: 81, midfield: 82, pace: 83, finishing: 83, keeping: 82, form: 3 } },
  { id: 'int', name: 'Internazionale',    shortName: 'Inter',       abbr: 'INT', leagueId: 'seriea', country: 'Italy',
    primary: '#010E80', secondary: '#000000', accent: '#FFFFFF', emblemKey: 'int',
    ratings: { attack: 87, defense: 86, midfield: 85, pace: 82, finishing: 86, keeping: 86, form: 4 } },
  { id: 'rom', name: 'AS Roma',           shortName: 'Roma',        abbr: 'ROM', leagueId: 'seriea', country: 'Italy',
    primary: '#8E1F2F', secondary: '#F0BC42', accent: '#FFFFFF', emblemKey: 'rom',
    ratings: { attack: 79, defense: 78, midfield: 78, pace: 78, finishing: 78, keeping: 78, form: 0 } },
  { id: 'nap', name: 'SSC Napoli',        shortName: 'Napoli',      abbr: 'NAP', leagueId: 'seriea', country: 'Italy',
    primary: '#12A0DF', secondary: '#FFFFFF', accent: '#003B82', emblemKey: 'nap',
    ratings: { attack: 85, defense: 80, midfield: 84, pace: 86, finishing: 84, keeping: 80, form: 3 } },
  { id: 'laz', name: 'SS Lazio',          shortName: 'Lazio',       abbr: 'LAZ', leagueId: 'seriea', country: 'Italy',
    primary: '#87D8F7', secondary: '#FFFFFF', accent: '#003366', emblemKey: 'laz',
    ratings: { attack: 78, defense: 77, midfield: 79, pace: 77, finishing: 78, keeping: 78, form: 1 } },

  // --- Ligue 1 ---
  { id: 'psg', name: 'Paris Saint-Germain', shortName: 'PSG',       abbr: 'PSG', leagueId: 'ligue1', country: 'France',
    primary: '#004170', secondary: '#DA291C', accent: '#FFFFFF', emblemKey: 'psg',
    ratings: { attack: 89, defense: 82, midfield: 86, pace: 88, finishing: 88, keeping: 83, form: 4 } },
  { id: 'mar', name: 'Olympique Marseille', shortName: 'Marseille', abbr: 'OM',  leagueId: 'ligue1', country: 'France',
    primary: '#2FAEE0', secondary: '#FFFFFF', accent: '#003F87', emblemKey: 'mar',
    ratings: { attack: 79, defense: 76, midfield: 78, pace: 80, finishing: 78, keeping: 77, form: 1 } },
  { id: 'lyo', name: 'Olympique Lyonnais',  shortName: 'Lyon',      abbr: 'OL',  leagueId: 'ligue1', country: 'France',
    primary: '#003366', secondary: '#FFFFFF', accent: '#DA291C', emblemKey: 'lyo',
    ratings: { attack: 77, defense: 75, midfield: 76, pace: 79, finishing: 77, keeping: 75, form: 0 } },
  { id: 'mon', name: 'AS Monaco',           shortName: 'Monaco',    abbr: 'ASM', leagueId: 'ligue1', country: 'France',
    primary: '#CE1126', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'mon',
    ratings: { attack: 80, defense: 77, midfield: 79, pace: 82, finishing: 79, keeping: 77, form: 2 } },
  { id: 'lil', name: 'Lille OSC',           shortName: 'Lille',     abbr: 'LIL', leagueId: 'ligue1', country: 'France',
    primary: '#E01E12', secondary: '#FFFFFF', accent: '#003F87', emblemKey: 'lil',
    ratings: { attack: 76, defense: 78, midfield: 77, pace: 78, finishing: 76, keeping: 77, form: 1 } },

  // --- NBA (Basketball) ---
  { id: 'lal', name: 'Los Angeles Lakers',  shortName: 'Lakers',    abbr: 'LAL', leagueId: 'nba', country: 'USA',
    primary: '#552583', secondary: '#FDB927', accent: '#FFFFFF', emblemKey: 'lal',
    ratings: { attack: 88, defense: 80, midfield: 84, pace: 86, finishing: 88, keeping: 82, form: 2 } },
  { id: 'bos', name: 'Boston Celtics',      shortName: 'Celtics',   abbr: 'BOS', leagueId: 'nba', country: 'USA',
    primary: '#007A33', secondary: '#FFFFFF', accent: '#BA9653', emblemKey: 'bos',
    ratings: { attack: 88, defense: 85, midfield: 86, pace: 84, finishing: 86, keeping: 85, form: 4 } },
  { id: 'gsw', name: 'Golden State Warriors', shortName: 'Warriors', abbr: 'GSW', leagueId: 'nba', country: 'USA',
    primary: '#1D428A', secondary: '#FFC72C', accent: '#FFFFFF', emblemKey: 'gsw',
    ratings: { attack: 90, defense: 78, midfield: 88, pace: 88, finishing: 92, keeping: 76, form: 3 } },
  { id: 'chi', name: 'Chicago Bulls',       shortName: 'Bulls',     abbr: 'CHI', leagueId: 'nba', country: 'USA',
    primary: '#CE1141', secondary: '#000000', accent: '#FFFFFF', emblemKey: 'chi',
    ratings: { attack: 78, defense: 75, midfield: 76, pace: 77, finishing: 77, keeping: 74, form: 0 } },
  { id: 'mia', name: 'Miami Heat',          shortName: 'Heat',      abbr: 'MIA', leagueId: 'nba', country: 'USA',
    primary: '#98002E', secondary: '#000000', accent: '#F9A01B', emblemKey: 'mia',
    ratings: { attack: 80, defense: 82, midfield: 81, pace: 80, finishing: 80, keeping: 82, form: 1 } },
  { id: 'den', name: 'Denver Nuggets',      shortName: 'Nuggets',   abbr: 'DEN', leagueId: 'nba', country: 'USA',
    primary: '#0E2240', secondary: '#FEC524', accent: '#8B2131', emblemKey: 'den',
    ratings: { attack: 86, defense: 84, midfield: 85, pace: 82, finishing: 86, keeping: 84, form: 5 } },
  { id: 'phi', name: 'Philadelphia 76ers',  shortName: '76ers',     abbr: 'PHI', leagueId: 'nba', country: 'USA',
    primary: '#006BB6', secondary: '#ED174C', accent: '#FFFFFF', emblemKey: 'phi',
    ratings: { attack: 84, defense: 82, midfield: 82, pace: 81, finishing: 85, keeping: 80, form: 2 } },
  { id: 'mil', name: 'Milwaukee Bucks',     shortName: 'Bucks',     abbr: 'MIL_BB', leagueId: 'nba', country: 'USA',
    primary: '#00471B', secondary: '#EEE1C6', accent: '#0077C0', emblemKey: 'mil_bb',
    ratings: { attack: 87, defense: 82, midfield: 84, pace: 83, finishing: 88, keeping: 82, form: 3 } },

  // --- NHL (Hockey) ---
  { id: 'tor', name: 'Toronto Maple Leafs', shortName: 'Maple Leafs', abbr: 'TOR', leagueId: 'nhl', country: 'Canada',
    primary: '#00205B', secondary: '#FFFFFF', accent: '#C8102E', emblemKey: 'tor',
    ratings: { attack: 84, defense: 78, midfield: 82, pace: 86, finishing: 84, keeping: 80, form: 2 } },
  { id: 'pit', name: 'Pittsburgh Penguins', shortName: 'Penguins',  abbr: 'PIT', leagueId: 'nhl', country: 'USA',
    primary: '#000000', secondary: '#FCB514', accent: '#CFC493', emblemKey: 'pit',
    ratings: { attack: 82, defense: 79, midfield: 81, pace: 83, finishing: 82, keeping: 81, form: 1 } },
  { id: 'nyr', name: 'New York Rangers',    shortName: 'Rangers',   abbr: 'NYR', leagueId: 'nhl', country: 'USA',
    primary: '#0033A0', secondary: '#FFFFFF', accent: '#CE1126', emblemKey: 'nyr',
    ratings: { attack: 83, defense: 84, midfield: 82, pace: 81, finishing: 82, keeping: 86, form: 3 } },
  { id: 'col', name: 'Colorado Avalanche',  shortName: 'Avalanche', abbr: 'COL', leagueId: 'nhl', country: 'USA',
    primary: '#6F263D', secondary: '#236192', accent: '#A2AAAD', emblemKey: 'col',
    ratings: { attack: 88, defense: 82, midfield: 86, pace: 85, finishing: 87, keeping: 84, form: 4 } },
  { id: 'tbl', name: 'Tampa Bay Lightning', shortName: 'Lightning', abbr: 'TBL', leagueId: 'nhl', country: 'USA',
    primary: '#002868', secondary: '#FFFFFF', accent: '#FFB81C', emblemKey: 'tbl',
    ratings: { attack: 86, defense: 82, midfield: 85, pace: 84, finishing: 86, keeping: 85, form: 3 } },
  { id: 'bru', name: 'Boston Bruins',       shortName: 'Bruins',    abbr: 'BOS_NHL', leagueId: 'nhl', country: 'USA',
    primary: '#000000', secondary: '#FFB81C', accent: '#FFFFFF', emblemKey: 'bru',
    ratings: { attack: 84, defense: 86, midfield: 84, pace: 80, finishing: 83, keeping: 86, form: 3 } },
];

export const TEAMS_BY_ID = TEAMS.reduce<Record<string, Team>>((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {});

export function getTeam(id: string): Team | undefined {
  return TEAMS_BY_ID[id];
}

export function teamsByLeague(leagueId: string): Team[] {
  return TEAMS.filter(t => t.leagueId === leagueId);
}

// Composite "strength" used by the odds engine.
export function teamStrength(t: Team): number {
  const r = t.ratings;
  const core = (r.attack * 1.2 + r.defense * 1.15 + r.midfield + r.pace * 0.7 + r.finishing * 0.9 + r.keeping * 0.85) / 5.8;
  return core + r.form * 0.6;
}
