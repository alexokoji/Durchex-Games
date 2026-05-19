import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Chip, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import BettingControls from '../components/casino/BettingControls';
import AutoBetPanel from '../components/casino/AutoBetPanel';
import { useAutoBet } from '../components/casino/useAutoBet';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useWallet } from '../contexts/WalletContext';
import { useCurrencyDefaults } from '../utils/useCurrencyDefaults';
import { formatMoney } from '../utils/currency';

const SYMBOLS = ['7️⃣', '🍒', '🍋', '🍊', '🍇', '💎', '⭐', '🔔'];
const SYMBOL_MULTIPLIERS: Record<string, number> = {
  '7️⃣': 50,
  '💎': 20,
  '⭐': 10,
  '🔔': 5,
  '🍇': 3,
  '🍊': 2,
  '🍋': 1.5,
  '🍒': 1,
};

const PAYLINES = 20;
const COLS = 5;
const ROWS = 3;

function randSymbol() {
  const weights = [2, 8, 10, 10, 8, 4, 6, 7];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= weights[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function generateGrid(): string[][] {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => randSymbol())
  );
}

interface WinLine {
  row: number;
  symbol: string;
  count: number;
  mult: number;
}

function evaluateWins(grid: string[][]): WinLine[] {
  const wins: WinLine[] = [];
  for (let row = 0; row < ROWS; row++) {
    let count = 1;
    const sym = grid[row][0];
    for (let col = 1; col < COLS; col++) {
      if (grid[row][col] === sym) count++;
      else break;
    }
    if (count >= 3) {
      wins.push({ row, symbol: sym, count, mult: SYMBOL_MULTIPLIERS[sym] * (count - 2) });
    }
  }
  return wins;
}

interface SpinHistory {
  mult: number;
  win: boolean;
}

export default function SlotsGame() {
  const wallet = useWallet();
  const defaults = useCurrencyDefaults();
  const [betAmount, setBetAmount] = useState(() => defaults.defaultStakeString);
  const [grid, setGrid] = useState<string[][]>(generateGrid());
  const [spinning, setSpinning] = useState(false);
  const [wins, setWins] = useState<WinLine[]>([]);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [totalWin, setTotalWin] = useState<number | null>(null);
  const [, setReelOffsets] = useState([0, 0, 0, 0, 0]);
  const [stats, setStats] = useState({ spins: 0, totalWagered: 0, totalWon: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  /** Promisified spin. Resolves with the round outcome (or null on failure). */
  const spinOnce = useCallback((overrideStake?: number): Promise<{ won: boolean; profit: number } | null> => {
    return new Promise(async (resolve) => {
      if (spinning) return resolve(null);
      const bet = overrideStake != null ? overrideStake : (parseFloat(betAmount) || 0.01);
      const placed = await wallet.placeBet({
        gameId: 'slots',
        gameName: 'Fortune Spin',
        stake: bet,
        details: `${PAYLINES} paylines`,
      });
      if (!placed) return resolve(null);

      setSpinning(true);
      setWins([]);
      setTotalWin(null);

      const tempGrids: string[][][] = Array.from({ length: 20 }, generateGrid);
      let frame = 0;
      intervalRef.current = setInterval(() => {
        frame++;
        setReelOffsets([frame % 3, frame % 3, frame % 3, frame % 3, frame % 3]);
        setGrid(tempGrids[frame % tempGrids.length]);
        if (frame >= 16) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const finalGrid = generateGrid();
          setGrid(finalGrid);
          setReelOffsets([0, 0, 0, 0, 0]);
          const winLines = evaluateWins(finalGrid);
          const totalMult = winLines.reduce((sum, w) => sum + w.mult, 0);
          const winAmt = bet * totalMult;
          setWins(winLines);
          setTotalWin(winLines.length > 0 ? winAmt : 0);
          setHistory(prev => [{ mult: totalMult, win: winLines.length > 0 }, ...prev.slice(0, 19)]);
          setStats(prev => ({
            spins: prev.spins + 1,
            totalWagered: prev.totalWagered + bet,
            totalWon: prev.totalWon + winAmt,
          }));
          void wallet.settleBet(placed.id, {
            won: winLines.length > 0,
            multiplier: winLines.length > 0 ? totalMult : undefined,
            payout: winAmt,
            details: winLines.length > 0
              ? `${winLines.length} payline${winLines.length > 1 ? 's' : ''} · ${totalMult}×`
              : 'No paylines hit',
          });
          setSpinning(false);
          resolve({ won: winLines.length > 0, profit: winAmt - bet });
        }
      }, 60);
    });
  }, [spinning, betAmount, wallet]);

  function spin() { void spinOnce(); }

  const auto = useAutoBet({
    runOneBet: (stake) => spinOnce(stake),
    baseStake: parseFloat(betAmount) || 0,
    setStake: (n) => setBetAmount(n.toFixed(2)),
  });

  const winRowSet = new Set(wins.map(w => w.row));

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, minHeight: 'calc(100vh - 64px)', p: 2, gap: 2 }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Stats */}
        <Grid container spacing={1.5}>
          {[
            { label: 'Paylines', value: PAYLINES, color: neonGreen },
            { label: 'RTP', value: '96.50%', color: neonBlue },
            { label: 'Max Win', value: '250x', color: neonGold },
            { label: 'Spins', value: stats.spins, color: '#ff9f43' },
          ].map((s) => (
            <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}` }}>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.value}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{s.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Slot machine */}
        <Box
          sx={{
            background: darkCard,
            border: `1px solid ${wins.length > 0 ? alpha(neonGold, 0.6) : darkBorder}`,
            borderRadius: 3,
            p: 3,
            transition: 'border-color 0.3s',
            boxShadow: wins.length > 0 ? `0 0 30px ${alpha(neonGold, 0.2)}` : 'none',
          }}
        >
          {/* Reel headers */}
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, justifyContent: 'center' }}>
            {Array.from({ length: COLS }, (_, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1, maxWidth: 80, height: 4, borderRadius: 2,
                  background: spinning ? `linear-gradient(90deg, ${neonGreen}, ${neonBlue})` : alpha('#fff', 0.1),
                  transition: 'background 0.3s',
                  boxShadow: spinning ? `0 0 8px ${alpha(neonGreen, 0.5)}` : 'none',
                }}
              />
            ))}
          </Box>

          {/* Grid */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            {Array.from({ length: COLS }, (_, col) => (
              <Box
                key={col}
                sx={{
                  flex: 1, maxWidth: 80,
                  background: alpha('#fff', 0.03),
                  border: `1px solid ${darkBorder}`,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {Array.from({ length: ROWS }, (_, row) => {
                  const isWinRow = winRowSet.has(row);
                  return (
                    <motion.div
                      key={row}
                      animate={spinning ? { y: [0, -8, 0] } : {}}
                      transition={{ duration: 0.12, repeat: spinning ? Infinity : 0, delay: col * 0.05 }}
                    >
                      <Box
                        sx={{
                          height: 72,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '2.2rem',
                          background: isWinRow && !spinning
                            ? alpha(neonGold, 0.12)
                            : 'transparent',
                          borderBottom: row < ROWS - 1 ? `1px solid ${darkBorder}` : 'none',
                          transition: 'background 0.3s',
                        }}
                      >
                        {grid[row]?.[col] ?? '🍒'}
                      </Box>
                    </motion.div>
                  );
                })}
              </Box>
            ))}
          </Box>

          {/* Win indicator */}
          <AnimatePresence>
            {totalWin !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  {wins.length > 0 ? (
                    <>
                      <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: neonGold, textShadow: `0 0 20px ${alpha(neonGold, 0.6)}` }}>
                        WIN! +{formatMoney(totalWin ?? 0, wallet.currency)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                        {wins.map((w, i) => (
                          <Chip
                            key={i}
                            label={`${w.symbol} x${w.count} — ${w.mult}x`}
                            size="small"
                            sx={{ background: alpha(neonGold, 0.15), color: neonGold, fontWeight: 800, fontSize: '0.72rem', height: 22 }}
                          />
                        ))}
                      </Box>
                    </>
                  ) : (
                    <Typography sx={{ fontSize: '0.88rem', color: 'text.disabled' }}>No win this spin</Typography>
                  )}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* Paytable */}
        <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', mb: 1.5 }}>
            PAYTABLE (3+ in a row)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {SYMBOLS.map((sym) => (
              <Box
                key={sym}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.6,
                  background: alpha('#fff', 0.04), border: `1px solid ${darkBorder}`, borderRadius: 1.5,
                }}
              >
                <Typography sx={{ fontSize: '1rem' }}>{sym}</Typography>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: neonGold }}>{SYMBOL_MULTIPLIERS[sym]}x</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* History */}
        <Box>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 700, mb: 1, letterSpacing: '0.08em' }}>SPIN HISTORY</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {history.map((h, i) => (
              <Chip
                key={i}
                label={h.win ? `${h.mult.toFixed(1)}x` : 'miss'}
                size="small"
                sx={{
                  height: 22, fontSize: '0.7rem', fontWeight: 800,
                  background: h.win ? alpha(neonGold, 0.15) : alpha('#ff4757', 0.12),
                  color: h.win ? neonGold : '#ff4757',
                  border: `1px solid ${h.win ? alpha(neonGold, 0.3) : alpha('#ff4757', 0.2)}`,
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <BettingControls
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onBet={spin}
          isRunning={spinning || auto.isRunning}
          betLabel="Spin"
          stopLabel="Spinning..."
        />
        <AutoBetPanel auto={auto} formatMoney={(n) => formatMoney(n, wallet.currency)} disabled={spinning} />

        {/* Quick bet amounts */}
        <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 1, letterSpacing: '0.08em' }}>LINES</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {[1, 5, 10, 20].map((lines) => (
              <Box
                key={lines}
                sx={{
                  flex: 1, textAlign: 'center', py: 0.8, borderRadius: 1.5, cursor: 'pointer',
                  background: lines === PAYLINES ? alpha(neonGreen, 0.15) : alpha('#fff', 0.04),
                  border: `1px solid ${lines === PAYLINES ? alpha(neonGreen, 0.5) : darkBorder}`,
                  color: lines === PAYLINES ? neonGreen : 'text.secondary',
                  fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.2s',
                }}
              >
                {lines}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Session stats */}
        <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 1.5, letterSpacing: '0.08em' }}>SESSION</Typography>
          {[
            { label: 'Spins', value: stats.spins, color: neonBlue },
            { label: 'Wagered', value: formatMoney(stats.totalWagered, wallet.currency), color: 'text.secondary' },
            { label: 'Won', value: formatMoney(stats.totalWon, wallet.currency), color: neonGreen },
            { label: 'Net', value: formatMoney(stats.totalWon - stats.totalWagered, wallet.currency), color: stats.totalWon >= stats.totalWagered ? neonGreen : '#ff4757' },
          ].map((s) => (
            <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{s.label}</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
            </Box>
          ))}
        </Box>

        {/* Max win button */}
        <Button
          variant="outlined"
          fullWidth
          sx={{ borderColor: alpha(neonGold, 0.4), color: neonGold, fontWeight: 700, fontSize: '0.82rem' }}
        >
          Max Bet
        </Button>
      </Box>
    </Box>
  );
}
