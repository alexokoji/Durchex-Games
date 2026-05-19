import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, TextField, Chip, Avatar,
  InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import BettingControls from '../components/casino/BettingControls';
import AutoBetPanel from '../components/casino/AutoBetPanel';
import { useAutoBet } from '../components/casino/useAutoBet';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useWallet, type BetRecord } from '../contexts/WalletContext';
import { useCurrencyDefaults } from '../utils/useCurrencyDefaults';
import { formatMoney } from '../utils/currency';

type GameState = 'waiting' | 'running' | 'crashed';

const USERS = ['Viper_X', 'CryptoBeast', 'LuckyDragon', 'Satoshi99', 'NeonWolf', 'DiamondHands', 'WhaleAlert'];
const COLORS = [neonGreen, neonBlue, '#a855f7', '#ff9f43', '#ff4757'];

function randUser() { return USERS[Math.floor(Math.random() * USERS.length)]; }
function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function randBet() { return (Math.random() * 0.05 + 0.001).toFixed(4); }
function randCashout() { return (Math.random() * 8 + 1.2).toFixed(2); }

interface Player {
  id: number; user: string; bet: string; cashout: string | null; color: string; cashedOut?: boolean; mult?: number;
}

export default function CrashGame() {
  const wallet = useWallet();
  const defaults = useCurrencyDefaults();
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [betAmount, setBetAmount] = useState(() => defaults.defaultStakeString);
  const [autoCashout, setAutoCashout] = useState('2.00');
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<number[]>([14.2, 1.4, 3.8, 8.1, 1.1, 22.5, 1.9, 5.4, 2.0, 11.3]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const idRef = useRef(100);
  const multRef = useRef(1.0);
  const crashAtRef = useRef(1.0);
  const stateRef = useRef<GameState>('waiting');
  const activeBetRef = useRef<BetRecord | null>(null);
  // When auto-play is driving the round, this resolves the per-round Promise
  // so the useAutoBet loop can advance. We can't await React state directly,
  // so the resolver is stored in a ref and called from the settlement paths
  // (manual cashout effect, crash settle, cancel).
  const roundResolveRef = useRef<((r: { won: boolean; profit: number } | null) => void) | null>(null);

  function generateCrash(): number {
    const r = Math.random();
    if (r < 0.05) return 1.0 + Math.random() * 0.1;
    if (r < 0.3) return 1.0 + Math.random() * 1.5;
    if (r < 0.7) return 1.5 + Math.random() * 5;
    return 5 + Math.random() * 20;
  }

  function generatePlayers(): Player[] {
    return Array.from({ length: Math.floor(Math.random() * 8) + 4 }, () => ({
      id: idRef.current++,
      user: randUser(),
      bet: randBet(),
      cashout: randCashout(),
      color: randColor(),
      cashedOut: false,
    }));
  }

  function drawCurve() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const crashed = stateRef.current === 'crashed';
    const curMult = multRef.current;

    // Grid
    ctx.strokeStyle = alpha('#ffffff', 0.05);
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (points.length < 2) return;

    const maxMult = Math.max(curMult + 1, 3);
    const padX = 40, padY = 30;

    function toCanvas(p: { x: number; y: number }) {
      const cx = padX + (p.x / 100) * (W - padX - 10);
      const cy = H - padY - ((p.y - 1) / (maxMult - 1)) * (H - padY - 10);
      return { cx, cy };
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    if (crashed) {
      grad.addColorStop(0, alpha('#ff4757', 0.4));
      grad.addColorStop(1, alpha('#ff4757', 0.02));
    } else {
      grad.addColorStop(0, alpha(neonGreen, 0.3));
      grad.addColorStop(1, alpha(neonGreen, 0.02));
    }

    ctx.beginPath();
    const start = toCanvas(points[0]);
    ctx.moveTo(start.cx, H - padY);
    ctx.lineTo(start.cx, start.cy);
    points.forEach(p => {
      const { cx, cy } = toCanvas(p);
      ctx.lineTo(cx, cy);
    });
    const last = toCanvas(points[points.length - 1]);
    ctx.lineTo(last.cx, H - padY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(start.cx, start.cy);
    points.forEach(p => {
      const { cx, cy } = toCanvas(p);
      ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = crashed ? '#ff4757' : neonGreen;
    ctx.lineWidth = 3;
    ctx.shadowColor = crashed ? '#ff4757' : neonGreen;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dot at end
    const dot = toCanvas(points[points.length - 1]);
    ctx.beginPath();
    ctx.arc(dot.cx, dot.cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = crashed ? '#ff4757' : neonGreen;
    ctx.shadowColor = crashed ? '#ff4757' : neonGreen;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Y-axis labels
    ctx.fillStyle = alpha('#ffffff', 0.4);
    ctx.font = '11px Roboto, sans-serif';
    for (let m = 1; m <= Math.ceil(maxMult); m += Math.ceil((maxMult - 1) / 4)) {
      const cy = H - padY - ((m - 1) / (maxMult - 1)) * (H - padY - 10);
      ctx.fillText(m.toFixed(1) + 'x', 4, cy + 4);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      drawCurve();
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    return () => ro.disconnect();
  }, []);

  useEffect(() => { drawCurve(); }, [points, gameState]);

  // Start countdown
  function startCountdown() {
    stateRef.current = 'waiting';
    setGameState('waiting');
    setMultiplier(1.0);
    multRef.current = 1.0;
    setCashedOut(null);
    setBetPlaced(false);
    setPoints([]);
    const crash = generateCrash();
    crashAtRef.current = crash;
    setPlayers(generatePlayers());

    let count = 5;
    setCountdown(count);
    const t = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(t);
        startGame();
      }
    }, 1000);
  }

  function startGame() {
    stateRef.current = 'running';
    setGameState('running');
    startTimeRef.current = Date.now();
    const crash = crashAtRef.current;
    const newPoints: { x: number; y: number }[] = [];

    function tick() {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const m = Math.pow(Math.E, elapsed * 0.07) * 1.0;
      multRef.current = m;
      setMultiplier(parseFloat(m.toFixed(2)));

      const pct = Math.min((elapsed / 60) * 100, 99);
      newPoints.push({ x: pct, y: m });
      setPoints([...newPoints]);

      // Auto cashout for fake players
      setPlayers(prev => prev.map(p => {
        if (!p.cashedOut && p.cashout && m >= parseFloat(p.cashout)) {
          return { ...p, cashedOut: true, mult: parseFloat(p.cashout) };
        }
        return p;
      }));

      // Auto cashout for user
      if (betPlaced && !cashedOut) {
        const ac = parseFloat(autoCashout);
        if (!isNaN(ac) && m >= ac) {
          setCashedOut(ac);
        }
      }

      if (m >= crash) {
        stateRef.current = 'crashed';
        setGameState('crashed');
        setHistory(prev => [parseFloat(m.toFixed(2)), ...prev.slice(0, 9)]);
        // Settle the user's bet on crash if they never cashed out.
        const bet = activeBetRef.current;
        if (bet && cashedOut === null) {
          const lostStake = bet.stake;
          void wallet.settleBet(bet.id, {
            won: false,
            payout: 0,
            details: `Crashed at ${m.toFixed(2)}× before cashout`,
          });
          activeBetRef.current = null;
          // Tell the auto-play loop this round ended as a loss.
          roundResolveRef.current?.({ won: false, profit: -lostStake });
          roundResolveRef.current = null;
        }
        setTimeout(startCountdown, 3000);
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    startCountdown();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  async function handleBet() {
    if (gameState === 'waiting') {
      const stake = Math.max(0, parseFloat(betAmount) || 0);
      const bet = await wallet.placeBet({
        gameId: 'crash',
        gameName: 'Crash',
        stake,
        details: `Auto-cashout @ ${parseFloat(autoCashout || '0').toFixed(2)}×`,
      });
      if (!bet) return;  // auth modal opens automatically when not signed in
      activeBetRef.current = bet;
      setBetPlaced(true);
    } else if (gameState === 'running' && betPlaced && cashedOut === null) {
      // Manual cashout — useEffect on `cashedOut` settles the bet via wallet.
      setCashedOut(multiplier);
    }
  }

  /**
   * Auto-play: place a bet on the next 'waiting' phase and wait for the
   * round to resolve (either auto-cashout hit or crash). Returns null if
   * the bet couldn't be placed (auth/balance) or if we couldn't grab a
   * 'waiting' slot within ~30 seconds.
   *
   * useAutoBet drives this via stake progression + stop conditions.
   */
  const runOneRound = useCallback((overrideStake?: number): Promise<{ won: boolean; profit: number } | null> => {
    return new Promise(async (resolve) => {
      // Wait for the next 'waiting' phase. Poll stateRef so we see fresh state.
      const startedAt = Date.now();
      while (stateRef.current !== 'waiting' || activeBetRef.current) {
        if (Date.now() - startedAt > 30_000) return resolve(null);
        await new Promise(r => setTimeout(r, 250));
      }
      const stake = overrideStake != null ? overrideStake : Math.max(0, parseFloat(betAmount) || 0);
      const bet = await wallet.placeBet({
        gameId: 'crash',
        gameName: 'Crash',
        stake,
        details: `Auto-play · cashout @ ${parseFloat(autoCashout || '0').toFixed(2)}×`,
      });
      if (!bet) return resolve(null);
      activeBetRef.current = bet;
      setBetPlaced(true);
      // The existing cashout / crash useEffect paths call roundResolveRef.
      roundResolveRef.current = resolve;
    });
  }, [betAmount, autoCashout, wallet]);

  const auto = useAutoBet({
    runOneBet: runOneRound,
    baseStake: parseFloat(betAmount) || 0,
    setStake: (n) => setBetAmount(n.toFixed(2)),
  });

  // If auto stops mid-round (user clicked Stop), tear down any pending Promise
  // so the loop doesn't hang waiting on a settlement that never comes.
  useEffect(() => {
    if (!auto.isRunning && roundResolveRef.current) {
      roundResolveRef.current(null);
      roundResolveRef.current = null;
    }
  }, [auto.isRunning]);

  // Settle a winning cashout once `cashedOut` flips from null to a number.
  useEffect(() => {
    if (cashedOut === null) return;
    const bet = activeBetRef.current;
    if (!bet) return;
    const stake = bet.stake;
    void wallet.settleBet(bet.id, {
      won: true,
      multiplier: cashedOut,
      payout: stake * cashedOut,
      details: `Cashed out at ${cashedOut.toFixed(2)}×`,
    });
    activeBetRef.current = null;
    // Auto-play loop is waiting on this Promise.
    const profit = stake * cashedOut - stake;
    roundResolveRef.current?.({ won: true, profit });
    roundResolveRef.current = null;
  }, [cashedOut, wallet]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', lg: 'row' },
      // On desktop, the page fills the viewport and the right panel scrolls
      // independently. On mobile we let the page scroll naturally so the
      // canvas + history + players + controls all stack.
      height: { xs: 'auto', lg: 'calc(100vh - 64px)' },
      minHeight: { xs: 'calc(100vh - 64px)', lg: 0 },
      overflow: { xs: 'visible', lg: 'hidden' },
    }}>
      {/* Main game area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, md: 2 }, minWidth: 0 }}>
        {/* History bar */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
          {history.map((h, i) => (
            <Chip
              key={i}
              label={h.toFixed(2) + 'x'}
              size="small"
              sx={{
                height: 22, fontSize: '0.7rem', fontWeight: 800,
                background: h >= 10 ? alpha(neonGold, 0.2) : h >= 2 ? alpha(neonGreen, 0.15) : alpha('#ff4757', 0.15),
                color: h >= 10 ? neonGold : h >= 2 ? neonGreen : '#ff4757',
                border: `1px solid ${h >= 10 ? alpha(neonGold, 0.3) : h >= 2 ? alpha(neonGreen, 0.2) : alpha('#ff4757', 0.2)}`,
              }}
            />
          ))}
        </Box>

        {/* Canvas */}
        <Box
          sx={{
            flex: { xs: '0 0 auto', lg: 1 },
            position: 'relative', borderRadius: 3, overflow: 'hidden',
            background: darkCard, border: `1px solid ${darkBorder}`,
            // On mobile the canvas takes a fixed height (~50vh) so the chart
            // stays sized while the rest of the page scrolls underneath it.
            minHeight: { xs: 280, md: 300 },
            height:    { xs: '50vh', lg: 'auto' },
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* Big multiplier display */}
          <Box
            sx={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}
          >
            <AnimatePresence mode="wait">
              {gameState === 'waiting' ? (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{ textAlign: 'center' }}
                >
                  <Typography sx={{ fontSize: '1rem', color: 'text.secondary', mb: 1 }}>Next round in</Typography>
                  <Typography sx={{
                    fontSize: '4rem', fontWeight: 900, color: neonBlue,
                    textShadow: `0 0 30px ${alpha(neonBlue, 0.8)}`,
                  }}>
                    {countdown}s
                  </Typography>
                  {betPlaced && (
                    <Chip label="Bet Placed ✓" sx={{ mt: 1, background: alpha(neonGreen, 0.2), color: neonGreen, fontWeight: 700 }} />
                  )}
                </motion.div>
              ) : gameState === 'crashed' ? (
                <motion.div
                  key="crashed"
                  initial={{ opacity: 0, scale: 1.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center' }}
                >
                  <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff4757', mb: 0.5, letterSpacing: '0.1em' }}>
                    CRASHED!
                  </Typography>
                  <Typography sx={{
                    fontSize: '4.5rem', fontWeight: 900, color: '#ff4757',
                    textShadow: '0 0 40px rgba(255,71,87,0.8)',
                  }}>
                    {multiplier.toFixed(2)}x
                  </Typography>
                </motion.div>
              ) : (
                <motion.div
                  key="running"
                  style={{ textAlign: 'center' }}
                >
                  <Typography
                    sx={{
                      fontSize: '5rem', fontWeight: 900,
                      color: multiplier > 5 ? neonGold : neonGreen,
                      textShadow: `0 0 40px ${multiplier > 5 ? alpha(neonGold, 0.8) : alpha(neonGreen, 0.8)}`,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {multiplier.toFixed(2)}x
                  </Typography>
                  {cashedOut && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Chip
                        label={`Cashed out @ ${cashedOut.toFixed(2)}x 🎉`}
                        sx={{
                          mt: 1, background: alpha(neonGold, 0.25), color: neonGold,
                          fontWeight: 800, fontSize: '0.85rem', height: 30,
                          border: `1px solid ${alpha(neonGold, 0.4)}`,
                        }}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Box>

        {/* Active players table */}
        <Box sx={{ mt: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', px: 2, py: 1, borderBottom: `1px solid ${darkBorder}` }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, flex: 1 }}>PLAYER</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, width: 70, textAlign: 'right' }}>BET</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, width: 80, textAlign: 'right' }}>CASHOUT</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, width: 80, textAlign: 'right' }}>PROFIT</Typography>
          </Box>
          <Box sx={{ maxHeight: 140, overflowY: 'auto' }}>
            {players.map((p) => (
              <Box
                key={p.id}
                sx={{
                  display: 'flex', alignItems: 'center', px: 2, py: 0.6,
                  '&:hover': { background: alpha('#fff', 0.02) },
                  borderBottom: `1px solid ${alpha(darkBorder, 0.5)}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: '0.55rem', background: alpha(p.color, 0.4), color: p.color }}>
                    {p.user[0]}
                  </Avatar>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }} noWrap>{p.user}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', width: 70, textAlign: 'right', color: 'text.secondary' }}>
                  {p.bet}
                </Typography>
                <Box sx={{ width: 80, textAlign: 'right' }}>
                  {p.cashedOut ? (
                    <Chip
                      label={`${p.mult?.toFixed(2)}x`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, background: alpha(neonGreen, 0.15), color: neonGreen }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>{p.cashout}x</Typography>
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.75rem', width: 80, textAlign: 'right', fontWeight: 700,
                    color: p.cashedOut ? neonGreen : gameState === 'crashed' ? '#ff4757' : 'text.disabled',
                  }}
                >
                  {p.cashedOut
                    ? `+${(parseFloat(p.bet) * (p.mult || 1)).toFixed(4)}`
                    : gameState === 'crashed' ? `-${p.bet}` : '-'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right panel - betting */}
      <Box
        sx={{
          width: { xs: '100%', lg: 280 },
          flexShrink: 0,
          p: { xs: 1.5, md: 2 },
          borderLeft: { lg: `1px solid ${darkBorder}` },
          borderTop:  { xs: `1px solid ${darkBorder}`, lg: 'none' },
          // The right panel only needs an internal scroll on desktop; on
          // mobile it shares the page scroll with the canvas + history above.
          overflowY: { xs: 'visible', lg: 'auto' },
        }}
      >
        <BettingControls
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onBet={handleBet}
          isRunning={gameState === 'running' && betPlaced && !cashedOut}
          betLabel={gameState === 'waiting' ? (betPlaced ? 'Cancel Bet' : 'Place Bet') : gameState === 'running' ? (betPlaced && !cashedOut ? 'Cash Out' : 'Bet Next') : 'Place Bet'}
          stopLabel={`Cash Out @ ${multiplier.toFixed(2)}x`}
        >
          <Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 0.5, fontWeight: 600 }}>
              AUTO CASH OUT AT
            </Typography>
            <TextField
              value={autoCashout}
              onChange={e => setAutoCashout(e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>x</Typography></InputAdornment>,
              }}
            />
          </Box>
        </BettingControls>

        {cashedOut && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Box
              sx={{
                mt: 2, p: 2, borderRadius: 2, textAlign: 'center',
                background: alpha(neonGreen, 0.1), border: `1px solid ${alpha(neonGreen, 0.3)}`,
              }}
            >
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Cashed out at</Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: neonGreen }}>{cashedOut.toFixed(2)}x</Typography>
              <Typography sx={{ fontSize: '0.85rem', color: neonGold, fontWeight: 700 }}>
                +{formatMoney((parseFloat(betAmount) || 0) * cashedOut - (parseFloat(betAmount) || 0), wallet.currency)}
              </Typography>
            </Box>
          </motion.div>
        )}

        {/* Auto-play panel — places a bet each waiting phase, auto-cashes out
            at the multiplier above, applies progression between rounds. */}
        <Box sx={{ mt: 2 }}>
          <AutoBetPanel
            auto={auto}
            formatMoney={(n) => formatMoney(n, wallet.currency)}
            disabled={false}
          />
        </Box>
      </Box>
    </Box>
  );
}
