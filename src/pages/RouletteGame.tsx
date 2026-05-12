import { useState, useRef } from 'react';
import {
  Box, Typography, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import BettingControls from '../components/casino/BettingControls';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useWallet } from '../contexts/WalletContext';
import { useCurrencyDefaults } from '../utils/useCurrencyDefaults';

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

function getColor(n: number): string {
  if (n === 0) return '#00aa44';
  return RED_NUMBERS.includes(n) ? '#cc2233' : '#222';
}

type BetType = 'number' | 'red' | 'black' | 'odd' | 'even' | '1-18' | '19-36' | '1st12' | '2nd12' | '3rd12';

interface Bet {
  type: BetType;
  value?: number;
  amount: number;
}

function resolveBet(bet: Bet, result: number): number {
  const isRed = RED_NUMBERS.includes(result);
  switch (bet.type) {
    case 'number': return bet.value === result ? bet.amount * 35 : -bet.amount;
    case 'red': return isRed ? bet.amount : -bet.amount;
    case 'black': return !isRed && result !== 0 ? bet.amount : -bet.amount;
    case 'odd': return result > 0 && result % 2 !== 0 ? bet.amount : -bet.amount;
    case 'even': return result > 0 && result % 2 === 0 ? bet.amount : -bet.amount;
    case '1-18': return result >= 1 && result <= 18 ? bet.amount : -bet.amount;
    case '19-36': return result >= 19 && result <= 36 ? bet.amount : -bet.amount;
    case '1st12': return result >= 1 && result <= 12 ? bet.amount * 2 : -bet.amount;
    case '2nd12': return result >= 13 && result <= 24 ? bet.amount * 2 : -bet.amount;
    case '3rd12': return result >= 25 && result <= 36 ? bet.amount * 2 : -bet.amount;
    default: return -bet.amount;
  }
}

interface HistoryEntry { number: number; color: string }

const WHEEL_NUMBERS = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

export default function RouletteGame() {
  const wallet = useWallet();
  const defaults = useCurrencyDefaults();
  const [betAmount, setBetAmount] = useState(() => defaults.defaultStakeString);
  const [bets, setBets] = useState<Bet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [selectedBetType, setSelectedBetType] = useState<BetType>('red');
  const spinRef = useRef(0);

  function addBet(type: BetType, value?: number) {
    const amt = parseFloat(betAmount) || 0.01;
    setBets(prev => {
      const existing = prev.findIndex(b => b.type === type && b.value === value);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], amount: updated[existing].amount + amt };
        return updated;
      }
      return [...prev, { type, value, amount: amt }];
    });
  }

  function clearBets() { setBets([]); }

  async function spin() {
    if (spinning || bets.length === 0) return;
    const totalStake = bets.reduce((s, b) => s + b.amount, 0);
    const placed = await wallet.placeBet({
      gameId: 'roulette',
      gameName: 'Roulette',
      stake: totalStake,
      details: `${bets.length} bet${bets.length > 1 ? 's' : ''} on the table`,
    });
    if (!placed) return;  // auth/balance gate

    setSpinning(true);
    setResult(null);
    setWinAmount(null);

    const resultNum = Math.floor(Math.random() * 37);
    const wheelIdx = WHEEL_NUMBERS.indexOf(resultNum);
    const degreesPerSlot = 360 / 37;
    const targetAngle = spinRef.current + 1440 + (wheelIdx * degreesPerSlot);
    spinRef.current = targetAngle;
    setWheelAngle(targetAngle);

    setTimeout(() => {
      // resolveBet returns +profit on a winning leg and -stake on a losing leg.
      // Translate that into the wallet's stake/payout model.
      const net = bets.reduce((sum, b) => sum + resolveBet(b, resultNum), 0);
      const payout = Math.max(0, totalStake + net);   // amount returned to the user
      setResult(resultNum);
      setWinAmount(net);
      setHistory(prev => [{ number: resultNum, color: getColor(resultNum) }, ...prev.slice(0, 19)]);
      void wallet.settleBet(placed.id, {
        won: net > 0,
        payout,
        details: `Number ${resultNum} · ${net >= 0 ? '+' : ''}${net.toFixed(5)} net`,
      });
      setSpinning(false);
    }, 3000);
  }

  const totalBetAmt = bets.reduce((s, b) => s + b.amount, 0);

  const OUTSIDE_BETS: { label: string; type: BetType; color?: string }[] = [
    { label: '1-18', type: '1-18' },
    { label: 'EVEN', type: 'even' },
    { label: 'RED', type: 'red', color: '#cc2233' },
    { label: 'BLACK', type: 'black', color: '#333' },
    { label: 'ODD', type: 'odd' },
    { label: '19-36', type: '19-36' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, minHeight: 'calc(100vh - 64px)', p: 2, gap: 2 }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* History */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minHeight: 28 }}>
          {history.map((h, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Box
                sx={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: h.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${alpha('#fff', 0.2)}`,
                }}
              >
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: '#fff' }}>{h.number}</Typography>
              </Box>
            </motion.div>
          ))}
        </Box>

        {/* Wheel */}
        <Box
          sx={{
            background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 3,
            p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}
        >
          <Box sx={{ position: 'relative', width: 220, height: 220 }}>
            {/* Wheel SVG */}
            <motion.div
              animate={{ rotate: wheelAngle }}
              transition={{ duration: 3, ease: [0.1, 0.6, 0.9, 1.0] }}
              style={{ width: '100%', height: '100%' }}
            >
              <svg viewBox="0 0 220 220" style={{ width: '100%', height: '100%' }}>
                {WHEEL_NUMBERS.map((num, i) => {
                  const angle = (i / 37) * 360;
                  const startRad = ((angle - 360 / 37 / 2) * Math.PI) / 180;
                  const endRad = ((angle + 360 / 37 / 2) * Math.PI) / 180;
                  const cx = 110, cy = 110, r = 100, ri = 40;
                  const x1 = cx + r * Math.cos(startRad);
                  const y1 = cy + r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad);
                  const y2 = cy + r * Math.sin(endRad);
                  const ix1 = cx + ri * Math.cos(startRad);
                  const iy1 = cy + ri * Math.sin(startRad);
                  const ix2 = cx + ri * Math.cos(endRad);
                  const iy2 = cy + ri * Math.sin(endRad);
                  const midRad = (angle * Math.PI) / 180;
                  const tx = cx + 72 * Math.cos(midRad);
                  const ty = cy + 72 * Math.sin(midRad);
                  const col = getColor(num);
                  return (
                    <g key={num}>
                      <path
                        d={`M ${ix1} ${iy1} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ri} ${ri} 0 0 0 ${ix1} ${iy1}`}
                        fill={col}
                        stroke={alpha('#fff', 0.15)}
                        strokeWidth="0.5"
                      />
                      <text
                        x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                        fill="#fff" fontSize="7" fontWeight="bold" fontFamily="Roboto, sans-serif"
                        transform={`rotate(${angle + 90}, ${tx}, ${ty})`}
                      >
                        {num}
                      </text>
                    </g>
                  );
                })}
                <circle cx="110" cy="110" r="38" fill={darkCard} stroke={alpha(neonGold, 0.5)} strokeWidth="2" />
                <circle cx="110" cy="110" r="10" fill={neonGold} />
              </svg>
            </motion.div>
            {/* Ball marker */}
            <Box
              sx={{
                position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                width: 12, height: 12, borderRadius: '50%',
                background: '#fff', boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                zIndex: 10,
              }}
            />
            {/* Result */}
            <AnimatePresence>
              {result !== null && !spinning && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Box
                    sx={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: getColor(result),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `3px solid ${alpha('#fff', 0.8)}`,
                      boxShadow: `0 0 20px ${getColor(result)}`,
                    }}
                  >
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>{result}</Typography>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>

          {/* Win display */}
          <AnimatePresence>
            {winAmount !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Typography
                  sx={{
                    fontSize: '1.6rem', fontWeight: 900, textAlign: 'center',
                    color: winAmount > 0 ? neonGreen : '#ff4757',
                    textShadow: `0 0 20px ${winAmount > 0 ? alpha(neonGreen, 0.6) : alpha('#ff4757', 0.6)}`,
                  }}
                >
                  {winAmount > 0 ? `+${winAmount.toFixed(5)} BTC` : `${winAmount.toFixed(5)} BTC`}
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* Betting board */}
        <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 1.5 }}>
          {/* Numbers grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 0.3, mb: 1 }}>
            {/* 0 */}
            <Box
              onClick={() => addBet('number', 0)}
              sx={{
                gridColumn: 'span 1', gridRow: 'span 3',
                height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: alpha('#00aa44', 0.2), border: `1px solid ${alpha('#00aa44', 0.5)}`,
                borderRadius: 1, cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem', color: '#fff',
                '&:hover': { background: alpha('#00aa44', 0.4) },
                transition: 'background 0.15s',
              }}
            >
              0
            </Box>
            {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
              const col = getColor(n);
              return (
                <Box
                  key={n}
                  onClick={() => addBet('number', n)}
                  sx={{
                    height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: alpha(col, 0.35), border: `1px solid ${alpha(col, 0.5)}`,
                    borderRadius: 0.5, cursor: 'pointer', fontWeight: 700, fontSize: '0.6rem', color: '#fff',
                    '&:hover': { background: alpha(col, 0.65), transform: 'scale(1.05)' },
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </Box>
              );
            })}
          </Box>

          {/* Dozens */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
            {(['1st12', '2nd12', '3rd12'] as BetType[]).map((t, i) => (
              <Box
                key={t}
                onClick={() => addBet(t)}
                sx={{
                  flex: 1, py: 0.8, textAlign: 'center', borderRadius: 1, cursor: 'pointer',
                  background: alpha(neonBlue, 0.1), border: `1px solid ${alpha(neonBlue, 0.3)}`,
                  fontSize: '0.7rem', fontWeight: 700, color: neonBlue,
                  '&:hover': { background: alpha(neonBlue, 0.25) }, transition: 'background 0.15s',
                }}
              >
                {['1st 12', '2nd 12', '3rd 12'][i]}
              </Box>
            ))}
          </Box>

          {/* Outside bets */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {OUTSIDE_BETS.map((ob) => (
              <Box
                key={ob.type}
                onClick={() => addBet(ob.type)}
                sx={{
                  flex: 1, py: 0.8, textAlign: 'center', borderRadius: 1, cursor: 'pointer',
                  background: ob.color ? alpha(ob.color, 0.3) : alpha('#fff', 0.05),
                  border: `1px solid ${ob.color ? alpha(ob.color, 0.5) : darkBorder}`,
                  fontSize: '0.65rem', fontWeight: 800, color: '#fff',
                  '&:hover': { opacity: 0.8, transform: 'scale(1.02)' },
                  transition: 'all 0.15s',
                }}
              >
                {ob.label}
              </Box>
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
          isRunning={spinning}
          betLabel={bets.length === 0 ? 'Place Bets First' : `Spin (${totalBetAmt.toFixed(3)} BTC)`}
          stopLabel="Spinning..."
        />

        {/* Current bets */}
        {bets.length > 0 && (
          <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em' }}>
                PLACED BETS
              </Typography>
              <Button size="small" onClick={clearBets} sx={{ fontSize: '0.65rem', color: '#ff4757', py: 0, minWidth: 'auto' }}>
                Clear
              </Button>
            </Box>
            {bets.map((b, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase' }}>
                  {b.type}{b.value !== undefined ? ` #${b.value}` : ''}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: neonGold }}>{b.amount.toFixed(3)}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Quick bets */}
        <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>
            QUICK BETS
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {(['red', 'black', 'odd', 'even'] as BetType[]).map((t) => (
              <Box
                key={t}
                onClick={() => { setSelectedBetType(t); addBet(t); }}
                sx={{
                  px: 1.2, py: 0.6, borderRadius: 1.5, cursor: 'pointer',
                  background: selectedBetType === t ? alpha(neonGreen, 0.15) : alpha('#fff', 0.04),
                  border: `1px solid ${selectedBetType === t ? alpha(neonGreen, 0.5) : darkBorder}`,
                  color: selectedBetType === t ? neonGreen : 'text.secondary',
                  fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase',
                  transition: 'all 0.15s',
                }}
              >
                {t}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
