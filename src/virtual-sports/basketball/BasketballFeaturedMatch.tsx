import { useEffect, useRef } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import TeamEmblem from '../core/TeamEmblem';
import { neonGreen, neonGold, darkBorder } from '../../theme';
import type { BasketballScheduledMatch } from './useBasketballSchedule';

interface Props { match: BasketballScheduledMatch }

export default function BasketballFeaturedMatch({ match }: Props) {
  const score = runningScore(match);
  const quarter = match.phase === 'live' ? Math.min(4, Math.floor(match.gameMinute / 12) + 1) : match.phase === 'finished' ? 4 : 0;

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(neonGreen, 0.3)}`, background: '#0a0d12', boxShadow: `0 0 30px ${alpha(neonGreen, 0.12)}` }}>
      <Court match={match} />

      {/* Scoreboard */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.25, py: 0.9, background: `linear-gradient(180deg, ${alpha('#000', 0.78)}, transparent)` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <TeamEmblem team={match.home} size={30} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>{match.home.shortName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {score.home} – {score.away}
          </Typography>
          {match.phase === 'live' && (
            <motion.div animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <Chip label={`Q${quarter} · ${formatClock(match.gameMinute)}`} size="small"
                sx={{ mt: 0.4, height: 18, fontSize: '0.62rem', fontWeight: 800, background: alpha('#ff4757', 0.22), color: '#ff4757' }} />
            </motion.div>
          )}
          {match.phase === 'betting' && <Chip label="TIP-OFF SOON" size="small" sx={{ mt: 0.4, height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGreen, 0.18), color: neonGreen }} />}
          {match.phase === 'finished' && <Chip label="FINAL" size="small" sx={{ mt: 0.4, height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGold, 0.2), color: neonGold }} />}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexDirection: 'row-reverse', minWidth: 0 }}>
          <TeamEmblem team={match.away} size={30} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>{match.away.shortName}</Typography>
        </Box>
      </Box>

      {/* Quarter ticker */}
      {(match.phase === 'live' || match.phase === 'finished') && (
        <Box sx={{
          position: 'absolute', top: 64, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 0.5, pointerEvents: 'none',
        }}>
          {[0, 1, 2, 3].map(q => (
            <Chip
              key={q}
              size="small"
              label={`Q${q + 1}: ${q < quarter ? `${match.simulation.quarterScores[q].home}-${match.simulation.quarterScores[q].away}` : '–'}`}
              sx={{
                height: 17, fontSize: '0.58rem', fontWeight: 800,
                background: alpha('#000', 0.55),
                color: q < quarter ? '#fff' : 'text.disabled',
                border: `1px solid ${darkBorder}`,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          ))}
        </Box>
      )}

      <Commentary match={match} />
    </Box>
  );
}

function Court({ match }: { match: BasketballScheduledMatch }) {
  return (
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: 460, minHeight: 240 }}>
      <svg viewBox="0 0 800 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="court-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#a86b30" />
            <stop offset="100%" stopColor="#7a4a1d" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="800" height="600" fill="url(#court-grad)" />
        {/* Wood-plank texture lines */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line key={i} x1="0" y1={30 * i} x2="800" y2={30 * i} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        ))}
        {/* Outline */}
        <rect x="20" y="40" width="760" height="520" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
        {/* Half-court */}
        <line x1="400" y1="40" x2="400" y2="560" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
        <circle cx="400" cy="300" r="58" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
        <circle cx="400" cy="300" r="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        {/* Free-throw zones */}
        <rect x="20"  y="220" width="160" height="160" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
        <rect x="620" y="220" width="160" height="160" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
        {/* 3-point arcs */}
        <path d="M20 100 Q 280 300 20 500" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
        <path d="M780 100 Q 520 300 780 500" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
        {/* Hoops */}
        <circle cx="60"  cy="300" r="10" fill="none" stroke="#ff4757" strokeWidth="3" />
        <circle cx="740" cy="300" r="10" fill="none" stroke="#ff4757" strokeWidth="3" />
        <rect x="46" y="270" width="4" height="60" fill="rgba(255,255,255,0.5)" />
        <rect x="750" y="270" width="4" height="60" fill="rgba(255,255,255,0.5)" />

        {/* Players */}
        {[
          { x: 130, y: 200 }, { x: 130, y: 400 }, { x: 240, y: 300 }, { x: 320, y: 200 }, { x: 320, y: 400 },
        ].map((p, i) => (
          <motion.circle
            key={`h-${i}`}
            cx={p.x} cy={p.y} r="11" fill={match.home.primary} stroke={match.home.secondary || '#fff'} strokeWidth="2"
            animate={match.phase === 'live' ? { cx: [p.x, p.x + 25, p.x], cy: [p.y, p.y + (i % 2 === 0 ? -15 : 15), p.y] } : { cx: p.x, cy: p.y }}
            transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {[
          { x: 670, y: 200 }, { x: 670, y: 400 }, { x: 560, y: 300 }, { x: 480, y: 200 }, { x: 480, y: 400 },
        ].map((p, i) => (
          <motion.circle
            key={`a-${i}`}
            cx={p.x} cy={p.y} r="11" fill={match.away.primary} stroke={match.away.secondary || '#fff'} strokeWidth="2"
            animate={match.phase === 'live' ? { cx: [p.x, p.x - 25, p.x], cy: [p.y, p.y + (i % 2 === 0 ? 15 : -15), p.y] } : { cx: p.x, cy: p.y }}
            transition={{ duration: 2.4 + i * 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Ball */}
        <Ball match={match} />
      </svg>
    </Box>
  );
}

function Ball({ match }: { match: BasketballScheduledMatch }) {
  if (match.phase !== 'live') return <circle cx="400" cy="300" r="9" fill="#e07a1f" stroke="#000" strokeWidth="1" />;
  const sweep = Math.sin(match.gameMinute / 1.4);
  const ballX = 400 + sweep * 280;
  const ballY = 300 + Math.cos(match.gameMinute / 0.9) * 130;
  return (
    <motion.circle
      animate={{ cx: ballX, cy: ballY }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
      r="9" fill="#e07a1f" stroke="#000" strokeWidth="1"
    />
  );
}

function Commentary({ match }: { match: BasketballScheduledMatch }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [match.visibleEvents.length]);

  const recent = match.visibleEvents.slice(-6).reverse();
  return (
    <Box sx={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      maxHeight: 110, p: 1, pt: 4,
      background: `linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)`,
    }}>
      <Box ref={listRef} sx={{ maxHeight: 80, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.2 }}>
        <AnimatePresence initial={false}>
          {recent.map(e => (
            <motion.div key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Typography sx={{
                fontSize: '0.7rem',
                color: e.type === 'goal' ? neonGreen : e.type === 'yellow-card' ? '#ffd700' : '#cfd8dc',
                fontWeight: 600,
              }}>
                <Box component="span" sx={{ color: 'text.secondary', mr: 0.5, fontSize: '0.65rem' }}>
                  Q{Math.min(4, Math.floor(e.minute / 12) + 1)} {formatClock(e.minute)}
                </Box>
                {e.description}
              </Typography>
            </motion.div>
          ))}
          {recent.length === 0 && match.phase === 'betting' && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic' }}>
              Warmups underway — markets open until tip-off.
            </Typography>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

function formatClock(gameMinute: number): string {
  const inQ = gameMinute % 12;
  const remaining = 12 - inQ;
  const m = Math.floor(remaining);
  const s = Math.floor((remaining - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function runningScore(match: BasketballScheduledMatch): { home: number; away: number } {
  if (match.phase === 'finished') return match.simulation.finalScore;
  let home = 0, away = 0;
  for (const e of match.visibleEvents) {
    if (e.type !== 'goal') continue;
    const desc = e.description;
    let pts = 2;
    if (desc.includes('3-pointer')) pts = 3;
    else if (desc.includes('free throw')) pts = 1;
    if (e.team === 'home') home += pts;
    else if (e.team === 'away') away += pts;
  }
  return { home, away };
}
