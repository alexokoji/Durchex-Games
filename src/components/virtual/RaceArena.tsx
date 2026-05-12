import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import type { SessionPhase } from './useVirtualSession';

export interface RaceRunner {
  id: number;
  name: string;
  emoji: string;
  color: string;
  progress: number;
  finished: boolean;
  position?: number;
}

interface RaceArenaProps {
  runners: RaceRunner[];
  phase: SessionPhase;
  winner: RaceRunner | null;
  sessionId: number;
}

export default function RaceArena({ runners, phase, winner, sessionId }: RaceArenaProps) {
  const sortedRunners = [...runners].sort((a, b) => a.id - b.id);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3,
        overflow: 'hidden',
        border: `1px solid ${darkBorder}`,
        background: `linear-gradient(180deg, ${darkCard} 0%, ${alpha('#000', 0.85)} 100%)`,
      }}
    >
      <Box
        sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2, py: 1.25,
          background: alpha('#000', 0.45),
          borderBottom: `1px solid ${darkBorder}`,
          position: 'relative', zIndex: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ fontSize: '1.1rem' }}>🏇</Box>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
            Race #{sessionId}
          </Typography>
          <Chip
            label={phase === 'live' ? 'RACING' : phase === 'result' ? 'FINISHED' : 'AT THE GATE'}
            size="small"
            sx={{
              height: 18, fontSize: '0.6rem', fontWeight: 800,
              background: phase === 'live' ? alpha('#ff4757', 0.2) : phase === 'result' ? alpha(neonGold, 0.2) : alpha(neonGreen, 0.18),
              color: phase === 'live' ? '#ff4757' : phase === 'result' ? neonGold : neonGreen,
              border: `1px solid ${alpha(phase === 'live' ? '#ff4757' : phase === 'result' ? neonGold : neonGreen, 0.3)}`,
            }}
          />
        </Box>
        {phase === 'result' && winner && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Winner</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: neonGold }}>
              🏆 {winner.name}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          position: 'relative',
          height: { xs: 240, sm: 280, md: 300 },
          background: 'linear-gradient(180deg, #6b3a18 0%, #8a5128 40%, #5a3014 100%)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(90deg, ${alpha('#fff', 0.03)} 0 60px, ${alpha('#000', 0.05)} 60px 120px)`,
        }} />

        <Box sx={{
          position: 'absolute', top: 0, bottom: 0, right: '6%',
          width: '2px', background: '#fff',
          boxShadow: `0 0 8px ${neonGold}`,
        }} />
        <Box sx={{
          position: 'absolute', top: 0, bottom: 0, right: '6%',
          width: 6, transform: 'translateX(2px)',
          backgroundImage: `repeating-linear-gradient(0deg, #fff 0 8px, #000 8px 16px)`,
          opacity: 0.7,
        }} />
        <Typography sx={{
          position: 'absolute', top: 4, right: '3%',
          fontSize: '0.62rem', fontWeight: 800, color: neonGold,
          letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}>
          FINISH
        </Typography>

        {sortedRunners.map((r, i) => {
          const laneTop = `${(i + 0.5) * (100 / sortedRunners.length)}%`;
          const laneLeft = `${4 + (r.progress / 100) * 88}%`;
          return (
            <Box key={r.id}>
              <Box
                sx={{
                  position: 'absolute',
                  top: laneTop,
                  left: 8, right: 8,
                  height: 1,
                  background: alpha('#fff', 0.08),
                  transform: 'translateY(-50%)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: laneTop,
                  left: 8,
                  transform: 'translate(-50%, -50%)',
                  width: 18, height: 18, borderRadius: '50%',
                  background: alpha('#000', 0.7),
                  color: r.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.62rem', fontWeight: 900,
                  border: `1px solid ${r.color}`,
                  zIndex: 2,
                }}
              >
                {r.id + 1}
              </Box>
              <motion.div
                animate={{ left: laneLeft }}
                transition={{ duration: 0.4, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: laneTop,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  zIndex: 3,
                }}
              >
                <Box
                  sx={{
                    fontSize: '1.4rem',
                    filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
                    transform: r.finished ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {r.emoji}
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.58rem', fontWeight: 800,
                    color: r.color,
                    textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.name}
                </Typography>
              </motion.div>
            </Box>
          );
        })}

        {phase === 'betting' && (
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 100%)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            pb: 1.5, pointerEvents: 'none',
          }}>
            <Chip
              label="Place your bets — race starts soon"
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
          {phase === 'result' && winner && (
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
                PHOTO FINISH
              </Typography>
              <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
                🏆 {winner.name}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: neonGold, fontWeight: 700 }}>
                Wins Race #{sessionId}
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}
