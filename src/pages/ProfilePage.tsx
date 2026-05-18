import { Box, Typography, Avatar, Chip, LinearProgress, Grid, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { formatMoney, usdApprox } from '../utils/currency';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, openAuthPrompt } = useAuth();
  const wallet = useWallet();

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sign in required</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>Sign in to view your profile.</Typography>
        <Button variant="contained" onClick={openAuthPrompt}>Sign in</Button>
      </Box>
    );
  }

  // Stats render in the user's chosen fiat (formatMoney respects locale +
  // symbol), and we append the USD equivalent so traders can compare across
  // accounts at a glance.
  const stats = [
    { label: 'Balance',       value: formatMoney(wallet.balance, wallet.currency),       sub: usdApprox(wallet.balance, wallet.currency),       color: neonGold },
    { label: 'Total Wagered', value: formatMoney(wallet.totalWagered, wallet.currency),  sub: usdApprox(wallet.totalWagered, wallet.currency),  color: neonBlue },
    { label: 'Net Profit',    value: `${wallet.netProfit >= 0 ? '+' : ''}${formatMoney(wallet.netProfit, wallet.currency)}`, sub: usdApprox(Math.abs(wallet.netProfit), wallet.currency), color: wallet.netProfit >= 0 ? neonGreen : '#ff6b7a' },
    { label: 'Bets Played',   value: String(wallet.history.length), sub: '',             color: '#a855f7' },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 3 }, maxWidth: 980, mx: 'auto' }}>
      {/* Identity card */}
      <Box sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(neonBlue, 0.12)}, ${alpha(neonGreen, 0.06)})`,
        border: `1px solid ${darkBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        mb: 3,
      }}>
        <Avatar sx={{
          width: 80, height: 80, fontSize: '1.6rem', fontWeight: 800,
          background: `linear-gradient(135deg, ${neonBlue}, #0080aa)`,
          border: `3px solid ${alpha(neonBlue, 0.4)}`,
        }}>
          {user.initials}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>{user.username}</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{user.email}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              label={`VIP Level ${user.vipLevel}`}
              size="small"
              sx={{
                background: `linear-gradient(135deg, ${neonGold}, #cc8800)`,
                color: '#000', fontWeight: 800, fontSize: '0.7rem',
              }}
            />
            <Typography sx={{ fontSize: '0.75rem', color: neonGold }}>{user.vipProgress}% to next tier</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={user.vipProgress}
            sx={{ mt: 0.75, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${neonGold}, ${neonGreen})` } }}
          />
        </Box>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate('/settings')}>
          Edit profile
        </Button>
      </Box>

      {/* Stats grid */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stats.map(s => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 0.5 }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                {s.value}
              </Typography>
              {s.sub && (
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums', mt: 0.25 }}>
                  {s.sub}
                </Typography>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Recent bets */}
      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, borderBottom: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em' }}>RECENT BETS</Typography>
          <Button size="small" onClick={() => navigate('/bet-history')}>View all</Button>
        </Box>
        {wallet.history.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              No bets yet — play any game and your history appears here.
            </Typography>
          </Box>
        ) : (
          <Box>
            {wallet.history.slice(0, 8).map(b => (
              <Box
                key={b.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2, py: 1,
                  borderBottom: `1px solid ${darkBorder}`,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{b.gameName}</Typography>
                  {b.details && (
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.details}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                  {b.stake.toFixed(5)}
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
                  fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 80,
                }}>
                  {b.result === 'win' ? '+' : '-'}{Math.abs(b.payout - b.stake).toFixed(5)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
