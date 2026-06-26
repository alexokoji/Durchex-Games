import { useEffect, useState } from 'react';
import { Box, Typography, Card, Table, TableBody, TableCell, TableHead, TableRow, Skeleton, Stack } from '@mui/material';
import { darkCard, darkBorder, neonGreen } from '../../theme';

interface LeaderboardEntry {
  username: string;
  wins: number;
  totalWagered: number;
  totalPayout: number;
  rank?: number;
}

interface GameLeaderboardProps {
  gameId: string;
  limit?: number;
}

export default function GameLeaderboard({ gameId, limit = 10 }: GameLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/leaderboard/game/${gameId}?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch leaderboard');
        const data = await res.json();
        setLeaderboard(data.map((entry: LeaderboardEntry, idx: number) => ({ ...entry, rank: idx + 1 })));
        setError(null);
      } catch (e: any) {
        setError(e.message);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [gameId, limit]);

  if (loading) {
    return (
      <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>Top Players</Typography>
        <Stack spacing={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={32} sx={{ background: '#2a2a3e' }} />
          ))}
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
        <Typography sx={{ fontSize: '0.85rem', color: '#ff6b7a' }}>Error loading leaderboard</Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2, overflowX: 'auto' }}>
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1.5 }}>🏆 Top Players</Typography>

      {leaderboard.length === 0 ? (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No results yet</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 250 }}>
            <TableHead>
              <TableRow sx={{ borderColor: darkBorder }}>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem', padding: '8px 4px' }}>Rank</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem', padding: '8px 4px' }}>Player</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.75rem', padding: '8px 4px' }}>Wins</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.75rem', padding: '8px 4px' }}>Wagered</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.75rem', padding: '8px 4px' }}>Won</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.map((entry) => (
                <TableRow key={entry.username} sx={{ borderColor: darkBorder, '&:hover': { background: '#2a2a3e' } }}>
                  <TableCell sx={{ color: entry.rank === 1 ? '#ffd700' : 'text.primary', fontWeight: entry.rank === 1 ? 700 : 400, fontSize: '0.8rem', padding: '6px 4px' }}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', padding: '6px 4px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.username}
                  </TableCell>
                  <TableCell align="right" sx={{ color: neonGreen, fontSize: '0.8rem', padding: '6px 4px', fontWeight: 600 }}>
                    {entry.wins}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', padding: '6px 4px', color: 'text.secondary' }}>
                    {entry.totalWagered.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', padding: '6px 4px', color: neonGreen }}>
                    {entry.totalPayout.toFixed(0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
