import type { League } from './types';

export const LEAGUES: League[] = [
  // Soccer
  { id: 'epl',     name: 'Premier League',  shortName: 'EPL',     country: 'England',     countryCode: 'GB', sport: 'soccer', tier: 'top', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', accent: '#3d195b' },
  { id: 'laliga',  name: 'La Liga',         shortName: 'La Liga', country: 'Spain',       countryCode: 'ES', sport: 'soccer', tier: 'top', flag: '🇪🇸', accent: '#ee8707' },
  { id: 'bunds',   name: 'Bundesliga',      shortName: 'BUND',    country: 'Germany',     countryCode: 'DE', sport: 'soccer', tier: 'top', flag: '🇩🇪', accent: '#d20515' },
  { id: 'seriea',  name: 'Serie A',         shortName: 'Serie A', country: 'Italy',       countryCode: 'IT', sport: 'soccer', tier: 'top', flag: '🇮🇹', accent: '#008c45' },
  { id: 'ligue1',  name: 'Ligue 1',         shortName: 'L1',      country: 'France',      countryCode: 'FR', sport: 'soccer', tier: 'top', flag: '🇫🇷', accent: '#0055a4' },
  { id: 'champ',   name: 'Champions Cup',   shortName: 'UCC',     country: 'Europe',      countryCode: 'EU', sport: 'soccer', tier: 'continental', flag: '🏆', accent: '#1e2a5a' },
  // Other sports (placeholders for follow-up turns)
  { id: 'nba',     name: 'NBA League',      shortName: 'NBA',     country: 'USA',         countryCode: 'US', sport: 'basketball', tier: 'top', flag: '🇺🇸', accent: '#c8102e' },
  { id: 'nhl',     name: 'NHL League',      shortName: 'NHL',     country: 'USA',         countryCode: 'US', sport: 'hockey', tier: 'top', flag: '🇺🇸', accent: '#003087' },
  { id: 'turf',    name: 'Global Turf',     shortName: 'TURF',    country: 'International', countryCode: 'WW', sport: 'horseracing', tier: 'top', flag: '🌍', accent: '#a16207' },
];

export function getLeague(id: string): League | undefined {
  return LEAGUES.find(l => l.id === id);
}

export function leaguesBySport(sport: League['sport']): League[] {
  return LEAGUES.filter(l => l.sport === sport);
}

export const COUNTRIES = [
  { code: 'GB', name: 'England',  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagueIds: ['epl'] },
  { code: 'ES', name: 'Spain',    flag: '🇪🇸', leagueIds: ['laliga'] },
  { code: 'DE', name: 'Germany',  flag: '🇩🇪', leagueIds: ['bunds'] },
  { code: 'IT', name: 'Italy',    flag: '🇮🇹', leagueIds: ['seriea'] },
  { code: 'FR', name: 'France',   flag: '🇫🇷', leagueIds: ['ligue1'] },
  { code: 'EU', name: 'Europe',   flag: '🇪🇺', leagueIds: ['champ'] },
];
