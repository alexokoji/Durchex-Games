"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_ODDS = exports.MIN_ODDS = exports.DEFAULT_OVERROUND = void 0;
exports.clampOdds = clampOdds;
exports.probabilitiesToOdds = probabilitiesToOdds;
exports.decimalToFractional = decimalToFractional;
exports.decimalToAmerican = decimalToAmerican;
exports.formatOdds = formatOdds;
exports.calculateMultiOdds = calculateMultiOdds;
exports.calculatePayout = calculatePayout;
exports.calculateProfit = calculateProfit;
exports.nCk = nCk;
exports.calculateSystemBet = calculateSystemBet;
exports.clashesWith = clashesWith;
exports.DEFAULT_OVERROUND = 1.06;
exports.MIN_ODDS = 1.01;
exports.MAX_ODDS = 999;
function clampOdds(d) {
    if (!isFinite(d) || d <= 1)
        return exports.MIN_ODDS;
    return Math.min(exports.MAX_ODDS, Math.max(exports.MIN_ODDS, d));
}
// Convert raw probabilities (sum may differ from 1) into bookmaker odds
// with the requested overround (house margin). 1.06 means a 6% margin.
function probabilitiesToOdds(probs, overround = exports.DEFAULT_OVERROUND) {
    const sum = probs.reduce((s, p) => s + p, 0);
    if (sum <= 0)
        return probs.map(() => exports.MIN_ODDS);
    const normalized = probs.map(p => p / sum);
    return normalized.map(p => {
        const fair = 1 / Math.max(0.0001, p);
        return clampOdds(fair / overround);
    });
}
function decimalToFractional(decimal) {
    const d = decimal - 1;
    if (d <= 0)
        return '0/1';
    // simple continued-fraction approximation
    let num = Math.round(d * 100);
    let den = 100;
    const g = gcd(num, den);
    num /= g;
    den /= g;
    return `${num}/${den}`;
}
function decimalToAmerican(decimal) {
    if (decimal >= 2) {
        return `+${Math.round((decimal - 1) * 100)}`;
    }
    return `${Math.round(-100 / (decimal - 1))}`;
}
function formatOdds(decimal, format) {
    switch (format) {
        case 'fractional': return decimalToFractional(decimal);
        case 'american': return decimalToAmerican(decimal);
        case 'decimal':
        default: return decimal.toFixed(2);
    }
}
function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
        [a, b] = [b, a % b];
    }
    return a || 1;
}
// Accumulator (multi) odds = product of every selection's decimal odds.
function calculateMultiOdds(selections) {
    if (selections.length === 0)
        return 0;
    return clampOdds(selections.reduce((p, s) => p * s.odds, 1));
}
function calculatePayout(stake, decimalOdds) {
    if (stake <= 0 || decimalOdds <= 1)
        return 0;
    return stake * decimalOdds;
}
function calculateProfit(stake, decimalOdds) {
    return Math.max(0, calculatePayout(stake, decimalOdds) - stake);
}
// nCk
function nCk(n, k) {
    if (k < 0 || k > n)
        return 0;
    if (k === 0 || k === n)
        return 1;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 1; i <= k; i++)
        r = (r * (n - k + i)) / i;
    return Math.round(r);
}
// "System k/n" – e.g., 2/3 means every 2-of-3 combination becomes a multi
function calculateSystemBet(selections, k, perLineStake) {
    const n = selections.length;
    const lines = nCk(n, k);
    const totalStake = perLineStake * lines;
    // worst case ignored – we compute the all-wins payout
    // pick highest-odds k combinations as the upper bound, but real bookies pay
    // *every* winning k-combination; here we approximate full-win = all multis.
    // For a tighter bound: sum of all kCn combinations' products.
    if (lines === 0) {
        return { lines: 0, perLineStake, totalStake: 0, maxPayout: 0 };
    }
    const maxPayout = sumOfCombinationProducts(selections.map(s => s.odds), k) * perLineStake;
    return { lines, perLineStake, totalStake, maxPayout };
}
function sumOfCombinationProducts(odds, k) {
    const n = odds.length;
    if (k <= 0 || k > n)
        return 0;
    const indices = Array.from({ length: k }, (_, i) => i);
    let total = 0;
    while (true) {
        let prod = 1;
        for (const i of indices)
            prod *= odds[i];
        total += prod;
        let i = k - 1;
        while (i >= 0 && indices[i] === n - k + i)
            i--;
        if (i < 0)
            break;
        indices[i]++;
        for (let j = i + 1; j < k; j++)
            indices[j] = indices[j - 1] + 1;
    }
    return total;
}
function clashesWith(a, b) {
    // Two selections from the same market (same match + market) cannot both be on a multi.
    return a.matchId === b.matchId && a.marketId === b.marketId;
}
//# sourceMappingURL=oddsEngine.js.map