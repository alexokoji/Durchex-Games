import { useEffect, useRef } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import TeamEmblem from '../core/TeamEmblem';
import { neonGreen, neonGold, darkBorder } from '../../theme';
import type { HockeyScheduledMatch } from './useHockeySchedule';

interface Props { match: HockeyScheduledMatch }

export default function HockeyFeaturedMatch({ match }: Props) {
  const score = runningScore(match);
  const period = match.phase === 'live' ? Math.min(3, Math.floor(match.gameMinute / 20) + 1) : match.phase === 'finished' ? 3 : 0;

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(neonGreen, 0.3)}`, background: '#06141d', boxShadow: `0 0 30px ${alpha(neonGreen, 0.12)}` }}>
      <Rink match={match} />
      {/* Scoreboard */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.25, py: 0.9, background: `linear-gradient(180deg, ${alpha('#000', 0.78)}, transparent)` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <TeamEmblem team={match.home} size={30} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>{match.home.shortName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{score.home} – {score.away}</Typography>
          {match.phase === 'live' && (
            <motion.div animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
              <Chip label={`P${period} · ${formatClock(match.gameMinute)}`} size="small" sx={{ mt: 0.4, height: 18, fontSize: '0.62rem', fontWeight: 800, background: alpha('#ff4757', 0.22), color: '#ff4757' }} />
            </motion.div>
          )}
          {match.phase === 'betting' && <Chip label="PUCK DROP SOON" size="small" sx={{ mt: 0.4, height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGreen, 0.18), color: neonGreen }} />}
          {match.phase === 'finished' && <Chip label="FINAL" size="small" sx={{ mt: 0.4, height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGold, 0.2), color: neonGold }} />}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexDirection: 'row-reverse', minWidth: 0 }}>
          <TeamEmblem team={match.away} size={30} />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>{match.away.shortName}</Typography>
        </Box>
      </Box>

      {/* Period ticker */}
      {(match.phase === 'live' || match.phase === 'finished') && (
        <Box sx={{
          position: 'absolute', top: 64, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 0.5, pointerEvents: 'none',
        }}>
          {[0, 1, 2].map(p => (
            <Chip
              key={p}
              size="small"
              label={`P${p + 1}: ${p < period ? `${match.simulation.periodScores[p].home}-${match.simulation.periodScores[p].away}` : '–'}`}
              sx={{
                height: 17, fontSize: '0.58rem', fontWeight: 800,
                background: alpha('#000', 0.55),
                color: p < period ? '#fff' : 'text.disabled',
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

function Rink({ match }: { match: HockeyScheduledMatch }) {
  return (
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: 460, minHeight: 240 }}>
      <svg viewBox="0 0 800 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="ice-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#cee9f4" />
            <stop offset="100%" stopColor="#a4c5d4" />
          </linearGradient>
        </defs>
        {/* Rink background */}
        <rect x="0" y="0" width="800" height="600" fill="url(#ice-grad)" />
        {/* Rink outline (rounded) */}
        <rect x="30" y="50" width="740" height="500" rx="80" ry="80" fill="none" stroke="#cc1717" strokeWidth="3" />
        {/* Center red line */}
        <line x1="400" y1="50" x2="400" y2="550" stroke="#cc1717" strokeWidth="3" />
        {/* Blue lines */}
        <line x1="240" y1="50" x2="240" y2="550" stroke="#1c66c9" strokeWidth="4" />
        <line x1="560" y1="50" x2="560" y2="550" stroke="#1c66c9" strokeWidth="4" />
        {/* Center face-off */}
        <circle cx="400" cy="300" r="50" fill="none" stroke="#1c66c9" strokeWidth="2" />
        <circle cx="400" cy="300" r="6" fill="#1c66c9" />
        {/* End face-offs */}
        {[[160, 200], [160, 400], [640, 200], [640, 400]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="36" fill="none" stroke="#cc1717" strokeWidth="2" />
        ))}
        {[[160, 200], [160, 400], [640, 200], [640, 400]].map(([x, y], i) => (
          <circle key={`dot${i}`} cx={x} cy={y} r="5" fill="#cc1717" />
        ))}
        {/* Goal creases (half-circles) */}
        <path d="M 60 270 A 30 30 0 0 1 60 330" fill="rgba(28,102,201,0.25)" stroke="#1c66c9" strokeWidth="2" />
        <path d="M 740 270 A 30 30 0 0 0 740 330" fill="rgba(28,102,201,0.25)" stroke="#1c66c9" strokeWidth="2" />
        {/* Goals */}
        <rect x="50" y="282" width="14" height="36" fill="rgba(255,255,255,0.7)" stroke="#cc1717" strokeWidth="1" />
        <rect x="736" y="282" width="14" height="36" fill="rgba(255,255,255,0.7)" stroke="#cc1717" strokeWidth="1" />

        {/* Skaters */}
        {[
          { x: 130, y: 300 }, { x: 220, y: 180 }, { x: 220, y: 420 }, { x: 320, y: 230 }, { x: 320, y: 370 }, { x: 380, y: 300 },
        ].map((p, i) => (
          <motion.circle
            key={`h-${i}`}
            cx={p.x} cy={p.y} r="11" fill={match.home.primary} stroke={match.home.secondary || '#fff'} strokeWidth="2"
            animate={match.phase === 'live' ? { cx: [p.x, p.x + 30, p.x], cy: [p.y, p.y + (i % 2 === 0 ? -16 : 14), p.y] } : { cx: p.x, cy: p.y }}
            transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {[
          { x: 670, y: 300 }, { x: 580, y: 180 }, { x: 580, y: 420 }, { x: 480, y: 230 }, { x: 480, y: 370 }, { x: 420, y: 300 },
        ].map((p, i) => (
          <motion.circle
            key={`a-${i}`}
            cx={p.x} cy={p.y} r="11" fill={match.away.primary} stroke={match.away.secondary || '#fff'} strokeWidth="2"
            animate={match.phase === 'live' ? { cx: [p.x, p.x - 30, p.x], cy: [p.y, p.y + (i % 2 === 0 ? 16 : -14), p.y] } : { cx: p.x, cy: p.y }}
            transition={{ duration: 3 + i * 0.35, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Puck */}
        <Puck match={match} />
      </svg>
    </Box>
  );
}

function Puck({ match }: { match: HockeyScheduledMatch }) {
  if (match.phase !== 'live') return <circle cx="400" cy="300" r="6" fill="#0a0a0a" stroke="#fff" strokeWidth="1" />;
  const sweep = Math.sin(match.gameMinute / 0.9);
  const x = 400 + sweep * 300;
  const y = 300 + Math.cos(match.gameMinute / 0.7) * 140;
  return (
    <motion.circle animate={{ cx: x, cy: y }} transition={{ duration: 0.7, ease: 'easeInOut' }}
      r="6" fill="#0a0a0a" stroke="#fff" strokeWidth="1" />
  );
}

function Commentary({ match }: { match: HockeyScheduledMatch }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [match.visibleEvents.length]);

  const recent = match.visibleEvents.slice(-6).reverse();
  return (
    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: 110, p: 1, pt: 4,
      background: `linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)` }}>
      <Box ref={listRef} sx={{ maxHeight: 80, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.2 }}>
        <AnimatePresence initial={false}>
          {recent.map(e => (
            <motion.div key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Typography sx={{
                fontSize: '0.7rem', fontWeight: 600,
                color: e.type === 'goal' ? neonGreen : e.type === 'yellow-card' ? '#ffd700' : e.type === 'corner' ? '#00d4ff' : '#cfd8dc',
              }}>
                <Box component="span" sx={{ color: 'text.secondary', mr: 0.5, fontSize: '0.65rem' }}>
                  P{Math.min(3, Math.floor(e.minute / 20) + 1)} {formatClock(e.minute)}
                </Box>
                {e.description}
              </Typography>
            </motion.div>
          ))}
          {recent.length === 0 && match.phase === 'betting' && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic' }}>
              Both teams warming up — markets open until puck drop.
            </Typography>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

function formatClock(gameMinute: number): string {
  const inP = gameMinute % 20;
  const remaining = 20 - inP;
  const m = Math.floor(remaining);
  const s = Math.floor((remaining - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function runningScore(match: HockeyScheduledMatch): { home: number; away: number } {
  if (match.phase === 'finished') return match.simulation.finalScore;
  let home = 0, away = 0;
  for (const e of match.visibleEvents) {
    if (e.type !== 'goal') continue;
    if (e.team === 'home') home++;
    else if (e.team === 'away') away++;
  }
  return { home, away };
}
