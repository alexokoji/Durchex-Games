import type { Team } from './types';
export { getPersonality } from './teamPersonalities';

// Terse constructor for the long tail of teams. Hand-crafted top clubs above
// keep their full verbose entries (more readable for the marquee names); the
// rest of each league is filled out below via `t(...)` for compactness.
interface MkTeamArgs {
  id: string; name: string; abbr: string; leagueId: string; country: string;
  short?: string;
  p?: string; s?: string; a?: string;             // primary/secondary/accent
  atk?: number; def?: number; mid?: number;       // attacking / defensive / midfield
  pac?: number; fin?: number; kee?: number;       // pace / finishing / keeping
  form?: number;
}
function mk(args: MkTeamArgs): Team {
  return {
    id: args.id,
    name: args.name,
    shortName: args.short ?? args.name,
    abbr: args.abbr,
    leagueId: args.leagueId,
    country: args.country,
    primary:   args.p ?? '#444444',
    secondary: args.s ?? '#FFFFFF',
    accent:    args.a ?? '#000000',
    emblemKey: 'procedural',
    ratings: {
      attack:    args.atk  ?? 71,
      defense:   args.def  ?? 71,
      midfield:  args.mid  ?? 71,
      pace:      args.pac  ?? 72,
      finishing: args.fin  ?? 70,
      keeping:   args.kee  ?? 71,
      form:      args.form ?? 0,
    },
  };
}

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

  // --- Eredivisie (Netherlands) ---
  { id: 'aja', name: 'Ajax',               shortName: 'Ajax',        abbr: 'AJA', leagueId: 'eredivisie', country: 'Netherlands',
    primary: '#D2122E', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 84, defense: 79, midfield: 83, pace: 84, finishing: 83, keeping: 80, form: 3 } },
  { id: 'psv', name: 'PSV Eindhoven',      shortName: 'PSV',         abbr: 'PSV', leagueId: 'eredivisie', country: 'Netherlands',
    primary: '#ED1C24', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 83, defense: 78, midfield: 81, pace: 83, finishing: 82, keeping: 79, form: 4 } },
  { id: 'fey', name: 'Feyenoord',          shortName: 'Feyenoord',   abbr: 'FEY', leagueId: 'eredivisie', country: 'Netherlands',
    primary: '#CC0000', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 80, defense: 78, midfield: 79, pace: 80, finishing: 79, keeping: 78, form: 2 } },
  { id: 'azk', name: 'AZ Alkmaar',         shortName: 'AZ',          abbr: 'AZ',  leagueId: 'eredivisie', country: 'Netherlands',
    primary: '#E20613', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 76, defense: 75, midfield: 76, pace: 77, finishing: 75, keeping: 75, form: 1 } },
  { id: 'utr', name: 'FC Utrecht',         shortName: 'Utrecht',     abbr: 'UTR', leagueId: 'eredivisie', country: 'Netherlands',
    primary: '#E20613', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 73, defense: 73, midfield: 73, pace: 74, finishing: 72, keeping: 73, form: 0 } },
  { id: 'twe', name: 'FC Twente',          shortName: 'Twente',      abbr: 'TWE', leagueId: 'eredivisie', country: 'Netherlands',
    primary: '#DC0814', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 74, defense: 75, midfield: 74, pace: 75, finishing: 73, keeping: 75, form: 1 } },

  // --- Liga Portugal ---
  { id: 'ben', name: 'SL Benfica',         shortName: 'Benfica',     abbr: 'BEN', leagueId: 'liganos', country: 'Portugal',
    primary: '#E50019', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 85, defense: 81, midfield: 83, pace: 84, finishing: 84, keeping: 82, form: 4 } },
  { id: 'por', name: 'FC Porto',           shortName: 'Porto',       abbr: 'POR', leagueId: 'liganos', country: 'Portugal',
    primary: '#003DA5', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 84, defense: 82, midfield: 82, pace: 83, finishing: 83, keeping: 83, form: 3 } },
  { id: 'spr', name: 'Sporting CP',        shortName: 'Sporting',    abbr: 'SCP', leagueId: 'liganos', country: 'Portugal',
    primary: '#008057', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 83, defense: 80, midfield: 82, pace: 82, finishing: 82, keeping: 80, form: 4 } },
  { id: 'bra', name: 'SC Braga',           shortName: 'Braga',       abbr: 'BRA', leagueId: 'liganos', country: 'Portugal',
    primary: '#A91D2A', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 76, defense: 75, midfield: 76, pace: 77, finishing: 75, keeping: 75, form: 1 } },
  { id: 'vit', name: 'Vitória SC',         shortName: 'Vitória',     abbr: 'VIT', leagueId: 'liganos', country: 'Portugal',
    primary: '#000000', secondary: '#FFFFFF', accent: '#FFFFFF', emblemKey: 'procedural',
    ratings: { attack: 72, defense: 72, midfield: 72, pace: 73, finishing: 71, keeping: 72, form: 0 } },

  // --- Süper Lig (Turkey) ---
  { id: 'gal', name: 'Galatasaray',        shortName: 'Galatasaray', abbr: 'GAL', leagueId: 'superlig', country: 'Turkey',
    primary: '#A90015', secondary: '#FFB400', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 84, defense: 80, midfield: 82, pace: 83, finishing: 83, keeping: 81, form: 4 } },
  { id: 'fen', name: 'Fenerbahçe',         shortName: 'Fenerbahçe',  abbr: 'FEN', leagueId: 'superlig', country: 'Turkey',
    primary: '#FFED00', secondary: '#003F87', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 83, defense: 79, midfield: 81, pace: 82, finishing: 82, keeping: 81, form: 3 } },
  { id: 'bjk', name: 'Beşiktaş',           shortName: 'Beşiktaş',    abbr: 'BJK', leagueId: 'superlig', country: 'Turkey',
    primary: '#000000', secondary: '#FFFFFF', accent: '#FFFFFF', emblemKey: 'procedural',
    ratings: { attack: 80, defense: 78, midfield: 79, pace: 80, finishing: 79, keeping: 78, form: 2 } },
  { id: 'trb', name: 'Trabzonspor',        shortName: 'Trabzon',     abbr: 'TRB', leagueId: 'superlig', country: 'Turkey',
    primary: '#7C0019', secondary: '#80BFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 77, defense: 76, midfield: 76, pace: 77, finishing: 76, keeping: 76, form: 1 } },
  { id: 'baş', name: 'İstanbul Başakşehir', shortName: 'Başakşehir', abbr: 'BAŞ', leagueId: 'superlig', country: 'Turkey',
    primary: '#F58220', secondary: '#003F87', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 74, defense: 74, midfield: 74, pace: 75, finishing: 74, keeping: 75, form: 0 } },

  // --- Championship (England Tier 2) ---
  { id: 'lds', name: 'Leeds United',       shortName: 'Leeds',       abbr: 'LDS', leagueId: 'efl', country: 'England',
    primary: '#FFCD00', secondary: '#1D428A', accent: '#FFFFFF', emblemKey: 'procedural',
    ratings: { attack: 78, defense: 74, midfield: 76, pace: 80, finishing: 77, keeping: 75, form: 3 } },
  { id: 'sou', name: 'Southampton',        shortName: 'Saints',      abbr: 'SOU', leagueId: 'efl', country: 'England',
    primary: '#D71920', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 75, defense: 73, midfield: 75, pace: 77, finishing: 74, keeping: 74, form: 2 } },
  { id: 'wba', name: 'West Bromwich Albion', shortName: 'WBA',        abbr: 'WBA', leagueId: 'efl', country: 'England',
    primary: '#122F67', secondary: '#FFFFFF', accent: '#FFFFFF', emblemKey: 'procedural',
    ratings: { attack: 73, defense: 73, midfield: 73, pace: 74, finishing: 72, keeping: 73, form: 1 } },
  { id: 'mid', name: 'Middlesbrough',      shortName: 'Boro',        abbr: 'MID', leagueId: 'efl', country: 'England',
    primary: '#E10024', secondary: '#FFFFFF', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 73, defense: 72, midfield: 72, pace: 74, finishing: 72, keeping: 72, form: 0 } },
  { id: 'shu', name: 'Sheffield United',   shortName: 'Sheff Utd',   abbr: 'SHU', leagueId: 'efl', country: 'England',
    primary: '#EC2227', secondary: '#000000', accent: '#FFFFFF', emblemKey: 'procedural',
    ratings: { attack: 74, defense: 75, midfield: 73, pace: 75, finishing: 73, keeping: 74, form: 1 } },
  { id: 'nor', name: 'Norwich City',       shortName: 'Norwich',     abbr: 'NOR', leagueId: 'efl', country: 'England',
    primary: '#FFF200', secondary: '#00A650', accent: '#000000', emblemKey: 'procedural',
    ratings: { attack: 72, defense: 71, midfield: 72, pace: 73, finishing: 71, keeping: 71, form: 0 } },

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
  { id: 'mil_bb', name: 'Milwaukee Bucks',  shortName: 'Bucks',     abbr: 'MIL', leagueId: 'nba', country: 'USA',
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

  // ──────────────────────────────────────────────────────────────────────
  // Full-league expansion. Procedural emblems; ratings tuned to plausible
  // mid-table strength unless the team is a known top-flight regular.
  // ──────────────────────────────────────────────────────────────────────

  // EPL fill (top 20)
  mk({ id: 'avl', name: 'Aston Villa',          short: 'Villa',       abbr: 'AVL', leagueId: 'epl', country: 'England', p: '#670E36', s: '#95BFE5', a: '#FFFFFF', atk: 80, def: 78, mid: 80, pac: 80, fin: 79, kee: 78, form: 3 }),
  mk({ id: 'bri', name: 'Brighton & Hove Albion', short: 'Brighton',  abbr: 'BRI', leagueId: 'epl', country: 'England', p: '#0057B8', s: '#FFCD00', a: '#FFFFFF', atk: 76, def: 74, mid: 78, pac: 79, fin: 75, kee: 75, form: 2 }),
  mk({ id: 'cry', name: 'Crystal Palace',       short: 'Palace',      abbr: 'CRY', leagueId: 'epl', country: 'England', p: '#1B458F', s: '#C4122E', a: '#FFFFFF', atk: 73, def: 73, mid: 72, pac: 76, fin: 72, kee: 73, form: 0 }),
  mk({ id: 'eve', name: 'Everton',              short: 'Everton',     abbr: 'EVE', leagueId: 'epl', country: 'England', p: '#003399', s: '#FFFFFF', a: '#000000', atk: 70, def: 72, mid: 71, pac: 72, fin: 70, kee: 73, form: -1 }),
  mk({ id: 'ful', name: 'Fulham',               short: 'Fulham',      abbr: 'FUL', leagueId: 'epl', country: 'England', p: '#FFFFFF', s: '#000000', a: '#CC0000', atk: 73, def: 72, mid: 72, pac: 74, fin: 72, kee: 72 }),
  mk({ id: 'wol', name: 'Wolverhampton',        short: 'Wolves',      abbr: 'WOL', leagueId: 'epl', country: 'England', p: '#FDB913', s: '#231F20', a: '#FFFFFF', atk: 72, def: 73, mid: 71, pac: 75, fin: 71, kee: 72 }),
  mk({ id: 'bou', name: 'AFC Bournemouth',      short: 'Bournemouth', abbr: 'BOU', leagueId: 'epl', country: 'England', p: '#DA291C', s: '#000000', a: '#FFFFFF', atk: 72, def: 70, mid: 71, pac: 76, fin: 72, kee: 70, form: 1 }),
  mk({ id: 'bre', name: 'Brentford',            short: 'Brentford',   abbr: 'BRE', leagueId: 'epl', country: 'England', p: '#E30613', s: '#FFFFFF', a: '#FBB800', atk: 74, def: 73, mid: 73, pac: 75, fin: 73, kee: 72 }),
  mk({ id: 'not', name: 'Nottingham Forest',    short: 'Forest',      abbr: 'NOT', leagueId: 'epl', country: 'England', p: '#DD0000', s: '#FFFFFF', a: '#000000', atk: 72, def: 71, mid: 70, pac: 73, fin: 72, kee: 71 }),
  mk({ id: 'bur', name: 'Burnley',              short: 'Burnley',     abbr: 'BUR', leagueId: 'epl', country: 'England', p: '#6C1D45', s: '#99D6EA', a: '#FFFFFF', atk: 68, def: 70, mid: 68, pac: 70, fin: 67, kee: 70, form: -2 }),
  mk({ id: 'lei', name: 'Leicester City',       short: 'Leicester',   abbr: 'LEI', leagueId: 'epl', country: 'England', p: '#003090', s: '#FDBE11', a: '#FFFFFF', atk: 73, def: 71, mid: 72, pac: 74, fin: 72, kee: 72 }),
  mk({ id: 'ips', name: 'Ipswich Town',         short: 'Ipswich',     abbr: 'IPS', leagueId: 'epl', country: 'England', p: '#0F4D92', s: '#FFFFFF', a: '#E03A3E', atk: 69, def: 69, mid: 68, pac: 71, fin: 68, kee: 68, form: -1 }),

  // La Liga fill (top 20)
  mk({ id: 'ath', name: 'Athletic Club',        short: 'Athletic',    abbr: 'ATH', leagueId: 'laliga', country: 'Spain', p: '#EE2523', s: '#FFFFFF', a: '#000000', atk: 79, def: 79, mid: 79, pac: 78, fin: 78, kee: 79, form: 2 }),
  mk({ id: 'bet', name: 'Real Betis',           short: 'Betis',       abbr: 'BET', leagueId: 'laliga', country: 'Spain', p: '#0BB363', s: '#FFFFFF', a: '#000000', atk: 76, def: 75, mid: 77, pac: 76, fin: 76, kee: 75, form: 1 }),
  mk({ id: 'vil', name: 'Villarreal CF',        short: 'Villarreal',  abbr: 'VIL', leagueId: 'laliga', country: 'Spain', p: '#FFE667', s: '#005CB9', a: '#000000', atk: 78, def: 76, mid: 78, pac: 76, fin: 77, kee: 76 }),
  mk({ id: 'cel', name: 'Celta Vigo',           short: 'Celta',       abbr: 'CEL', leagueId: 'laliga', country: 'Spain', p: '#8AC3EE', s: '#FFFFFF', a: '#CC0000', atk: 73, def: 72, mid: 72, pac: 75, fin: 73, kee: 72 }),
  mk({ id: 'osa', name: 'CA Osasuna',           short: 'Osasuna',     abbr: 'OSA', leagueId: 'laliga', country: 'Spain', p: '#D91A21', s: '#1A2A4F', a: '#FFFFFF', atk: 71, def: 73, mid: 71, pac: 73, fin: 70, kee: 72 }),
  mk({ id: 'mll', name: 'RCD Mallorca',         short: 'Mallorca',    abbr: 'MLL', leagueId: 'laliga', country: 'Spain', p: '#CB1F2C', s: '#000000', a: '#FFD700', atk: 70, def: 72, mid: 71, pac: 71, fin: 70, kee: 72 }),
  mk({ id: 'lpa', name: 'UD Las Palmas',        short: 'Las Palmas',  abbr: 'LPA', leagueId: 'laliga', country: 'Spain', p: '#FFE100', s: '#005EB8', a: '#FFFFFF', atk: 70, def: 70, mid: 70, pac: 72, fin: 70, kee: 70 }),
  mk({ id: 'gtf', name: 'Getafe CF',            short: 'Getafe',      abbr: 'GTF', leagueId: 'laliga', country: 'Spain', p: '#005AC3', s: '#FFFFFF', a: '#000000', atk: 69, def: 72, mid: 70, pac: 71, fin: 69, kee: 71 }),
  mk({ id: 'gra', name: 'Granada CF',           short: 'Granada',     abbr: 'GRA', leagueId: 'laliga', country: 'Spain', p: '#C8102E', s: '#FFFFFF', a: '#000000', atk: 69, def: 69, mid: 69, pac: 70, fin: 68, kee: 70 }),
  mk({ id: 'alm', name: 'UD Almería',           short: 'Almería',     abbr: 'ALM', leagueId: 'laliga', country: 'Spain', p: '#E30613', s: '#FFFFFF', a: '#000000', atk: 68, def: 68, mid: 68, pac: 69, fin: 68, kee: 68 }),
  mk({ id: 'gir', name: 'Girona FC',            short: 'Girona',      abbr: 'GIR', leagueId: 'laliga', country: 'Spain', p: '#CB0F1E', s: '#FFFFFF', a: '#FFCC00', atk: 76, def: 73, mid: 75, pac: 76, fin: 75, kee: 73, form: 3 }),
  mk({ id: 'ray', name: 'Rayo Vallecano',       short: 'Rayo',        abbr: 'RAY', leagueId: 'laliga', country: 'Spain', p: '#FFFFFF', s: '#E20E0E', a: '#000000', atk: 71, def: 70, mid: 70, pac: 73, fin: 70, kee: 70 }),
  mk({ id: 'ale', name: 'Deportivo Alavés',     short: 'Alavés',      abbr: 'ALE', leagueId: 'laliga', country: 'Spain', p: '#003DA5', s: '#FFFFFF', a: '#000000', atk: 70, def: 71, mid: 70, pac: 71, fin: 69, kee: 71 }),
  mk({ id: 'cad', name: 'Cádiz CF',             short: 'Cádiz',       abbr: 'CAD', leagueId: 'laliga', country: 'Spain', p: '#FFE600', s: '#005CB9', a: '#000000', atk: 67, def: 70, mid: 68, pac: 69, fin: 67, kee: 70 }),

  // Bundesliga fill (18)
  mk({ id: 'wob', name: 'VfL Wolfsburg',        short: 'Wolfsburg',   abbr: 'WOB', leagueId: 'bunds', country: 'Germany', p: '#65B32E', s: '#FFFFFF', a: '#000000', atk: 75, def: 74, mid: 75, pac: 76, fin: 74, kee: 75 }),
  mk({ id: 'stu', name: 'VfB Stuttgart',        short: 'Stuttgart',   abbr: 'STU', leagueId: 'bunds', country: 'Germany', p: '#E32219', s: '#FFFFFF', a: '#000000', atk: 78, def: 76, mid: 77, pac: 78, fin: 77, kee: 76, form: 2 }),
  mk({ id: 'wer', name: 'SV Werder Bremen',     short: 'Werder',      abbr: 'WER', leagueId: 'bunds', country: 'Germany', p: '#008F37', s: '#FFFFFF', a: '#000000', atk: 73, def: 73, mid: 73, pac: 74, fin: 73, kee: 73 }),
  mk({ id: 'hof', name: 'TSG Hoffenheim',       short: 'Hoffenheim',  abbr: 'HOF', leagueId: 'bunds', country: 'Germany', p: '#1961AD', s: '#FFFFFF', a: '#000000', atk: 74, def: 73, mid: 74, pac: 74, fin: 74, kee: 73 }),
  mk({ id: 'mgb', name: 'Borussia M’gladbach', short: 'M’gladbach', abbr: 'BMG', leagueId: 'bunds', country: 'Germany', p: '#FFFFFF', s: '#000000', a: '#00B140', atk: 74, def: 72, mid: 73, pac: 75, fin: 73, kee: 73 }),
  mk({ id: 'koe', name: '1. FC Köln',           short: 'Köln',        abbr: 'KOE', leagueId: 'bunds', country: 'Germany', p: '#E1000F', s: '#FFFFFF', a: '#000000', atk: 71, def: 71, mid: 71, pac: 72, fin: 71, kee: 71 }),
  mk({ id: 'mai', name: '1. FSV Mainz 05',      short: 'Mainz',       abbr: 'MAI', leagueId: 'bunds', country: 'Germany', p: '#C5011E', s: '#FFFFFF', a: '#FFEB00', atk: 71, def: 72, mid: 71, pac: 72, fin: 70, kee: 72 }),
  mk({ id: 'fre', name: 'SC Freiburg',          short: 'Freiburg',    abbr: 'FRE', leagueId: 'bunds', country: 'Germany', p: '#D72C2C', s: '#FFFFFF', a: '#000000', atk: 75, def: 75, mid: 75, pac: 75, fin: 74, kee: 75, form: 1 }),
  mk({ id: 'aug', name: 'FC Augsburg',          short: 'Augsburg',    abbr: 'AUG', leagueId: 'bunds', country: 'Germany', p: '#BA3733', s: '#005CA9', a: '#FFFFFF', atk: 70, def: 71, mid: 70, pac: 71, fin: 70, kee: 71 }),
  mk({ id: 'uni', name: 'Union Berlin',         short: 'Union',       abbr: 'UNI', leagueId: 'bunds', country: 'Germany', p: '#EB1923', s: '#FFE001', a: '#FFFFFF', atk: 73, def: 75, mid: 73, pac: 73, fin: 72, kee: 75 }),
  mk({ id: 'boc', name: 'VfL Bochum',           short: 'Bochum',      abbr: 'BOC', leagueId: 'bunds', country: 'Germany', p: '#005CA9', s: '#FFFFFF', a: '#000000', atk: 68, def: 70, mid: 69, pac: 70, fin: 68, kee: 70 }),
  mk({ id: 'hei', name: '1. FC Heidenheim',     short: 'Heidenheim',  abbr: 'HEI', leagueId: 'bunds', country: 'Germany', p: '#E1000F', s: '#0F4D92', a: '#FFFFFF', atk: 69, def: 70, mid: 69, pac: 70, fin: 69, kee: 70 }),
  mk({ id: 'dar', name: 'SV Darmstadt 98',      short: 'Darmstadt',   abbr: 'DAR', leagueId: 'bunds', country: 'Germany', p: '#1B449C', s: '#FFFFFF', a: '#000000', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68, form: -1 }),

  // Serie A fill (20)
  mk({ id: 'ata', name: 'Atalanta BC',          short: 'Atalanta',    abbr: 'ATA', leagueId: 'seriea', country: 'Italy', p: '#1E71B8', s: '#000000', a: '#FFFFFF', atk: 82, def: 78, mid: 80, pac: 81, fin: 82, kee: 78, form: 3 }),
  mk({ id: 'fio', name: 'Fiorentina',           short: 'Viola',       abbr: 'FIO', leagueId: 'seriea', country: 'Italy', p: '#592C82', s: '#FFFFFF', a: '#000000', atk: 76, def: 75, mid: 76, pac: 75, fin: 75, kee: 75, form: 1 }),
  mk({ id: 'trn', name: 'Torino FC',            short: 'Torino',      abbr: 'TRN', leagueId: 'seriea', country: 'Italy', p: '#881620', s: '#FFFFFF', a: '#000000', atk: 73, def: 75, mid: 73, pac: 73, fin: 73, kee: 75 }),
  mk({ id: 'sas', name: 'Sassuolo',             short: 'Sassuolo',    abbr: 'SAS', leagueId: 'seriea', country: 'Italy', p: '#00A651', s: '#000000', a: '#FFFFFF', atk: 72, def: 71, mid: 72, pac: 73, fin: 72, kee: 71 }),
  mk({ id: 'bol', name: 'Bologna FC',           short: 'Bologna',     abbr: 'BOL', leagueId: 'seriea', country: 'Italy', p: '#7A1E2C', s: '#001A4B', a: '#FFFFFF', atk: 76, def: 76, mid: 76, pac: 76, fin: 75, kee: 75, form: 2 }),
  mk({ id: 'gen', name: 'Genoa CFC',            short: 'Genoa',       abbr: 'GEN', leagueId: 'seriea', country: 'Italy', p: '#CC0000', s: '#000044', a: '#FFFFFF', atk: 71, def: 71, mid: 71, pac: 72, fin: 71, kee: 71 }),
  mk({ id: 'udi', name: 'Udinese Calcio',       short: 'Udinese',     abbr: 'UDI', leagueId: 'seriea', country: 'Italy', p: '#000000', s: '#FFFFFF', a: '#FBE001', atk: 71, def: 73, mid: 71, pac: 72, fin: 70, kee: 73 }),
  mk({ id: 'cag', name: 'Cagliari',             short: 'Cagliari',    abbr: 'CAG', leagueId: 'seriea', country: 'Italy', p: '#A2122F', s: '#10295C', a: '#FFFFFF', atk: 69, def: 71, mid: 70, pac: 70, fin: 69, kee: 71 }),
  mk({ id: 'ver', name: 'Hellas Verona',        short: 'Verona',      abbr: 'VER', leagueId: 'seriea', country: 'Italy', p: '#003B7A', s: '#FFCE08', a: '#FFFFFF', atk: 69, def: 70, mid: 69, pac: 70, fin: 68, kee: 70 }),
  mk({ id: 'emp', name: 'Empoli FC',            short: 'Empoli',      abbr: 'EMP', leagueId: 'seriea', country: 'Italy', p: '#005EB8', s: '#FFFFFF', a: '#000000', atk: 68, def: 70, mid: 69, pac: 70, fin: 68, kee: 70 }),
  mk({ id: 'mza', name: 'AC Monza',             short: 'Monza',       abbr: 'MZA', leagueId: 'seriea', country: 'Italy', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 70, def: 70, mid: 70, pac: 71, fin: 70, kee: 70 }),
  mk({ id: 'lec', name: 'US Lecce',             short: 'Lecce',       abbr: 'LEC', leagueId: 'seriea', country: 'Italy', p: '#FBE100', s: '#CC0000', a: '#000000', atk: 68, def: 69, mid: 68, pac: 70, fin: 67, kee: 69 }),
  mk({ id: 'sal', name: 'US Salernitana',       short: 'Salernitana', abbr: 'SAL', leagueId: 'seriea', country: 'Italy', p: '#5B2D8E', s: '#FFFFFF', a: '#000000', atk: 66, def: 68, mid: 66, pac: 68, fin: 65, kee: 68, form: -2 }),
  mk({ id: 'fro', name: 'Frosinone',            short: 'Frosinone',   abbr: 'FRO', leagueId: 'seriea', country: 'Italy', p: '#FFD500', s: '#0066B3', a: '#000000', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),

  // Ligue 1 fill (18)
  mk({ id: 'nic', name: 'OGC Nice',             short: 'Nice',        abbr: 'NIC', leagueId: 'ligue1', country: 'France', p: '#CC0000', s: '#000000', a: '#FFFFFF', atk: 75, def: 76, mid: 75, pac: 75, fin: 74, kee: 75, form: 1 }),
  mk({ id: 'ren', name: 'Stade Rennais',        short: 'Rennes',      abbr: 'REN', leagueId: 'ligue1', country: 'France', p: '#CC0000', s: '#000000', a: '#FFFFFF', atk: 76, def: 74, mid: 76, pac: 76, fin: 75, kee: 74 }),
  mk({ id: 'str', name: 'RC Strasbourg',        short: 'Strasbourg',  abbr: 'STR', leagueId: 'ligue1', country: 'France', p: '#0066CC', s: '#FFFFFF', a: '#CC0000', atk: 71, def: 71, mid: 71, pac: 72, fin: 70, kee: 71 }),
  mk({ id: 'nan', name: 'FC Nantes',            short: 'Nantes',      abbr: 'NAN', leagueId: 'ligue1', country: 'France', p: '#FFD500', s: '#005A2E', a: '#FFFFFF', atk: 71, def: 70, mid: 70, pac: 72, fin: 70, kee: 70 }),
  mk({ id: 'brt', name: 'Stade Brestois 29',    short: 'Brest',       abbr: 'BRT', leagueId: 'ligue1', country: 'France', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 73, def: 73, mid: 73, pac: 73, fin: 72, kee: 73, form: 2 }),
  mk({ id: 'rim', name: 'Stade de Reims',       short: 'Reims',       abbr: 'RIM', leagueId: 'ligue1', country: 'France', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 71, def: 71, mid: 71, pac: 72, fin: 70, kee: 71 }),
  mk({ id: 'tou', name: 'Toulouse FC',          short: 'Toulouse',    abbr: 'TOU', leagueId: 'ligue1', country: 'France', p: '#7B1FA2', s: '#FFFFFF', a: '#000000', atk: 70, def: 70, mid: 70, pac: 71, fin: 69, kee: 70 }),
  mk({ id: 'mtp', name: 'Montpellier HSC',      short: 'Montpellier', abbr: 'MTP', leagueId: 'ligue1', country: 'France', p: '#003C71', s: '#F58220', a: '#FFFFFF', atk: 70, def: 70, mid: 70, pac: 71, fin: 70, kee: 70 }),
  mk({ id: 'met', name: 'FC Metz',              short: 'Metz',        abbr: 'MET', leagueId: 'ligue1', country: 'France', p: '#702C84', s: '#FFFFFF', a: '#000000', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'hav', name: 'Le Havre AC',          short: 'Le Havre',    abbr: 'HAV', leagueId: 'ligue1', country: 'France', p: '#003DA5', s: '#FFFFFF', a: '#000000', atk: 67, def: 69, mid: 67, pac: 68, fin: 66, kee: 69 }),
  mk({ id: 'clr', name: 'Clermont Foot',        short: 'Clermont',    abbr: 'CLR', leagueId: 'ligue1', country: 'France', p: '#1B449C', s: '#CC0000', a: '#FFFFFF', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'len', name: 'RC Lens',              short: 'Lens',        abbr: 'LEN', leagueId: 'ligue1', country: 'France', p: '#FFD500', s: '#CC0000', a: '#000000', atk: 76, def: 75, mid: 75, pac: 76, fin: 75, kee: 75, form: 1 }),
  mk({ id: 'bor', name: 'FC Bordeaux',          short: 'Bordeaux',    abbr: 'BOR', leagueId: 'ligue1', country: 'France', p: '#000080', s: '#FFFFFF', a: '#000000', atk: 70, def: 71, mid: 70, pac: 71, fin: 69, kee: 71 }),

  // Eredivisie fill (18)
  mk({ id: 'nec', name: 'NEC Nijmegen',         short: 'NEC',         abbr: 'NEC', leagueId: 'eredivisie', country: 'Netherlands', p: '#CC0000', s: '#000000', a: '#FFFFFF', atk: 70, def: 70, mid: 70, pac: 71, fin: 70, kee: 70 }),
  mk({ id: 'spa', name: 'Sparta Rotterdam',     short: 'Sparta',      abbr: 'SPA', leagueId: 'eredivisie', country: 'Netherlands', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 69, def: 70, mid: 69, pac: 70, fin: 68, kee: 70 }),
  mk({ id: 'hee', name: 'SC Heerenveen',        short: 'Heerenveen',  abbr: 'HEE', leagueId: 'eredivisie', country: 'Netherlands', p: '#0066B3', s: '#FFFFFF', a: '#CC0000', atk: 70, def: 70, mid: 70, pac: 71, fin: 69, kee: 70 }),
  mk({ id: 'vts', name: 'Vitesse',              short: 'Vitesse',     abbr: 'VTS', leagueId: 'eredivisie', country: 'Netherlands', p: '#FFD500', s: '#000000', a: '#FFFFFF', atk: 69, def: 69, mid: 69, pac: 70, fin: 68, kee: 69 }),
  mk({ id: 'hrc', name: 'Heracles Almelo',      short: 'Heracles',    abbr: 'HRC', leagueId: 'eredivisie', country: 'Netherlands', p: '#000000', s: '#FFFFFF', a: '#FFFFFF', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'gae', name: 'Go Ahead Eagles',      short: 'GA Eagles',   abbr: 'GAE', leagueId: 'eredivisie', country: 'Netherlands', p: '#CC0000', s: '#FFD500', a: '#000000', atk: 68, def: 68, mid: 68, pac: 69, fin: 67, kee: 68 }),
  mk({ id: 'rkc', name: 'RKC Waalwijk',         short: 'Waalwijk',    abbr: 'RKC', leagueId: 'eredivisie', country: 'Netherlands', p: '#FFD500', s: '#0033A0', a: '#FFFFFF', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'pec', name: 'PEC Zwolle',           short: 'PEC',         abbr: 'PEC', leagueId: 'eredivisie', country: 'Netherlands', p: '#0033A0', s: '#FFFFFF', a: '#000000', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'exc', name: 'Excelsior',            short: 'Excelsior',   abbr: 'EXC', leagueId: 'eredivisie', country: 'Netherlands', p: '#CC0000', s: '#000000', a: '#FFFFFF', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'nac', name: 'NAC Breda',            short: 'NAC',         abbr: 'NAC', leagueId: 'eredivisie', country: 'Netherlands', p: '#FFD500', s: '#000000', a: '#FFFFFF', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'fsr', name: 'Fortuna Sittard',      short: 'Fortuna',     abbr: 'FSR', leagueId: 'eredivisie', country: 'Netherlands', p: '#FFD500', s: '#1B5E20', a: '#FFFFFF', atk: 65, def: 67, mid: 66, pac: 66, fin: 64, kee: 67 }),
  mk({ id: 'alc', name: 'Almere City',          short: 'Almere',      abbr: 'ALC', leagueId: 'eredivisie', country: 'Netherlands', p: '#000000', s: '#CC0000', a: '#FFFFFF', atk: 64, def: 66, mid: 65, pac: 65, fin: 63, kee: 66 }),

  // Liga Portugal fill (18)
  mk({ id: 'boa', name: 'Boavista FC',          short: 'Boavista',    abbr: 'BOA', leagueId: 'liganos', country: 'Portugal', p: '#000000', s: '#FFFFFF', a: '#FFFFFF', atk: 69, def: 70, mid: 69, pac: 70, fin: 68, kee: 70 }),
  mk({ id: 'esl', name: 'Estoril Praia',        short: 'Estoril',     abbr: 'ESL', leagueId: 'liganos', country: 'Portugal', p: '#FFD500', s: '#0033A0', a: '#FFFFFF', atk: 68, def: 69, mid: 68, pac: 69, fin: 67, kee: 69 }),
  mk({ id: 'fam', name: 'FC Famalicão',         short: 'Famalicão',   abbr: 'FAM', leagueId: 'liganos', country: 'Portugal', p: '#FFD500', s: '#1B5E20', a: '#FFFFFF', atk: 68, def: 69, mid: 68, pac: 69, fin: 67, kee: 69 }),
  mk({ id: 'gil', name: 'Gil Vicente FC',       short: 'Gil Vicente', abbr: 'GIL', leagueId: 'liganos', country: 'Portugal', p: '#CC0000', s: '#1B5E20', a: '#FFFFFF', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'cap', name: 'Casa Pia AC',          short: 'Casa Pia',    abbr: 'CAP', leagueId: 'liganos', country: 'Portugal', p: '#000000', s: '#FFFFFF', a: '#FFFFFF', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'cha', name: 'GD Chaves',            short: 'Chaves',      abbr: 'CHV', leagueId: 'liganos', country: 'Portugal', p: '#CC0000', s: '#000080', a: '#FFFFFF', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'esa', name: 'Estrela da Amadora',   short: 'Amadora',     abbr: 'ESA', leagueId: 'liganos', country: 'Portugal', p: '#CC0000', s: '#000000', a: '#FFFFFF', atk: 64, def: 66, mid: 65, pac: 65, fin: 63, kee: 66 }),
  mk({ id: 'far', name: 'SC Farense',           short: 'Farense',     abbr: 'FAR', leagueId: 'liganos', country: 'Portugal', p: '#000000', s: '#FFFFFF', a: '#CC0000', atk: 65, def: 66, mid: 65, pac: 66, fin: 64, kee: 66 }),
  mk({ id: 'mor', name: 'Moreirense FC',        short: 'Moreirense',  abbr: 'MOR', leagueId: 'liganos', country: 'Portugal', p: '#FFFFFF', s: '#1B5E20', a: '#FFFFFF', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'prt', name: 'Portimonense SC',      short: 'Portimonense', abbr: 'PRT', leagueId: 'liganos', country: 'Portugal', p: '#000000', s: '#FFFFFF', a: '#FFD500', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'rav', name: 'Rio Ave FC',           short: 'Rio Ave',     abbr: 'RAV', leagueId: 'liganos', country: 'Portugal', p: '#1B5E20', s: '#FFFFFF', a: '#000000', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'viz', name: 'FC Vizela',            short: 'Vizela',      abbr: 'VIZ', leagueId: 'liganos', country: 'Portugal', p: '#FFFFFF', s: '#000000', a: '#FFFFFF', atk: 64, def: 65, mid: 64, pac: 65, fin: 63, kee: 65 }),
  mk({ id: 'aro', name: 'FC Arouca',            short: 'Arouca',      abbr: 'ARO', leagueId: 'liganos', country: 'Portugal', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),

  // Süper Lig fill (19)
  mk({ id: 'ada', name: 'Adana Demirspor',      short: 'Adana',       abbr: 'ADA', leagueId: 'superlig', country: 'Turkey', p: '#003DA5', s: '#FFFFFF', a: '#CC0000', atk: 74, def: 73, mid: 73, pac: 74, fin: 73, kee: 73, form: 1 }),
  mk({ id: 'ant', name: 'Antalyaspor',          short: 'Antalya',     abbr: 'ANT', leagueId: 'superlig', country: 'Turkey', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 70, def: 71, mid: 70, pac: 71, fin: 69, kee: 71 }),
  mk({ id: 'kny', name: 'Konyaspor',            short: 'Konya',       abbr: 'KNY', leagueId: 'superlig', country: 'Turkey', p: '#1B5E20', s: '#FFFFFF', a: '#000000', atk: 71, def: 71, mid: 71, pac: 71, fin: 70, kee: 71 }),
  mk({ id: 'kay', name: 'Kayserispor',          short: 'Kayseri',     abbr: 'KAY', leagueId: 'superlig', country: 'Turkey', p: '#CC0000', s: '#FFD500', a: '#000000', atk: 70, def: 70, mid: 70, pac: 70, fin: 69, kee: 70 }),
  mk({ id: 'ala', name: 'Alanyaspor',           short: 'Alanya',      abbr: 'ALA', leagueId: 'superlig', country: 'Turkey', p: '#F58220', s: '#1B5E20', a: '#FFFFFF', atk: 70, def: 71, mid: 70, pac: 71, fin: 69, kee: 71 }),
  mk({ id: 'siv', name: 'Sivasspor',            short: 'Sivas',       abbr: 'SIV', leagueId: 'superlig', country: 'Turkey', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 69, def: 70, mid: 69, pac: 70, fin: 68, kee: 70 }),
  mk({ id: 'hat', name: 'Hatayspor',            short: 'Hatay',       abbr: 'HAT', leagueId: 'superlig', country: 'Turkey', p: '#7B0F2B', s: '#FFFFFF', a: '#000000', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'rzs', name: 'Çaykur Rizespor',      short: 'Rize',        abbr: 'RZS', leagueId: 'superlig', country: 'Turkey', p: '#0F4D92', s: '#1B5E20', a: '#FFFFFF', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'sam', name: 'Samsunspor',           short: 'Samsun',      abbr: 'SAM', leagueId: 'superlig', country: 'Turkey', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 69, def: 69, mid: 69, pac: 69, fin: 68, kee: 69 }),
  mk({ id: 'gzt', name: 'Gaziantep FK',         short: 'Gaziantep',   abbr: 'GZT', leagueId: 'superlig', country: 'Turkey', p: '#CC0000', s: '#000000', a: '#FFFFFF', atk: 68, def: 69, mid: 68, pac: 69, fin: 67, kee: 69 }),
  mk({ id: 'krg', name: 'Karagümrük',           short: 'Karagümrük',  abbr: 'KRG', leagueId: 'superlig', country: 'Turkey', p: '#CC0000', s: '#000000', a: '#FFFFFF', atk: 67, def: 68, mid: 67, pac: 68, fin: 66, kee: 68 }),
  mk({ id: 'ang', name: 'MKE Ankaragücü',       short: 'Ankaragücü',  abbr: 'ANG', leagueId: 'superlig', country: 'Turkey', p: '#0F4D92', s: '#FFD500', a: '#000000', atk: 68, def: 69, mid: 68, pac: 69, fin: 67, kee: 69 }),
  mk({ id: 'pen', name: 'Pendikspor',           short: 'Pendik',      abbr: 'PEN', leagueId: 'superlig', country: 'Turkey', p: '#1B5E20', s: '#CC0000', a: '#FFFFFF', atk: 65, def: 66, mid: 65, pac: 66, fin: 64, kee: 66 }),
  mk({ id: 'ist', name: 'İstanbulspor',         short: 'İstanbulspor', abbr: 'IST', leagueId: 'superlig', country: 'Turkey', p: '#FFD500', s: '#000000', a: '#FFFFFF', atk: 65, def: 66, mid: 65, pac: 66, fin: 64, kee: 66 }),

  // EFL Championship fill (24)
  mk({ id: 'bcc', name: 'Birmingham City',      short: 'Birmingham',  abbr: 'BCC', leagueId: 'efl', country: 'England', p: '#0F4D92', s: '#FFFFFF', a: '#CC0000', atk: 70, def: 70, mid: 70, pac: 70, fin: 69, kee: 70 }),
  mk({ id: 'brs', name: 'Bristol City',         short: 'Bristol C',   abbr: 'BRS', leagueId: 'efl', country: 'England', p: '#E03A3E', s: '#000000', a: '#FFFFFF', atk: 71, def: 71, mid: 71, pac: 72, fin: 70, kee: 71 }),
  mk({ id: 'car', name: 'Cardiff City',         short: 'Cardiff',     abbr: 'CAR', leagueId: 'efl', country: 'England', p: '#0070B5', s: '#FFFFFF', a: '#000000', atk: 70, def: 70, mid: 70, pac: 71, fin: 69, kee: 70 }),
  mk({ id: 'cov', name: 'Coventry City',        short: 'Coventry',    abbr: 'COV', leagueId: 'efl', country: 'England', p: '#0066B3', s: '#FFFFFF', a: '#000000', atk: 72, def: 72, mid: 72, pac: 73, fin: 71, kee: 72, form: 1 }),
  mk({ id: 'hul', name: 'Hull City',            short: 'Hull',        abbr: 'HUL', leagueId: 'efl', country: 'England', p: '#F18A01', s: '#000000', a: '#FFFFFF', atk: 70, def: 70, mid: 70, pac: 71, fin: 69, kee: 70 }),
  mk({ id: 'mlw', name: 'Millwall',             short: 'Millwall',    abbr: 'MLW', leagueId: 'efl', country: 'England', p: '#003DA5', s: '#FFFFFF', a: '#000000', atk: 68, def: 70, mid: 69, pac: 69, fin: 68, kee: 70 }),
  mk({ id: 'ply', name: 'Plymouth Argyle',      short: 'Plymouth',    abbr: 'PLY', leagueId: 'efl', country: 'England', p: '#1B5E20', s: '#FFFFFF', a: '#000000', atk: 69, def: 69, mid: 69, pac: 70, fin: 68, kee: 69 }),
  mk({ id: 'pmh', name: 'Portsmouth',           short: 'Pompey',      abbr: 'PMH', leagueId: 'efl', country: 'England', p: '#001489', s: '#FFFFFF', a: '#FFD500', atk: 70, def: 70, mid: 70, pac: 71, fin: 69, kee: 70 }),
  mk({ id: 'pnu', name: 'Preston North End',    short: 'Preston',     abbr: 'PNU', leagueId: 'efl', country: 'England', p: '#FFFFFF', s: '#0F4D92', a: '#000000', atk: 70, def: 71, mid: 70, pac: 71, fin: 69, kee: 71 }),
  mk({ id: 'qpr', name: 'Queens Park Rangers',  short: 'QPR',         abbr: 'QPR', leagueId: 'efl', country: 'England', p: '#1B449C', s: '#FFFFFF', a: '#000000', atk: 70, def: 70, mid: 70, pac: 71, fin: 69, kee: 70 }),
  mk({ id: 'rot', name: 'Rotherham United',     short: 'Rotherham',   abbr: 'ROT', leagueId: 'efl', country: 'England', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 66, def: 67, mid: 66, pac: 67, fin: 65, kee: 67 }),
  mk({ id: 'sto', name: 'Stoke City',           short: 'Stoke',       abbr: 'STO', leagueId: 'efl', country: 'England', p: '#E03A3E', s: '#FFFFFF', a: '#0F4D92', atk: 70, def: 71, mid: 70, pac: 71, fin: 69, kee: 71 }),
  mk({ id: 'sun', name: 'Sunderland',           short: 'Sunderland',  abbr: 'SUN', leagueId: 'efl', country: 'England', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 72, def: 71, mid: 72, pac: 73, fin: 71, kee: 71 }),
  mk({ id: 'swa', name: 'Swansea City',         short: 'Swansea',     abbr: 'SWA', leagueId: 'efl', country: 'England', p: '#FFFFFF', s: '#000000', a: '#000000', atk: 70, def: 70, mid: 70, pac: 71, fin: 69, kee: 70 }),
  mk({ id: 'wat', name: 'Watford',              short: 'Watford',     abbr: 'WAT', leagueId: 'efl', country: 'England', p: '#FBE001', s: '#000000', a: '#CC0000', atk: 73, def: 72, mid: 73, pac: 73, fin: 72, kee: 72 }),
  mk({ id: 'bla', name: 'Blackburn Rovers',     short: 'Blackburn',   abbr: 'BLA', leagueId: 'efl', country: 'England', p: '#FFFFFF', s: '#0F4D92', a: '#000000', atk: 70, def: 70, mid: 70, pac: 70, fin: 69, kee: 70 }),
  mk({ id: 'der', name: 'Derby County',         short: 'Derby',       abbr: 'DER', leagueId: 'efl', country: 'England', p: '#FFFFFF', s: '#000000', a: '#000000', atk: 68, def: 69, mid: 68, pac: 69, fin: 67, kee: 69 }),
  mk({ id: 'lut', name: 'Luton Town',           short: 'Luton',       abbr: 'LUT', leagueId: 'efl', country: 'England', p: '#F58220', s: '#000080', a: '#FFFFFF', atk: 69, def: 70, mid: 69, pac: 70, fin: 68, kee: 70 }),

  // NBA fill (30 total)
  mk({ id: 'bkn', name: 'Brooklyn Nets',        short: 'Nets',        abbr: 'BKN', leagueId: 'nba', country: 'USA', p: '#000000', s: '#FFFFFF', a: '#FFFFFF', atk: 78, def: 76, mid: 77, pac: 78, fin: 78, kee: 76 }),
  mk({ id: 'nyk', name: 'New York Knicks',      short: 'Knicks',      abbr: 'NYK', leagueId: 'nba', country: 'USA', p: '#006BB6', s: '#F58426', a: '#FFFFFF', atk: 82, def: 80, mid: 81, pac: 80, fin: 82, kee: 80, form: 2 }),
  mk({ id: 'trr', name: 'Toronto Raptors',      short: 'Raptors',     abbr: 'TRR', leagueId: 'nba', country: 'Canada', p: '#CE1141', s: '#000000', a: '#A1A1A4', atk: 78, def: 77, mid: 77, pac: 78, fin: 78, kee: 77 }),
  mk({ id: 'atl', name: 'Atlanta Hawks',        short: 'Hawks',       abbr: 'ATL', leagueId: 'nba', country: 'USA', p: '#E03A3E', s: '#26282A', a: '#C1D32F', atk: 80, def: 76, mid: 79, pac: 81, fin: 80, kee: 75 }),
  mk({ id: 'chh', name: 'Charlotte Hornets',    short: 'Hornets',     abbr: 'CHH', leagueId: 'nba', country: 'USA', p: '#1D1160', s: '#00788C', a: '#A1A1A4', atk: 75, def: 73, mid: 74, pac: 76, fin: 75, kee: 73 }),
  mk({ id: 'cav', name: 'Cleveland Cavaliers',  short: 'Cavaliers',   abbr: 'CAV', leagueId: 'nba', country: 'USA', p: '#860038', s: '#FDBB30', a: '#041E42', atk: 84, def: 82, mid: 83, pac: 81, fin: 84, kee: 81, form: 3 }),
  mk({ id: 'det', name: 'Detroit Pistons',      short: 'Pistons',     abbr: 'DET', leagueId: 'nba', country: 'USA', p: '#C8102E', s: '#1D42BA', a: '#FFFFFF', atk: 73, def: 72, mid: 72, pac: 75, fin: 73, kee: 71 }),
  mk({ id: 'ind', name: 'Indiana Pacers',       short: 'Pacers',      abbr: 'IND', leagueId: 'nba', country: 'USA', p: '#002D62', s: '#FDBB30', a: '#FFFFFF', atk: 84, def: 78, mid: 83, pac: 85, fin: 85, kee: 78, form: 2 }),
  mk({ id: 'orl', name: 'Orlando Magic',        short: 'Magic',       abbr: 'ORL', leagueId: 'nba', country: 'USA', p: '#0077C0', s: '#000000', a: '#C4CED4', atk: 80, def: 80, mid: 80, pac: 81, fin: 79, kee: 80, form: 2 }),
  mk({ id: 'was', name: 'Washington Wizards',   short: 'Wizards',     abbr: 'WAS', leagueId: 'nba', country: 'USA', p: '#002B5C', s: '#E31837', a: '#C4CED4', atk: 73, def: 71, mid: 72, pac: 74, fin: 73, kee: 71 }),
  mk({ id: 'dal', name: 'Dallas Mavericks',     short: 'Mavs',        abbr: 'DAL', leagueId: 'nba', country: 'USA', p: '#00538C', s: '#B8C4CA', a: '#002B5E', atk: 87, def: 80, mid: 85, pac: 84, fin: 88, kee: 80, form: 3 }),
  mk({ id: 'hou', name: 'Houston Rockets',      short: 'Rockets',     abbr: 'HOU', leagueId: 'nba', country: 'USA', p: '#CE1141', s: '#000000', a: '#C4CED4', atk: 80, def: 78, mid: 79, pac: 82, fin: 80, kee: 77 }),
  mk({ id: 'mem', name: 'Memphis Grizzlies',    short: 'Grizzlies',   abbr: 'MEM', leagueId: 'nba', country: 'USA', p: '#5D76A9', s: '#12173F', a: '#F5B112', atk: 80, def: 80, mid: 81, pac: 82, fin: 80, kee: 79 }),
  mk({ id: 'nop', name: 'New Orleans Pelicans', short: 'Pelicans',    abbr: 'NOP', leagueId: 'nba', country: 'USA', p: '#0C2340', s: '#C8102E', a: '#85714D', atk: 81, def: 78, mid: 80, pac: 82, fin: 81, kee: 78 }),
  mk({ id: 'spu', name: 'San Antonio Spurs',    short: 'Spurs',       abbr: 'SAS', leagueId: 'nba', country: 'USA', p: '#C4CED4', s: '#000000', a: '#000000', atk: 76, def: 75, mid: 75, pac: 77, fin: 76, kee: 75 }),
  mk({ id: 'min', name: 'Minnesota Timberwolves', short: 'T’wolves', abbr: 'MIN', leagueId: 'nba', country: 'USA', p: '#0C2340', s: '#236192', a: '#9EA2A2', atk: 84, def: 84, mid: 83, pac: 82, fin: 84, kee: 83, form: 3 }),
  mk({ id: 'okc', name: 'Oklahoma City Thunder', short: 'Thunder',    abbr: 'OKC', leagueId: 'nba', country: 'USA', p: '#007AC1', s: '#EF3B24', a: '#FDBB30', atk: 87, def: 84, mid: 86, pac: 85, fin: 87, kee: 83, form: 5 }),
  mk({ id: 'ptb', name: 'Portland Trail Blazers', short: 'Blazers',   abbr: 'PTB', leagueId: 'nba', country: 'USA', p: '#E03A3E', s: '#000000', a: '#FFFFFF', atk: 74, def: 72, mid: 73, pac: 75, fin: 74, kee: 72 }),
  mk({ id: 'uta', name: 'Utah Jazz',            short: 'Jazz',        abbr: 'UTA', leagueId: 'nba', country: 'USA', p: '#002B5C', s: '#F9A01B', a: '#00471B', atk: 75, def: 73, mid: 74, pac: 76, fin: 75, kee: 73 }),
  mk({ id: 'sac', name: 'Sacramento Kings',     short: 'Kings',       abbr: 'SAC', leagueId: 'nba', country: 'USA', p: '#5A2D81', s: '#63727A', a: '#000000', atk: 80, def: 76, mid: 79, pac: 80, fin: 80, kee: 76 }),
  mk({ id: 'lac', name: 'LA Clippers',          short: 'Clippers',    abbr: 'LAC', leagueId: 'nba', country: 'USA', p: '#C8102E', s: '#1D428A', a: '#FFFFFF', atk: 84, def: 80, mid: 83, pac: 83, fin: 84, kee: 80, form: 2 }),
  mk({ id: 'phx', name: 'Phoenix Suns',         short: 'Suns',        abbr: 'PHX', leagueId: 'nba', country: 'USA', p: '#1D1160', s: '#E56020', a: '#63727A', atk: 84, def: 78, mid: 83, pac: 82, fin: 85, kee: 78, form: 1 }),

  // NHL fill (32 total)
  mk({ id: 'mtl', name: 'Montreal Canadiens',   short: 'Canadiens',   abbr: 'MTL', leagueId: 'nhl', country: 'Canada', p: '#AF1E2D', s: '#192168', a: '#FFFFFF', atk: 72, def: 73, mid: 72, pac: 75, fin: 71, kee: 73 }),
  mk({ id: 'ott', name: 'Ottawa Senators',      short: 'Senators',    abbr: 'OTT', leagueId: 'nhl', country: 'Canada', p: '#E31837', s: '#000000', a: '#C8A36E', atk: 76, def: 73, mid: 75, pac: 78, fin: 76, kee: 73 }),
  mk({ id: 'buf', name: 'Buffalo Sabres',       short: 'Sabres',      abbr: 'BUF', leagueId: 'nhl', country: 'USA', p: '#002654', s: '#FCB514', a: '#FFFFFF', atk: 78, def: 75, mid: 77, pac: 79, fin: 77, kee: 75 }),
  mk({ id: 'nyi', name: 'New York Islanders',   short: 'Islanders',   abbr: 'NYI', leagueId: 'nhl', country: 'USA', p: '#00539B', s: '#F47D30', a: '#FFFFFF', atk: 78, def: 80, mid: 79, pac: 78, fin: 78, kee: 81 }),
  mk({ id: 'njd', name: 'New Jersey Devils',    short: 'Devils',      abbr: 'NJD', leagueId: 'nhl', country: 'USA', p: '#CE1126', s: '#000000', a: '#FFFFFF', atk: 82, def: 78, mid: 81, pac: 83, fin: 82, kee: 78, form: 2 }),
  mk({ id: 'phl', name: 'Philadelphia Flyers',  short: 'Flyers',      abbr: 'PHL', leagueId: 'nhl', country: 'USA', p: '#F74902', s: '#000000', a: '#FFFFFF', atk: 76, def: 75, mid: 75, pac: 77, fin: 76, kee: 75 }),
  mk({ id: 'wsh', name: 'Washington Capitals',  short: 'Capitals',    abbr: 'WSH', leagueId: 'nhl', country: 'USA', p: '#041E42', s: '#C8102E', a: '#FFFFFF', atk: 80, def: 78, mid: 79, pac: 79, fin: 80, kee: 78 }),
  mk({ id: 'crh', name: 'Carolina Hurricanes',  short: 'Hurricanes',  abbr: 'CAR', leagueId: 'nhl', country: 'USA', p: '#CC0000', s: '#000000', a: '#A2AAAD', atk: 84, def: 84, mid: 84, pac: 83, fin: 83, kee: 84, form: 3 }),
  mk({ id: 'cbj', name: 'Columbus Blue Jackets', short: 'Blue Jackets', abbr: 'CBJ', leagueId: 'nhl', country: 'USA', p: '#002654', s: '#CE1126', a: '#A4A9AD', atk: 74, def: 73, mid: 73, pac: 75, fin: 74, kee: 73 }),
  mk({ id: 'fla', name: 'Florida Panthers',     short: 'Panthers',    abbr: 'FLA', leagueId: 'nhl', country: 'USA', p: '#041E42', s: '#C8102E', a: '#B9975B', atk: 86, def: 84, mid: 85, pac: 84, fin: 85, kee: 84, form: 4 }),
  mk({ id: 'drw', name: 'Detroit Red Wings',    short: 'Red Wings',   abbr: 'DET', leagueId: 'nhl', country: 'USA', p: '#CE1126', s: '#FFFFFF', a: '#FFFFFF', atk: 78, def: 76, mid: 77, pac: 78, fin: 78, kee: 76 }),
  mk({ id: 'cbh', name: 'Chicago Blackhawks',   short: 'Blackhawks',  abbr: 'CHI', leagueId: 'nhl', country: 'USA', p: '#CF0A2C', s: '#000000', a: '#FF671F', atk: 73, def: 72, mid: 72, pac: 74, fin: 73, kee: 72 }),
  mk({ id: 'mnh', name: 'Minnesota Wild',       short: 'Wild',        abbr: 'MNH', leagueId: 'nhl', country: 'USA', p: '#154734', s: '#A6192E', a: '#EAAA00', atk: 80, def: 80, mid: 79, pac: 79, fin: 79, kee: 80 }),
  mk({ id: 'wpg', name: 'Winnipeg Jets',        short: 'Jets',        abbr: 'WPG', leagueId: 'nhl', country: 'Canada', p: '#041E42', s: '#004C97', a: '#AC162C', atk: 82, def: 82, mid: 82, pac: 81, fin: 81, kee: 82, form: 2 }),
  mk({ id: 'stl', name: 'St. Louis Blues',      short: 'Blues',       abbr: 'STL', leagueId: 'nhl', country: 'USA', p: '#002F87', s: '#FCB514', a: '#041E42', atk: 78, def: 78, mid: 78, pac: 78, fin: 78, kee: 78 }),
  mk({ id: 'nsh', name: 'Nashville Predators',  short: 'Predators',   abbr: 'NSH', leagueId: 'nhl', country: 'USA', p: '#FFB81C', s: '#041E42', a: '#FFFFFF', atk: 80, def: 80, mid: 80, pac: 80, fin: 79, kee: 80 }),
  mk({ id: 'dst', name: 'Dallas Stars',         short: 'Stars',       abbr: 'DAL', leagueId: 'nhl', country: 'USA', p: '#006847', s: '#8F8F8C', a: '#000000', atk: 85, def: 84, mid: 84, pac: 84, fin: 84, kee: 84, form: 3 }),
  mk({ id: 'edm', name: 'Edmonton Oilers',      short: 'Oilers',      abbr: 'EDM', leagueId: 'nhl', country: 'Canada', p: '#041E42', s: '#FF4C00', a: '#FFFFFF', atk: 89, def: 80, mid: 87, pac: 86, fin: 89, kee: 80, form: 4 }),
  mk({ id: 'vcv', name: 'Vancouver Canucks',    short: 'Canucks',     abbr: 'VAN', leagueId: 'nhl', country: 'Canada', p: '#00205B', s: '#00843D', a: '#041C2C', atk: 82, def: 81, mid: 81, pac: 82, fin: 82, kee: 81 }),
  mk({ id: 'cgy', name: 'Calgary Flames',       short: 'Flames',      abbr: 'CGY', leagueId: 'nhl', country: 'Canada', p: '#C8102E', s: '#F1BE48', a: '#111111', atk: 78, def: 78, mid: 78, pac: 78, fin: 78, kee: 78 }),
  mk({ id: 'vgk', name: 'Vegas Golden Knights', short: 'Knights',     abbr: 'VGK', leagueId: 'nhl', country: 'USA', p: '#B4975A', s: '#333F42', a: '#C8102E', atk: 84, def: 83, mid: 83, pac: 83, fin: 84, kee: 83 }),
  mk({ id: 'sea', name: 'Seattle Kraken',       short: 'Kraken',      abbr: 'SEA', leagueId: 'nhl', country: 'USA', p: '#001628', s: '#99D9D9', a: '#355464', atk: 76, def: 76, mid: 76, pac: 76, fin: 76, kee: 76 }),
  mk({ id: 'ana', name: 'Anaheim Ducks',        short: 'Ducks',       abbr: 'ANA', leagueId: 'nhl', country: 'USA', p: '#F47A38', s: '#B9975B', a: '#000000', atk: 72, def: 72, mid: 72, pac: 73, fin: 72, kee: 72 }),
  mk({ id: 'sjs', name: 'San Jose Sharks',      short: 'Sharks',      abbr: 'SJS', leagueId: 'nhl', country: 'USA', p: '#006D75', s: '#000000', a: '#EA7200', atk: 70, def: 71, mid: 70, pac: 71, fin: 70, kee: 71, form: -2 }),
  mk({ id: 'lak', name: 'Los Angeles Kings',    short: 'Kings',       abbr: 'LAK', leagueId: 'nhl', country: 'USA', p: '#111111', s: '#A2AAAD', a: '#FFFFFF', atk: 80, def: 80, mid: 80, pac: 80, fin: 79, kee: 80 }),
  mk({ id: 'uth', name: 'Utah Hockey Club',     short: 'Utah HC',     abbr: 'UTH', leagueId: 'nhl', country: 'USA', p: '#71AFE5', s: '#000000', a: '#FFFFFF', atk: 76, def: 75, mid: 75, pac: 76, fin: 76, kee: 75 }),

  // ──────────────────────────────────────────────────────────────────────
  // UEFA Champions Cup (UCC) — 32 European powerhouses. These are dedicated
  // tournament entries (separate ids from their domestic league copies) so
  // standings + fixtures resolve cleanly without a cross-league join.
  // ──────────────────────────────────────────────────────────────────────
  // English (5)
  mk({ id: 'c_mci', name: 'Manchester City',   short: 'Man City',  abbr: 'MCI', leagueId: 'champ', country: 'England', p: '#6CABDD', s: '#1C2C5B', a: '#FFC659', atk: 92, def: 87, mid: 92, pac: 86, fin: 90, kee: 86, form: 5 }),
  mk({ id: 'c_liv', name: 'Liverpool',         short: 'Liverpool', abbr: 'LIV', leagueId: 'champ', country: 'England', p: '#C8102E', s: '#F6EB61', a: '#00B2A9', atk: 89, def: 84, mid: 85, pac: 89, fin: 88, kee: 84, form: 4 }),
  mk({ id: 'c_ars', name: 'Arsenal',           short: 'Arsenal',   abbr: 'ARS', leagueId: 'champ', country: 'England', p: '#EF0107', s: '#FFFFFF', a: '#063672', atk: 86, def: 84, mid: 87, pac: 85, fin: 83, kee: 82, form: 3 }),
  mk({ id: 'c_avl', name: 'Aston Villa',       short: 'Villa',     abbr: 'AVL', leagueId: 'champ', country: 'England', p: '#670E36', s: '#95BFE5', a: '#FFFFFF', atk: 80, def: 78, mid: 80, pac: 80, fin: 79, kee: 78, form: 3 }),
  mk({ id: 'c_tot', name: 'Tottenham Hotspur', short: 'Tottenham', abbr: 'TOT', leagueId: 'champ', country: 'England', p: '#132257', s: '#FFFFFF', a: '#C8102E', atk: 82, def: 76, mid: 80, pac: 88, fin: 83, kee: 78, form: 2 }),
  // Spanish (4)
  mk({ id: 'c_rma', name: 'Real Madrid',       short: 'Real Madrid', abbr: 'RMA', leagueId: 'champ', country: 'Spain', p: '#FEBE10', s: '#FFFFFF', a: '#00529F', atk: 93, def: 88, mid: 90, pac: 88, fin: 92, kee: 88, form: 6 }),
  mk({ id: 'c_bar', name: 'FC Barcelona',      short: 'Barcelona',   abbr: 'BAR', leagueId: 'champ', country: 'Spain', p: '#A50044', s: '#004D98', a: '#FFED02', atk: 90, def: 84, mid: 91, pac: 85, fin: 88, kee: 84, form: 4 }),
  mk({ id: 'c_atm', name: 'Atlético Madrid',   short: 'Atlético',    abbr: 'ATM', leagueId: 'champ', country: 'Spain', p: '#CE3524', s: '#FFFFFF', a: '#272E61', atk: 83, def: 86, mid: 82, pac: 80, fin: 81, kee: 85, form: 2 }),
  mk({ id: 'c_ath', name: 'Athletic Club',     short: 'Athletic',    abbr: 'ATH', leagueId: 'champ', country: 'Spain', p: '#EE2523', s: '#FFFFFF', a: '#000000', atk: 79, def: 79, mid: 79, pac: 78, fin: 78, kee: 79, form: 2 }),
  // Italian (5)
  mk({ id: 'c_int', name: 'Internazionale',    short: 'Inter',       abbr: 'INT', leagueId: 'champ', country: 'Italy', p: '#010E80', s: '#000000', a: '#FFFFFF', atk: 87, def: 86, mid: 85, pac: 82, fin: 86, kee: 86, form: 4 }),
  mk({ id: 'c_mil', name: 'AC Milan',          short: 'Milan',       abbr: 'MIL', leagueId: 'champ', country: 'Italy', p: '#FB090B', s: '#000000', a: '#FFFFFF', atk: 84, def: 81, mid: 82, pac: 83, fin: 83, kee: 82, form: 3 }),
  mk({ id: 'c_juv', name: 'Juventus',          short: 'Juventus',    abbr: 'JUV', leagueId: 'champ', country: 'Italy', p: '#000000', s: '#FFFFFF', a: '#FFD700', atk: 83, def: 84, mid: 82, pac: 79, fin: 82, kee: 85, form: 1 }),
  mk({ id: 'c_ata', name: 'Atalanta',          short: 'Atalanta',    abbr: 'ATA', leagueId: 'champ', country: 'Italy', p: '#1E71B8', s: '#000000', a: '#FFFFFF', atk: 82, def: 78, mid: 80, pac: 81, fin: 82, kee: 78, form: 3 }),
  mk({ id: 'c_bol', name: 'Bologna FC',        short: 'Bologna',     abbr: 'BOL', leagueId: 'champ', country: 'Italy', p: '#7A1E2C', s: '#001A4B', a: '#FFFFFF', atk: 76, def: 76, mid: 76, pac: 76, fin: 75, kee: 75, form: 2 }),
  // German (4)
  mk({ id: 'c_bay', name: 'Bayern Munich',     short: 'Bayern',      abbr: 'BAY', leagueId: 'champ', country: 'Germany', p: '#DC052D', s: '#FFFFFF', a: '#0066B2', atk: 91, def: 87, mid: 89, pac: 86, fin: 90, kee: 88, form: 5 }),
  mk({ id: 'c_bvb', name: 'Borussia Dortmund', short: 'Dortmund',    abbr: 'BVB', leagueId: 'champ', country: 'Germany', p: '#FDE100', s: '#000000', a: '#FFFFFF', atk: 85, def: 78, mid: 82, pac: 87, fin: 84, kee: 80, form: 2 }),
  mk({ id: 'c_lev', name: 'Bayer Leverkusen',  short: 'Leverkusen',  abbr: 'LEV', leagueId: 'champ', country: 'Germany', p: '#E32221', s: '#000000', a: '#FFFFFF', atk: 86, def: 83, mid: 85, pac: 85, fin: 84, kee: 82, form: 4 }),
  mk({ id: 'c_stu', name: 'VfB Stuttgart',     short: 'Stuttgart',   abbr: 'STU', leagueId: 'champ', country: 'Germany', p: '#E32219', s: '#FFFFFF', a: '#000000', atk: 78, def: 76, mid: 77, pac: 78, fin: 77, kee: 76, form: 2 }),
  // French (3)
  mk({ id: 'c_psg', name: 'Paris Saint-Germain', short: 'PSG',     abbr: 'PSG', leagueId: 'champ', country: 'France', p: '#004170', s: '#DA291C', a: '#FFFFFF', atk: 89, def: 82, mid: 86, pac: 88, fin: 88, kee: 83, form: 4 }),
  mk({ id: 'c_mar', name: 'Olympique Marseille', short: 'Marseille', abbr: 'OM', leagueId: 'champ', country: 'France', p: '#2FAEE0', s: '#FFFFFF', a: '#003F87', atk: 79, def: 76, mid: 78, pac: 80, fin: 78, kee: 77, form: 1 }),
  mk({ id: 'c_brt', name: 'Stade Brestois 29',  short: 'Brest',     abbr: 'BRT', leagueId: 'champ', country: 'France', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 73, def: 73, mid: 73, pac: 73, fin: 72, kee: 73, form: 2 }),
  // Portuguese (2)
  mk({ id: 'c_ben', name: 'SL Benfica',        short: 'Benfica',     abbr: 'BEN', leagueId: 'champ', country: 'Portugal', p: '#E50019', s: '#FFFFFF', a: '#000000', atk: 85, def: 81, mid: 83, pac: 84, fin: 84, kee: 82, form: 4 }),
  mk({ id: 'c_por', name: 'FC Porto',          short: 'Porto',       abbr: 'POR', leagueId: 'champ', country: 'Portugal', p: '#003DA5', s: '#FFFFFF', a: '#000000', atk: 84, def: 82, mid: 82, pac: 83, fin: 83, kee: 83, form: 3 }),
  // Dutch (2)
  mk({ id: 'c_psv', name: 'PSV Eindhoven',     short: 'PSV',         abbr: 'PSV', leagueId: 'champ', country: 'Netherlands', p: '#ED1C24', s: '#FFFFFF', a: '#000000', atk: 83, def: 78, mid: 81, pac: 83, fin: 82, kee: 79, form: 4 }),
  mk({ id: 'c_fey', name: 'Feyenoord',         short: 'Feyenoord',   abbr: 'FEY', leagueId: 'champ', country: 'Netherlands', p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 80, def: 78, mid: 79, pac: 80, fin: 79, kee: 78, form: 2 }),
  // Belgian / Austrian / Czech / Scottish / Croatian / Serbian / Slovak (7)
  mk({ id: 'c_brg', name: 'Club Brugge',       short: 'Brugge',      abbr: 'CLB', leagueId: 'champ', country: 'Belgium',   p: '#0066CC', s: '#000000', a: '#FFFFFF', atk: 76, def: 76, mid: 76, pac: 76, fin: 75, kee: 76, form: 2 }),
  mk({ id: 'c_rbs', name: 'RB Salzburg',       short: 'Salzburg',    abbr: 'SAL', leagueId: 'champ', country: 'Austria',   p: '#FFFFFF', s: '#E20613', a: '#000000', atk: 78, def: 76, mid: 77, pac: 78, fin: 77, kee: 76, form: 2 }),
  mk({ id: 'c_spa', name: 'Sparta Praha',      short: 'Sparta',      abbr: 'SPR', leagueId: 'champ', country: 'Czechia',   p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 74, def: 74, mid: 74, pac: 74, fin: 73, kee: 74 }),
  mk({ id: 'c_cel', name: 'Celtic FC',         short: 'Celtic',      abbr: 'CEL', leagueId: 'champ', country: 'Scotland',  p: '#16973A', s: '#FFFFFF', a: '#000000', atk: 80, def: 77, mid: 79, pac: 79, fin: 79, kee: 77, form: 3 }),
  mk({ id: 'c_din', name: 'Dinamo Zagreb',     short: 'Dinamo',      abbr: 'DZG', leagueId: 'champ', country: 'Croatia',   p: '#0033A0', s: '#FFFFFF', a: '#000000', atk: 75, def: 74, mid: 75, pac: 74, fin: 74, kee: 74 }),
  mk({ id: 'c_rds', name: 'Red Star Belgrade', short: 'Red Star',    abbr: 'RDS', leagueId: 'champ', country: 'Serbia',    p: '#CC0000', s: '#FFFFFF', a: '#000000', atk: 76, def: 75, mid: 75, pac: 76, fin: 76, kee: 75 }),
  mk({ id: 'c_slo', name: 'Slovan Bratislava', short: 'Slovan',      abbr: 'SLO', leagueId: 'champ', country: 'Slovakia',  p: '#0033A0', s: '#FFFFFF', a: '#FFFFFF', atk: 72, def: 73, mid: 73, pac: 73, fin: 72, kee: 73 }),
  // Ukrainian (1)
  mk({ id: 'c_shk', name: 'Shakhtar Donetsk',  short: 'Shakhtar',    abbr: 'SHK', leagueId: 'champ', country: 'Ukraine',   p: '#F58220', s: '#000000', a: '#FFFFFF', atk: 77, def: 75, mid: 76, pac: 77, fin: 76, kee: 75, form: 1 }),
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
