import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { neonGreen, neonGold, darkBorder } from '../../theme';
import type { League } from '../core/types';

interface SportsbookHeaderProps {
  league: League;
  nextEventLabel: string;
  nextEventSeconds: number;
  liveCount: number;
  totalMatches: number;
}

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function SportsbookHeader({
  league,
  nextEventLabel,
  nextEventSeconds,
  liveCount,
  totalMatches,
}: SportsbookHeaderProps) {
  const isUrgent = nextEventSeconds <= 15;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        px: { xs: 1.5, md: 2 },
        py: 1.25,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha(league.accent, 0.18)} 0%, ${alpha('#000', 0.4)} 100%)`,
        border: `1px solid ${alpha(league.accent, 0.35)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ fontSize: '1.5rem', lineHeight: 1 }}>{league.flag}</Box>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {league.country}
          </Typography>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, lineHeight: 1.1 }}>
            {league.name}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {liveCount > 0 && (
          <motion.div animate={{ opacity: [1, 0.55, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <Chip
              size="small"
              label={`● ${liveCount} LIVE`}
              sx={{
                height: 22, fontWeight: 900, fontSize: '0.65rem',
                background: alpha('#ff4757', 0.18),
                color: '#ff4757',
                border: `1px solid ${alpha('#ff4757', 0.4)}`,
              }}
            />
          </motion.div>
        )}
        <Chip
          size="small"
          label={`${totalMatches} fixtures`}
          sx={{
            height: 22, fontWeight: 800, fontSize: '0.65rem',
            background: alpha(neonGreen, 0.12),
            color: neonGreen,
            border: `1px solid ${alpha(neonGreen, 0.3)}`,
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 1.5, py: 0.75, borderRadius: 1.5,
          background: alpha(isUrgent ? '#ff4757' : neonGold, 0.12),
          border: `1px solid ${alpha(isUrgent ? '#ff4757' : neonGold, 0.35)}`,
        }}
      >
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {nextEventLabel}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.95rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums',
            color: isUrgent ? '#ff4757' : neonGold,
          }}
        >
          {formatCountdown(nextEventSeconds)}
        </Typography>
      </Box>
    </Box>
  );
  void darkBorder;
}
