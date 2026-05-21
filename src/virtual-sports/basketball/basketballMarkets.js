"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectBasketball = projectBasketball;
exports.normalCdf = normalCdf;
exports.buildBasketballMarkets = buildBasketballMarkets;
const oddsEngine_1 = require("../core/oddsEngine");
const teamDatabase_1 = require("../core/teamDatabase");
const BASE_TOTAL_POINTS = 220; // mean points per game (both teams combined)
const POINT_DIFF_STD = 11; // std-dev of margin
const TOTAL_POINTS_STD = 13;
function projectBasketball(home, away) {
    const homePower = (0, teamDatabase_1.teamStrength)(home) + 3; // home-court advantage
    const awayPower = (0, teamDatabase_1.teamStrength)(away);
    const diffMean = (homePower - awayPower) * 0.55;
    const totalMean = BASE_TOTAL_POINTS + ((home.ratings.attack + away.ratings.attack) - (home.ratings.defense + away.ratings.defense)) * 0.35;
    return {
        homeMean: (totalMean + diffMean) / 2,
        awayMean: (totalMean - diffMean) / 2,
        diffMean,
        diffStd: POINT_DIFF_STD,
        totalMean,
        totalStd: TOTAL_POINTS_STD,
    };
}
// Standard normal CDF approximation.
function normalCdf(x, mean = 0, std = 1) {
    const z = (x - mean) / std;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
}
function makeMarket(matchId, idSuffix, category, label, options) {
    return { id: `${matchId}-${idSuffix}`, matchId, category, label, options, status: 'open' };
}
function makeOptions(probs, overround = oddsEngine_1.DEFAULT_OVERROUND) {
    const odds = (0, oddsEngine_1.probabilitiesToOdds)(probs.map(p => p.p), overround);
    return probs.map((p, i) => ({ id: p.id, label: p.label, shortLabel: p.shortLabel, odds: odds[i] }));
}
function buildBasketballMarkets(matchId, home, away) {
    const proj = projectBasketball(home, away);
    const pHomeWin = 1 - normalCdf(0, proj.diffMean, proj.diffStd);
    const pAwayWin = 1 - pHomeWin;
    const markets = [];
    // Winner (no draws in basketball)
    markets.push(makeMarket(matchId, 'winner', 'WINNER', 'Match Winner', makeOptions([
        { id: 'home', label: home.shortName, shortLabel: '1', p: pHomeWin },
        { id: 'away', label: away.shortName, shortLabel: '2', p: pAwayWin },
    ])));
    // Spread — common lines around the projected margin
    const spreadCenter = Math.round(proj.diffMean * 2) / 2;
    for (const offset of [-6.5, -3.5, 0.5, 3.5, 6.5]) {
        const line = spreadCenter + offset;
        if (Math.abs(line) > 18)
            continue;
        const pHome = 1 - normalCdf(line, proj.diffMean, proj.diffStd);
        markets.push(makeMarket(matchId, `spread-${line}`, 'SPREAD', `Spread (${formatSpread(line)})`, makeOptions([
            { id: 'home', label: `${home.abbr} ${formatSpread(-line)}`, p: pHome },
            { id: 'away', label: `${away.abbr} ${formatSpread(line)}`, p: 1 - pHome },
        ])));
    }
    // Total points
    const totalCenter = Math.round(proj.totalMean / 5) * 5;
    for (const offset of [-10, -5, 0, 5, 10]) {
        const line = totalCenter + offset - 0.5;
        const pOver = 1 - normalCdf(line, proj.totalMean, proj.totalStd);
        markets.push(makeMarket(matchId, `total-${line}`, 'TOTAL_POINTS', `Total Points — Over/Under ${line}`, makeOptions([
            { id: 'over', label: `Over ${line}`, p: pOver },
            { id: 'under', label: `Under ${line}`, p: 1 - pOver },
        ])));
    }
    // Team Totals
    for (const side of ['home', 'away']) {
        const team = side === 'home' ? home : away;
        const mean = side === 'home' ? proj.homeMean : proj.awayMean;
        const center = Math.round(mean / 5) * 5;
        for (const offset of [-5, 0, 5]) {
            const line = center + offset - 0.5;
            const pOver = 1 - normalCdf(line, mean, TOTAL_POINTS_STD * 0.75);
            markets.push(makeMarket(matchId, `tt-${side}-${line}`, 'TEAM_TOTAL', `${team.shortName} — Over/Under ${line}`, makeOptions([
                { id: 'over', label: `Over ${line}`, p: pOver },
                { id: 'under', label: `Under ${line}`, p: 1 - pOver },
            ])));
        }
    }
    // 1st Quarter Winner – pulled toward 50/50 because of small-sample variance
    const pQ1Home = 0.5 + (pHomeWin - 0.5) * 0.6;
    markets.push(makeMarket(matchId, 'q1-winner', 'PERIOD_WINNER', '1st Quarter Winner', makeOptions([
        { id: 'home', label: home.shortName, shortLabel: '1', p: pQ1Home },
        { id: 'away', label: away.shortName, shortLabel: '2', p: 1 - pQ1Home },
    ])));
    // Halftime Result — also pulled toward 50/50 a bit
    const pHtHome = 0.5 + (pHomeWin - 0.5) * 0.75;
    markets.push(makeMarket(matchId, 'ht-winner', 'HALF_TIME', 'Halftime Winner', makeOptions([
        { id: 'home', label: home.shortName, shortLabel: '1', p: pHtHome },
        { id: 'away', label: away.shortName, shortLabel: '2', p: 1 - pHtHome },
    ])));
    return { markets, projection: proj };
}
function formatSpread(n) {
    if (n > 0)
        return `+${n}`;
    return `${n}`;
}
//# sourceMappingURL=basketballMarkets.js.map