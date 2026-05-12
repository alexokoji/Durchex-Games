import { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import type { SessionPhase } from './useVirtualSession';

export type ArenaSport = 'soccer' | 'basketball' | 'hockey';

export interface ArenaMatch {
  id: string | number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeColor?: string;
  awayColor?: string;
}

interface MatchArenaProps {
  sport: ArenaSport;
  match: ArenaMatch;
  phase: SessionPhase;
  liveProgress: number;
  matchClockLabel?: string;
}

const SPORT_META: Record<ArenaSport, {
  field: string;
  fieldAccent: string;
  ball: string;
  emoji: string;
  fieldElements: 'pitch' | 'court' | 'rink';
}> = {
  soccer:     { field: '#0a3a1a', fieldAccent: '#0e5028', ball: '⚽', emoji: '⚽', fieldElements: 'pitch' },
  basketball: { field: '#5a3520', fieldAccent: '#7a4828', ball: '🏀', emoji: '🏀', fieldElements: 'court' },
  hockey:     { field: '#cae8ff', fieldAccent: '#a8d5f5', ball: '🏒', emoji: '🏒', fieldElements: 'rink' },
};

function FieldOverlay({ kind }: { kind: 'pitch' | 'court' | 'rink' }) {
  if (kind === 'pitch') {
    return (
      <>
        <Box sx={{ position: 'absolute', inset: 8, border: '2px solid rgba(255,255,255,0.4)', borderRadius: 1 }} />
        <Box sx={{ position: 'absolute', top: 8, bottom: 8, left: '50%', width: '2px', background: 'rgba(255,255,255,0.4)' }} />
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', transform: 'translate(-50%, -50%)' }} />
        <Box sx={{ position: 'absolute', top: '30%', left: 8, width: 36, height: '40%', borderRight: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid rgba(255,255,255,0.4)', borderBottom: '2px solid rgba(255,255,255,0.4)' }} />
        <Box sx={{ position: 'absolute', top: '30%', right: 8, width: 36, height: '40%', borderLeft: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid rgba(255,255,255,0.4)', borderBottom: '2px solid rgba(255,255,255,0.4)' }} />
      </>
    );
  }
  if (kind === 'court') {
    return (
      <>
        <Box sx={{ position: 'absolute', inset: 8, border: '2px solid rgba(255,255,255,0.5)', borderRadius: 1 }} />
        <Box sx={{ position: 'absolute', top: 8, bottom: 8, left: '50%', width: '2px', background: 'rgba(255,255,255,0.5)' }} />
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', transform: 'translate(-50%, -50%)' }} />
        <Box sx={{ position: 'absolute', top: '20%', left: 8, width: 60, height: '60%', border: '2px solid rgba(255,255,255,0.5)', borderLeft: 'none' }} />
        <Box sx={{ position: 'absolute', top: '20%', right: 8, width: 60, height: '60%', border: '2px solid rgba(255,255,255,0.5)', borderRight: 'none' }} />
      </>
    );
  }
  return (
    <>
      <Box sx={{ position: 'absolute', inset: 8, border: '2px solid rgba(50,90,200,0.4)', borderRadius: 6 }} />
      <Box sx={{ position: 'absolute', top: 8, bottom: 8, left: '50%', width: '2px', background: 'rgba(220,30,30,0.6)' }} />
      <Box sx={{ position: 'absolute', top: '50%', left: '50%', width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(50,90,200,0.5)', transform: 'translate(-50%, -50%)' }} />
      <Box sx={{ position: 'absolute', top: '50%', left: '25%', width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(220,30,30,0.4)', transform: 'translate(-50%, -50%)' }} />
      <Box sx={{ position: 'absolute', top: '50%', right: '25%', width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(220,30,30,0.4)', transform: 'translate(-50%, -50%)' }} />
    </>
  );
}

function generatePath(progress: number, seed: number): { x: number; y: number } {
  const angle = progress * Math.PI * 4 + seed;
  const xWave = Math.sin(angle * 1.3 + seed) * 30;
  const yWave = Math.cos(angle * 0.9 + seed * 1.5) * 22;
  const x = 50 + Math.sin(progress * Math.PI * 2 + seed) * 30 + xWave * 0.4;
  const y = 50 + yWave;
  return { x, y };
}

export default function MatchArena({
  sport, match, phase, liveProgress, matchClockLabel,
}: MatchArenaProps) {
  const meta = SPORT_META[sport];
  const ballPos = useMemo(() => generatePath(liveProgress, match.homeScore + match.awayScore + 1), [liveProgress, match.homeScore, match.awayScore]);
  const players = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const isHome = i < 3;
      const seed = i * 1.7 + (isHome ? 0 : Math.PI);
      const pos = generatePath(liveProgress + i * 0.1, seed);
      return {
        id: i,
        isHome,
        x: Math.max(10, Math.min(90, pos.x + (isHome ? -10 : 10))),
        y: Math.max(15, Math.min(85, pos.y)),
      };
    });
  }, [liveProgress]);

  const homeColor = match.homeColor || neonBlue;
  const awayColor = match.awayColor || '#ff6b7a';

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${darkBorder}`,
        background: `linear-gradient(180deg, ${darkCard} 0%, ${alpha('#000', 0.8)} 100%)`,
        boxShadow: `0 0 40px ${alpha(phase === 'live' ? '#ff4757' : neonGreen, 0.15)} inset`,
      }}
    >
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.25,
          background: alpha('#000', 0.45),
          borderBottom: `1px solid ${darkBorder}`,
          backdropFilter: 'blur(8px)',
          position: 'relative', zIndex: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: homeColor, boxShadow: `0 0 8px ${homeColor}` }} />
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: homeColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {match.homeTeam}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2 }}>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: homeColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {match.homeScore}
          </Typography>
          <Box>
            <Chip
              label={phase === 'live' ? 'LIVE' : phase === 'result' ? 'FT' : 'KICK-OFF'}
              size="small"
              sx={{
                height: 18, fontSize: '0.6rem', fontWeight: 800,
                background: phase === 'live' ? alpha('#ff4757', 0.2) : phase === 'result' ? alpha(neonGold, 0.2) : alpha(neonGreen, 0.18),
                color: phase === 'live' ? '#ff4757' : phase === 'result' ? neonGold : neonGreen,
                border: `1px solid ${alpha(phase === 'live' ? '#ff4757' : phase === 'result' ? neonGold : neonGreen, 0.3)}`,
              }}
            />
            {matchClockLabel && (
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textAlign: 'center', mt: 0.25 }}>
                {matchClockLabel}
              </Typography>
            )}
          </Box>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: awayColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {match.awayScore}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: awayColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {match.awayTeam}
          </Typography>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: awayColor, boxShadow: `0 0 8px ${awayColor}` }} />
        </Box>
      </Box>

      <Box
        sx={{
          position: 'relative',
          height: { xs: 200, sm: 240, md: 260 },
          background: `linear-gradient(180deg, ${meta.field} 0%, ${meta.fieldAccent} 100%)`,
          overflow: 'hidden',
        }}
      >
        <FieldOverlay kind={meta.fieldElements} />

        {sport === 'soccer' && (
          <Box sx={{
            position: 'absolute', inset: 0,
            backgroundImage: `repeating-linear-gradient(90deg, ${alpha('#fff', 0.04)} 0 40px, ${alpha('#000', 0.05)} 40px 80px)`,
            pointerEvents: 'none',
          }} />
        )}

        {players.map(p => (
          <motion.div
            key={p.id}
            animate={{ left: `${p.x}%`, top: `${p.y}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              width: 14, height: 14,
              borderRadius: '50%',
              background: p.isHome ? homeColor : awayColor,
              boxShadow: `0 0 8px ${p.isHome ? homeColor : awayColor}, 0 2px 4px rgba(0,0,0,0.6)`,
              border: '2px solid rgba(255,255,255,0.7)',
              zIndex: 3,
            }}
          />
        ))}

        {phase !== 'result' && (
          <motion.div
            animate={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              fontSize: '1rem',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
              zIndex: 4,
            }}
          >
            {meta.ball}
          </motion.div>
        )}

        {phase === 'betting' && (
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55) 100%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            pb: 1.5, pointerEvents: 'none',
          }}>
            <Chip
              label="Place your bets — kick-off soon"
              size="small"
              sx={{
                background: alpha(neonGreen, 0.2),
                color: neonGreen,
                border: `1px solid ${alpha(neonGreen, 0.4)}`,
                fontWeight: 700, fontSize: '0.7rem',
              }}
            />
          </Box>
        )}

        <AnimatePresence>
          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                zIndex: 5,
              }}
            >
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mb: 0.5, letterSpacing: '0.1em' }}>
                FULL TIME
              </Typography>
              <Typography sx={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, color: '#fff' }}>
                {match.homeScore} <span style={{ color: 'rgba(255,255,255,0.5)' }}>–</span> {match.awayScore}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: neonGold, fontWeight: 700, mt: 0.75 }}>
                {match.homeScore === match.awayScore
                  ? 'Match drawn'
                  : `${match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam} wins`}
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}
