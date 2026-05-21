"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPersonality = getPersonality;
/**
 * Explicit personality profiles for marquee clubs. Each captures the team's
 * known real-world play identity (high press / counter / possession / etc.).
 * Clubs without an entry fall back to `derivePersonality()` which builds a
 * sensible profile from their numeric ratings.
 *
 * Values 0–100 unless noted; `currentForm` is -10..+10.
 */
const P = {
    // ─── Premier League ────────────────────────────────────────────────────
    mci: {
        attackStrength: 92, defenseStrength: 87, pressingIntensity: 80, possessionStyle: 95,
        passingSpeed: 85, counterAttackStrength: 70, finishing: 90, setPieceStrength: 82,
        goalkeeping: 86, aggression: 55, discipline: 78, currentForm: 5,
        injuryFactor: 30, fatigueFactor: 35,
    },
    liv: {
        attackStrength: 89, defenseStrength: 84, pressingIntensity: 95, possessionStyle: 70,
        passingSpeed: 88, counterAttackStrength: 85, finishing: 88, setPieceStrength: 80,
        goalkeeping: 84, aggression: 70, discipline: 70, currentForm: 4,
        injuryFactor: 45, fatigueFactor: 55,
    },
    ars: {
        attackStrength: 86, defenseStrength: 84, pressingIntensity: 75, possessionStyle: 82,
        passingSpeed: 80, counterAttackStrength: 75, finishing: 83, setPieceStrength: 78,
        goalkeeping: 82, aggression: 55, discipline: 75, currentForm: 3,
        injuryFactor: 35, fatigueFactor: 40,
    },
    che: {
        attackStrength: 81, defenseStrength: 80, pressingIntensity: 65, possessionStyle: 70,
        passingSpeed: 75, counterAttackStrength: 72, finishing: 80, setPieceStrength: 84,
        goalkeeping: 81, aggression: 60, discipline: 70, currentForm: 1,
        injuryFactor: 40, fatigueFactor: 45,
    },
    mun: {
        attackStrength: 83, defenseStrength: 79, pressingIntensity: 70, possessionStyle: 60,
        passingSpeed: 80, counterAttackStrength: 88, finishing: 84, setPieceStrength: 76,
        goalkeeping: 81, aggression: 65, discipline: 65, currentForm: 0,
        injuryFactor: 45, fatigueFactor: 50,
    },
    tot: {
        attackStrength: 82, defenseStrength: 76, pressingIntensity: 78, possessionStyle: 55,
        passingSpeed: 85, counterAttackStrength: 88, finishing: 83, setPieceStrength: 72,
        goalkeeping: 78, aggression: 60, discipline: 70, currentForm: 2,
        injuryFactor: 50, fatigueFactor: 55,
    },
    new: {
        attackStrength: 78, defenseStrength: 80, pressingIntensity: 72, possessionStyle: 55,
        passingSpeed: 70, counterAttackStrength: 76, finishing: 78, setPieceStrength: 82,
        goalkeeping: 80, aggression: 72, discipline: 65, currentForm: 1,
        injuryFactor: 45, fatigueFactor: 50,
    },
    whu: {
        attackStrength: 75, defenseStrength: 73, pressingIntensity: 55, possessionStyle: 50,
        passingSpeed: 65, counterAttackStrength: 70, finishing: 75, setPieceStrength: 80,
        goalkeeping: 75, aggression: 68, discipline: 62, currentForm: -1,
        injuryFactor: 50, fatigueFactor: 55,
    },
    // ─── La Liga ───────────────────────────────────────────────────────────
    rma: {
        attackStrength: 93, defenseStrength: 88, pressingIntensity: 70, possessionStyle: 78,
        passingSpeed: 85, counterAttackStrength: 90, finishing: 92, setPieceStrength: 84,
        goalkeeping: 88, aggression: 58, discipline: 75, currentForm: 6,
        injuryFactor: 35, fatigueFactor: 35,
    },
    bar: {
        attackStrength: 90, defenseStrength: 84, pressingIntensity: 78, possessionStyle: 95,
        passingSpeed: 90, counterAttackStrength: 72, finishing: 88, setPieceStrength: 78,
        goalkeeping: 84, aggression: 55, discipline: 75, currentForm: 4,
        injuryFactor: 40, fatigueFactor: 40,
    },
    atm: {
        attackStrength: 83, defenseStrength: 90, pressingIntensity: 75, possessionStyle: 45,
        passingSpeed: 65, counterAttackStrength: 85, finishing: 81, setPieceStrength: 82,
        goalkeeping: 86, aggression: 78, discipline: 60, currentForm: 2,
        injuryFactor: 40, fatigueFactor: 50,
    },
    sev: {
        attackStrength: 76, defenseStrength: 75, pressingIntensity: 60, possessionStyle: 60,
        passingSpeed: 70, counterAttackStrength: 70, finishing: 74, setPieceStrength: 75,
        goalkeeping: 76, aggression: 60, discipline: 70, currentForm: -1,
        injuryFactor: 45, fatigueFactor: 50,
    },
    val: {
        attackStrength: 73, defenseStrength: 72, pressingIntensity: 60, possessionStyle: 55,
        passingSpeed: 68, counterAttackStrength: 70, finishing: 72, setPieceStrength: 72,
        goalkeeping: 73, aggression: 60, discipline: 68, currentForm: 0,
        injuryFactor: 45, fatigueFactor: 50,
    },
    rso: {
        attackStrength: 76, defenseStrength: 77, pressingIntensity: 65, possessionStyle: 80,
        passingSpeed: 78, counterAttackStrength: 70, finishing: 75, setPieceStrength: 74,
        goalkeeping: 76, aggression: 50, discipline: 78, currentForm: 1,
        injuryFactor: 40, fatigueFactor: 45,
    },
    // ─── Bundesliga ────────────────────────────────────────────────────────
    bay: {
        attackStrength: 91, defenseStrength: 87, pressingIntensity: 82, possessionStyle: 88,
        passingSpeed: 88, counterAttackStrength: 80, finishing: 90, setPieceStrength: 80,
        goalkeeping: 88, aggression: 60, discipline: 75, currentForm: 5,
        injuryFactor: 40, fatigueFactor: 40,
    },
    bvb: {
        attackStrength: 85, defenseStrength: 78, pressingIntensity: 80, possessionStyle: 60,
        passingSpeed: 88, counterAttackStrength: 88, finishing: 84, setPieceStrength: 75,
        goalkeeping: 80, aggression: 65, discipline: 68, currentForm: 2,
        injuryFactor: 45, fatigueFactor: 50,
    },
    rbl: {
        attackStrength: 82, defenseStrength: 80, pressingIntensity: 90, possessionStyle: 60,
        passingSpeed: 85, counterAttackStrength: 85, finishing: 81, setPieceStrength: 76,
        goalkeeping: 80, aggression: 70, discipline: 70, currentForm: 2,
        injuryFactor: 45, fatigueFactor: 55,
    },
    lev: {
        attackStrength: 86, defenseStrength: 83, pressingIntensity: 78, possessionStyle: 82,
        passingSpeed: 85, counterAttackStrength: 78, finishing: 84, setPieceStrength: 80,
        goalkeeping: 82, aggression: 55, discipline: 78, currentForm: 4,
        injuryFactor: 35, fatigueFactor: 40,
    },
    sge: {
        attackStrength: 76, defenseStrength: 75, pressingIntensity: 65, possessionStyle: 50,
        passingSpeed: 70, counterAttackStrength: 75, finishing: 75, setPieceStrength: 82,
        goalkeeping: 75, aggression: 72, discipline: 65, currentForm: 0,
        injuryFactor: 50, fatigueFactor: 55,
    },
    // ─── Serie A ───────────────────────────────────────────────────────────
    juv: {
        attackStrength: 83, defenseStrength: 84, pressingIntensity: 55, possessionStyle: 60,
        passingSpeed: 70, counterAttackStrength: 82, finishing: 82, setPieceStrength: 80,
        goalkeeping: 85, aggression: 65, discipline: 75, currentForm: 1,
        injuryFactor: 40, fatigueFactor: 45,
    },
    mil: {
        attackStrength: 84, defenseStrength: 81, pressingIntensity: 75, possessionStyle: 65,
        passingSpeed: 80, counterAttackStrength: 82, finishing: 83, setPieceStrength: 78,
        goalkeeping: 82, aggression: 60, discipline: 72, currentForm: 3,
        injuryFactor: 40, fatigueFactor: 45,
    },
    int: {
        attackStrength: 87, defenseStrength: 86, pressingIntensity: 70, possessionStyle: 70,
        passingSpeed: 78, counterAttackStrength: 82, finishing: 86, setPieceStrength: 84,
        goalkeeping: 86, aggression: 62, discipline: 75, currentForm: 4,
        injuryFactor: 35, fatigueFactor: 40,
    },
    rom: {
        attackStrength: 79, defenseStrength: 78, pressingIntensity: 65, possessionStyle: 60,
        passingSpeed: 72, counterAttackStrength: 76, finishing: 78, setPieceStrength: 80,
        goalkeeping: 78, aggression: 70, discipline: 65, currentForm: 0,
        injuryFactor: 45, fatigueFactor: 50,
    },
    nap: {
        attackStrength: 85, defenseStrength: 80, pressingIntensity: 78, possessionStyle: 85,
        passingSpeed: 86, counterAttackStrength: 76, finishing: 84, setPieceStrength: 76,
        goalkeeping: 80, aggression: 58, discipline: 75, currentForm: 3,
        injuryFactor: 35, fatigueFactor: 40,
    },
    laz: {
        attackStrength: 78, defenseStrength: 77, pressingIntensity: 60, possessionStyle: 75,
        passingSpeed: 78, counterAttackStrength: 72, finishing: 78, setPieceStrength: 76,
        goalkeeping: 78, aggression: 60, discipline: 72, currentForm: 1,
        injuryFactor: 40, fatigueFactor: 45,
    },
    // ─── Ligue 1 ───────────────────────────────────────────────────────────
    psg: {
        attackStrength: 89, defenseStrength: 82, pressingIntensity: 65, possessionStyle: 78,
        passingSpeed: 85, counterAttackStrength: 88, finishing: 88, setPieceStrength: 78,
        goalkeeping: 83, aggression: 55, discipline: 72, currentForm: 4,
        injuryFactor: 40, fatigueFactor: 40,
    },
    mar: {
        attackStrength: 79, defenseStrength: 76, pressingIntensity: 72, possessionStyle: 55,
        passingSpeed: 75, counterAttackStrength: 78, finishing: 78, setPieceStrength: 76,
        goalkeeping: 77, aggression: 75, discipline: 60, currentForm: 1,
        injuryFactor: 45, fatigueFactor: 50,
    },
    lyo: {
        attackStrength: 77, defenseStrength: 75, pressingIntensity: 65, possessionStyle: 65,
        passingSpeed: 75, counterAttackStrength: 72, finishing: 77, setPieceStrength: 74,
        goalkeeping: 75, aggression: 58, discipline: 72, currentForm: 0,
        injuryFactor: 45, fatigueFactor: 50,
    },
    mon: {
        attackStrength: 80, defenseStrength: 77, pressingIntensity: 75, possessionStyle: 65,
        passingSpeed: 82, counterAttackStrength: 85, finishing: 79, setPieceStrength: 72,
        goalkeeping: 77, aggression: 60, discipline: 70, currentForm: 2,
        injuryFactor: 40, fatigueFactor: 45,
    },
    lil: {
        attackStrength: 76, defenseStrength: 78, pressingIntensity: 70, possessionStyle: 55,
        passingSpeed: 70, counterAttackStrength: 78, finishing: 76, setPieceStrength: 76,
        goalkeeping: 77, aggression: 65, discipline: 75, currentForm: 1,
        injuryFactor: 40, fatigueFactor: 50,
    },
};
/**
 * Returns the explicit personality for a team if defined, else derives one
 * from the team's numeric ratings + name heuristics. The derivation is
 * deterministic so the same team always produces the same personality.
 */
function getPersonality(team) {
    if (team.personality)
        return team.personality;
    const explicit = P[team.id];
    if (explicit)
        return explicit;
    return derivePersonality(team);
}
function derivePersonality(team) {
    const r = team.ratings;
    // Mid-spread used to nudge derived values up/down based on overall quality.
    const overall = (r.attack + r.defense + r.midfield) / 3;
    const bias = (overall - 75) / 2; // -ish range
    const clamp = (v) => Math.max(45, Math.min(95, Math.round(v)));
    return {
        attackStrength: clamp(r.attack),
        defenseStrength: clamp(r.defense),
        pressingIntensity: clamp(65 + bias / 2),
        possessionStyle: clamp(60 + (r.midfield - r.attack) / 2),
        passingSpeed: clamp(r.midfield),
        counterAttackStrength: clamp(60 + r.pace / 2),
        finishing: clamp(r.finishing),
        setPieceStrength: clamp(70 + bias / 3),
        goalkeeping: clamp(r.keeping),
        aggression: 65,
        discipline: 70,
        currentForm: r.form,
        injuryFactor: 45,
        fatigueFactor: 45,
    };
}
//# sourceMappingURL=teamPersonalities.js.map