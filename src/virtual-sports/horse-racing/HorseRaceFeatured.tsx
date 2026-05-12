import { useEffect, useRef } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { neonGreen, neonGold, darkBorder } from '../../theme';
import { RACE_TYPE_META } from './horseDatabase';
import type { ScheduledRace } from './useHorseRacingSchedule';

interface Props { race: ScheduledRace }

export default function HorseRaceFeatured({ race }: Props) {
  // Compute each horse's track progress at the current live time.
  const positions = computePositions(race);

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: `1px solid ${alpha(neonGreen, 0.3)}`, background: '#1a4015', boxShadow: `0 0 30px ${alpha(neonGreen, 0.12)}` }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.9, background: `linear-gradient(180deg, ${alpha('#000', 0.78)}, transparent)`, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Race {race.raceNumber} · {RACE_TYPE_META[race.raceType].label}
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 800 }}>
            {RACE_TYPE_META[race.raceType].distance}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {race.phase === 'live' && (
          <motion.div animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 1.3, repeat: Infinity }}>
            <Chip label={`● ${Math.round(race.liveProgress * 100)}%`} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, background: alpha('#ff4757', 0.22), color: '#ff4757' }} />
          </motion.div>
        )}
        {race.phase === 'betting' && <Chip label="GATES SOON" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGreen, 0.18), color: neonGreen }} />}
        {race.phase === 'finished' && <Chip label="RESULT" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGold, 0.2), color: neonGold }} />}
      </Box>

      <Track race={race} positions={positions} />

      {race.phase === 'finished' && <ResultPanel race={race} />}

      <Commentary race={race} />
    </Box>
  );
}

function Track({ race, positions }: { race: ScheduledRace; positions: { id: string; progress: number }[] }) {
  // Track viewbox: 800 wide x 360 tall.
  // Lanes laid out vertically across the 8 horses with finish line at x=760.
  const trackWidth = 760;
  const startX = 28;
  const finishX = startX + trackWidth;

  return (
    <Box sx={{ width: '100%', aspectRatio: '20/9', maxHeight: 460, minHeight: 240, position: 'relative' }}>
      <svg viewBox="0 0 800 360" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="turf-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1d6b22" />
            <stop offset="100%" stopColor="#0e3b13" />
          </linearGradient>
          <linearGradient id="rail-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#fefae0" />
            <stop offset="100%" stopColor="#a9a89c" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="800" height="360" fill="url(#turf-grad)" />

        {/* Track surface */}
        <rect x="20" y="60" width="760" height="280" fill="#c19a6b" stroke="#85602f" strokeWidth="2" />
        {/* Lane dividers */}
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1="20" y1={60 + (i + 1) * 35} x2="780" y2={60 + (i + 1) * 35} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="6 6" />
        ))}
        {/* Starting gates */}
        <rect x={startX - 6} y="58" width="6" height="282" fill="#0a0a0a" stroke="#fff" strokeWidth="1" />
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`gate${i}`} x1={startX - 6} y1={60 + (i + 1) * 35} x2={startX} y2={60 + (i + 1) * 35} stroke="#fff" strokeWidth="1" />
        ))}
        {/* Finish line */}
        <g>
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={i} x={finishX - 3} y={62 + i * 17.5} width="6" height="9" fill={i % 2 === 0 ? '#fff' : '#000'} />
          ))}
          <line x1={finishX} y1="60" x2={finishX} y2="340" stroke="#fff" strokeWidth="1" />
        </g>
        {/* Rail at the top */}
        <rect x="20" y="58" width="760" height="2" fill="url(#rail-grad)" />
        <rect x="20" y="340" width="760" height="2" fill="url(#rail-grad)" />

        {/* Horses */}
        {race.horses.map((h, i) => {
          const laneY = 60 + (i + 0.5) * 35;
          const progress = positions.find(p => p.id === h.id)?.progress ?? 0;
          const x = startX + progress * trackWidth;
          const finished = progress >= 1;
          return (
            <g key={h.id}>
              {/* Lane number */}
              <text x={startX - 14} y={laneY + 4} fontSize="11" fontWeight="900" fill="#fff" textAnchor="middle">{h.number}</text>
              {/* Horse silhouette + silk */}
              <motion.g
                animate={{ x }}
                transition={{ duration: 0.6, ease: 'linear' }}
              >
                {/* Body */}
                <ellipse cx="0" cy={laneY} rx="14" ry="6" fill={h.silkPrimary} stroke={h.silkSecondary} strokeWidth="1.5" />
                {/* Head */}
                <ellipse cx="13" cy={laneY - 4} rx="5" ry="3.5" fill="#7a3e1d" />
                {/* Neck */}
                <line x1="10" y1={laneY - 2} x2="14" y2={laneY - 4} stroke="#7a3e1d" strokeWidth="3" />
                {/* Tail */}
                <line x1="-13" y1={laneY} x2="-18" y2={laneY + 1} stroke="#3b2412" strokeWidth="2.5" />
                {/* Legs */}
                <line x1="-8" y1={laneY + 5} x2="-10" y2={laneY + 12} stroke="#5b3a1f" strokeWidth="2" />
                <line x1="8"  y1={laneY + 5} x2="10"  y2={laneY + 12} stroke="#5b3a1f" strokeWidth="2" />
                <line x1="-4" y1={laneY + 5} x2="-6"  y2={laneY + 12} stroke="#5b3a1f" strokeWidth="2" />
                <line x1="4"  y1={laneY + 5} x2="6"   y2={laneY + 12} stroke="#5b3a1f" strokeWidth="2" />
                {/* Jockey silk */}
                <circle cx="0" cy={laneY - 6} r="3.5" fill={h.silkPrimary} stroke={h.silkSecondary} strokeWidth="1" />
                {finished && (
                  <text x="0" y={laneY - 12} fontSize="9" fontWeight="900" fill="#fff" textAnchor="middle">🏁</text>
                )}
              </motion.g>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

function ResultPanel({ race }: { race: ScheduledRace }) {
  const top3 = race.simulation.finishOrder.slice(0, 3).map((id, i) => {
    const horse = race.horses.find(h => h.id === id)!;
    return { rank: i + 1, horse };
  });
  return (
    <Box sx={{
      position: 'absolute', top: 64, left: 0, right: 0, mx: 'auto',
      width: 'fit-content',
      px: 1.25, py: 0.5,
      background: alpha('#000', 0.75),
      borderRadius: 1.5,
      border: `1px solid ${alpha(neonGold, 0.35)}`,
      display: 'flex', gap: 1.2, alignItems: 'center',
    }}>
      {top3.map(t => (
        <Box key={t.horse.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 900, color: t.rank === 1 ? neonGold : t.rank === 2 ? '#c0c0c0' : '#cd7f32' }}>
            {t.rank === 1 ? '🥇' : t.rank === 2 ? '🥈' : '🥉'}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>
            #{t.horse.number} {t.horse.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function Commentary({ race }: { race: ScheduledRace }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [race.visibleEvents.length]);

  const recent = race.visibleEvents.slice(-6).reverse();
  return (
    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: 110, p: 1, pt: 4,
      background: `linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)` }}>
      <Box ref={listRef} sx={{ maxHeight: 80, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.2 }}>
        <AnimatePresence initial={false}>
          {recent.map(e => (
            <motion.div key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600,
                color: e.type === 'fulltime' ? neonGold : e.type === 'corner' ? '#cfd8dc' : '#cfd8dc' }}>
                {e.description}
              </Typography>
            </motion.div>
          ))}
          {recent.length === 0 && race.phase === 'betting' && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic' }}>
              Loading into the gates — markets open until the off.
            </Typography>
          )}
        </AnimatePresence>
      </Box>
      <Box sx={{ display: 'none' }}>{darkBorder}</Box>
    </Box>
  );
}

function computePositions(race: ScheduledRace): { id: string; progress: number }[] {
  if (race.phase === 'betting') {
    // All horses at the start
    return race.horses.map(h => ({ id: h.id, progress: 0 }));
  }
  if (race.phase === 'finished') {
    // All have finished. Spread them apart slightly so the leader is at x=1 and the rest just behind.
    return race.simulation.finishOrder.map((id, idx) => ({ id, progress: 1 - idx * 0.04 }));
  }
  // Live: scale each horse's progress to current liveProgress, weighted by their relative speed.
  const liveProg = race.liveProgress;
  const meanTime = average(Object.values(race.simulation.finishTimesMs));
  return race.horses.map(h => {
    const t = race.simulation.finishTimesMs[h.id];
    // horses with lower expected finish time progress faster
    const ratio = meanTime / t;
    const progress = Math.min(1, liveProg * ratio);
    return { id: h.id, progress };
  });
}

function average(nums: number[]): number {
  if (nums.length === 0) return 1;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}
