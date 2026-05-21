"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COUNTRIES = exports.LEAGUES = void 0;
exports.getLeague = getLeague;
exports.leaguesBySport = leaguesBySport;
exports.LEAGUES = [
    // Soccer — domestic top divisions
    { id: 'epl', name: 'Premier League', shortName: 'EPL', country: 'England', countryCode: 'GB', sport: 'soccer', tier: 'top', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', accent: '#3d195b' },
    { id: 'efl', name: 'Championship', shortName: 'EFL', country: 'England', countryCode: 'GB', sport: 'soccer', tier: 'top', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', accent: '#0066b3' },
    { id: 'laliga', name: 'La Liga', shortName: 'La Liga', country: 'Spain', countryCode: 'ES', sport: 'soccer', tier: 'top', flag: '🇪🇸', accent: '#ee8707' },
    { id: 'bunds', name: 'Bundesliga', shortName: 'BUND', country: 'Germany', countryCode: 'DE', sport: 'soccer', tier: 'top', flag: '🇩🇪', accent: '#d20515' },
    { id: 'seriea', name: 'Serie A', shortName: 'Serie A', country: 'Italy', countryCode: 'IT', sport: 'soccer', tier: 'top', flag: '🇮🇹', accent: '#008c45' },
    { id: 'ligue1', name: 'Ligue 1', shortName: 'L1', country: 'France', countryCode: 'FR', sport: 'soccer', tier: 'top', flag: '🇫🇷', accent: '#0055a4' },
    { id: 'eredivisie', name: 'Eredivisie', shortName: 'ERE', country: 'Netherlands', countryCode: 'NL', sport: 'soccer', tier: 'top', flag: '🇳🇱', accent: '#ae1c28' },
    { id: 'liganos', name: 'Liga Portugal', shortName: 'Liga', country: 'Portugal', countryCode: 'PT', sport: 'soccer', tier: 'top', flag: '🇵🇹', accent: '#006600' },
    { id: 'superlig', name: 'Süper Lig', shortName: 'SüpL', country: 'Turkey', countryCode: 'TR', sport: 'soccer', tier: 'top', flag: '🇹🇷', accent: '#e30a17' },
    // Soccer — cups
    { id: 'facup', name: 'FA Cup', shortName: 'FA Cup', country: 'England', countryCode: 'GB', sport: 'soccer', tier: 'cup', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', accent: '#7e1f3b' },
    // Soccer — continental
    { id: 'champ', name: 'Champions Cup', shortName: 'UCC', country: 'Europe', countryCode: 'EU', sport: 'soccer', tier: 'continental', flag: '🏆', accent: '#1e2a5a' },
    { id: 'eurocup', name: 'Europa Cup', shortName: 'UEC', country: 'Europe', countryCode: 'EU', sport: 'soccer', tier: 'continental', flag: '🥈', accent: '#f37b1d' },
    // International / national-team competitions
    { id: 'wcup', name: 'World Cup', shortName: 'WC', country: 'International', countryCode: 'WW', sport: 'soccer', tier: 'continental', flag: '🌍', accent: '#a4824b' },
    { id: 'copa', name: 'Copa America', shortName: 'COPA', country: 'South America', countryCode: 'SA', sport: 'soccer', tier: 'continental', flag: '🌎', accent: '#1860a5' },
    { id: 'afcon', name: 'AFCON', shortName: 'AFCON', country: 'Africa', countryCode: 'AF', sport: 'soccer', tier: 'continental', flag: '🌍', accent: '#16973a' },
    { id: 'asiancup', name: 'AFC Asian Cup', shortName: 'AFC', country: 'Asia', countryCode: 'AS', sport: 'soccer', tier: 'continental', flag: '🌏', accent: '#dc352f' },
    // Other sports
    { id: 'nba', name: 'NBA League', shortName: 'NBA', country: 'USA', countryCode: 'US', sport: 'basketball', tier: 'top', flag: '🇺🇸', accent: '#c8102e' },
    { id: 'euroleague', name: 'EuroLeague', shortName: 'EuroL', country: 'Europe', countryCode: 'EU', sport: 'basketball', tier: 'top', flag: '🇪🇺', accent: '#ff8200' },
    { id: 'acb', name: 'Liga ACB', shortName: 'ACB', country: 'Spain', countryCode: 'ES', sport: 'basketball', tier: 'top', flag: '🇪🇸', accent: '#aa151b' },
    { id: 'eurocup_bb', name: 'EuroCup', shortName: 'EurC', country: 'Europe', countryCode: 'EU', sport: 'basketball', tier: 'continental', flag: '🇪🇺', accent: '#1e90ff' },
    { id: 'bcl', name: 'Basketball Champions League', shortName: 'BCL', country: 'Europe', countryCode: 'EU', sport: 'basketball', tier: 'continental', flag: '🇪🇺', accent: '#00a651' },
    { id: 'fibawc', name: 'FIBA World Cup', shortName: 'FIBA', country: 'International', countryCode: 'WW', sport: 'basketball', tier: 'continental', flag: '🌍', accent: '#ff8200' },
    { id: 'eurobasket', name: 'EuroBasket', shortName: 'EURO', country: 'Europe', countryCode: 'EU', sport: 'basketball', tier: 'continental', flag: '🇪🇺', accent: '#003399' },
    { id: 'nhl', name: 'NHL League', shortName: 'NHL', country: 'USA', countryCode: 'US', sport: 'hockey', tier: 'top', flag: '🇺🇸', accent: '#003087' },
    { id: 'khl', name: 'KHL', shortName: 'KHL', country: 'Russia', countryCode: 'RU', sport: 'hockey', tier: 'top', flag: '🇷🇺', accent: '#003049' },
    { id: 'shl', name: 'SHL', shortName: 'SHL', country: 'Sweden', countryCode: 'SE', sport: 'hockey', tier: 'top', flag: '🇸🇪', accent: '#005293' },
    { id: 'liiga', name: 'Liiga', shortName: 'Liiga', country: 'Finland', countryCode: 'FI', sport: 'hockey', tier: 'top', flag: '🇫🇮', accent: '#003580' },
    { id: 'chl', name: 'Champions Hockey League', shortName: 'CHL', country: 'Europe', countryCode: 'EU', sport: 'hockey', tier: 'continental', flag: '🇪🇺', accent: '#5c2d91' },
    { id: 'iihfwc', name: 'IIHF World Champ', shortName: 'IIHF', country: 'International', countryCode: 'WW', sport: 'hockey', tier: 'continental', flag: '🌍', accent: '#005bbb' },
    { id: 'turf', name: 'Global Turf', shortName: 'TURF', country: 'International', countryCode: 'WW', sport: 'horseracing', tier: 'top', flag: '🌍', accent: '#a16207' },
];
function getLeague(id) {
    return exports.LEAGUES.find(l => l.id === id);
}
function leaguesBySport(sport) {
    return exports.LEAGUES.filter(l => l.sport === sport);
}
exports.COUNTRIES = [
    { code: 'GB', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', leagueIds: ['epl', 'efl', 'facup'] },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', leagueIds: ['laliga'] },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', leagueIds: ['bunds'] },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', leagueIds: ['seriea'] },
    { code: 'FR', name: 'France', flag: '🇫🇷', leagueIds: ['ligue1'] },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', leagueIds: ['eredivisie'] },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', leagueIds: ['liganos'] },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', leagueIds: ['superlig'] },
    { code: 'EU', name: 'Europe', flag: '🇪🇺', leagueIds: ['champ', 'eurocup', 'eurobasket'] },
    { code: 'WW', name: 'International', flag: '🌍', leagueIds: ['wcup', 'fibawc', 'iihfwc'] },
    { code: 'SA', name: 'South America', flag: '🌎', leagueIds: ['copa'] },
    { code: 'AF', name: 'Africa', flag: '🌍', leagueIds: ['afcon'] },
    { code: 'AS', name: 'Asia', flag: '🌏', leagueIds: ['asiancup'] },
];
//# sourceMappingURL=leagueDatabase.js.map