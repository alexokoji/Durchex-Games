/**
 * AdminCasinoPredictionsPanel
 *
 * Shows deterministic round predictions for all 6 casino games.
 * Each row displays the exact local time-window when that round plays so
 * predictions are immediately actionable ("play dice at 14:23:40").
 *
 * The seeded RNG is shared with the games via seededGameRng.ts, so the
 * predicted outcome is exactly what the player will see when they play
 * inside that time window.
 */

import { useMemo, useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Chip, Button, Alert,
  FormControl, InputLabel, Select, MenuItem, Tooltip,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { neonGreen, neonGold, neonBlue, darkBorder, darkCard } from '../../theme';
import { useToasts } from '../../contexts/ToastContext';
import {
  mulberry32,
  dailySeedFor, currentRound,
  CRASH_INTERVAL_S, generateCrashMultiplier,
  DICE_INTERVAL_S,
  MINES_INTERVAL_S, generateSeededMines,
  ROULETTE_INTERVAL_S,
  PLINKO_INTERVAL_S, seededPlinkoBucket,
  SLOTS_INTERVAL_S, generateSlotsGrid,
} from '../../utils/seededGameRng';

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** UTC midnight for today in milliseconds. */
function midnightMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** Start time (ms) of a given round. */
function roundStartMs(round: number, intervalSeconds: number): number {
  return midnightMs() + round * intervalSeconds * 1000;
}

/** Format a UTC-ms timestamp as local HH:MM:SS. */
function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

/** Human-readable countdown to / from a round start. */
function countdownLabel(timeMs: number, intervalMs: number, nowMs: number): string {
  const endMs = timeMs + intervalMs;
  if (nowMs >= timeMs && nowMs < endMs) {
    const secsLeft = Math.round((endMs - nowMs) / 1000);
    return `▶ ends in ${secsLeft}s`;
  }
  const delta = Math.round((timeMs - nowMs) / 1000);
  if (delta < 0) return `${-delta}s ago`;
  if (delta === 0) return '▶ NOW';
  return `in ${delta}s`;
}

function isCurrentRound(timeMs: number, intervalMs: number, nowMs: number): boolean {
  return nowMs >= timeMs && nowMs < timeMs + intervalMs;
}

// ─── Shared constants ─────────────────────────────────────────────────────────

const PLINKO_MULTS: Record<string, number[]> = {
  Low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  Medium: [13,  3,   1.3, 0.7, 0.4, 0.7, 1.3, 3,   13 ],
  High:   [29,  4,   1.5, 0.3, 0.2, 0.3, 1.5, 4,   29 ],
};
const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const SYM_MULT: Record<string, number> = {
  '7️⃣': 50, '💎': 20, '⭐': 10, '🔔': 5, '🍇': 3, '🍊': 2, '🍋': 1.5, '🍒': 1,
};

// ─── Data types ───────────────────────────────────────────────────────────────

interface BaseRound { round: number; timeMs: number }
interface CrashRound  extends BaseRound { multiplier: number; label: string; tier: 'bust'|'low'|'mid'|'high'|'moon' }
interface DiceRound   extends BaseRound { roll: number; over50: boolean; over75: boolean; under25: boolean }
interface MinesRound  extends BaseRound { mineCount: number; minePositions: number[]; safePositions: number[] }
interface RouletteRound extends BaseRound {
  number: number; color: 'red'|'black'|'green';
  odd: boolean|null; dozen: '1st'|'2nd'|'3rd'|null; half: '1-18'|'19-36'|null;
}
interface PlinkoRound  extends BaseRound { bucket: number; multiplier: number; risk: string }
interface SlotsRound   extends BaseRound {
  grid: string[][]; topLine: string[];
  topWin: { symbol: string; count: number; mult: number } | null;
  bigWin: boolean;
}

// ─── Prediction builders (include past round so admins can verify) ────────────

function buildCrashPredictions(count = 22): CrashRound[] {
  const seed   = dailySeedFor('crash');
  const start  = currentRound(CRASH_INTERVAL_S) - 1;          // -1 = last round (verify)
  const intMs  = CRASH_INTERVAL_S * 1000;
  return Array.from({ length: count }, (_, i) => {
    const round  = start + i;
    const rand   = mulberry32(seed ^ (round * 2654435761));
    const m      = generateCrashMultiplier(rand);
    const tier   = crashTier(m);
    return { round, timeMs: midnightMs() + round * intMs, multiplier: m, label: m.toFixed(2) + 'x', tier };
  });
}

function buildDicePredictions(count = 22): DiceRound[] {
  const seed   = dailySeedFor('dice');
  const start  = currentRound(DICE_INTERVAL_S) - 1;
  const intMs  = DICE_INTERVAL_S * 1000;
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    const roll  = Math.round(rand() * 10000) / 100;
    return { round, timeMs: midnightMs() + round * intMs, roll, over50: roll > 50, over75: roll > 75, under25: roll < 25 };
  });
}

const GRID_SIZE = 25;

function buildMinesPredictions(mineCount: number, count = 17): MinesRound[] {
  const seed  = dailySeedFor(`mines_${mineCount}`);
  const start = currentRound(MINES_INTERVAL_S) - 1;
  const intMs = MINES_INTERVAL_S * 1000;
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    const mines = generateSeededMines(GRID_SIZE, mineCount, rand);
    const minePositions = mines.map((v, idx) => v ? idx : -1).filter(v => v >= 0).sort((a, b) => a - b);
    const safePositions: number[] = [];
    for (let idx = 0; idx < GRID_SIZE && safePositions.length < 5; idx++) {
      if (!mines[idx]) safePositions.push(idx);
    }
    return { round, timeMs: midnightMs() + round * intMs, mineCount, minePositions, safePositions };
  });
}

function buildRoulettePredictions(count = 22): RouletteRound[] {
  const seed  = dailySeedFor('roulette');
  const start = currentRound(ROULETTE_INTERVAL_S) - 1;
  const intMs = ROULETTE_INTERVAL_S * 1000;
  return Array.from({ length: count }, (_, i) => {
    const round = start + i;
    const rand  = mulberry32(seed ^ (round * 2654435761));
    const n     = Math.floor(rand() * 37);
    const color: RouletteRound['color'] = n === 0 ? 'green' : RED_NUMBERS.includes(n) ? 'red' : 'black';
    return {
      round, timeMs: midnightMs() + round * intMs, number: n, color,
      odd:   n === 0 ? null : n % 2 !== 0,
      dozen: n === 0 ? null : n <= 12 ? '1st' : n <= 24 ? '2nd' : '3rd',
      half:  n === 0 ? null : n <= 18 ? '1-18' : '19-36',
    };
  });
}

function buildPlinkoPredictions(risk: string, count = 22): PlinkoRound[] {
  const seed  = dailySeedFor(`plinko_${risk}`);
  const start = currentRound(PLINKO_INTERVAL_S) - 1;
  const intMs = PLINKO_INTERVAL_S * 1000;
  const mults = PLINKO_MULTS[risk] ?? PLINKO_MULTS.Medium;
  return Array.from({ length: count }, (_, i) => {
    const round  = start + i;
    const rand   = mulberry32(seed ^ (round * 2654435761));
    const bucket = seededPlinkoBucket(rand, mults.length - 1);
    return { round, timeMs: midnightMs() + round * intMs, bucket, multiplier: mults[bucket], risk };
  });
}

function evalLine(row: string[]): { symbol: string; count: number; mult: number } | null {
  let count = 1; const sym = row[0];
  for (let c = 1; c < row.length; c++) { if (row[c] === sym) count++; else break; }
  if (count >= 3) return { symbol: sym, count, mult: SYM_MULT[sym] ?? 1 };
  return null;
}

function buildSlotsPredictions(count = 17): SlotsRound[] {
  const seed  = dailySeedFor('slots');
  const start = currentRound(SLOTS_INTERVAL_S) - 1;
  const intMs = SLOTS_INTERVAL_S * 1000;
  return Array.from({ length: count }, (_, i) => {
    const round   = start + i;
    const rand    = mulberry32(seed ^ (round * 2654435761));
    const grid    = generateSlotsGrid(rand);
    const topLine = grid[0];
    const topWin  = evalLine(topLine);
    const bigWin  = grid.some(row => evalLine(row)?.symbol === '7️⃣' || evalLine(row)?.symbol === '💎');
    return { round, timeMs: midnightMs() + round * intMs, grid, topLine, topWin, bigWin };
  });
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

type GameTab = 'crash' | 'dice' | 'mines' | 'roulette' | 'plinko' | 'slots';

export default function AdminCasinoPredictionsPanel() {
  const toasts = useToasts();
  const [tab, setTab]             = useState<GameTab>('crash');
  const [mineCount, setMineCount] = useState(3);
  const [plinkoRisk, setPlinkoRisk] = useState('Medium');

  // Live clock — ticks every second so countdown labels stay current.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Predictions rebuild every 5 s so the NOW row advances automatically.
  const refreshKey = Math.floor(nowMs / 5000);

  const crashRows    = useMemo(() => buildCrashPredictions(22),             [refreshKey]);          // eslint-disable-line react-hooks/exhaustive-deps
  const diceRows     = useMemo(() => buildDicePredictions(22),              [refreshKey]);          // eslint-disable-line react-hooks/exhaustive-deps
  const minesRows    = useMemo(() => buildMinesPredictions(mineCount, 17),  [refreshKey, mineCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const rouletteRows = useMemo(() => buildRoulettePredictions(22),          [refreshKey]);          // eslint-disable-line react-hooks/exhaustive-deps
  const plinkoRows   = useMemo(() => buildPlinkoPredictions(plinkoRisk, 22),[refreshKey, plinkoRisk]); // eslint-disable-line react-hooks/exhaustive-deps
  const slotsRows    = useMemo(() => buildSlotsPredictions(17),             [refreshKey]);          // eslint-disable-line react-hooks/exhaustive-deps

  // ── copy helpers ────────────────────────────────────────────────────────────
  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text).then(
      () => toasts.success('Copied', label),
      () => toasts.error('Copy failed', 'Clipboard access blocked.'),
    );
  }

  function copyCrash() {
    copy(
      crashRows.map(r => `${fmtTime(r.timeMs)}  Crash → ${r.label}  (${r.tier.toUpperCase()})`).join('\n'),
      `${crashRows.length} crash predictions`,
    );
  }
  function copyDice() {
    copy(
      diceRows.map(r => `${fmtTime(r.timeMs)}  Dice roll → ${r.roll.toFixed(2)}`).join('\n'),
      `${diceRows.length} dice predictions`,
    );
  }
  function copyMines() {
    copy(
      minesRows.map(r =>
        `${fmtTime(r.timeMs)}  Mines (${r.mineCount} mines) → Mines@[${r.minePositions.join(',')}]  Safe@[${r.safePositions.join(',')}]`
      ).join('\n'),
      `${minesRows.length} mines predictions`,
    );
  }
  function copyRoulette() {
    copy(
      rouletteRows.map(r =>
        `${fmtTime(r.timeMs)}  Roulette → ${r.number} ${r.color.toUpperCase()} ${r.odd == null ? '' : r.odd ? 'ODD' : 'EVEN'}`
      ).join('\n'),
      `${rouletteRows.length} roulette predictions`,
    );
  }
  function copyPlinko() {
    copy(
      plinkoRows.map(r => `${fmtTime(r.timeMs)}  Plinko → bucket ${r.bucket + 1}/9 · ${r.multiplier}×`).join('\n'),
      `${plinkoRows.length} plinko predictions`,
    );
  }
  function copySlots() {
    copy(
      slotsRows.map(r =>
        `${fmtTime(r.timeMs)}  Slots → [${r.topLine.join(' ')}]${r.topWin ? ` → ${r.topWin.count}× ${r.topWin.symbol} (${r.topWin.mult}×)` : ' — no win'}`
      ).join('\n'),
      `${slotsRows.length} slots predictions`,
    );
  }

  // ── shared row styling ──────────────────────────────────────────────────────
  const rowSx = (isCurrent: boolean, isPast: boolean) => ({
    '& td': { borderColor: darkBorder },
    background: isCurrent
      ? alpha(neonGreen, 0.07)
      : isPast ? alpha('#fff', 0.01) : 'transparent',
    opacity: isPast ? 0.5 : 1,
  });

  return (
    <Box>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, mb: 0.5 }}>
        Casino Game Predictions
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
        Exact outcomes per time window — derived from today's daily seed, shared with the live games.
        Rounds advance in real time. The highlighted row is the <strong>active window right now</strong>.
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
        <Typography sx={{ fontWeight: 700, mb: 0.25 }}>How to use these signals</Typography>
        <Typography sx={{ fontSize: '0.78rem' }}>
          Each row shows a <strong>time window</strong>. Tell players to open the game
          <em> at that time</em> — the seeded outcome they'll see will match the prediction.
          Highlighted row = current active window. Dimmed rows = already passed (for verification).
          Predictions reset at UTC midnight.
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
          title="Crash — signal schedule"
          subtitle={`${CRASH_INTERVAL_S}s windows · each round has a fixed crash point`}
          onCopyAll={copyCrash}
          count={crashRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Time</TableCell>
                <TableCell sx={thSx}>Window</TableCell>
                <TableCell sx={thSx}>Crash point</TableCell>
                <TableCell sx={thSx}>Tier</TableCell>
                <TableCell sx={thSx} align="right">Signal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {crashRows.map(r => {
                const intMs   = CRASH_INTERVAL_S * 1000;
                const isCurr  = isCurrentRound(r.timeMs, intMs, nowMs);
                const isPast  = r.timeMs + intMs <= nowMs;
                return (
                  <TableRow key={r.round} hover sx={rowSx(isCurr, isPast)}>
                    <TableCell sx={tdSx}>
                      <TimeCell timeMs={r.timeMs} intervalMs={intMs} nowMs={nowMs} isCurrent={isCurr} />
                    </TableCell>
                    <TableCell sx={{ ...tdSx, fontVariantNumeric: 'tabular-nums', color: 'text.disabled', fontSize: '0.7rem' }}>
                      {fmtTime(r.timeMs)}–{fmtTime(r.timeMs + intMs)}
                    </TableCell>
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
                        {r.tier === 'high'  && 'Ride to 4–6×'}
                        {r.tier === 'moon'  && '🚀 Moon! Hold for 8×+'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </GameSection>
      )}

      {/* ── DICE ─────────────────────────────────────────────────────── */}
      {tab === 'dice' && (
        <GameSection
          title="Dice — signal schedule"
          subtitle={`${DICE_INTERVAL_S}s windows · roll the dice during the highlighted window`}
          onCopyAll={copyDice}
          count={diceRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Time</TableCell>
                <TableCell sx={thSx}>Window</TableCell>
                <TableCell sx={thSx}>Roll result</TableCell>
                <TableCell sx={thSx}>&gt; 50?</TableCell>
                <TableCell sx={thSx}>&gt; 75?</TableCell>
                <TableCell sx={thSx}>&lt; 25?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diceRows.map(r => {
                const intMs  = DICE_INTERVAL_S * 1000;
                const isCurr = isCurrentRound(r.timeMs, intMs, nowMs);
                const isPast = r.timeMs + intMs <= nowMs;
                return (
                  <TableRow key={r.round} hover sx={rowSx(isCurr, isPast)}>
                    <TableCell sx={tdSx}>
                      <TimeCell timeMs={r.timeMs} intervalMs={intMs} nowMs={nowMs} isCurrent={isCurr} />
                    </TableCell>
                    <TableCell sx={{ ...tdSx, color: 'text.disabled', fontSize: '0.7rem' }}>
                      {fmtTime(r.timeMs)}–{fmtTime(r.timeMs + intMs)}
                    </TableCell>
                    <TableCell sx={tdSx}>
                      <Typography sx={{ fontWeight: 900, fontSize: '0.92rem', color: neonGold, fontVariantNumeric: 'tabular-nums' }}>
                        {r.roll.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={tdSx}><YN yes={r.over50} /></TableCell>
                    <TableCell sx={tdSx}><YN yes={r.over75} /></TableCell>
                    <TableCell sx={tdSx}><YN yes={r.under25} /></TableCell>
                  </TableRow>
                );
              })}
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
            title={`Mines (${mineCount} mines) — signal schedule`}
            subtitle={`${MINES_INTERVAL_S}s windows · start a game during the highlighted window`}
            onCopyAll={copyMines}
            count={minesRows.length}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Time</TableCell>
                  <TableCell sx={thSx}>Window</TableCell>
                  <TableCell sx={thSx}>Mine cells (0-based grid)</TableCell>
                  <TableCell sx={thSx}>First 5 safe cells ✓</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {minesRows.map(r => {
                  const intMs  = MINES_INTERVAL_S * 1000;
                  const isCurr = isCurrentRound(r.timeMs, intMs, nowMs);
                  const isPast = r.timeMs + intMs <= nowMs;
                  return (
                    <TableRow key={r.round} hover sx={rowSx(isCurr, isPast)}>
                      <TableCell sx={tdSx}>
                        <TimeCell timeMs={r.timeMs} intervalMs={intMs} nowMs={nowMs} isCurrent={isCurr} />
                      </TableCell>
                      <TableCell sx={{ ...tdSx, color: 'text.disabled', fontSize: '0.7rem' }}>
                        {fmtTime(r.timeMs)}–{fmtTime(r.timeMs + intMs)}
                      </TableCell>
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
                  );
                })}
              </TableBody>
            </Table>
          </GameSection>
        </Box>
      )}

      {/* ── ROULETTE ──────────────────────────────────────────────────── */}
      {tab === 'roulette' && (
        <GameSection
          title="Roulette — signal schedule"
          subtitle={`${ROULETTE_INTERVAL_S}s windows · spin during the highlighted window`}
          onCopyAll={copyRoulette}
          count={rouletteRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Time</TableCell>
                <TableCell sx={thSx}>Window</TableCell>
                <TableCell sx={thSx}>Number</TableCell>
                <TableCell sx={thSx}>Color</TableCell>
                <TableCell sx={thSx}>Odd/Even</TableCell>
                <TableCell sx={thSx}>Dozen</TableCell>
                <TableCell sx={thSx}>Half</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rouletteRows.map(r => {
                const intMs   = ROULETTE_INTERVAL_S * 1000;
                const isCurr  = isCurrentRound(r.timeMs, intMs, nowMs);
                const isPast  = r.timeMs + intMs <= nowMs;
                const numColor = r.color === 'green' ? neonGreen : r.color === 'red' ? '#ff4757' : '#aaa';
                return (
                  <TableRow key={r.round} hover sx={rowSx(isCurr, isPast)}>
                    <TableCell sx={tdSx}>
                      <TimeCell timeMs={r.timeMs} intervalMs={intMs} nowMs={nowMs} isCurrent={isCurr} />
                    </TableCell>
                    <TableCell sx={{ ...tdSx, color: 'text.disabled', fontSize: '0.7rem' }}>
                      {fmtTime(r.timeMs)}–{fmtTime(r.timeMs + intMs)}
                    </TableCell>
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
                      {r.odd == null
                        ? <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>—</Typography>
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
            title={`Plinko (${plinkoRisk} risk) — signal schedule`}
            subtitle={`${PLINKO_INTERVAL_S}s windows · drop during the highlighted window`}
            onCopyAll={copyPlinko}
            count={plinkoRows.length}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={thSx}>Time</TableCell>
                  <TableCell sx={thSx}>Window</TableCell>
                  <TableCell sx={thSx}>Bucket (1–9)</TableCell>
                  <TableCell sx={thSx}>Multiplier</TableCell>
                  <TableCell sx={thSx}>Position</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plinkoRows.map(r => {
                  const intMs   = PLINKO_INTERVAL_S * 1000;
                  const isCurr  = isCurrentRound(r.timeMs, intMs, nowMs);
                  const isPast  = r.timeMs + intMs <= nowMs;
                  const isEdge  = r.bucket === 0 || r.bucket === 8;
                  const isMid   = r.bucket === 4;
                  const tone    = isEdge ? '#a855f7' : isMid ? '#ff6b7a' : r.multiplier >= 2 ? neonGold : neonBlue;
                  return (
                    <TableRow key={r.round} hover sx={rowSx(isCurr, isPast)}>
                      <TableCell sx={tdSx}>
                        <TimeCell timeMs={r.timeMs} intervalMs={intMs} nowMs={nowMs} isCurrent={isCurr} />
                      </TableCell>
                      <TableCell sx={{ ...tdSx, color: 'text.disabled', fontSize: '0.7rem' }}>
                        {fmtTime(r.timeMs)}–{fmtTime(r.timeMs + intMs)}
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Typography sx={{ fontWeight: 800, color: tone }}>{r.bucket + 1}</Typography>
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Chip size="small" label={`${r.multiplier}×`} sx={chipSx(tone)} />
                      </TableCell>
                      <TableCell sx={tdSx}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {isEdge ? '🔥 Edge — high payout' : isMid ? 'Centre — lowest return' : 'Mid bucket'}
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
          title="Slots — signal schedule (top payline)"
          subtitle={`${SLOTS_INTERVAL_S}s windows · spin during the highlighted window`}
          onCopyAll={copySlots}
          count={slotsRows.length}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={thSx}>Time</TableCell>
                <TableCell sx={thSx}>Window</TableCell>
                <TableCell sx={thSx}>Top row</TableCell>
                <TableCell sx={thSx}>Payline result</TableCell>
                <TableCell sx={thSx}>Big win?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {slotsRows.map(r => {
                const intMs  = SLOTS_INTERVAL_S * 1000;
                const isCurr = isCurrentRound(r.timeMs, intMs, nowMs);
                const isPast = r.timeMs + intMs <= nowMs;
                return (
                  <TableRow key={r.round} hover sx={rowSx(isCurr, isPast)}>
                    <TableCell sx={tdSx}>
                      <TimeCell timeMs={r.timeMs} intervalMs={intMs} nowMs={nowMs} isCurrent={isCurr} />
                    </TableCell>
                    <TableCell sx={{ ...tdSx, color: 'text.disabled', fontSize: '0.7rem' }}>
                      {fmtTime(r.timeMs)}–{fmtTime(r.timeMs + intMs)}
                    </TableCell>
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
                );
              })}
            </TableBody>
          </Table>
        </GameSection>
      )}
    </Box>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** The "Time" column cell — shows countdown or NOW badge. */
function TimeCell({
  timeMs, intervalMs, nowMs, isCurrent,
}: { timeMs: number; intervalMs: number; nowMs: number; isCurrent: boolean }) {
  const label = countdownLabel(timeMs, intervalMs, nowMs);
  if (isCurrent) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Box sx={{
          px: 0.75, py: 0.25, borderRadius: 1,
          background: alpha(neonGreen, 0.18),
          border: `1px solid ${alpha(neonGreen, 0.5)}`,
          color: neonGreen, fontWeight: 900, fontSize: '0.72rem',
          letterSpacing: '0.05em', whiteSpace: 'nowrap',
        }}>
          ▶ NOW
        </Box>
        <Typography sx={{ fontSize: '0.7rem', color: neonGreen, fontVariantNumeric: 'tabular-nums' }}>
          {label.replace('▶ ', '')}
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <AccessTimeIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
      <Typography sx={{
        fontSize: '0.75rem',
        color: timeMs + intervalMs <= nowMs ? 'text.disabled' : 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </Typography>
    </Box>
  );
}

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
        <Tooltip title="Copy all predictions as text (includes timestamps)">
          <Button
            size="small" variant="outlined"
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
    <Chip size="small" label={label ?? (yes ? 'Yes' : 'No')} sx={chipSx(yes ? neonGreen : '#ff6b7a')} />
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
