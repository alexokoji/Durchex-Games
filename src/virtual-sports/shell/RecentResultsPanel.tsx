import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { alpha } from '@mui/material/styles';
import HistoryIcon from '@mui/icons-material/History';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import type { SportKey } from '../core/types';
import { getResultsForView, type RecentResult } from '../core/recentResults';
import { LEAGUES } from '../core/leagueDatabase';

interface Props {
  sport: SportKey;
  /** Optional league filter — when set, hides the league chip filter. */
  fixedLeagueId?: string;
  limit?: number;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function RecentResultsPanel({ sport, fixedLeagueId, limit = 30 }: Props) {
  const [leagueId, setLeagueId] = useState<string | 'all'>(fixedLeagueId ?? 'all');
  const [results, setResults] = useState<RecentResult[]>([]);

  // Refresh from the store every 20s — picks up any live results pushed by
  // the simulation while the user is on this page.
  useEffect(() => {
    function refresh() {
      setResults(getResultsForView({
        sport,
        leagueId: leagueId === 'all' ? undefined : leagueId,
        limit,
      }));
    }
    refresh();
    const t = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(t);
  }, [sport, leagueId, limit]);

  const leaguesForSport = useMemo(
    () => LEAGUES.filter(l => l.sport === sport && l.tier !== 'continental'),
    [sport],
  );

  return (
    <Box sx={{
      p: { xs: 1.5, md: 2 },
      borderRadius: 2,
      background: darkCard,
      border: `1px solid ${darkBorder}`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <HistoryIcon sx={{ fontSize: 18, color: neonBlue }} />
        <Typography sx={{ fontSize: '0.95rem', fontWeight: 800 }}>Recent results</Typography>
        <Chip
          size="small"
          label={`${results.length} matches`}
          sx={{ background: alpha(neonBlue, 0.12), color: neonBlue }}
        />
        {!fixedLeagueId && leaguesForSport.length > 1 && (
          <Box sx={{ ml: 'auto' }}>
            <ToggleButtonGroup
              value={leagueId}
              exclusive
              size="small"
              onChange={(_, v) => v && setLeagueId(v)}
            >
              <ToggleButton value="all">All</ToggleButton>
              {leaguesForSport.slice(0, 5).map(l => (
                <ToggleButton key={l.id} value={l.id}>{l.shortName}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}
      </Box>

      {results.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', py: 2, textAlign: 'center' }}>
          No recent results yet — finish a session to see them here.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 480, overflowY: 'auto' }}>
          {results.map(r => {
            const homeWon = r.home.score > r.away.score;
            const draw    = r.home.score === r.away.score;
            return (
              <Box key={r.id} sx={{
                px: 1.5, py: 1,
                borderRadius: 1.5,
                background: r.source === 'live' ? alpha(neonGreen, 0.05) : 'transparent',
                display: 'grid',
                gridTemplateColumns: '60px 1fr auto 1fr 70px',
                gap: 1,
                alignItems: 'center',
                fontSize: '0.85rem',
              }}>
                <Chip
                  size="small"
                  label={r.leagueName}
                  sx={{
                    background: alpha('#fff', 0.05),
                    color: 'text.secondary',
                    fontSize: '0.65rem',
                    height: 18,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
                <Typography sx={{
                  fontSize: '0.85rem', fontWeight: homeWon ? 800 : 600,
                  color: homeWon ? '#fff' : 'text.secondary',
                  textAlign: 'right',
                }}>
                  {r.home.name}
                </Typography>
                <Box sx={{
                  px: 1, py: 0.25, borderRadius: 1,
                  background: alpha(draw ? neonGold : (homeWon ? neonGreen : neonBlue), 0.15),
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  fontVariantNumeric: 'tabular-nums', fontWeight: 800,
                }}>
                  <span>{r.home.score}</span><span style={{ opacity: 0.4 }}>·</span><span>{r.away.score}</span>
                </Box>
                <Typography sx={{
                  fontSize: '0.85rem', fontWeight: !homeWon && !draw ? 800 : 600,
                  color: !homeWon && !draw ? '#fff' : 'text.secondary',
                }}>
                  {r.away.name}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', textAlign: 'right' }}>
                  {timeAgo(r.finishedAt)}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
