import {
  Box, Typography, LinearProgress, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';
import { neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';

/**
 * VIP ladder — mirrors `server/src/services/vip.ts` so client and server
 * agree on names, thresholds and perks. The wagered amounts are USD-
 * equivalent so a player on any fiat sees the same progression.
 */
const VIP_TIERS: { level: number; name: string; icon: string; minWageredUsd: number; cashbackPct: number; color: string; perks: string[] }[] = [
  { level: 1, name: 'Bronze',   icon: '🥉', minWageredUsd: 100,  cashbackPct: 0.05, color: '#cd7f32', perks: ['5% weekly cashback on net losses',  'Bronze chat badge'] },
  { level: 2, name: 'Silver',   icon: '🥈', minWageredUsd: 300,  cashbackPct: 0.08, color: '#c0c0c0', perks: ['8% weekly cashback',  'Higher daily withdrawal cap', 'Silver chat badge'] },
  { level: 3, name: 'Gold',     icon: '🥇', minWageredUsd: 500,  cashbackPct: 0.10, color: '#ffd700', perks: ['10% weekly cashback', 'Priority support queue', 'Gold chat badge'] },
  { level: 4, name: 'Platinum', icon: '💎', minWageredUsd: 750,  cashbackPct: 0.12, color: '#8b00ff', perks: ['12% weekly cashback', 'Dedicated VIP host', 'Platinum chat badge', 'Birthday bonus'] },
  { level: 5, name: 'Diamond',  icon: '🔮', minWageredUsd: 1000, cashbackPct: 0.15, color: '#00bcd4', perks: ['15% weekly cashback', 'Exclusive tournaments', 'Custom withdrawal limits', 'Diamond chat badge'] },
];

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export default function VIPPage() {
  const { user } = useAuth();

  const wageredUsd = user?.vipWageredUsd ?? 0;
  const currentLevel = user?.vipLevel ?? 0;
  const currentTier  = currentLevel >= 1 ? VIP_TIERS[currentLevel - 1] : null;
  const nextTier     = currentLevel < 5 ? VIP_TIERS[currentLevel] : null;
  const tierFloor    = currentTier?.minWageredUsd ?? 0;
  const tierCeiling  = nextTier?.minWageredUsd ?? tierFloor + 1;
  const progressPct  = nextTier
    ? Math.max(0, Math.min(100, ((wageredUsd - tierFloor) / (tierCeiling - tierFloor)) * 100))
    : 100;
  const usdToNext = nextTier ? Math.max(0, nextTier.minWageredUsd - wageredUsd) : 0;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, pb: { xs: 10, md: 2.5 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Hero */}
      <Box sx={{
        borderRadius: 3, overflow: 'hidden', mb: 3, p: { xs: 3, md: 5 },
        background: 'linear-gradient(135deg, #0d0a20 0%, #1a0a30 50%, #0d1520 100%)',
        border: `1px solid ${alpha(currentTier?.color ?? '#8b00ff', 0.3)}`,
        position: 'relative',
      }}>
        <Box sx={{
          position: 'absolute', top: -80, right: 60, width: 300, height: 300,
          borderRadius: '50%', background: alpha(currentTier?.color ?? '#8b00ff', 0.12), filter: 'blur(60px)',
        }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ fontSize: '3rem' }}>{currentTier?.icon ?? '🎯'}</Box>
            <Box>
              <Typography variant="h3" sx={{
                fontWeight: 900,
                background: `linear-gradient(90deg, ${neonGold}, #ff9f43)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                VIP Club
              </Typography>
              <Typography sx={{ color: 'text.secondary' }}>
                {currentTier
                  ? `You're a ${currentTier.name} member earning ${Math.round(currentTier.cashbackPct * 100)}% weekly cashback on net losses.`
                  : 'Wager $100 USD-equivalent lifetime to unlock Bronze and weekly cashback.'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
            <Chip
              icon={<StarIcon sx={{ fontSize: 14, color: '#000 !important' }} />}
              label={currentTier ? `${currentTier.name} · Level ${currentTier.level}` : 'Unranked'}
              sx={{
                background: currentTier
                  ? `linear-gradient(135deg, ${currentTier.color}, ${alpha(currentTier.color, 0.6)})`
                  : alpha('#fff', 0.08),
                color: '#000', fontWeight: 900, fontSize: '0.78rem', height: 28,
              }}
            />
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Lifetime wagered: <strong style={{ color: '#fff' }}>{fmtUsd(wageredUsd)}</strong> (USD-equivalent)
            </Typography>
          </Box>

          {nextTier ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                  Progress to {nextTier.name} (Level {nextTier.level})
                </Typography>
                <Typography sx={{ fontSize: '0.78rem', color: neonGold, fontWeight: 700 }}>
                  {fmtUsd(usdToNext)} to go
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate" value={progressPct}
                sx={{
                  height: 10, borderRadius: 5,
                  background: alpha('#fff', 0.06),
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${currentTier?.color ?? neonGold}, ${nextTier.color})`,
                  },
                }}
              />
            </Box>
          ) : (
            <Typography sx={{ fontSize: '0.9rem', color: neonGold, fontWeight: 700 }}>
              You've reached the top — Diamond. Enjoy the perks.
            </Typography>
          )}
        </motion.div>
      </Box>

      {/* Tier ladder */}
      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, mb: 3 }}>
        {VIP_TIERS.map(t => {
          const isCurrent  = currentTier?.level === t.level;
          const isUnlocked = currentLevel >= t.level;
          return (
            <motion.div key={t.level} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: t.level * 0.04 }}>
              <Box sx={{
                p: 2, borderRadius: 2.5, height: '100%',
                background: isCurrent
                  ? `linear-gradient(135deg, ${alpha(t.color, 0.14)}, ${alpha(t.color, 0.04)})`
                  : darkCard,
                border: `1px solid ${isCurrent ? alpha(t.color, 0.5) : darkBorder}`,
                opacity: isUnlocked ? 1 : 0.7,
                position: 'relative',
              }}>
                {isCurrent && (
                  <Chip
                    label="Current"
                    size="small"
                    sx={{
                      position: 'absolute', top: 8, right: 8,
                      height: 18, fontSize: '0.62rem', fontWeight: 800,
                      background: alpha(t.color, 0.2), color: t.color,
                    }}
                  />
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ fontSize: '1.5rem' }}>{t.icon}</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: t.color, fontSize: '1rem' }}>{t.name}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Level {t.level}</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1 }}>
                  Unlock at <strong style={{ color: '#fff' }}>{fmtUsd(t.minWageredUsd)}</strong> lifetime wagered
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {t.perks.map(p => (
                    <Typography key={p} sx={{ fontSize: '0.78rem', color: isUnlocked ? '#fff' : 'text.secondary' }}>
                      • {p}
                    </Typography>
                  ))}
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>

      {/* How it works */}
      <Box sx={{
        p: { xs: 2, md: 3 }, borderRadius: 3, mb: 3,
        background: darkCard, border: `1px solid ${darkBorder}`,
      }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', mb: 1.5 }}>How VIP works</Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
          1. Every bet you place adds to your <strong style={{ color: '#fff' }}>lifetime wagered</strong> total (in USD-equivalent).
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
          2. Cross a tier threshold and you instantly unlock its perks — no application needed.
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
          3. Every Monday we credit your tier's cashback % on the previous week's <em>net losses</em> (losses minus wins). Cashback lands in your bonus balance with a 3× wagering requirement.
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          4. Cashback only — no weekly or reload bonuses on top. The platform keeps it simple.
        </Typography>
      </Box>
    </Box>
  );
}
