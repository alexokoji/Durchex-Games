import { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import type { MatchEvent, SportKey, Team } from '../core/types';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';

interface MatchPreview2DProps {
  sport: SportKey;
  home: Team;
  away: Team;
  /** All known events for the simulated match (we reveal them by minute). */
  events: MatchEvent[];
  /** Final score (rendered once `progress` reaches 1.0). */
  finalScore: { home: number; away: number };
  /** 0..1 — share of the live phase consumed. Use 1.0 for finished. */
  progress: number;
  /** Phase indicator: BETTING / LIVE / FT. */
  phaseLabel?: string;
}

/**
 * Stylised 2.5D match preview — a perspective-tilted pitch with an animated
 * ball, score panel, and event ticker. Reads from the same simulation that
 * powers settlement, so what the user sees is exactly what their bet will
 * resolve against.
 *
 * "2.5D" = pure CSS perspective + transform + framer-motion. No WebGL.
 */
export default function MatchPreview2D({ sport, home, away, events, finalScore, progress, phaseLabel }: MatchPreview2DProps) {
  // ─── Derive the visible minute / period ─────────────────────────────────
  const fullSpan = sport === 'soccer' ? 90 : sport === 'basketball' ? 48 : 60;
  // Float minute — keeps the ball trajectory smooth between integer ticks.
  const fineMinute = Math.min(fullSpan, progress * fullSpan);
  const minute = Math.floor(fineMinute);

  // Sorted events (defensive — caller is supposed to provide them sorted).
  const sortedEvents = useMemo(
    () => events.filter(e => e.type !== 'kickoff').slice().sort((a, b) => a.minute - b.minute),
    [events],
  );
  const visibleEvents = useMemo(
    () => sortedEvents.filter(e => e.minute <= minute).slice(-30),
    [sortedEvents, minute],
  );
  const goalEvents = useMemo(
    () => visibleEvents.filter(e => e.type === 'goal'),
    [visibleEvents],
  );

  // Score derived from goals shown so far, capped at the simulation's final.
  const homeScore = Math.min(finalScore.home, goalEvents.filter(e => e.team === 'home').length);
  const awayScore = Math.min(finalScore.away, goalEvents.filter(e => e.team === 'away').length);

  // ─── Event-driven ball trajectory ──────────────────────────────────────
  // For every event in the simulation we know roughly *where* on the pitch
  // it happened (goal → goal-mouth, corner → corner flag, card → midfield).
  // The ball lerps between the two bracketing events around the current
  // fine-grained minute, so the commentary and the ball's location agree.
  const ballPos = useMemo(() => computeBallPosition(sortedEvents, fineMinute, fullSpan), [sortedEvents, fineMinute, fullSpan]);

  // ─── Latest event flash ─────────────────────────────────────────────────
  const lastEvent = visibleEvents[visibleEvents.length - 1];

  return (
    <Box sx={{
      position: 'relative',
      borderRadius: 2,
      overflow: 'hidden',
      background: darkCard,
      border: `1px solid ${darkBorder}`,
      mb: 1.5,
    }}>
      {/* ─── Header strip ─────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 1,
        px: 1.5, py: 1,
        background: `linear-gradient(90deg, ${alpha(home.primary, 0.18)}, transparent, ${alpha(away.primary, 0.18)})`,
      }}>
        <TeamBadge team={home} align="left" score={homeScore} />
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Chip
            size="small"
            label={phaseLabel ?? (progress >= 1 ? 'FT' : `${minute}'`)}
            sx={{
              background: progress >= 1
                ? alpha(neonGold, 0.18)
                : alpha('#ff4757', 0.22),
              color: progress >= 1 ? neonGold : '#ff4757',
              fontWeight: 800, letterSpacing: '0.08em', fontSize: '0.7rem',
            }}
          />
          <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', mt: 0.25, letterSpacing: '0.08em' }}>
            {sport.toUpperCase()}
          </Typography>
        </Box>
        <TeamBadge team={away} align="right" score={awayScore} />
      </Box>

      {/* ─── 2.5D field ───────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative',
        height: { xs: 160, sm: 200 },
        perspective: '900px',
        overflow: 'hidden',
        background: backgroundForSport(sport),
      }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          transform: 'rotateX(38deg) scale(1.05)',
          transformOrigin: 'center 65%',
          transformStyle: 'preserve-3d',
        }}>
          <Pitch sport={sport} home={home} away={away} />

          {/* Players — each team's formation drifts toward / away from the
              ball based on their attacking vs defensive role. Computed once
              per sport and pulled together by ballPos. */}
          {playersFor(sport, 'home', home, ballPos, fineMinute).map(p => (
            <PlayerDot key={`h-${p.idx}`} pos={p} color={home.primary} number={p.label} />
          ))}
          {playersFor(sport, 'away', away, ballPos, fineMinute).map(p => (
            <PlayerDot key={`a-${p.idx}`} pos={p} color={away.primary} number={p.label} />
          ))}

          {/* Ball/puck — animates to wherever the next commentary event
              says it should be. Spring tween makes the motion feel like
              play building toward an attack rather than abrupt teleports. */}
          <motion.div
            animate={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
            transition={{ type: 'spring', stiffness: 22, damping: 11, mass: 1 }}
            style={{
              position: 'absolute',
              width: sport === 'hockey' ? 10 : 12,
              height: sport === 'hockey' ? 10 : 12,
              borderRadius: '50%',
              background: sport === 'hockey'
                ? '#111'
                : 'radial-gradient(circle at 30% 30%, #fff, #aaa 70%)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.4)',
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}
          />

          {/* Goal flash overlay */}
          <AnimatePresence>
            {lastEvent && lastEvent.type === 'goal' && (
              <motion.div
                key={lastEvent.id}
                initial={{ opacity: 0.85, scale: 0.95 }}
                animate={{ opacity: 0, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: lastEvent.team === 'home'
                    ? `radial-gradient(circle at 25% 50%, ${alpha(home.primary, 0.6)}, transparent 60%)`
                    : `radial-gradient(circle at 75% 50%, ${alpha(away.primary, 0.6)}, transparent 60%)`,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            )}
          </AnimatePresence>
        </Box>

        {/* Vignette to add depth */}
        <Box sx={{
          pointerEvents: 'none',
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
          zIndex: 2,
        }} />
      </Box>

      {/* ─── Event ticker ─────────────────────────────────────────────── */}
      <Box sx={{
        position: 'relative', zIndex: 3,
        px: 1.5, py: 0.75,
        borderTop: `1px solid ${darkBorder}`,
        minHeight: 32,
        display: 'flex', alignItems: 'center', gap: 1,
      }}>
        <AnimatePresence mode="wait">
          {lastEvent ? (
            <motion.div
              key={lastEvent.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Chip
                size="small"
                label={`${lastEvent.minute}'`}
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, background: alpha(neonGreen, 0.15), color: neonGreen }}
              />
              <Typography sx={{ fontSize: '0.75rem', color: '#fff' }}>
                {lastEvent.description}
              </Typography>
            </motion.div>
          ) : (
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
              {phaseLabel === 'BETTING' ? 'Match starts soon — odds open' : 'Awaiting kickoff…'}
            </Typography>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function TeamBadge({ team, align, score }: { team: Team; align: 'left' | 'right'; score: number }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.75,
      flexDirection: align === 'right' ? 'row-reverse' : 'row',
      minWidth: 0, flex: 1,
    }}>
      <Box sx={{
        width: 26, height: 26, borderRadius: '50%',
        background: `linear-gradient(135deg, ${team.primary}, ${team.accent ?? team.secondary})`,
        border: `2px solid ${alpha('#fff', 0.25)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.65rem', fontWeight: 900, color: team.secondary,
        flexShrink: 0,
      }}>
        {team.abbr.slice(0, 3)}
      </Box>
      <Box sx={{ minWidth: 0, textAlign: align === 'right' ? 'right' : 'left' }}>
        <Typography sx={{
          fontSize: '0.78rem', fontWeight: 800,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {team.shortName}
        </Typography>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1, color: neonGold, fontVariantNumeric: 'tabular-nums' }}>
          {score}
        </Typography>
      </Box>
    </Box>
  );
}

function Pitch({ sport, home, away }: { sport: SportKey; home: Team; away: Team }) {
  if (sport === 'soccer') {
    return (
      <svg viewBox="0 0 200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <rect width="200" height="120" fill="url(#grass)" />
        <defs>
          <linearGradient id="grass" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#1f6b35" />
            <stop offset="50%"  stopColor="#1a5a2c" />
            <stop offset="100%" stopColor="#143f1f" />
          </linearGradient>
          <pattern id="stripes" x="0" y="0" width="20" height="120" patternUnits="userSpaceOnUse">
            <rect width="20" height="120" fill="rgba(255,255,255,0.025)" />
          </pattern>
        </defs>
        {/* Vertical mowing stripes */}
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={i * 20} y={0} width="20" height="120"
            fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent'} />
        ))}
        {/* Borders */}
        <rect x="2" y="2" width="196" height="116" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <line x1="100" y1="2" x2="100" y2="118" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <circle cx="100" cy="60" r="14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <circle cx="100" cy="60" r="1" fill="rgba(255,255,255,0.7)" />
        {/* Penalty areas */}
        <rect x="2"   y="35" width="18" height="50" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <rect x="180" y="35" width="18" height="50" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        {/* Goals (subtle team-colored back posts) */}
        <rect x="0"   y="52" width="2" height="16" fill={home.primary} opacity="0.7" />
        <rect x="198" y="52" width="2" height="16" fill={away.primary} opacity="0.7" />
      </svg>
    );
  }
  if (sport === 'basketball') {
    return (
      <svg viewBox="0 0 200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="court" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#a26735" />
            <stop offset="100%" stopColor="#6c3f1c" />
          </linearGradient>
        </defs>
        <rect width="200" height="120" fill="url(#court)" />
        <rect x="2" y="2" width="196" height="116" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        <line x1="100" y1="2" x2="100" y2="118" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        <circle cx="100" cy="60" r="14" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        {/* Three-point arcs */}
        <path d="M2 30 A55 55 0 0 1 2 90" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        <path d="M198 30 A55 55 0 0 0 198 90" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        {/* Paint */}
        <rect x="2"   y="42" width="22" height="36" fill={alpha(home.primary, 0.35)} stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
        <rect x="176" y="42" width="22" height="36" fill={alpha(away.primary, 0.35)} stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
      </svg>
    );
  }
  // hockey
  return (
    <svg viewBox="0 0 200 120" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <rect width="200" height="120" fill="#e6f0ff" />
      <rect width="200" height="120" fill="url(#ice-glow)" />
      <defs>
        <radialGradient id="ice-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(180,210,255,0.05)" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="196" height="116" rx="22" fill="none" stroke="#a8b8c8" strokeWidth="0.8" />
      <line x1="100" y1="2" x2="100" y2="118" stroke="#cc0000" strokeWidth="0.8" />
      <line x1="60"  y1="2" x2="60"  y2="118" stroke="#0066cc" strokeWidth="0.6" />
      <line x1="140" y1="2" x2="140" y2="118" stroke="#0066cc" strokeWidth="0.6" />
      <circle cx="100" cy="60" r="8" fill="none" stroke="#0066cc" strokeWidth="0.5" />
      {/* Goal creases */}
      <path d="M2 50 A14 14 0 0 1 2 70" fill={alpha(home.primary, 0.25)} stroke="#cc0000" strokeWidth="0.6" />
      <path d="M198 50 A14 14 0 0 0 198 70" fill={alpha(away.primary, 0.25)} stroke="#cc0000" strokeWidth="0.6" />
    </svg>
  );
}

// ─── Players ─────────────────────────────────────────────────────────────

interface PlayerPos {
  idx: number;       // jersey number for the label
  label: string;
  x: number;
  y: number;
}

/**
 * Compact dot with a jersey number. Spring-animated so the formation
 * collectively eases into position whenever the ball moves.
 */
function PlayerDot({ pos, color, number }: { pos: PlayerPos; color: string; number: string }) {
  return (
    <motion.div
      animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      transition={{ type: 'spring', stiffness: 18, damping: 14, mass: 1 }}
      style={{
        position: 'absolute',
        width: 14, height: 14,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${color}, ${darken(color, 0.4)})`,
        border: '1.5px solid rgba(255,255,255,0.6)',
        boxShadow: '0 2px 3px rgba(0,0,0,0.4)',
        transform: 'translate(-50%, -50%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 7,
        fontWeight: 900,
        color: '#fff',
        textShadow: '0 1px 1px rgba(0,0,0,0.6)',
        zIndex: 4,
        pointerEvents: 'none',
      }}
    >
      {number}
    </motion.div>
  );
}

function darken(hex: string, amount: number): string {
  const m = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(m.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(m.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(m.slice(4, 6), 16) * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}

/**
 * Returns sport-specific formations. Each player's position is computed
 * relative to (1) their role in the formation, (2) which half their team
 * defends, and (3) where the ball currently is — strikers crash toward the
 * ball when their team has it; defenders shift opposite the ball when
 * defending. The result is a believable approximation of team shape.
 */
function playersFor(sport: SportKey, side: 'home' | 'away', _team: { id: string }, ball: PitchPos, time: number): PlayerPos[] {
  const isHome = side === 'home';
  // Team defends LEFT goal (x=0) if home, RIGHT goal (x=100) if away.
  const defendsLeft = isHome;
  // Ball in our attacking half? then push forward; else push back.
  const ballInOurAttackingHalf = defendsLeft ? ball.x > 50 : ball.x < 50;
  const pushForward = ballInOurAttackingHalf ? 1 : -1;

  const formation = FORMATIONS[sport];
  return formation.map((role, idx) => {
    // Mirror x for the away team so each role anchors in its own half.
    const baseX = defendsLeft ? role.x : 100 - role.x;
    const baseY = role.y;

    // Reactive shift: attacker-like roles chase the ball, defender-like
    // roles back-shift, midfielders lerp toward midfield/ball.
    const chase = role.chase;                       // 0..1
    const dx = (ball.x - baseX) * chase * 0.6;
    const dy = (ball.y - baseY) * chase * 0.4;

    // Compactness — when defending, the line drops a bit toward our goal.
    const compact = (defendsLeft ? -1 : 1) * (1 - chase) * 3 * (ballInOurAttackingHalf ? 0.5 : 1) * (pushForward < 0 ? 1 : -0.4);

    // Breathing motion so the formation doesn't look frozen between events.
    const sway = Math.sin(time * 1.4 + idx * 0.7) * 1.6;

    return {
      idx,
      label: role.num,
      x: Math.max(2, Math.min(98, baseX + dx + compact + sway)),
      y: Math.max(8, Math.min(92, baseY + dy + Math.cos(time * 1.1 + idx) * 1.4)),
    };
  });
}

/**
 * Formations expressed in "home-attacking-right" coordinates: x in [0..100]
 * with 0 = our goal line, 100 = opponent goal line. `chase` is how strongly
 * the role tracks the ball (0 = stay put, 1 = follow the ball everywhere).
 */
type Role = { x: number; y: number; chase: number; num: string };
const FORMATIONS: Record<SportKey, Role[]> = {
  // Soccer 4-3-3 (10 outfield + GK). Numbers loosely match real shirt numbers.
  soccer: [
    { x: 4,  y: 50, chase: 0.05, num: '1'  }, // GK
    { x: 18, y: 22, chase: 0.20, num: '2'  }, // RB
    { x: 18, y: 40, chase: 0.18, num: '5'  }, // CB
    { x: 18, y: 60, chase: 0.18, num: '4'  }, // CB
    { x: 18, y: 78, chase: 0.20, num: '3'  }, // LB
    { x: 40, y: 30, chase: 0.40, num: '6'  }, // RM
    { x: 38, y: 50, chase: 0.45, num: '8'  }, // CM
    { x: 40, y: 70, chase: 0.40, num: '11' }, // LM
    { x: 65, y: 30, chase: 0.70, num: '7'  }, // RW
    { x: 70, y: 50, chase: 0.80, num: '9'  }, // ST
    { x: 65, y: 70, chase: 0.70, num: '10' }, // LW
  ],
  // Basketball — 5 players, very high ball-chase since the half-court is small.
  basketball: [
    { x: 16, y: 50, chase: 0.55, num: '1' },
    { x: 35, y: 30, chase: 0.75, num: '2' },
    { x: 38, y: 70, chase: 0.75, num: '3' },
    { x: 55, y: 40, chase: 0.85, num: '4' },
    { x: 55, y: 60, chase: 0.85, num: '5' },
  ],
  // Hockey — 6 skaters (incl. goalie). Lower chase for defenders.
  hockey: [
    { x: 6,  y: 50, chase: 0.05, num: 'G'  },
    { x: 22, y: 35, chase: 0.30, num: '4'  },
    { x: 22, y: 65, chase: 0.30, num: '7'  },
    { x: 50, y: 50, chase: 0.65, num: '11' },
    { x: 68, y: 35, chase: 0.80, num: '17' },
    { x: 68, y: 65, chase: 0.80, num: '19' },
  ],
  horseracing: [],
};

// ─── Event-driven ball geometry ───────────────────────────────────────────

interface PitchPos { x: number; y: number }

/** Stable per-event jitter so the ball doesn't pixel-perfectly stack on
 *  repeated event types (e.g. two yellows in a row). Hash of the id. */
function jitter(seed: string, salt: number, range: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  h = (h * (salt + 7919)) >>> 0;
  return ((h % 1000) / 1000 - 0.5) * range;
}

/**
 * Where on the pitch should the ball *be* at the moment a given event
 * happens? Home attacks left→right by convention.
 */
function eventPosition(event: MatchEvent | null | undefined): PitchPos {
  if (!event) return { x: 50, y: 50 };

  // 'home' attacks right; 'away' attacks left. 'neutral' = midfield events.
  const attackingRight = event.team === 'home';
  const seed = event.id ?? event.description ?? `${event.minute}-${event.type}`;

  switch (event.type) {
    case 'goal':
      return { x: attackingRight ? 92 : 8, y: 50 + jitter(seed, 1, 16) };
    case 'penalty':
      return { x: attackingRight ? 88 : 12, y: 50 };
    case 'var-disallowed':
      return { x: attackingRight ? 86 : 14, y: 50 + jitter(seed, 2, 18) };
    case 'corner':
      return {
        x: attackingRight ? 96 : 4,
        // Corner flags top OR bottom — pick deterministically from the seed.
        y: jitter(seed, 3, 1) > 0 ? 12 : 88,
      };
    case 'yellow-card':
    case 'red-card':
      // Fouls happen in the attacking team's half mostly, with vertical spread.
      return {
        x: (attackingRight ? 65 : 35) + jitter(seed, 4, 14),
        y: 50 + jitter(seed, 5, 50),
      };
    case 'injury':
      return {
        x: 50 + jitter(seed, 6, 60),
        y: 50 + jitter(seed, 7, 50),
      };
    case 'substitution':
      // Subs happen near the touchline — pin to the bench side.
      return { x: 50 + jitter(seed, 8, 25), y: jitter(seed, 9, 1) > 0 ? 6 : 94 };
    case 'halftime':
    case 'fulltime':
      return { x: 50, y: 50 };
    default:
      return { x: 50 + jitter(seed, 10, 40), y: 50 + jitter(seed, 11, 40) };
  }
}

/**
 * Compute the live ball position by linearly interpolating between the two
 * bracketing events around `currentMinute`. Between events the ball drifts
 * smoothly from the previous spot toward the next, so the commentary and
 * the visible ball location match.
 */
function computeBallPosition(events: MatchEvent[], currentMinute: number, span: number): PitchPos {
  if (events.length === 0) return { x: 50, y: 50 };

  // Locate the last passed event and the first future one.
  let prev: MatchEvent | undefined;
  let next: MatchEvent | undefined;
  for (const e of events) {
    if (e.minute <= currentMinute) prev = e;
    else { next = e; break; }
  }

  const prevPos = eventPosition(prev);
  const nextPos = eventPosition(next);

  // If there's no upcoming event, drift slowly toward midfield (game winding down).
  const prevMin = prev?.minute ?? 0;
  const nextMin = next?.minute ?? span;
  const denom = Math.max(0.001, nextMin - prevMin);
  const t = Math.max(0, Math.min(1, (currentMinute - prevMin) / denom));

  // Ease-in-out so the ball lingers near events instead of constant-velocity sliding.
  const eased = t * t * (3 - 2 * t);

  // After a goal we want a quick reset toward the centre circle (kickoff).
  // So if `prev` is a goal AND we're more than 1 minute past it, bend the
  // trajectory through (50, 50).
  let target = lerp(prevPos, nextPos, eased);
  if (prev?.type === 'goal' && (currentMinute - prev.minute) > 0.6) {
    const center: PitchPos = { x: 50, y: 50 };
    const u = Math.min(1, (currentMinute - prev.minute) / 1.5);
    target = lerp(prevPos, center, u);
    // Then from centre toward `next` once we're past the kickoff.
    if (u >= 1 && next) target = lerp(center, nextPos, eased);
  }

  // Small breathing jitter so the ball never looks static between sparse events.
  target.x += Math.sin(currentMinute * 1.7) * 1.8;
  target.y += Math.cos(currentMinute * 2.3) * 1.4;

  return target;
}

function lerp(a: PitchPos, b: PitchPos, t: number): PitchPos {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function backgroundForSport(sport: SportKey): string {
  if (sport === 'soccer')     return 'linear-gradient(180deg, #2a4d6c 0%, #14253a 100%)';
  if (sport === 'basketball') return 'linear-gradient(180deg, #2a1a0e 0%, #14080a 100%)';
  if (sport === 'hockey')     return 'linear-gradient(180deg, #1a2540 0%, #0a1020 100%)';
  return 'linear-gradient(180deg, #1a2030 0%, #0a0f1a 100%)';
}
