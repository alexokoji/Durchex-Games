/**
 * seededGameRng
 *
 * Shared deterministic RNG utilities used by both casino games and the admin
 * predictions panel. Both sides import from here, so admin round predictions
 * exactly match the outcomes players actually see in-game.
 *
 * Algorithm : mulberry32 — same as the virtual-sports prediction engine.
 * Round index: floor(elapsed-since-midnight-UTC / intervalMs)
 *
 * Every game uses a (daily seed) XOR (round number × Knuth constant) so that
 * different rounds of the same game produce independent pseudo-random streams.
 */

// ─── Core RNG ─────────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** djb2 hash — same function used by virtual-sports sims. */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Daily seed keyed by UTC date + game name. Rolls over at midnight UTC. */
export function dailySeedFor(game: string): number {
  const d = new Date();
  const key = `${game}${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
  return hashStr(key);
}

/** Round number based on elapsed seconds from UTC midnight ÷ round interval. */
export function currentRound(intervalSeconds: number): number {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  return Math.floor((Date.now() - midnight.getTime()) / (intervalSeconds * 1000));
}

/** Create a seeded rand function for the current round of a game. */
export function roundRandFor(game: string, intervalSeconds: number): () => number {
  const seed  = dailySeedFor(game);
  const round = currentRound(intervalSeconds);
  return mulberry32(seed ^ (round * 2654435761));
}

// ─── Crash ────────────────────────────────────────────────────────────────────

export const CRASH_INTERVAL_S  = 25;
export const CRASH_HOUSE_EDGE  = 0.01;  // matches useGameConfig default
export const CRASH_INSTA_BUST  = 0.05;  // matches useGameConfig default
export const CRASH_MOONSHOT    = 0.05;  // matches useGameConfig default

/**
 * Generate a crash multiplier from a seeded rand function.
 * The optional `opts` let callers substitute admin-configured knobs;
 * omit them (or leave a field undefined) to use the shared defaults above.
 */
export function generateCrashMultiplier(
  rand: () => number,
  opts?: { houseEdge?: number; instaBustRate?: number; moonshotRate?: number },
): number {
  const houseEdge     = opts?.houseEdge     ?? CRASH_HOUSE_EDGE;
  const instaBustRate = opts?.instaBustRate ?? CRASH_INSTA_BUST;
  const moonshotRate  = opts?.moonshotRate  ?? CRASH_MOONSHOT;

  const r = rand();
  if (r < instaBustRate)                    return 1.0 + rand() * 0.1;
  if (r < instaBustRate + moonshotRate)     return 10  + rand() * 20;
  const u = rand() * (1 - houseEdge);
  return Math.max(1.0, Math.min(50, 1 / (1 - u)));
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

export const DICE_INTERVAL_S = 10;

// ─── Mines ────────────────────────────────────────────────────────────────────

export const MINES_INTERVAL_S = 20;

/**
 * Generate a boolean[] mine map using a seeded rand (Fisher-Yates).
 * Replaces the while-loop approach from MinesGame.tsx so both the game
 * and the admin panel produce identical mine layouts for the same round.
 */
export function generateSeededMines(
  totalCells: number,
  mineCount: number,
  rand: () => number,
): boolean[] {
  // Fisher-Yates on indices, take the first mineCount as mine positions.
  const cells = Array.from({ length: totalCells }, (_, i) => i);
  for (let j = totalCells - 1; j > 0; j--) {
    const k = Math.floor(rand() * (j + 1));
    [cells[j], cells[k]] = [cells[k], cells[j]];
  }
  const mines = new Array<boolean>(totalCells).fill(false);
  for (let i = 0; i < mineCount; i++) mines[cells[i]] = true;
  return mines;
}

// ─── Roulette ─────────────────────────────────────────────────────────────────

export const ROULETTE_INTERVAL_S = 30;

// ─── Plinko ───────────────────────────────────────────────────────────────────

export const PLINKO_INTERVAL_S = 8;
export const PLINKO_ROWS       = 12;

/**
 * Simulate a 12-row Plinko path and return the 0-based bucket index.
 * Uses a binary-tree walk (right with p=0.5 at each row) which gives a
 * binomial(12, 0.5) distribution, then clamps to [0, maxBucket].
 */
export function seededPlinkoBucket(rand: () => number, maxBucket = 8): number {
  let bucket = 0;
  for (let row = 0; row < PLINKO_ROWS; row++) {
    if (rand() < 0.5) bucket++;
  }
  return Math.min(bucket, maxBucket);
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export const SLOTS_INTERVAL_S = 12;

/**
 * Canonical symbol list and weights — must match SlotsGame.tsx exactly so
 * the same seeded rand produces the same symbol on both sides.
 */
export const SLOTS_SYMBOLS = ['7️⃣', '🍒', '🍋', '🍊', '🍇', '💎', '⭐', '🔔'] as const;
export const SLOTS_WEIGHTS = [2, 8, 10, 10, 8, 4, 6, 7] as const;
const SLOTS_TOTAL_W = (SLOTS_WEIGHTS as readonly number[]).reduce((a, b) => a + b, 0);

export function pickSlotSymbol(rand: () => number): string {
  let r = rand() * SLOTS_TOTAL_W;
  for (let i = 0; i < SLOTS_SYMBOLS.length; i++) {
    r -= SLOTS_WEIGHTS[i];
    if (r <= 0) return SLOTS_SYMBOLS[i];
  }
  return SLOTS_SYMBOLS[SLOTS_SYMBOLS.length - 1];
}

export function generateSlotsGrid(rand: () => number, rows = 3, cols = 5): string[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => pickSlotSymbol(rand)),
  );
}
