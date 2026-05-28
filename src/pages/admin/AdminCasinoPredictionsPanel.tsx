/**
 * AdminCasinoPredictionsPanel
 *
 * Generates deterministic outcome predictions for casino-style games using a
 * daily seeded RNG (mulberry32). The seed rolls over at UTC midnight just like
 * virtual sports, so predictions stay consistent within a day and change the
 * next day. Admins can share these as engagement tips or "hot predictions".
 *
 * Games covered: Crash · Dice · Mines · Roulette · Plinko · Slots
 */

import { useMemo, useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Chip, Button, IconButton, Alert,
  FormControl, InputLabel, Select, MenuItem, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { neonGreen, neonGold, neonBlue, darkBorder, darkCard } from '../../theme';
import { useToasts } from '../../contexts/ToastContext';

// ─── Seeded RNG (mulberry32 — same algorithm as virtual-sports sims) ──────────

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** djb2 hash — same function used by virtual sports. */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Daily seed keyed by UTC date + game name. Rolls over at midnight UTC. */
function dailySeedFor(game: string): number {
  const d = new Date();
  const key = `${game}${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
  return hashStr(key);
}

/** Round number based on elapsed seconds from UTC midnight ÷ round interval. */
function currentRound(intervalSeconds: number): number {
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  return Math.floor((Date.now() - midnight.getTime()) / (intervalSeconds * 1000));
}

// ─── Crash ────────────────────────────────────────────────────────────────────

const CRASH_INTERVAL_S = 25; // approx seconds per round
const CRASH_HOUSE_EDGE = 0.04;
const CRASH_INSTA_BUST = 0.08;
const CRASH_MOONSHOT   = 0.04;

interface CrashRound { round: number; multiplier: number; label: string; tier: 'bust' | 'low' | 'mid' | 'high' | 'moon' }

function generateCrashMultiplier(rand: () => number): number {
  const r = rand();
  if (r < CRASH_INSTA_BUST) return 1.0 + rand() * 0.1;
  if (r < CRASH_INSTA_BUST + CRASH_MOONSHOT) return 10 + rand() * 20;
  const u = rand() * (1 - CRASH_HOUSE_EDGE);
  return Math.max(1.0, Math.min(50, 1 / (1 - u)));
}

function crashTier(m: number): CrashRound['tier'] {
  if (m < 1.3) return 'bust';
  if (m < 2)   return 'low';
  if (m < 5)   return 'mid';
  if (m < 10)  return 'high';
  return 'moon';
}

function crashColor(tier: CrashRound['tier']): string {
  if (tier === 'bust') return '#ff4757';
  if (tier === 'low')  return '#ff9f43';
  if (tier === 'mid')  return neonGold;
  if (tier === 'high') return neonGreen;
  return '#a855f7';
}

function buildCrashPredictions(count = 20): CrashRound[] {
  const seed  = dailySeedFor('crash');
  const start = currentRound(CRASH_INTERVAL_S);
  const rows: CrashRound[] = [];
  for (let i = 0; i < count; i++) {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    const m     = generateCrashMultiplier(rand);
    const tier  = crashTier(m);
    rows.push({ round, multiplier: m, label: m.toFixed(2) + 'x', tier });
  }
  return rows;
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

const DICE_INTERVAL_S = 10;

interface DiceRound { round: number; roll: number; over50: boolean; over75: boolean; under25: boolean }

function buildDicePredictions(count = 20): DiceRound[] {
  const seed  = dailySeedFor('dice');
  const start = currentRound(DICE_INTERVAL_S);
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    const roll  = Math.round(rand() * 10000) / 100;   // 0.00 – 100.00
    return { round, roll, over50: roll > 50, over75: roll > 75, under25: roll < 25 };
  });
}

// ─── Mines ────────────────────────────────────────────────────────────────────

const MINES_INTERVAL_S = 20;
const GRID_SIZE = 25;

interface MinesRound {
  round: number;
  mineCount: number;
  minePositions: number[];   // 0-based cell indices
  safePositions: number[];   // first 5 safe cells (good bet positions)
}

function buildMinesPredictions(mineCount: number, count = 15): MinesRound[] {
  const seed  = dailySeedFor(`mines_${mineCount}`);
  const start = currentRound(MINES_INTERVAL_S);
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    // Fisher-Yates to place mines
    const cells = Array.from({ length: GRID_SIZE }, (_, j) => j);
    for (let j = GRID_SIZE - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [cells[j], cells[k]] = [cells[k], cells[j]];
    }
    const minePositions = cells.slice(0, mineCount).sort((a, b) => a - b);
    const safePositions = cells.slice(mineCount, mineCount + 5);
    return { round, mineCount, minePositions, safePositions };
  });
}

// ─── Roulette ─────────────────────────────────────────────────────────────────

const ROULETTE_INTERVAL_S = 30;
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

interface RouletteRound {
  round: number;
  number: number;
  color: 'red' | 'black' | 'green';
  odd: boolean | null;
  dozen: '1st' | '2nd' | '3rd' | null;
  half: '1-18' | '19-36' | null;
}

function buildRoulettePredictions(count = 20): RouletteRound[] {
  const seed  = dailySeedFor('roulette');
  const start = currentRound(ROULETTE_INTERVAL_S);
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    const n     = Math.floor(rand() * 37);  // 0-36
    const color: RouletteRound['color'] = n === 0 ? 'green' : RED_NUMBERS.includes(n) ? 'red' : 'black';
    const odd: boolean | null = n === 0 ? null : n % 2 !== 0;
    const dozen: RouletteRound['dozen'] = n === 0 ? null : n <= 12 ? '1st' : n <= 24 ? '2nd' : '3rd';
    const half: RouletteRound['half']  = n === 0 ? null : n <= 18 ? '1-18' : '19-36';
    return { round, number: n, color, odd, dozen, half };
  });
}

// ─── Plinko ───────────────────────────────────────────────────────────────────

const PLINKO_INTERVAL_S = 8;
const PLINKO_ROWS = 12;
const PLINKO_MULTS: Record<string, number[]> = {
  Low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  Medium: [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,   13 ],
  High:   [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,   29 ],
};

interface PlinkoRound { round: number; bucket: number; multiplier: number; risk: string }

function buildPlinkoPredictions(risk: string, count = 20): PlinkoRound[] {
  const seed  = dailySeedFor(`plinko_${risk}`);
  const start = currentRound(PLINKO_INTERVAL_S);
  const mults = PLINKO_MULTS[risk] ?? PLINKO_MULTS.Medium;
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    let bucket  = 0;
    for (let row = 0; row < PLINKO_ROWS; row++) {
      if (rand() < 0.5) bucket++;
    }
    bucket = Math.min(bucket, mults.length - 1);
    return { round, bucket, multiplier: mults[bucket], risk };
  });
}

// ─── Slots ────────────────────────────────────────────────────────────────────

const SLOTS_INTERVAL_S = 12;
const SYMBOLS = ['7️⃣', '💎', '⭐', '🔔', '🍇', '🍊', '🍋', '🍒'];
const WEIGHTS  = [2, 4, 6, 7, 8, 10, 10, 8];
const SYM_MULT: Record<string, number> = {
  '7️⃣': 50, '💎': 20, '⭐': 10, '🔔': 5, '🍇': 3, '🍊': 2, '🍋': 1.5, '🍒': 1,
};
const TOTAL_W = WEIGHTS.reduce((a, b) => a + b, 0);

function pickSymbol(rand: () => number): string {
  let r = rand() * TOTAL_W;
  for (let i = 0; i < SYMBOLS.length; i++) { r -= WEIGHTS[i]; if (r <= 0) return SYMBOLS[i]; }
  return SYMBOLS[SYMBOLS.length - 1];
}

interface SlotsRound {
  round: number;
  grid: string[][];      // 3 rows × 5 cols
  topLine: string[];
  topWin: { symbol: string; count: number; mult: number } | null;
  bigWin: boolean;
}

function evalLine(row: string[]): { symbol: string; count: number; mult: number } | null {
  let count = 1;
  const sym = row[0];
  for (let c = 1; c < row.length; c++) { if (row[c] === sym) count++; else break; }
  if (count >= 3) return { symbol: sym, count, mult: SYM_MULT[sym] ?? 1 };
  return null;
}

function buildSlotsPredictions(count = 15): SlotsRound[] {
  const seed  = dailySeedFor('slots');
  const start = currentRound(SLOTS_INTERVAL_S);
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    const grid: string[][] = Array.from({ length: 3 }, () =>
      Array.from({ length: 5 }, () => pickSymbol(rand))
    );
    const topLine = grid[0];
    const topWin  = evalLine(topLine);
    const bigWin  = grid.some(row => evalLine(row)?.symbol === '7️⃣' || evalLine(row)?.symbol === '💎');
    return { round, grid, topLine, topWin, bigWin };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

type GameTab = 'crash' | 'dice' | 'mines' | 'roulette' | 'plinko' | 'slots';

export default function AdminCasinoPredictionsPanel() {
  const toasts = useToasts();
  const [tab, setTab]             = useState<GameTab>('crash');
  const [mineCount, setMineCount] = useState(3);
  const [plinkoRisk, setPlinkoRisk] = useState('Medium');

  const crashRows    = useMemo(() => buildCrashPredictions(20),              []);
  const diceRows     = useMemo(() => buildDicePredictions(20),               []);
  const minesRows    = useMemo(() => buildMinesPredictions(mineCount, 15),   [mineCount]);
  const rouletteRows = useMemo(() => buildRoulettePredictions(20),           []);
  const plinkoRows   = useMemo(() => buildPlinkoPredictions(plinkoRisk, 20), [plinkoRisk]);
  const slotsRows    = useMemo(() => buildSlotsPredictions(15),              []);

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text).then(
      () => toasts.success('Copied', label),
      () => toasts.error('Copy failed', 'Clipboard access blocked.'),
    );
  }

  function copyCrash() {
    copy(crashRows.map(r => `Round ${r.round}: ${r.label}`).join('\n'), `${crashRows.length} crash predictions`);
  }
  function copyDice() {
    copy(diceRows.map(r => `Roll ${r.round}: ${r.roll.toFixed(2)}`).join('\n'), `${diceRows.length} dice predictions`);
  }
  function copyMines() {
    copy(minesRows.map(r =>
      `Game ${r.round} (${r.mineCount} mines): Mines@[${r.minePositions.join(',')}]  Safe@[${r.safePositions.join(',')}]`
    ).join('\n'), `${minesRows.length} mines predictions`);
  }
  function copyRoulette() {
    copy(rouletteRows.map(r =>
      `Spin ${r.round}: ${r.number} ${r.color.toUpperCase()} ${r.odd == null ? '' : r.odd ? 'ODD' : 'EVEN'} ${r.dozen ?? ''}12`
    ).join('\n'), `${rouletteRows.length} roulette predictions`);
  }
  function copyPlinko() {
    copy(plinkoRows.map(r => `Drop ${r.round}: bucket ${r.bucket} → ${r.multiplier}x`).join('\n'), `${plinkoRows.length} plinko predictions`);
  }
  function copySlots() {
    copy(slotsRows.map(r =>
      `Spin ${r.round}: [${r.topLine.join(' ')}]${r.topWin ? ` → ${r.topWin.count}× ${r.topWin.symbol} (${r.topWin.mult}×)` : ' — no win'}`
    ).join('\n'), `${slotsRows.length} slots predictions`);
  }

  return (
    <Box>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, mb: 0.5 }}>
        Casino Game Predictions
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
        Upcoming round outcomes generated from today's daily seed.
        Resets at UTC midnight. Use as engagement tips or to share "hot predictions" with users.
      </Typography>

      <Alert
        icon={<LockIcon fontSize="small" />}
        severity="warning"
        sx={{
          mb: 2,
          background: alpha(neonGold, 0.07),
          border: `1px solid ${alpha(neonGold, 0.3)}`,
          '& .MuiAlert-icon': { color: neonGold },
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 0.25 }}>Deterministic daily seed</Typography>
        <Typography sx={{ fontSize: '0.78rem' }}>
          Outcomes are derived from a seeded RNG keyed to today's UTC date — the same
          technique used by the virtual sports engine. Round numbers advance as time passes.
          Nothing is stored; refresh regenerates from the same seed.
        </Typography>
      </Alert>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v as GameTab)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          borderBottom: `1px solid ${darkBorder}`,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', minWidth: 80 },
          '& .Mui-selected': { color: `${neonGreen} !important` },
          '& .MuiTabs-indicator': { backgroundColor: neonGreen },
        }}
      >
        <Tab value="crash"    label="🚀 Crash"    />
        <Tab value="dice"     label="🎲 Dice"     />
        <Tab value="mines"    label="💣 Mines"    />
        <Tab value="roulette" label="🎡 Roulette" />
        <Tab value="plinko"   label="📍 Plinko"   />
        <Tab value="slots"    label="🎰 Slots"    />
      </Tabs>

      {/* ── CRASH ─────────────────────────────────────────────────────── */}
      {tab === 'crash' && (
        <GameSection
          title="Crash — Next 20 rounds"
          subtitle={`Round interval ≈ ${CRASH_INTERVAL_S}s · Current round #${currentRound(CRASH_INTERVAL_S)}`}
          onCopyAll={copyCrash}
          count={crashRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Round</TableCell>
                <TableCell sx={thSx}>Multiplier</TableCell>
                <TableCell sx={thSx}>Tier</TableCell>
                <TableCell sx={thSx} align="right">Bet advice</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {crashRows.map(r => (
                <TableRow key={r.round} hover sx={{ '& td': { borderColor: darkBorder } }}>
                  <TableCell sx={tdSx}><code>#{r.round}</code></TableCell>
                  <TableCell sx={tdSx}>
                    <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: crashColor(r.tier) }}>
                      {r.label}
                    </Typography>
                  </TableCell>
                  <TableCell sx={tdSx}>
                    <Chip size="small" label={r.tier.toUpperCase()} sx={chipSx(crashColor(r.tier))} />
                  </TableCell>
                  <TableCell sx={tdSx} align="right">
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {r.tier === 'bust'  && 'Skip / no bet'}
                      {r.tier === 'low'   && 'Cash out at 1.2–1.4×'}
                      {r.tier === 'mid'   && 'Cash out at 1.8–2.5×'}
                      {r.tier === 'high'  && 'Let it ride to 4–6×'}
                      {r.tier === 'moon'  && '🚀 Moon! Hold for 8×+'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GameSection>
      )}

      {/* ── DICE ─────────────────────────────────────────────────────── */}
      {tab === 'dice' && (
        <GameSection
          title="Dice — Next 20 rolls"
          subtitle={`Roll interval ≈ ${DICE_INTERVAL_S}s · Current roll #${currentRound(DICE_INTERVAL_S)}`}
          onCopyAll={copyDice}
          count={diceRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Roll #</TableCell>
                <TableCell sx={thSx}>Result</TableCell>
                <TableCell sx={thSx}>Over 50?</TableCell>
                <TableCell sx={thSx}>Over 75?</TableCell>
                <TableCell sx={thSx}>Under 25?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diceRows.map(r => (
                <TableRow key={r.round} hover sx={{ '& td': { borderColor: darkBorder } }}>
                  <TableCell sx={tdSx}><code>#{r.round}</code></TableCell>
                  <TableCell sx={tdSx}>
                    <Typography sx={{ fontWeight: 900, fontSize: '0.92rem', color: neonGold, fontVariantNumeric: 'tabular-nums' }}>
                      {r.roll.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={tdSx}><YN yes={r.over50} /></TableCell>
                  <TableCell sx={tdSx}><YN yes={r.over75} /></TableCell>
                  <TableCell sx={tdSx}><YN yes={r.under25} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GameSection>
      )}

      {/* ── MINES ─────────────────────────────────────────────────────── */}
      {tab === 'mines' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Mine count</InputLabel>
              <Select value={mineCount} label="Mine count" onChange={e => setMineCount(Number(e.target.value))}>
                {[1, 2, 3, 5, 10, 15].map(n => (
                  <MenuItem key={n} value={n}>{n} mine{n > 1 ? 's' : ''}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <GameSection
            title={`Mines (${mineCount} mines) — Next 15 games`}
            subtitle={`Game interval ≈ ${MINES_INTERVAL_S}s · Current game #${currentRound(MINES_INTERVAL_S)}`}
            onCopyAll={copyMines}
            count={minesRows.length}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Game #</TableCell>
                  <TableCell sx={thSx}>Mine cells (0-based)</TableCell>
                  <TableCell sx={thSx}>First 5 safe cells ✓</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {minesRows.map(r => (
                  <TableRow key={r.round} hover sx={{ '& td': { borderColor: darkBorder } }}>
                    <TableCell sx={tdSx}><code>#{r.round}</code></TableCell>
                    <TableCell sx={tdSx}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                        {r.minePositions.map(p => (
                          <Chip key={p} size="small" label={p}
                            sx={{ ...chipSx('#ff4757'), height: 20, fontSize: '0.68rem' }} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={tdSx}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.4 }}>
                        {r.safePositions.map(p => (
                          <Chip key={p} size="small" label={p}
                            sx={{ ...chipSx(neonGreen), height: 20, fontSize: '0.68rem' }} />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </GameSection>
        </Box>
      )}

      {/* ── ROULETTE ──────────────────────────────────────────────────── */}
      {tab === 'roulette' && (
        <GameSection
          title="Roulette — Next 20 spins"
          subtitle={`Spin interval ≈ ${ROULETTE_INTERVAL_S}s · Current spin #${currentRound(ROULETTE_INTERVAL_S)}`}
          onCopyAll={copyRoulette}
          count={rouletteRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Spin #</TableCell>
                <TableCell sx={thSx}>Number</TableCell>
                <TableCell sx={thSx}>Color</TableCell>
                <TableCell sx={thSx}>Odd/Even</TableCell>
                <TableCell sx={thSx}>Dozen</TableCell>
                <TableCell sx={thSx}>Half</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rouletteRows.map(r => {
                const numColor = r.color === 'green' ? neonGreen : r.color === 'red' ? '#ff4757' : '#aaa';
                return (
                  <TableRow key={r.round} hover sx={{ '& td': { borderColor: darkBorder } }}>
                    <TableCell sx={tdSx}><code>#{r.round}</code></TableCell>
                    <TableCell sx={tdSx}>
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: '50%',
                        background: numColor, color: r.color === 'black' ? '#fff' : '#000',
                        fontWeight: 900, fontSize: '0.8rem',
                      }}>
                        {r.number}
                      </Box>
                    </TableCell>
                    <TableCell sx={tdSx}>
                      <Chip size="small" label={r.color.toUpperCase()} sx={chipSx(numColor)} />
                    </TableCell>
                    <TableCell sx={tdSx}>
                      {r.odd == null ? <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>—</Typography>
                        : <YN yes={r.odd} label={r.odd ? 'ODD' : 'EVEN'} />}
                    </TableCell>
                    <TableCell sx={tdSx}>
                      {r.dozen ? <Chip size="small" label={`${r.dozen} 12`} sx={chipSx(neonBlue)} /> : '—'}
                    </TableCell>
                    <TableCell sx={tdSx}>
                      {r.half ? <Chip size="small" label={r.half} sx={chipSx(neonGold)} /> : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </GameSection>
      )}

      {/* ── PLINKO ────────────────────────────────────────────────────── */}
      {tab === 'plinko' && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Risk level</InputLabel>
              <Select value={plinkoRisk} label="Risk level" onChange={e => setPlinkoRisk(e.target.value)}>
                {['Low', 'Medium', 'High'].map(r => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <GameSection
            title={`Plinko (${plinkoRisk} risk) — Next 20 drops`}
            subtitle={`Drop interval ≈ ${PLINKO_INTERVAL_S}s · Current drop #${currentRound(PLINKO_INTERVAL_S)}`}
            onCopyAll={copyPlinko}
            count={plinkoRows.length}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Drop #</TableCell>
                  <TableCell sx={thSx}>Bucket (0–8)</TableCell>
                  <TableCell sx={thSx}>Multiplier</TableCell>
                  <TableCell sx={thSx}>Position</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plinkoRows.map(r => {
                  const isEdge = r.bucket === 0 || r.bucket === 8;
                  const isMid  = r.bucket === 4;
                  const tone   = isEdge ? '#a855f7' : isMid ? '#ff6b7a' : r.multiplier >= 2 ? neonGold : neonBlue;
                  return (
                    <TableRow key={r.round} hover sx={{ '& td': { borderColor: darkBorder } }}>
                      <TableCell sx={tdSx}><code>#{r.round}</code></TableCell>
                      <TableCell sx={tdSx}>
                        <Typography sx={{ fontWeight: 800, color: tone }}>{r.bucket}</Typography>
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Chip size="small" label={`${r.multiplier}×`} sx={chipSx(tone)} />
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {isEdge ? '🔥 Edge bucket — high payout' : isMid ? 'Centre — lowest return' : 'Mid bucket'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </GameSection>
        </Box>
      )}

      {/* ── SLOTS ─────────────────────────────────────────────────────── */}
      {tab === 'slots' && (
        <GameSection
          title="Slots — Next 15 spins (top payline)"
          subtitle={`Spin interval ≈ ${SLOTS_INTERVAL_S}s · Current spin #${currentRound(SLOTS_INTERVAL_S)}`}
          onCopyAll={copySlots}
          count={slotsRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Spin #</TableCell>
                <TableCell sx={thSx}>Top row</TableCell>
                <TableCell sx={thSx}>Top payline result</TableCell>
                <TableCell sx={thSx}>Big win?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slotsRows.map(r => (
                <TableRow key={r.round} hover sx={{ '& td': { borderColor: darkBorder } }}>
                  <TableCell sx={tdSx}><code>#{r.round}</code></TableCell>
                  <TableCell sx={tdSx}>
                    <Typography sx={{ fontSize: '1rem', letterSpacing: 4 }}>
                      {r.topLine.join(' ')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={tdSx}>
                    {r.topWin ? (
                      <Chip
                        size="small"
                        label={`${r.topWin.count}× ${r.topWin.symbol} → ${r.topWin.mult}×`}
                        sx={chipSx(neonGreen)}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>No match</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={tdSx}>
                    {r.bigWin
                      ? <Chip size="small" icon={<FlashOnIcon sx={{ fontSize: 14 }} />} label="BIG WIN" sx={chipSx('#a855f7')} />
                      : <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>—</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GameSection>
      )}
    </Box>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function GameSection({
  title, subtitle, onCopyAll, count, children,
}: {
  title: string; subtitle: string; onCopyAll: () => void; count: number;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{subtitle}</Typography>
        </Box>
        <Tooltip title="Copy all predictions as text">
          <Button
            size="small"
            variant="outlined"
            startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
            onClick={onCopyAll}
            sx={{ borderColor: alpha(neonGreen, 0.4), color: neonGreen, fontSize: '0.75rem' }}
          >
            Copy {count}
          </Button>
        </Tooltip>
      </Box>
      <Box sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${darkBorder}`, background: darkCard }}>
        {children}
      </Box>
    </Box>
  );
}

function YN({ yes, label }: { yes: boolean; label?: string }) {
  return (
    <Chip
      size="small"
      label={label ?? (yes ? 'Yes' : 'No')}
      sx={chipSx(yes ? neonGreen : '#ff6b7a')}
    />
  );
}

function chipSx(tone: string) {
  return {
    background: alpha(tone, 0.12), color: tone,
    border: `1px solid ${alpha(tone, 0.3)}`,
    fontWeight: 800, fontSize: '0.7rem', height: 22,
  };
}

const thSx = {
  fontWeight: 800, fontSize: '0.72rem',
  color: 'text.disabled', letterSpacing: '0.05em',
  borderColor: darkBorder, background: alpha('#fff', 0.02),
};

const tdSx = { fontSize: '0.82rem', py: 1, borderColor: darkBorder };
