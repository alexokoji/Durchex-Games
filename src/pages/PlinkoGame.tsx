import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import BettingControls from '../components/casino/BettingControls';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';

const ROWS = 12;
const RISK_LEVELS = ['Low', 'Medium', 'High'];
const MULTIPLIERS: Record<string, number[]> = {
  Low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  Medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
  High:   [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
};

const BUCKET_COLORS = [
  '#ff4757', '#ff6b6b', '#ff9f43', '#ffd700', neonGreen,
  '#ffd700', '#ff9f43', '#ff6b6b', '#ff4757',
];

interface Ball {
  id: number; x: number; y: number; vx: number; vy: number;
  row: number; col: number; done: boolean; bucket: number | null;
}

interface PegState { row: number; col: number; lit: boolean; color: string }

export default function PlinkoGame() {
  const [betAmount, setBetAmount] = useState('0.01');
  const [risk, setRisk] = useState('Medium');
  const [balls, setBalls] = useState<Ball[]>([]);
  const [pegs, setPegs] = useState<PegState[]>([]);
  const [history, setHistory] = useState<{ mult: number; color: string }[]>([]);
  const [activeResult, setActiveResult] = useState<{ mult: number; bucket: number } | null>(null);
  const idRef = useRef(0);
  const ballsRef = useRef<Ball[]>([]);
  const pegsRef = useRef<PegState[]>([]);

  const mults = MULTIPLIERS[risk];
  const BOARD_W = 500;
  const BOARD_H = 520;
  const PEG_R = 6;
  const BALL_R = 8;

  function pegX(row: number, col: number) {
    const cols = row + 1;
    const spacing = BOARD_W / (cols + 1);
    return spacing * (col + 1);
  }
  function pegY(row: number) {
    return 40 + row * ((BOARD_H - 120) / ROWS);
  }

  // Initialize pegs
  useEffect(() => {
    const ps: PegState[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= r; c++) {
        ps.push({ row: r, col: c, lit: false, color: neonBlue });
      }
    }
    setPegs(ps);
    pegsRef.current = ps;
  }, []);

  function dropBall() {
    const ball: Ball = {
      id: idRef.current++,
      x: BOARD_W / 2 + (Math.random() - 0.5) * 4,
      y: 10,
      vx: 0, vy: 1,
      row: 0, col: 0,
      done: false, bucket: null,
    };
    ballsRef.current = [...ballsRef.current, ball];
    setBalls([...ballsRef.current]);
    animateBall(ball.id);
  }

  function animateBall(id: number) {
    function step() {
      const idx = ballsRef.current.findIndex(b => b.id === id);
      if (idx === -1) return;
      const b = { ...ballsRef.current[idx] };

      if (b.done) return;

      b.vy += 0.35;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.92;

      // Check peg collisions
      for (const peg of pegsRef.current) {
        const px = pegX(peg.row, peg.col);
        const py = pegY(peg.row);
        const dx = b.x - px;
        const dy = b.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PEG_R + BALL_R) {
          // Bounce
          b.vx = dx > 0 ? Math.abs(b.vx) + (Math.random() * 2 + 1) : -(Math.abs(b.vx) + (Math.random() * 2 + 1));
          b.vy = -Math.abs(b.vy) * 0.5;
          b.y = py - (PEG_R + BALL_R) - 1;
          // Light up peg
          const newPegs = pegsRef.current.map(p =>
            p.row === peg.row && p.col === peg.col
              ? { ...p, lit: true, color: neonGold }
              : p
          );
          pegsRef.current = newPegs;
          setPegs([...newPegs]);
          setTimeout(() => {
            const reset = pegsRef.current.map(p =>
              p.row === peg.row && p.col === peg.col
                ? { ...p, lit: false, color: neonBlue }
                : p
            );
            pegsRef.current = reset;
            setPegs([...reset]);
          }, 200);
          break;
        }
      }

      // Hit bottom - find bucket
      if (b.y > BOARD_H - 50) {
        const bucketCount = mults.length;
        const bucketW = BOARD_W / bucketCount;
        const bucket = Math.min(bucketCount - 1, Math.max(0, Math.floor(b.x / bucketW)));
        b.done = true;
        b.bucket = bucket;
        const mult = mults[bucket];
        setActiveResult({ mult, bucket });
        setHistory(prev => [{ mult, color: BUCKET_COLORS[bucket] }, ...prev.slice(0, 19)]);
        setTimeout(() => {
          ballsRef.current = ballsRef.current.filter(bb => bb.id !== id);
          setBalls([...ballsRef.current]);
          setActiveResult(null);
        }, 1200);
      }

      if (!b.done) {
        const updated = [...ballsRef.current];
        updated[idx] = b;
        ballsRef.current = updated;
        setBalls([...updated]);
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, minHeight: 'calc(100vh - 64px)', p: 2, gap: 2 }}>
      {/* Main board */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* History */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minHeight: 28 }}>
          {history.slice(0, 15).map((h, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Chip
                label={h.mult + 'x'}
                size="small"
                sx={{
                  height: 22, fontSize: '0.68rem', fontWeight: 800,
                  background: alpha(h.color, 0.15), color: h.color,
                  border: `1px solid ${alpha(h.color, 0.3)}`,
                }}
              />
            </motion.div>
          ))}
        </Box>

        {/* Board */}
        <Box
          sx={{
            background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 3,
            position: 'relative', overflow: 'hidden',
            width: '100%', maxWidth: BOARD_W, mx: 'auto',
          }}
        >
          <svg
            viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
            style={{ width: '100%', display: 'block' }}
          >
            {/* Background grid */}
            <defs>
              <radialGradient id="pegGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={neonBlue} stopOpacity="0.8" />
                <stop offset="100%" stopColor={neonBlue} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Pegs */}
            {pegs.map((peg, i) => {
              const x = pegX(peg.row, peg.col);
              const y = pegY(peg.row);
              return (
                <g key={i}>
                  {peg.lit && (
                    <circle cx={x} cy={y} r={PEG_R * 2.5} fill={peg.color} opacity={0.25} />
                  )}
                  <circle
                    cx={x} cy={y} r={PEG_R}
                    fill={peg.lit ? peg.color : alpha(neonBlue, 0.7)}
                    style={{
                      filter: peg.lit ? `drop-shadow(0 0 6px ${peg.color})` : 'none',
                      transition: 'fill 0.1s',
                    }}
                  />
                </g>
              );
            })}

            {/* Balls */}
            {balls.map((ball) => (
              <g key={ball.id}>
                <circle cx={ball.x} cy={ball.y} r={BALL_R * 1.8} fill={neonGreen} opacity={0.15} />
                <circle
                  cx={ball.x} cy={ball.y} r={BALL_R}
                  fill="url(#ballGrad)"
                  style={{ filter: `drop-shadow(0 0 8px ${neonGreen})` }}
                />
              </g>
            ))}

            {/* Ball gradient */}
            <defs>
              <radialGradient id="ballGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor={neonGreen} />
              </radialGradient>
            </defs>

            {/* Buckets */}
            {mults.map((mult, i) => {
              const bucketW = BOARD_W / mults.length;
              const x = i * bucketW;
              const color = BUCKET_COLORS[i];
              const isActive = activeResult?.bucket === i;
              return (
                <g key={i}>
                  <rect
                    x={x + 2} y={BOARD_H - 44} width={bucketW - 4} height={40}
                    rx={4}
                    fill={alpha(color, isActive ? 0.5 : 0.15)}
                    stroke={color}
                    strokeWidth={isActive ? 2 : 1}
                    style={{ transition: 'all 0.2s' }}
                  />
                  <text
                    x={x + bucketW / 2} y={BOARD_H - 18}
                    textAnchor="middle"
                    fill={isActive ? '#fff' : color}
                    fontSize={mult >= 10 ? 11 : 12}
                    fontWeight="800"
                    fontFamily="Roboto, sans-serif"
                  >
                    {mult}x
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Active result overlay */}
          {activeResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              style={{
                position: 'absolute', top: '40%', left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none', textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '3rem', fontWeight: 900,
                  color: BUCKET_COLORS[activeResult.bucket],
                  textShadow: `0 0 30px ${BUCKET_COLORS[activeResult.bucket]}`,
                }}
              >
                {activeResult.mult}x
              </Typography>
            </motion.div>
          )}
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0 }}>
        {/* Risk selector */}
        <Box sx={{ mb: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 1.5 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 1, letterSpacing: '0.08em' }}>
            RISK LEVEL
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {RISK_LEVELS.map((r) => (
              <Box
                key={r}
                onClick={() => setRisk(r)}
                sx={{
                  flex: 1, textAlign: 'center', py: 0.8, borderRadius: 1.5, cursor: 'pointer',
                  background: risk === r ? alpha(neonGreen, 0.15) : alpha('#fff', 0.03),
                  border: `1px solid ${risk === r ? alpha(neonGreen, 0.5) : darkBorder}`,
                  color: risk === r ? neonGreen : 'text.secondary',
                  fontWeight: 700, fontSize: '0.78rem',
                  transition: 'all 0.2s',
                }}
              >
                {r}
              </Box>
            ))}
          </Box>
        </Box>

        <BettingControls
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onBet={dropBall}
          betLabel="Drop Ball"
        />

        {/* Multipliers preview */}
        <Box sx={{ mt: 1.5, p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mb: 1, letterSpacing: '0.08em' }}>
            MULTIPLIERS
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {mults.map((m, i) => (
              <Chip
                key={i}
                label={`${m}x`}
                size="small"
                sx={{
                  height: 22, fontSize: '0.68rem', fontWeight: 800,
                  background: alpha(BUCKET_COLORS[i], 0.15),
                  color: BUCKET_COLORS[i],
                  border: `1px solid ${alpha(BUCKET_COLORS[i], 0.3)}`,
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
