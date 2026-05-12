import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';

export interface UpcomingSession {
  id: number;
  startsInSeconds: number;
  matches: { home: string; away: string }[];
  highlight?: boolean;
}

interface NextSessionsListProps {
  sessions: UpcomingSession[];
  reminders: Set<number>;
  onToggleReminder: (id: number) => void;
  sportLabel: string;
}

function formatStartsIn(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export default function NextSessionsList({
  sessions, reminders, onToggleReminder, sportLabel,
}: NextSessionsListProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em' }}>
          NEXT SESSIONS
        </Typography>
        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
          {sportLabel}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sessions.map((s) => {
          const reminded = reminders.has(s.id);
          return (
            <Box
              key={s.id}
              sx={{
                background: s.highlight ? alpha(neonBlue, 0.06) : darkCard,
                border: `1px solid ${s.highlight ? alpha(neonBlue, 0.3) : darkBorder}`,
                borderRadius: 2,
                p: 1.25,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center',
                  background: alpha(neonGreen, 0.08),
                  border: `1px solid ${alpha(neonGreen, 0.2)}`,
                  borderRadius: 1.5,
                  px: 1, py: 0.5,
                  minWidth: 56,
                }}
              >
                <ScheduleIcon sx={{ fontSize: 12, color: neonGreen }} />
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: neonGreen, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {formatStartsIn(s.startsInSeconds)}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    Session #{s.id}
                  </Typography>
                  {s.highlight && (
                    <Chip
                      label="FEATURED"
                      size="small"
                      sx={{
                        height: 14, fontSize: '0.52rem', fontWeight: 800,
                        background: `linear-gradient(135deg, ${neonGold}, #cc8800)`,
                        color: '#000',
                        '& .MuiChip-label': { px: 0.6 },
                      }}
                    />
                  )}
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    color: 'text.secondary',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.matches.slice(0, 2).map(m => `${m.home} v ${m.away}`).join(' · ')}
                  {s.matches.length > 2 ? ` · +${s.matches.length - 2}` : ''}
                </Typography>
              </Box>
              <Tooltip title={reminded ? 'Remove reminder' : 'Remind me when this session starts'} arrow>
                <IconButton size="small" onClick={() => onToggleReminder(s.id)}>
                  {reminded
                    ? <BookmarkIcon sx={{ fontSize: 16, color: neonGold }} />
                    : <BookmarkBorderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
