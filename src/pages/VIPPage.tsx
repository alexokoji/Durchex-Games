import {
  Box, Typography, Grid, LinearProgress, Chip, Avatar,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';

const VIP_TIERS = [
  { name: 'Bronze', icon: '🥉', minXp: 0, color: '#cd7f32', perks: ['5% Cashback', '5% Reload', 'Priority Support'] },
  { name: 'Silver', icon: '🥈', minXp: 10000, color: '#c0c0c0', perks: ['8% Cashback', '8% Reload', 'Weekly Bonus'] },
  { name: 'Gold', icon: '🥇', minXp: 50000, color: neonGold, perks: ['12% Cashback', '10% Reload', '0.02 BTC Weekly'] },
  { name: 'Platinum', icon: '💎', minXp: 200000, color: '#8b00ff', perks: ['15% Cashback', '15% Reload', '0.05 BTC Weekly', 'VIP Manager'] },
  { name: 'Diamond', icon: '🔮', minXp: 1000000, color: neonBlue, perks: ['20% Cashback', '20% Reload', '0.2 BTC Weekly', 'Custom Limits'] },
];

const LEADERBOARD = [
  { rank: 1, user: 'WhaleKing', wagered: '142.4 BTC', level: 'Diamond', avatar: '👑', color: neonGold },
  { rank: 2, user: 'CryptoGod', wagered: '98.1 BTC', level: 'Diamond', avatar: '🔮', color: neonBlue },
  { rank: 3, user: 'NeonWolf', wagered: '67.3 BTC', level: 'Platinum', avatar: '💎', color: '#8b00ff' },
  { rank: 4, user: 'Satoshi99', wagered: '45.8 BTC', level: 'Gold', avatar: '🥇', color: neonGold },
  { rank: 5, user: 'DiamondHands', wagered: '33.2 BTC', level: 'Gold', avatar: '💎', color: neonGold },
];

export default function VIPPage() {
  const currentXp = 68420;
  const nextXp = 100000;
  const currentTier = VIP_TIERS[2];

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, pb: { xs: 10, md: 2.5 } }}>
      {/* Hero */}
      <Box
        sx={{
          borderRadius: 3, overflow: 'hidden', mb: 3, p: { xs: 3, md: 5 },
          background: 'linear-gradient(135deg, #0d0a20 0%, #1a0a30 50%, #0d1520 100%)',
          border: `1px solid ${alpha('#8b00ff', 0.3)}`,
          position: 'relative',
        }}
      >
        <Box sx={{
          position: 'absolute', top: -80, right: 60, width: 300, height: 300,
          borderRadius: '50%', background: alpha('#8b00ff', 0.12), filter: 'blur(60px)',
        }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ fontSize: '3rem' }}>👑</Box>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900, background: `linear-gradient(90deg, ${neonGold}, #ff9f43)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                VIP Club
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>
                Exclusive rewards for loyal players
              </Typography>
            </Box>
          </Box>

          {/* Current level */}
          <Box
            sx={{
              p: 2.5, borderRadius: 2, display: 'inline-flex', flexDirection: 'column', gap: 1,
              background: alpha(neonGold, 0.1), border: `1px solid ${alpha(neonGold, 0.3)}`,
              minWidth: 280,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>CURRENT LEVEL</Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: neonGold }}>{currentTier.icon} {currentTier.name}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>TOTAL XP</Typography>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                  {currentXp.toLocaleString()}
                </Typography>
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={(currentXp / nextXp) * 100} sx={{ height: 8 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{currentXp.toLocaleString()} XP</Typography>
              <Typography sx={{ fontSize: '0.68rem', color: neonGold }}>Next: {nextXp.toLocaleString()} XP</Typography>
            </Box>
          </Box>
        </motion.div>
      </Box>

      {/* Tiers */}
      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>VIP Tiers</Typography>
      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        {VIP_TIERS.map((tier, i) => (
          <Grid key={tier.name} size={{ xs: 12, sm: 6, md: 4 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -4 }}
            >
              <Box
                sx={{
                  p: 2, borderRadius: 2, textAlign: 'center',
                  background: alpha(tier.color, 0.08),
                  border: `1px solid ${tier.name === currentTier.name ? tier.color : alpha(tier.color, 0.3)}`,
                  position: 'relative',
                  boxShadow: tier.name === currentTier.name ? `0 0 20px ${alpha(tier.color, 0.3)}` : 'none',
                }}
              >
                {tier.name === currentTier.name && (
                  <Chip
                    label="CURRENT"
                    size="small"
                    sx={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      background: tier.color, color: '#000', fontWeight: 900, fontSize: '0.6rem', height: 20,
                    }}
                  />
                )}
                <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>{tier.icon}</Typography>
                <Typography sx={{ fontWeight: 800, color: tier.color, mb: 1 }}>{tier.name}</Typography>
                {tier.perks.map(p => (
                  <Typography key={p} sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.6 }}>
                    ✓ {p}
                  </Typography>
                ))}
                <Typography sx={{ fontSize: '0.65rem', color: alpha(tier.color, 0.7), mt: 1, fontWeight: 700 }}>
                  {tier.minXp === 0 ? 'Starting' : `${tier.minXp.toLocaleString()} XP`}
                </Typography>
              </Box>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Leaderboard */}
      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>Weekly Leaderboard</Typography>
      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ display: 'flex', px: 2, py: 1.2, borderBottom: `1px solid ${darkBorder}`, background: alpha('#fff', 0.02) }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, width: 40 }}>#</Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, flex: 1 }}>PLAYER</Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, width: 100, textAlign: 'right' }}>WAGERED</Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, width: 80, textAlign: 'right' }}>LEVEL</Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, width: 80, textAlign: 'right' }}>PRIZE</Typography>
        </Box>
        {LEADERBOARD.map((p, i) => (
          <motion.div
            key={p.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Box
              sx={{
                display: 'flex', alignItems: 'center', px: 2, py: 1.4,
                borderBottom: i < LEADERBOARD.length - 1 ? `1px solid ${alpha(darkBorder, 0.5)}` : 'none',
                '&:hover': { background: alpha('#fff', 0.02) },
              }}
            >
              <Box sx={{ width: 40 }}>
                <Typography sx={{
                  fontSize: '0.88rem', fontWeight: 900,
                  color: p.rank <= 3 ? [neonGold, '#c0c0c0', '#cd7f32'][p.rank - 1] : 'text.disabled',
                }}>
                  {p.rank <= 3 ? ['🥇', '🥈', '🥉'][p.rank - 1] : `#${p.rank}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                <Avatar sx={{ width: 32, height: 32, background: alpha(p.color, 0.2), fontSize: '1rem' }}>
                  {p.avatar}
                </Avatar>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.user}</Typography>
              </Box>
              <Typography sx={{ width: 100, textAlign: 'right', fontSize: '0.82rem', color: neonGold, fontWeight: 700 }}>
                {p.wagered}
              </Typography>
              <Box sx={{ width: 80, textAlign: 'right' }}>
                <Chip
                  label={p.level}
                  size="small"
                  sx={{
                    height: 20, fontSize: '0.62rem', fontWeight: 800,
                    background: alpha(p.color, 0.15), color: p.color,
                  }}
                />
              </Box>
              <Typography sx={{ width: 80, textAlign: 'right', fontSize: '0.82rem', color: neonGreen, fontWeight: 700 }}>
                {['0.5 BTC', '0.25 BTC', '0.1 BTC', '0.05 BTC', '0.02 BTC'][i]}
              </Typography>
            </Box>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}
