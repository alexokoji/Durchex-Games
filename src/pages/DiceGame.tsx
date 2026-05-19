import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Slider, Chip, Grid,
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

type DiceResult = 'win' | 'lose' | null;

const DICE_DOTS = [1, 2, 3, 4, 5, 6];

// Dot positions for each face value: [cx, cy] percentages
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function DiceFace({ value, color }: { value: number; color: string }) {
  const dots = DOT_POSITIONS[value] || DOT_POSITIONS[1];
  return (
    <svg width="130" height="130" viewBox="0 0 100 100">
      <rect x="4" y="4" width="92" height="92" rx="16" fill={alpha(color, 0.12)} stroke={color} strokeWidth="2" style={{ filter: `drop-shadow(0 0 12px ${color})` }} />
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="8" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      ))}
    </svg>
  );
}

interface HistoryEntry { roll: number; target: number; over: boolean; result: DiceResult }

export default function DiceGame() {
  const wallet = useWallet();
  const defaults = useCurrencyDefaults();
  const [betAmount, setBetAmount] = useState(() => defaults.defaultStakeString);
  const [target, setTarget] = useState(50.0);
  const [isOver, setIsOver] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<DiceResult>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [diceFace, setDiceFace] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, streak: 0, bestStreak: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const winChance = isOver ? 100 - target : target;
  const multiplier = winChance > 0 ? parseFloat(((99 / winChance)).toFixed(4)) : 0;
  const profit = parseFloat(betAmount) * (multiplier - 1);

  /**
   * Promisified single dice roll — returns once the animation has finished
   * and the bet is settled. Returns null if the bet couldn't be placed
   * (auth or balance). Used by both the manual Roll button and the auto-bet
   * loop so behaviour stays identical regardless of who's pulling the trigger.
   */
  const rollOnce = useCallback((overrideStake?: number): Promise<{ won: boolean; profit: number } | null> => {
    return new Promise(async (resolve) => {
      if (rolling) return resolve(null);
      const stake = overrideStake != null ? overrideStake : Math.max(0, parseFloat(betAmount) || 0);
      const bet = await wallet.placeBet({
        gameId: 'dice',
        gameName: 'Dice',
        stake,
        details: `${isOver ? 'Over' : 'Under'} ${target.toFixed(2)} · ${multiplier.toFixed(2)}×`,
      });
      if (!bet) return resolve(null);

      setRolling(true);
      setLastResult(null);
      let flips = 0;
      intervalRef.current = setInterval(() => {
        setDiceFace(Math.floor(Math.random() * 6));
        flips++;
        if (flips > 12) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const r = parseFloat((Math.random() * 100).toFixed(2));
          const win = isOver ? r > target : r < target;
          setRoll(r);
          setLastResult(win ? 'win' : 'lose');
          setHistory(prev => [{ roll: r, target, over: isOver, result: win ? 'win' : 'lose' }, ...prev.slice(0, 19)]);
          setStats(prev => {
            const streak = win ? prev.streak + 1 : 0;
            return {
              wins: prev.wins + (win ? 1 : 0),
              losses: prev.losses + (win ? 0 : 1),
              streak,
              bestStreak: Math.max(prev.bestStreak, streak),
            };
          });
          void wallet.settleBet(bet.id, {
            won: win,
            multiplier: win ? multiplier : undefined,
            payout: win ? stake * multiplier : 0,
            details: `Rolled ${r.toFixed(2)} · target ${isOver ? '>' : '<'} ${target.toFixed(2)}`,
          });
          setRolling(false);
          resolve({ won: win, profit: win ? stake * (multiplier - 1) : -stake });
        }
      }, 60);
    });
  }, [rolling, betAmount, isOver, target, multiplier, wallet]);

  function handleRoll() { void rollOnce(); }

  const auto = useAutoBet({
    runOneBet: (stake) => rollOnce(stake),
    baseStake: parseFloat(betAmount) || 0,
    setStake: (n) => setBetAmount(n.toFixed(2)),
  });

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, minHeight: 'calc(100vh - 64px)', p: 2, gap: 2 }}>
      {/* Main game */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Stats row */}
        <Grid container spacing={1.5}>
          {[
            { label: 'Win Chance', value: `${winChance.toFixed(2)}%`, color: neonGreen },
            { label: 'Multiplier', value: `${multiplier.toFixed(2)}x`, color: neonBlue },
            { label: 'Profit on Win', value: `+${formatMoney(profit, wallet.currency)}`, color: neonGold },
            { label: 'Streak', value: `${stats.streak}`, color: '#a855f7' },
          ].map((s) => (
            <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
              <Box
                sx={{
                  p: 1.5, borderRadius: 2, textAlign: 'center',
                  background: darkCard, border: `1px solid ${darkBorder}`,
                }}
              >
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: s.color }}>{s.value}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{s.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Dice display */}
        <Box
          sx={{
            flex: 1,
            background: darkCard,
            border: `1px solid ${lastResult === 'win' ? alpha(neonGreen, 0.5) : lastResult === 'lose' ? alpha('#ff4757', 0.5) : darkBorder}`,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 260,
            position: 'relative',
            overflow: 'hidden',
            transition: 'border-color 0.4s',
          }}
        >
          {/* Background glow */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                key={lastResult}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', inset: 0,
                  background: lastResult === 'win'
                    ? `radial-gradient(circle, ${alpha(neonGreen, 0.12)} 0%, transparent 70%)`
                    : `radial-gradient(circle, ${alpha('#ff4757', 0.12)} 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>

          {/* Dice */}
          <motion.div
            animate={rolling ? { rotate: [0, 15, -10, 8, -5, 0], scale: [1, 1.1, 0.95, 1.05, 1] } : {}}
            transition={{ duration: 0.7 }}
          >
            <DiceFace value={DICE_DOTS[diceFace]} color={lastResult === 'win' ? neonGreen : lastResult === 'lose' ? '#ff4757' : neonBlue} />
          </motion.div>

          {/* Roll result */}
          <AnimatePresence mode="wait">
            {roll !== null && !rolling && (
              <motion.div
                key={roll}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center' }}
              >
                <Typography
                  sx={{
                    fontSize: '3rem', fontWeight: 900, mt: 1,
                    color: lastResult === 'win' ? neonGreen : '#ff4757',
                    textShadow: `0 0 30px ${lastResult === 'win' ? alpha(neonGreen, 0.7) : alpha('#ff4757', 0.7)}`,
                  }}
                >
                  {roll.toFixed(2)}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.1em',
                    color: lastResult === 'win' ? neonGreen : '#ff4757',
                  }}
                >
                  {lastResult === 'win' ? '✓ WIN!' : '✗ LOSE'}
                </Typography>
              </motion.div>
            )}
            {roll === null && (
              <Typography sx={{ mt: 2, color: 'text.disabled', fontSize: '0.88rem' }}>
                Place bet and roll
              </Typography>
            )}
          </AnimatePresence>
        </Box>

        {/* Slider */}
        <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 3, p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1 }}>
            {['Under', 'Over'].map((o) => (
              <Box
                key={o}
                onClick={() => setIsOver(o === 'Over')}
                sx={{
                  flex: 1, textAlign: 'center', py: 1, borderRadius: 2, cursor: 'pointer',
                  background: (o === 'Over') === isOver ? alpha(neonGreen, 0.15) : alpha('#fff', 0.03),
                  border: `1px solid ${(o === 'Over') === isOver ? alpha(neonGreen, 0.5) : darkBorder}`,
                  color: (o === 'Over') === isOver ? neonGreen : 'text.secondary',
                  fontWeight: 700, fontSize: '0.82rem',
                  transition: 'all 0.2s',
                }}
              >
                Roll {o}
              </Box>
            ))}
          </Box>

          <Box sx={{ px: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>0</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: neonGreen }}>
                {isOver ? `> ${target.toFixed(2)}` : `< ${target.toFixed(2)}`}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>100</Typography>
            </Box>
            <Slider
              value={target}
              onChange={(_, v) => setTarget(v as number)}
              min={1}
              max={97}
              step={0.01}
              sx={{
                '& .MuiSlider-rail': {
                  background: `linear-gradient(90deg, ${alpha(neonGreen, 0.3)}, ${alpha('#ff4757', 0.3)})`,
                  height: 8,
                },
                '& .MuiSlider-track': { height: 8 },
              }}
            />
          </Box>

          {/* Range visualization */}
          <Box
            sx={{
              mt: 1.5, height: 8, borderRadius: 2, overflow: 'hidden',
              background: alpha('#fff', 0.06),
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: isOver ? `${100 - target}%` : `${target}%`,
                marginLeft: isOver ? `${target}%` : 0,
                background: `linear-gradient(90deg, ${neonGreen}, ${neonBlue})`,
                borderRadius: 2,
                boxShadow: `0 0 8px ${alpha(neonGreen, 0.4)}`,
                transition: 'all 0.2s',
              }}
            />
          </Box>
        </Box>

        {/* History */}
        <Box>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 700, mb: 1, letterSpacing: '0.08em' }}>
            ROLL HISTORY
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {history.slice(0, 20).map((h, i) => (
              <Chip
                key={i}
                label={h.roll.toFixed(1)}
                size="small"
                sx={{
                  height: 22, fontSize: '0.7rem', fontWeight: 800,
                  background: h.result === 'win' ? alpha(neonGreen, 0.15) : alpha('#ff4757', 0.15),
                  color: h.result === 'win' ? neonGreen : '#ff4757',
                  border: `1px solid ${h.result === 'win' ? alpha(neonGreen, 0.3) : alpha('#ff4757', 0.3)}`,
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0 }}>
        <BettingControls
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onBet={handleRoll}
          isRunning={rolling || auto.isRunning}
          betLabel="Roll Dice"
          stopLabel="Rolling..."
        />
        <Box sx={{ mt: 2 }}>
          <AutoBetPanel
            auto={auto}
            formatMoney={(n) => formatMoney(n, wallet.currency)}
            disabled={rolling}
          />
        </Box>
        <Box sx={{ mt: 2, p: 2, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 1.5, letterSpacing: '0.08em' }}>
            SESSION STATS
          </Typography>
          {[
            { label: 'Wins', value: stats.wins, color: neonGreen },
            { label: 'Losses', value: stats.losses, color: '#ff4757' },
            { label: 'Win Rate', value: stats.wins + stats.losses > 0 ? `${((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)}%` : '0%', color: neonBlue },
            { label: 'Best Streak', value: stats.bestStreak, color: neonGold },
          ].map((s) => (
            <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6 }}>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{s.label}</Typography>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
