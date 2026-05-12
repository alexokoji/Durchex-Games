import { useEffect, useMemo, useRef } from 'react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import TeamEmblem from '../core/TeamEmblem';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import type { ScheduledMatch } from './useSoccerSchedule';
import type { MatchEvent, Team } from '../core/types';

interface SoccerFeaturedMatchProps {
  match: ScheduledMatch;
}

export default function SoccerFeaturedMatch({ match }: SoccerFeaturedMatchProps) {
  const score = computeRunningScore(match);
  const possession = computePossession(match);
  const momentum  = computeMomentum(match);
  const homeFormation = pickFormation(match.home);
  const awayFormation = pickFormation(match.away);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${alpha(neonGreen, 0.3)}`,
        background: `linear-gradient(180deg, #0a1f0d 0%, #061008 100%)`,
        boxShadow: `0 0 30px ${alpha(neonGreen, 0.12)}`,
      }}
    >
      <Pitch match={match} possession={possession} homeFormation={homeFormation} awayFormation={awayFormation} />

      {/* Scoreboard overlay */}
      <Box
        sx={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 1.25, py: 0.9,
          background: `linear-gradient(180deg, ${alpha('#000', 0.78)}, transparent)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <TeamEmblem team={match.home} size={30} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.home.shortName}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', letterSpacing: '0.1em' }}>
              {homeFormation}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {score.home} – {score.away}
          </Typography>
          <PhaseBadge match={match} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexDirection: 'row-reverse', minWidth: 0 }}>
          <TeamEmblem team={match.away} size={30} />
          <Box sx={{ minWidth: 0, textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.away.shortName}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', letterSpacing: '0.1em' }}>
              {awayFormation}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Momentum chip on the score row */}
      {match.phase === 'live' && (
        <Box sx={{ position: 'absolute', top: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div animate={{ y: [0, -2, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
            <Chip
              size="small"
              icon={<Box sx={{ fontSize: '0.6rem', color: momentum.team === 'home' ? match.home.primary : match.away.primary, ml: '6px !important' }}>{momentum.team === 'home' ? '◀' : '▶'}</Box>}
              label={`${momentum.label} attacking`}
              sx={{
                height: 20, fontSize: '0.6rem', fontWeight: 800,
                background: alpha(momentum.team === 'home' ? match.home.primary : match.away.primary, 0.25),
                color: '#fff',
                border: `1px solid ${alpha(momentum.team === 'home' ? match.home.primary : match.away.primary, 0.5)}`,
                backdropFilter: 'blur(6px)',
              }}
            />
          </motion.div>
        </Box>
      )}

      {/* Possession bar */}
      <PossessionBar match={match} possession={possession} />

      <CommentaryFeed events={match.visibleEvents} match={match} />
    </Box>
  );
}

function PhaseBadge({ match }: { match: ScheduledMatch }) {
  if (match.phase === 'live') {
    return (
      <motion.div animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
        <Chip
          label={`● ${match.liveMinute}'`}
          size="small"
          sx={{ mt: 0.4, height: 18, fontSize: '0.62rem', fontWeight: 800, background: alpha('#ff4757', 0.22), color: '#ff4757' }}
        />
      </motion.div>
    );
  }
  if (match.phase === 'betting') {
    return <Chip label="KICK-OFF SOON" size="small" sx={{ mt: 0.4, height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGreen, 0.18), color: neonGreen }} />;
  }
  return <Chip label="FT" size="small" sx={{ mt: 0.4, height: 18, fontSize: '0.6rem', fontWeight: 800, background: alpha(neonGold, 0.2), color: neonGold }} />;
}

// ────────────────────────────────────────────────────────────────────────────
// 2.5D animated pitch
// ────────────────────────────────────────────────────────────────────────────

interface PitchProps {
  match: ScheduledMatch;
  possession: { home: number; away: number };
  homeFormation: string;
  awayFormation: string;
}

function Pitch({ match, possession, homeFormation, awayFormation }: PitchProps) {
  // Attack push from current possession (drifts players forward when their team has the ball).
  const liveDrive = match.phase === 'live'
    ? (Math.sin(match.liveMinute / 3) * 0.4 + (possession.home / 100 - 0.5))
    : 0;

  return (
    <Box sx={{ position: 'relative', width: '100%', aspectRatio: '16/9', maxHeight: 460, minHeight: 240 }}>
      <svg viewBox="0 0 800 600" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="pitch-grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#0a4d18" />
            <stop offset="100%" stopColor="#08390f" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="800" height="600" fill="url(#pitch-grass)" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={i * 100} y="0" width="50" height="600" fill="rgba(255,255,255,0.04)" />
        ))}
        <rect x="20" y="40" width="760" height="520" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <line x1="400" y1="40" x2="400" y2="560" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <circle cx="400" cy="300" r="65" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <circle cx="400" cy="300" r="3" fill="rgba(255,255,255,0.7)" />
        {/* penalty boxes */}
        <rect x="20"  y="180" width="120" height="240" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <rect x="660" y="180" width="120" height="240" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <rect x="20"  y="230" width="50"  height="140" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <rect x="730" y="230" width="50"  height="140" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        {/* goals */}
        <rect x="14"  y="270" width="6"  height="60" fill="rgba(255,255,255,0.8)" />
        <rect x="780" y="270" width="6"  height="60" fill="rgba(255,255,255,0.8)" />
        {/* corner arcs */}
        <path d="M20,40 A 10 10 0 0 1 30 50" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <path d="M780,40 A 10 10 0 0 0 770 50" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <path d="M20,560 A 10 10 0 0 0 30 550" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <path d="M780,560 A 10 10 0 0 1 770 550" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

        <FormationPlayers team={match.home} side="home" formation={homeFormation} drive={liveDrive} phase={match.phase} />
        <FormationPlayers team={match.away} side="away" formation={awayFormation} drive={-liveDrive} phase={match.phase} />

        <BallAnim match={match} possession={possession} />
      </svg>
    </Box>
  );
}

function FormationPlayers({ team, side, formation, drive, phase }: {
  team: Team; side: 'home' | 'away'; formation: string; drive: number; phase: ScheduledMatch['phase'];
}) {
  const lines = formation.split('-').map(Number);  // e.g., "4-3-3" → [4,3,3]
  // Lines run from defenders → midfielders → forwards (rightward for home, leftward for away).
  const isHome = side === 'home';
  const xStart = isHome ? 80 : 720;
  const xStep  = isHome ? 130 : -130;
  const players: { x: number; y: number; key: string }[] = [];

  // Goalkeeper
  players.push({ x: isHome ? 50 : 750, y: 300, key: `${side}-gk` });

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const count = lines[lineIdx];
    const x = xStart + xStep * (lineIdx + 1) + drive * 50;
    const spacing = 480 / Math.max(1, count + 1);
    for (let i = 0; i < count; i++) {
      const y = 60 + spacing * (i + 1);
      players.push({ x, y, key: `${side}-${lineIdx}-${i}` });
    }
  }

  return (
    <>
      {players.map((p, i) => (
        <motion.circle
          key={p.key}
          cx={p.x}
          cy={p.y}
          r="11"
          fill={team.primary}
          stroke={team.secondary || '#fff'}
          strokeWidth="2"
          animate={phase === 'live' ? {
            cx: [p.x, p.x + (i % 2 === 0 ? 14 : -10), p.x],
            cy: [p.y, p.y + (i % 3 === 0 ? -10 : 8), p.y],
          } : { cx: p.x, cy: p.y }}
          transition={{ duration: 3 + (i % 5) * 0.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

function BallAnim({ match, possession }: { match: ScheduledMatch; possession: { home: number; away: number } }) {
  if (match.phase !== 'live') {
    return <circle cx="400" cy="300" r="6" fill="#fff" stroke="#000" strokeWidth="1" />;
  }
  // Ball drifts toward the team currently in possession.
  const possessionTilt = (possession.home - 50) / 100;       // -0.5..+0.5, +ve = home pushing right
  const oscillation    = Math.sin(match.liveMinute / 2.5);
  const ballX = 400 + (possessionTilt * 220) + oscillation * 120;
  const ballY = 300 + Math.cos(match.liveMinute / 1.8) * 80;
  return (
    <motion.circle
      animate={{ cx: ballX, cy: ballY }}
      transition={{ duration: 1, ease: 'easeInOut' }}
      r="6" fill="#fff" stroke="#000" strokeWidth="1"
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Possession bar + commentary
// ────────────────────────────────────────────────────────────────────────────

function PossessionBar({ match, possession }: { match: ScheduledMatch; possession: { home: number; away: number } }) {
  return (
    <Box sx={{
      position: 'absolute', bottom: 132, left: 0, right: 0,
      px: 1.25, py: 0.6,
      background: `linear-gradient(180deg, transparent 0%, ${alpha('#000', 0.45)} 100%)`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: match.home.primary, letterSpacing: '0.08em' }}>
          {possession.home}%
        </Typography>
        <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Possession
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: match.away.primary, letterSpacing: '0.08em' }}>
          {possession.away}%
        </Typography>
      </Box>
      <Box sx={{
        position: 'relative', height: 5, borderRadius: 1, overflow: 'hidden',
        background: alpha('#fff', 0.08),
      }}>
        <motion.div
          animate={{ width: `${possession.home}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            background: `linear-gradient(90deg, ${match.home.primary} 0%, ${alpha(match.home.primary, 0.6)} 100%)`,
          }}
        />
      </Box>
      <Box sx={{ display: 'none' }}>{LinearProgress.name}</Box>
    </Box>
  );
}

function CommentaryFeed({ events, match }: { events: MatchEvent[]; match: ScheduledMatch }) {
  const listRef = useRef<HTMLDivElement>(null);

  // Ambient commentary mixed with the simulated events (purely cosmetic for atmosphere).
  const ambient = useMemo(() => makeAmbientCommentary(match), [match.id, match.liveMinute]);
  const combined = useMemo(() => {
    return [...events, ...ambient]
      .sort((a, b) => a.minute - b.minute)
      .slice(-7)
      .reverse();
  }, [events, ambient]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [combined.length]);

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        maxHeight: 130,
        background: `linear-gradient(0deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)`,
        p: 1,
        pt: 4,
      }}
    >
      <Box
        ref={listRef}
        sx={{
          maxHeight: 90,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
        }}
      >
        <AnimatePresence initial={false}>
          {combined.map(e => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Typography sx={{
                fontSize: '0.7rem',
                color: e.type === 'goal' || e.type === 'penalty'
                  ? neonGreen
                  : e.type === 'red-card' ? '#ff4757'
                  : e.type === 'yellow-card' ? '#ffd700'
                  : e.type === 'var-disallowed' ? '#ff9f43'
                  : '#cfd8dc',
                fontWeight: 600,
              }}>
                <Box component="span" sx={{ color: 'text.secondary', mr: 0.5, fontSize: '0.65rem' }}>
                  {e.minute}'
                </Box>
                {e.description}
              </Typography>
            </motion.div>
          ))}
          {combined.length === 0 && match.phase === 'betting' && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontStyle: 'italic' }}>
              Teams warming up… markets open until kick-off.
            </Typography>
          )}
        </AnimatePresence>
      </Box>
      {/* Keep theme imports referenced for tree-shaking. */}
      <Box sx={{ display: 'none' }}>{darkCard}{darkBorder}</Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function computeRunningScore(match: ScheduledMatch): { home: number; away: number } {
  if (match.phase === 'finished') return match.simulation.finalScore;
  let home = 0;
  let away = 0;
  for (const e of match.visibleEvents) {
    if (e.type !== 'goal' && e.type !== 'penalty') continue;
    if (e.team === 'home') home++;
    else if (e.team === 'away') away++;
  }
  return { home, away };
}

function computePossession(match: ScheduledMatch): { home: number; away: number } {
  // Base: xG share, then fluctuate by ±8% during live phase using a sine on liveMinute.
  const xgShare = match.simulation.xg.home / Math.max(0.001, match.simulation.xg.home + match.simulation.xg.away);
  const base = 35 + xgShare * 30;  // 35–65%
  const wave = match.phase === 'live' ? Math.sin(match.liveMinute / 7) * 8 : 0;
  const home = Math.max(28, Math.min(72, Math.round(base + wave)));
  return { home, away: 100 - home };
}

function computeMomentum(match: ScheduledMatch): { team: 'home' | 'away'; label: string } {
  // Look at the last 3 visible events – if one team appears more, they have the momentum.
  const recent = match.visibleEvents.slice(-3);
  let hWeight = 0, aWeight = 0;
  for (const e of recent) {
    const w = (e.type === 'goal' || e.type === 'penalty') ? 3
            : (e.type === 'corner') ? 1.5
            : 1;
    if (e.team === 'home') hWeight += w;
    else if (e.team === 'away') aWeight += w;
  }
  const possessionHome = computePossession(match).home;
  if (hWeight === 0 && aWeight === 0) {
    return possessionHome >= 50
      ? { team: 'home', label: match.home.abbr }
      : { team: 'away', label: match.away.abbr };
  }
  return hWeight >= aWeight
    ? { team: 'home', label: match.home.abbr }
    : { team: 'away', label: match.away.abbr };
}

function pickFormation(team: Team): string {
  // Pick a sensible formation from the team's profile.
  const attackOrient = team.ratings.attack - team.ratings.defense;
  if (attackOrient >= 5)  return '4-3-3';
  if (attackOrient >= 0)  return '4-2-3-1';
  if (attackOrient >= -5) return '4-4-2';
  return '5-3-2';
}

function makeAmbientCommentary(match: ScheduledMatch): MatchEvent[] {
  if (match.phase !== 'live') return [];
  const out: MatchEvent[] = [];
  const lines = [
    `${match.home.shortName} build patiently from the back.`,
    `${match.away.shortName} press high, looking to win it back.`,
    `${match.home.shortName} switch the play across the pitch.`,
    `${match.away.shortName} threaten down the right flank.`,
    `Half-chance for ${match.home.shortName} from the edge of the box.`,
    `${match.away.shortName} keeper claims a routine ball.`,
  ];
  // Sprinkle one ambient line every ~12 simulated minutes — only when nothing real has happened nearby.
  for (let m = 8; m < match.liveMinute; m += 12) {
    const nearbyReal = match.visibleEvents.some(e => Math.abs(e.minute - m) <= 3 && (e.type === 'goal' || e.type === 'penalty' || e.type === 'red-card'));
    if (nearbyReal) continue;
    const line = lines[(m + match.simulation.xg.home * 17) % lines.length | 0];
    out.push({
      id: `amb-${match.id}-${m}`,
      minute: m,
      type: 'corner',  // re-use generic event type for styling
      team: m % 2 === 0 ? 'home' : 'away',
      description: line,
    });
  }
  return out;
}
