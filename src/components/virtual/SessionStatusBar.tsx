import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LockClockIcon from '@mui/icons-material/LockClock';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import FlagIcon from '@mui/icons-material/Flag';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { formatCountdown, type SessionPhase, type VirtualSessionState } from './useVirtualSession';

interface SessionStatusBarProps {
  state: VirtualSessionState;
  sportLabel: string;
}

const PHASE_META: Record<SessionPhase, { label: string; color: string; icon: React.ReactNode }> = {
  betting: { label: 'BETTING OPEN', color: neonGreen, icon: <LockClockIcon sx={{ fontSize: 14 }} /> },
  live:    { label: 'LIVE',          color: '#ff4757', icon: <SportsScoreIcon sx={{ fontSize: 14 }} /> },
  result:  { label: 'RESULT',        color: neonGold,  icon: <FlagIcon sx={{ fontSize: 14 }} /> },
};

export default function SessionStatusBar({ state, sportLabel }: SessionStatusBarProps) {
  const meta = PHASE_META[state.phase];
  const progressPct = (state.phaseElapsed / state.phaseDuration) * 100;

  return (
    <Box
      sx={{
        background: darkCard,
        border: `1px solid ${darkBorder}`,
        borderRadius: 2,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            width: 6, height: 6, borderRadius: '50%',
            background: meta.color,
            boxShadow: `0 0 10px ${meta.color}`,
            flexShrink: 0,
            animation: state.phase === 'live' ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.4 },
            },
          }}
        />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: meta.color, letterSpacing: '0.05em' }}>
          {meta.label}
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          · {sportLabel}
        </Typography>
        <Chip
          label={`Session #${state.sessionId}`}
          size="small"
          sx={{
            ml: 0.5, height: 18, fontSize: '0.6rem', fontWeight: 700,
            background: alpha('#fff', 0.06),
            color: 'text.secondary',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {meta.icon}
          <Typography
            sx={{
              fontSize: '0.95rem', fontWeight: 900,
              color: meta.color,
              fontVariantNumeric: 'tabular-nums',
              minWidth: 50, textAlign: 'right',
            }}
          >
            {formatCountdown(state.phaseRemaining)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: '1 1 100%', mt: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, progressPct)}
          sx={{
            height: 4, borderRadius: 2,
            background: alpha('#fff', 0.05),
            '& .MuiLinearProgress-bar': {
              background: `linear-gradient(90deg, ${meta.color}, ${alpha(meta.color, 0.5)})`,
              transition: 'transform 0.25s linear',
            },
          }}
        />
      </Box>
    </Box>
  );
}
