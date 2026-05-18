import { Box, Typography, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';

interface WeekOption {
  week: number;
  matchCount: number;
  startsAt: number;
  /** 'live' | 'upcoming' relative to the current week. */
  state: 'live' | 'upcoming';
}

interface Props {
  weeks: WeekOption[];
  selectedWeek: number;
  onSelect: (week: number) => void;
  totalWeeks: number;
  /** "BETTING" | "LIVE" | "FINISHED" — drives the live chip color/text. */
  phaseLabel: string;
  /** Seconds remaining for the phase OR until the next week. */
  secondsToNextWeek: number;
}

function fmtCountdown(s: number): string {
  if (s <= 0) return '0:00';
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

function fmtDayHour(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function WeekSelector({ weeks, selectedWeek, onSelect, totalWeeks, phaseLabel, secondsToNextWeek }: Props) {
  return (
    <Box sx={{
      p: 1.25, borderRadius: 2,
      background: darkCard, border: `1px solid ${darkBorder}`,
      mb: 1.25,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em' }}>
          MATCH WEEK
        </Typography>
        <Chip
          size="small"
          label={phaseLabel}
          sx={{
            background: phaseLabel === 'LIVE' ? alpha('#ff4757', 0.18) : alpha(neonGreen, 0.15),
            color:      phaseLabel === 'LIVE' ? '#ff4757' : neonGreen,
            fontWeight: 800,
          }}
        />
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          Next week in <strong style={{ color: neonGold }}>{fmtCountdown(secondsToNextWeek)}</strong>
        </Typography>
      </Box>

      {/* Horizontal scroll of selectable weeks */}
      <Box sx={{
        display: 'flex', gap: 0.75,
        overflowX: 'auto', pb: 0.5,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { background: alpha('#fff', 0.1), borderRadius: 3 },
      }}>
        {weeks.map(w => {
          const isSelected = w.week === selectedWeek;
          const tone = w.state === 'live' ? '#ff4757' : neonBlue;
          return (
            <Box
              key={w.week}
              onClick={() => onSelect(w.week)}
              sx={{
                minWidth: 96,
                px: 1.25, py: 0.75, borderRadius: 1.5,
                cursor: 'pointer',
                background: isSelected ? alpha(tone, 0.18) : alpha('#fff', 0.03),
                border: `1px solid ${isSelected ? tone : darkBorder}`,
                transition: 'background 0.15s, border-color 0.15s',
                '&:hover': { background: alpha(tone, 0.1), borderColor: alpha(tone, 0.4) },
                flexShrink: 0,
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontWeight: 800, letterSpacing: '0.08em' }}>
                  W{w.week} / {totalWeeks}
                </Typography>
                {w.state === 'live' && (
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%', background: '#ff4757',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                  }} />
                )}
              </Box>
              <Typography sx={{
                fontSize: '0.78rem', fontWeight: 800,
                color: isSelected ? '#fff' : 'text.primary',
                mt: 0.25,
              }}>
                {w.state === 'live' ? 'In progress' : fmtDayHour(w.startsAt)}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
                {w.matchCount} matches
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
