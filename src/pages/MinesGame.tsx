import { useRef, useState } from 'react';
import {
  Box, Typography, Grid, Button, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import BettingControls from '../components/casino/BettingControls';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useWallet, type BetRecord } from '../contexts/WalletContext';
import { useCurrencyDefaults } from '../utils/useCurrencyDefaults';

function generateMines(totalCells: number, mineCount: number): boolean[] {
  const mines = new Array(totalCells).fill(false);
  let placed = 0;
  while (placed < mineCount) {
    const idx = Math.floor(Math.random() * totalCells);
    if (!mines[idx]) {
      mines[idx] = true;
      placed++;
    }
  }
  return mines;
}

interface HistoryEntry {
  mines: number;
  revealed: number;
  payout: number;
  hit: boolean;
}

export default function MinesGame() {
  const wallet = useWallet();
  const defaults = useCurrencyDefaults();
  const [betAmount, setBetAmount] = useState(() => defaults.defaultStakeString);
  const [mineCount, setMineCount] = useState(3);
  const [gridSize] = useState(25);
  const [mines, setMines] = useState<boolean[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(gridSize).fill(false));
  const [gameActive, setGameActive] = useState(false);
  const [safeRevealed, setSafeRevealed] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentPayout, setCurrentPayout] = useState<number | null>(null);
  const [stats, setStats] = useState({ rounds: 0, won: 0, lost: 0, profit: 0 });
  const activeBetRef = useRef<BetRecord | null>(null);

  async function startGame() {
    const stake = Math.max(0, parseFloat(betAmount) || 0);
    const bet = await wallet.placeBet({
      gameId: 'mines',
      gameName: 'Mines',
      stake,
      details: `${mineCount} mines on 5×5 grid`,
    });
    if (!bet) return;  // auth/balance gate
    activeBetRef.current = bet;
    const newMines = generateMines(gridSize, mineCount);
    setMines(newMines);
    setRevealed(new Array(gridSize).fill(false));
    setSafeRevealed(0);
    setGameActive(true);
    setCurrentPayout(null);
  }

  function cashOut() {
    if (!gameActive || safeRevealed === 0) return;
    const bet = parseFloat(betAmount) || 0.01;
    const multiplier = Math.pow(1.1, safeRevealed);
    const payout = bet * multiplier;
    setHistory(prev => [{ mines: mineCount, revealed: safeRevealed, payout, hit: false }, ...prev.slice(0, 19)]);
    setStats(prev => ({ rounds: prev.rounds + 1, won: prev.won + 1, lost: prev.lost, profit: prev.profit + (payout - bet) }));
    setCurrentPayout(payout);
    setGameActive(false);
    if (activeBetRef.current) {
      void wallet.settleBet(activeBetRef.current.id, {
        won: true,
        multiplier,
        payout,
        details: `Cashed at ${safeRevealed} safe (${multiplier.toFixed(2)}×)`,
      });
      activeBetRef.current = null;
    }
  }

  function revealCell(idx: number) {
    if (!gameActive || revealed[idx]) return;
    const newRevealed = [...revealed];
    newRevealed[idx] = true;
    setRevealed(newRevealed);

    if (mines[idx]) {
      setGameActive(false);
      const bet = parseFloat(betAmount) || 0.01;
      setHistory(prev => [{ mines: mineCount, revealed: safeRevealed, payout: -bet, hit: true }, ...prev.slice(0, 19)]);
      setStats(prev => ({ rounds: prev.rounds + 1, won: prev.won, lost: prev.lost + 1, profit: prev.profit - bet }));
      setCurrentPayout(-bet);
      if (activeBetRef.current) {
        void wallet.settleBet(activeBetRef.current.id, {
          won: false,
          payout: 0,
          details: `Hit mine after ${safeRevealed} safe`,
        });
        activeBetRef.current = null;
      }
    } else {
      setSafeRevealed(prev => prev + 1);
    }
  }

  const cells = Array.from({ length: gridSize }, (_, i) => {
    const isMine = mines[i];
    const isRevealed = revealed[i];
    return { id: i, isMine, isRevealed };
  });

  const bet = parseFloat(betAmount) || 0.01;
  const currentMultiplier = safeRevealed > 0 ? Math.pow(1.1, safeRevealed) : 0;
  const potentialWin = bet * currentMultiplier;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, minHeight: 'calc(100vh - 64px)', p: 2, gap: 2 }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Stats */}
        <Grid container spacing={1.5}>
          {[
            { label: 'Rounds', value: stats.rounds, color: neonBlue },
            { label: 'Won', value: stats.won, color: neonGreen },
            { label: 'Lost', value: stats.lost, color: '#ff4757' },
            { label: 'Profit', value: `${stats.profit > 0 ? '+' : ''}${stats.profit.toFixed(4)} BTC`, color: stats.profit > 0 ? neonGreen : '#ff4757' },
          ].map((s) => (
            <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}` }}>
                <Typography sx={{ fontSize: typeof s.value === 'number' ? '1.4rem' : '0.9rem', fontWeight: 900, color: s.color }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{s.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Game board */}
        <Box
          sx={{
            background: darkCard,
            border: `2px solid ${gameActive ? alpha(neonGreen, 0.4) : darkBorder}`,
            borderRadius: 3,
            p: 2.5,
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 1,
            transition: 'border-color 0.3s',
          }}
        >
          {cells.map((cell) => (
            <motion.div
              key={cell.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: cell.id * 0.02 }}
            >
              <Box
                onClick={() => revealCell(cell.id)}
                sx={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  cursor: cell.isRevealed || !gameActive ? 'default' : 'pointer',
                  fontWeight: 900,
                  transition: 'all 0.2s',
                  background: cell.isRevealed
                    ? cell.isMine
                      ? alpha('#ff4757', 0.2)
                      : alpha(neonGreen, 0.2)
                    : gameActive
                      ? alpha(neonBlue, 0.1)
                      : alpha('#fff', 0.03),
                  border: `2px solid ${
                    cell.isRevealed
                      ? cell.isMine
                        ? '#ff4757'
                        : neonGreen
                      : gameActive
                        ? alpha(neonBlue, 0.4)
                        : darkBorder
                  }`,
                  boxShadow: cell.isRevealed && !cell.isMine ? `0 0 12px ${alpha(neonGreen, 0.3)}` : 'none',
                  '&:hover': gameActive && !cell.isRevealed
                    ? { transform: 'scale(1.05)', borderColor: neonBlue, background: alpha(neonBlue, 0.15) }
                    : {},
                }}
              >
                {cell.isRevealed ? (cell.isMine ? '💣' : '✓') : '?'}
              </Box>
            </motion.div>
          ))}
        </Box>

        {/* Game info */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>SAFE REVEALED</Typography>
            <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: neonGreen }}>{safeRevealed}</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>MULTIPLIER</Typography>
            <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: neonGold }}>{currentMultiplier.toFixed(2)}x</Typography>
          </Box>
          <Box sx={{ flex: 1, p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 0.5 }}>POTENTIAL WIN</Typography>
            <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: neonBlue }}>{potentialWin.toFixed(5)} BTC</Typography>
          </Box>
        </Box>

        {/* Result display */}
        <AnimatePresence>
          {currentPayout !== null && !gameActive && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Box sx={{ p: 2, background: alpha(currentPayout > 0 ? neonGreen : '#ff4757', 0.1), border: `1px solid ${currentPayout > 0 ? neonGreen : '#ff4757'}`, borderRadius: 2, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: currentPayout > 0 ? neonGreen : '#ff4757' }}>
                  {currentPayout > 0 ? '+' : ''}{currentPayout.toFixed(5)} BTC
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        <Box>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 700, mb: 1, letterSpacing: '0.08em' }}>
            ROUND HISTORY
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {history.map((h, i) => (
              <Chip
                key={i}
                label={`${h.revealed}/${gridSize - h.mines}`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: h.hit ? alpha('#ff4757', 0.15) : alpha(neonGreen, 0.15),
                  color: h.hit ? '#ff4757' : neonGreen,
                  border: `1px solid ${h.hit ? '#ff4757' : neonGreen}`,
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
          onBet={startGame}
          isRunning={gameActive}
          betLabel={gameActive ? 'Reveal' : 'Start Game'}
          stopLabel="Playing..."
        />

        {/* Mine selector */}
        <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>
            MINES
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {[1, 3, 5, 10].map((m) => (
              <Box
                key={m}
                onClick={() => !gameActive && setMineCount(m)}
                sx={{
                  flex: 1,
                  py: 0.8,
                  textAlign: 'center',
                  borderRadius: 1.5,
                  cursor: gameActive ? 'default' : 'pointer',
                  background: mineCount === m ? alpha(neonGreen, 0.15) : alpha('#fff', 0.04),
                  border: `1px solid ${mineCount === m ? alpha(neonGreen, 0.5) : darkBorder}`,
                  color: mineCount === m ? neonGreen : 'text.secondary',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  transition: 'all 0.2s',
                  opacity: gameActive ? 0.5 : 1,
                }}
              >
                {m}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Cash out button */}
        {gameActive && safeRevealed > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={cashOut}
              sx={{
                py: 1.5,
                fontWeight: 900,
                fontSize: '0.95rem',
                background: `linear-gradient(135deg, ${neonGold}, #ff9f43)`,
                color: '#000',
              }}
            >
              CASH OUT
            </Button>
          </motion.div>
        )}

        {/* Rules */}
        <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>
            HOW TO PLAY
          </Typography>
          {[
            { label: 'Reveal cells', desc: 'Avoid mines' },
            { label: 'Each safe cell', desc: 'Increases multiplier' },
            { label: 'Cash out', desc: 'Before hitting a mine' },
          ].map((r) => (
            <Box key={r.label} sx={{ mb: 0.8 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>{r.label}</Typography>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>{r.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
