import { Box, Typography, LinearProgress, Grid, Button, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { neonGreen, neonGold, neonBlue, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';

const TIERS = [
  { level: 1, name: 'Bronze',    color: '#cd7f32', threshold: 0 },
  { level: 2, name: 'Silver',    color: '#c0c0c0', threshold: 1 },
  { level: 3, name: 'Gold',      color: '#ffd700', threshold: 5 },
  { level: 4, name: 'Platinum',  color: '#8e8e93', threshold: 25 },
  { level: 5, name: 'Diamond',   color: '#b9f2ff', threshold: 100 },
  { level: 6, name: 'Mythic',    color: '#a855f7', threshold: 500 },
];

export default function RewardsPage() {
  const { isAuthenticated, openAuthPrompt } = useAuth();
  const wallet = useWallet();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sign in required</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>Sign in to access rewards and VIP perks.</Typography>
        <Button variant="contained" onClick={openAuthPrompt}>Sign in</Button>
      </Box>
    );
  }

  const wagered = wallet.totalWagered;
  const currentTier = [...TIERS].reverse().find(t => wagered >= t.threshold) ?? TIERS[0];
  const nextTier = TIERS.find(t => t.threshold > wagered);
  const progress = nextTier
    ? Math.min(100, ((wagered - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100)
    : 100;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 3 }, maxWidth: 980, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>Rewards & VIP</Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem' }}>
        Wager more to climb tiers and unlock cashback, reload bonuses, and exclusive promos.
      </Typography>

      <Box sx={{
        p: { xs: 2, md: 3 },
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(currentTier.color, 0.18)}, ${alpha(neonGold, 0.06)})`,
        border: `1px solid ${alpha(currentTier.color, 0.35)}`,
        mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <StarIcon sx={{ fontSize: 30, color: currentTier.color }} />
          <Box>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Current Tier
            </Typography>
            <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: currentTier.color }}>
              {currentTier.name} · Level {currentTier.level}
            </Typography>
          </Box>
        </Box>
        {nextTier ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', mb: 0.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
                Progress to {nextTier.name}
              </Typography>
              <Typography sx={{ color: nextTier.color, fontWeight: 700, fontSize: '0.78rem' }}>
                {wagered.toFixed(2)} / {nextTier.threshold} BTC wagered
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${currentTier.color}, ${nextTier.color})` } }}
            />
          </>
        ) : (
          <Chip label="Max tier reached" sx={{ background: alpha(neonGold, 0.2), color: neonGold, fontWeight: 800 }} />
        )}
      </Box>

      {/* Active promos */}
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1 }}>
        ACTIVE PROMOTIONS
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[
          { title: 'Daily Cashback',  desc: 'Get 10% back on net losses every 24h.', badge: '10%',  color: neonGreen },
          { title: 'Weekly Reload',   desc: '50% reload bonus every Monday.',         badge: '50%',  color: neonBlue },
          { title: 'Welcome Bonus',   desc: '300% match on your first deposit.',      badge: '300%', color: neonGold },
        ].map(p => (
          <Grid key={p.title} size={{ xs: 12, sm: 4 }}>
            <Box sx={{
              p: 2, borderRadius: 2,
              background: alpha(p.color, 0.06),
              border: `1px solid ${alpha(p.color, 0.25)}`,
              position: 'relative', overflow: 'hidden',
            }}>
              <Chip label={p.badge} sx={{
                position: 'absolute', top: 10, right: 10,
                background: `linear-gradient(135deg, ${p.color}, ${alpha(p.color, 0.6)})`,
                color: '#000', fontWeight: 900, fontSize: '0.8rem', height: 26,
              }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <CardGiftcardIcon sx={{ fontSize: 18, color: p.color }} />
                <Typography sx={{ fontWeight: 800 }}>{p.title}</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{p.desc}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Tier ladder */}
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em', color: 'text.secondary', mb: 1 }}>
        VIP TIERS
      </Typography>
      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        {TIERS.map(t => {
          const reached = wagered >= t.threshold;
          const active = t.level === currentTier.level;
          return (
            <Box
              key={t.level}
              sx={{
                display: 'grid', gridTemplateColumns: '40px 1fr auto auto',
                gap: 1.5, alignItems: 'center',
                px: 2, py: 1.25,
                borderBottom: `1px solid ${darkBorder}`,
                '&:last-child': { borderBottom: 'none' },
                background: active ? alpha(t.color, 0.06) : 'transparent',
              }}
            >
              <EmojiEventsIcon sx={{ color: reached ? t.color : 'text.disabled', fontSize: 22 }} />
              <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: reached ? t.color : 'text.secondary' }}>
                {t.name}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {t.threshold} BTC wagered
              </Typography>
              <Chip
                label={active ? 'Current' : reached ? 'Reached' : 'Locked'}
                size="small"
                sx={{
                  height: 18, fontSize: '0.62rem', fontWeight: 700,
                  background: active ? alpha(t.color, 0.2) : alpha('#fff', 0.05),
                  color: reached ? t.color : 'text.disabled',
                }}
              />
            </Box>
          );
        })}
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button variant="outlined" onClick={() => navigate('/vip')}>See the full VIP programme</Button>
      </Box>
    </Box>
  );
}
