import { useMemo, useState } from 'react';
import { Box, Typography, Chip, Button, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { formatMoney } from '../utils/currency';

type Filter = 'all' | 'win' | 'loss';

export default function BetHistoryPage() {
  const { isAuthenticated, openAuthPrompt } = useAuth();
  const wallet = useWallet();
  const [filter, setFilter] = useState<Filter>('all');
  const [game, setGame] = useState<string>('all');

  const games = useMemo(() => {
    const s = new Set<string>();
    wallet.history.forEach(h => s.add(h.gameId));
    return Array.from(s);
  }, [wallet.history]);

  const rows = useMemo(() => {
    return wallet.history.filter(b =>
      (filter === 'all' || b.result === filter) &&
      (game === 'all' || b.gameId === game),
    );
  }, [wallet.history, filter, game]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sign in required</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>Sign in to see your bet history.</Typography>
        <Button variant="contained" onClick={openAuthPrompt}>Sign in</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 3 }, maxWidth: 980, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>Bet History</Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem' }}>
        Every bet you've placed across games and virtual sports.
      </Typography>

      {/* Headline stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
        {[
          { label: 'Bets',         value: wallet.history.length, color: neonBlue },
          { label: 'Wagered',      value: formatMoney(wallet.totalWagered, wallet.currency), color: neonGold },
          { label: 'Won',          value: formatMoney(wallet.totalWon, wallet.currency), color: neonGreen },
          { label: 'Net',          value: `${wallet.netProfit >= 0 ? '+' : ''}${formatMoney(wallet.netProfit, wallet.currency)}`, color: wallet.netProfit >= 0 ? neonGreen : '#ff6b7a' },
        ].map(s => (
          <Box key={s.label} sx={{ p: 1.5, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
            <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.label}</Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderBottom: `1px solid ${darkBorder}`, flexWrap: 'wrap' }}>
          <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ minHeight: 32 }}>
            <Tab label="All"   value="all"  sx={{ minHeight: 32, fontSize: '0.72rem', fontWeight: 800 }} />
            <Tab label="Wins"  value="win"  sx={{ minHeight: 32, fontSize: '0.72rem', fontWeight: 800 }} />
            <Tab label="Losses" value="loss" sx={{ minHeight: 32, fontSize: '0.72rem', fontWeight: 800 }} />
          </Tabs>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label="All games"
              size="small"
              onClick={() => setGame('all')}
              sx={{
                height: 22, fontSize: '0.62rem', fontWeight: 700,
                background: game === 'all' ? alpha(neonGreen, 0.18) : alpha('#fff', 0.05),
                color: game === 'all' ? neonGreen : 'text.secondary',
                border: `1px solid ${game === 'all' ? alpha(neonGreen, 0.4) : darkBorder}`,
                cursor: 'pointer',
              }}
            />
            {games.map(g => (
              <Chip
                key={g}
                label={g}
                size="small"
                onClick={() => setGame(g)}
                sx={{
                  height: 22, fontSize: '0.62rem', fontWeight: 700,
                  background: game === g ? alpha(neonGreen, 0.18) : alpha('#fff', 0.05),
                  color: game === g ? neonGreen : 'text.secondary',
                  border: `1px solid ${game === g ? alpha(neonGreen, 0.4) : darkBorder}`,
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Rows */}
        {rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              {wallet.history.length === 0 ? "You haven't placed any bets yet." : 'No bets match the current filter.'}
            </Typography>
          </Box>
        ) : (
          <Box>
            {rows.map(b => (
              <Box
                key={b.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto auto auto',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2, py: 1,
                  borderBottom: `1px solid ${darkBorder}`,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', minWidth: 56 }}>
                  {new Date(b.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{b.gameName}</Typography>
                  {b.details && (
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.details}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                  Stake {formatMoney(b.stake, b.currency)}
                </Typography>
                <Chip
                  label={b.result.toUpperCase()}
                  size="small"
                  sx={{
                    height: 18, fontSize: '0.6rem', fontWeight: 800,
                    background: b.result === 'win' ? alpha(neonGreen, 0.15) : alpha('#ff4757', 0.15),
                    color: b.result === 'win' ? neonGreen : '#ff4757',
                  }}
                />
                <Typography sx={{
                  fontSize: '0.85rem', fontWeight: 800,
                  color: b.result === 'win' ? neonGreen : '#ff6b7a',
                  fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 90,
                }}>
                  {b.result === 'win' ? '+' : '-'}{formatMoney(Math.abs(b.payout - b.stake), b.currency)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
