import { useState } from 'react';
import {
  Box, Typography, Button, Grid, Chip, Tabs, Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BoltIcon from '@mui/icons-material/Bolt';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import GameCard from '../components/casino/GameCard';
import type { GameCardData } from '../components/casino/GameCard';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';

const GAMES: GameCardData[] = [
  {
    id: 'crash', title: 'Crash', provider: 'Nexus Originals', rtp: '99.00%', players: 1842,
    badge: 'HOT', badgeColor: '#ff4757', path: '/crash',
    gradient: 'linear-gradient(135deg, #1a0a0a 0%, #3d0000 50%, #ff1a1a22 100%)',
    image: '/assets/Games Images/Crash.png',
  },
  {
    id: 'dice', title: 'Dice', provider: 'Nexus Originals', rtp: '99.00%', players: 3201,
    badge: 'POPULAR', badgeColor: neonBlue, path: '/dice',
    gradient: 'linear-gradient(135deg, #0a1020 0%, #001540 50%, #0044ff22 100%)',
    image: '/assets/Games Images/Dice.png',
  },
  {
    id: 'plinko', title: 'Plinko', provider: 'Nexus Originals', rtp: '99.00%', players: 987,
    badge: 'NEW', badgeColor: '#a855f7', path: '/plinko',
    gradient: 'linear-gradient(135deg, #0e0a1a 0%, #200040 50%, #aa00ff22 100%)',
    image: '/assets/Games Images/Plinko.png',
  },
  {
    id: 'slots', title: 'Fortune Spin', provider: 'Pragmatic Play', rtp: '96.50%', players: 4512,
    gradient: 'linear-gradient(135deg, #0a1505 0%, #103000 50%, #00ff0022 100%)',
    image: '/assets/Games Images/Spin.png',
    path: '/slots',
  },
  {
    id: 'roulette', title: 'Lightning Roulette', provider: 'Evolution', rtp: '97.30%', players: 2156,
    badge: 'LIVE', badgeColor: '#ff9f43', path: '/roulette',
    gradient: 'linear-gradient(135deg, #1a1000 0%, #402200 50%, #ff880022 100%)',
    image: '/assets/Games Images/Roulette.png',
  },
  {
    id: 'blackjack', title: 'Speed Blackjack', provider: 'Evolution', rtp: '99.54%', players: 891,
    gradient: 'linear-gradient(135deg, #001515 0%, #003030 50%, #00ffff22 100%)',
    image: '/assets/Games Images/Blackjack.png',
    path: '/blackjack',
  },
  {
    id: 'baccarat', title: 'Baccarat Deluxe', provider: 'Playtech', rtp: '98.76%', players: 1204,
    gradient: 'linear-gradient(135deg, #10000a 0%, #300015 50%, #ff006622 100%)',
    image: '/assets/Games Images/Baccarat.png',
    path: '/baccarat',
  },
  {
    id: 'mines', title: 'Mines', provider: 'Nexus Originals', rtp: '99.00%', players: 2789,
    badge: 'HOT', badgeColor: '#ff4757', path: '/mines',
    gradient: 'linear-gradient(135deg, #050a00 0%, #102000 50%, #44ff0022 100%)',
    image: '/assets/Games Images/Mines.png',
  },
  {
    id: 'soccer', title: 'Virtual Soccer', provider: 'Nexus Sports', rtp: '97.50%', players: 1523,
    gradient: 'linear-gradient(135deg, #0a1510 0%, #102015 50%, #00ff3322 100%)',
    image: '/assets/Games Images/Soccer.png',
    path: '/virtual/soccer',
  },
  {
    id: 'basketball', title: 'Virtual Basketball', provider: 'Nexus Sports', rtp: '97.50%', players: 1287,
    gradient: 'linear-gradient(135deg, #1a0505 0%, #301010 50%, #ff6b3322 100%)',
    image: '/assets/Games Images/Basketball.png',
    path: '/virtual/basketball',
  },
  {
    id: 'hockey', title: 'Virtual Hockey', provider: 'Nexus Sports', rtp: '97.50%', players: 892,
    gradient: 'linear-gradient(135deg, #050a15 0%, #101520 50%, #0088ff22 100%)',
    image: '/assets/Games Images/Hockey.png',
    path: '/virtual/hockey',
  },
  {
    id: 'horse-race', title: 'Horse Racing', provider: 'Nexus Sports', rtp: '97.50%', players: 2104,
    badge: 'LIVE', badgeColor: '#ff9f43', path: '/virtual/horseracing',
    gradient: 'linear-gradient(135deg, #15090a 0%, #2d0f0a 50%, #ff802222 100%)',
    image: '/assets/Games Images/Horse Racing.png',
  },
];

const CATEGORIES = ['All', 'Originals', 'Slots', 'Live', 'Table', 'Sports'];

function HeroBanner() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        mb: 3,
        minHeight: { xs: 200, md: 280 },
        background: 'linear-gradient(135deg, #0a1628 0%, #111826 40%, #0d1f0d 100%)',
        border: `1px solid ${darkBorder}`,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Animated grid overlay */}
      <Box
        sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(${alpha(neonGreen, 0.05)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha(neonGreen, 0.05)} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.8,
        }}
      />

      {/* Glow orbs */}
      <Box sx={{
        position: 'absolute', top: -60, right: 100, width: 300, height: 300,
        borderRadius: '50%', background: alpha(neonGreen, 0.08),
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: -80, right: 0, width: 250, height: 250,
        borderRadius: '50%', background: alpha(neonBlue, 0.1),
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <Box sx={{ position: 'relative', px: { xs: 3, md: 5 }, py: { xs: 4, md: 5 }, maxWidth: 600 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Chip
            icon={<BoltIcon sx={{ fontSize: 14 }} />}
            label="Provably Fair Gaming"
            size="small"
            sx={{
              mb: 2, background: alpha(neonGreen, 0.15), color: neonGreen,
              border: `1px solid ${alpha(neonGreen, 0.4)}`,
              fontWeight: 700, fontSize: '0.72rem',
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900, mb: 1, lineHeight: 1.1,
              background: `linear-gradient(135deg, #ffffff 0%, ${neonGreen} 60%, ${neonBlue} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontSize: { xs: '2rem', md: '2.8rem' },
            }}
          >
            The Future of<br />Crypto Casino
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem', maxWidth: 380 }}>
            Provably fair games with instant payouts. Deposits and withdrawals in your local currency
            — and every win settles in the same currency, no conversion fees.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  // Scroll to the featured-games grid below the hero. The
                  // grid has id="games-grid" so we can target it directly
                  // without coupling the button to a route.
                  const el = document.getElementById('games-grid');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                startIcon={<BoltIcon />}
                sx={{
                  background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                  color: '#000', fontWeight: 900,
                  boxShadow: `0 0 24px ${alpha(neonGreen, 0.5)}`,
                  px: 3, py: 1.2,
                }}
              >
                Play Now
              </Button>
            </motion.div>
          </Box>
        </motion.div>
      </Box>

      {/* Right side stats */}
      <Box
        sx={{
          position: 'absolute', right: { xs: -200, md: 40 }, top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 1.5,
        }}
      >
        {[
          { label: 'Total Wagered', value: '$2.1B+', color: neonGold },
          { label: 'Active Players', value: '48,219', color: neonGreen },
          { label: 'Biggest Win', value: '24,580x', color: '#ff4757' },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              px: 2, py: 1.2, borderRadius: 2,
              background: alpha(darkCard, 0.8),
              border: `1px solid ${darkBorder}`,
              backdropFilter: 'blur(10px)',
              textAlign: 'right',
            }}
          >
            <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: stat.color, lineHeight: 1.1 }}>
              {stat.value}
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{stat.label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function HomePage() {
  const [category, setCategory] = useState(0);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, pb: { xs: 10, md: 2.5 } }}>
      <HeroBanner />

      {/* Category tabs */}
      <Box id="games-grid" sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, scrollMarginTop: 80 }}>
        <LocalFireDepartmentIcon sx={{ color: '#ff4757', fontSize: 22 }} />
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>Featured Games</Typography>
      </Box>

      <Tabs
        value={category}
        onChange={(_, v) => setCategory(v)}
        sx={{
          mb: 2.5,
          '& .MuiTabs-root': { minHeight: 40 },
          '& .MuiTab-root': { minHeight: 36, py: 0, fontSize: '0.78rem' },
        }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {CATEGORIES.map((c) => (
          <Tab key={c} label={c} sx={{ minHeight: 36 }} />
        ))}
      </Tabs>

      {/* Game grid */}
      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        {GAMES.map((game, i) => (
          <Grid key={game.id} size={{ xs: 6, sm: 4, md: 3, lg: 3 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <GameCard game={game} />
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Promotions section */}
      <PromotionsSection />
    </Box>
  );
}

/**
 * Two promotion cards on the homepage:
 *   1. Welcome bonus — 100% of first deposit, drives signup or deposit
 *   2. Claim cashback — copy + CTA driven by the user's current VIP level.
 *
 * No BTC anywhere; figures are described in % so they read the same in
 * every fiat currency.
 */
function PromotionsSection() {
  const navigate = useNavigate();
  const { user, openAuthPrompt } = useAuth();
  const isGuest = !user;
  const tierName  = user?.vipName ?? 'Unranked';
  const tierColor = user?.vipColor ?? '#64748b';
  const cashbackPct = (user?.vipCashbackPct ?? 0) * 100;
  const usdToNext = user?.vipNextThresholdUsd != null
    ? Math.max(0, user.vipNextThresholdUsd - (user.vipWageredUsd ?? 0))
    : 0;

  // Welcome card always links to register; cashback card varies by state.
  const cashbackTitle = isGuest
    ? 'VIP Cashback'
    : cashbackPct > 0
      ? `${tierName} Cashback`
      : 'Unlock VIP Cashback';
  const cashbackDesc = isGuest
    ? 'Sign in and start wagering — Bronze members earn 5% weekly cashback on net losses, Diamond earn 15%.'
    : cashbackPct > 0
      ? `You earn ${cashbackPct.toFixed(0)}% of your weekly net losses back automatically. Credited every Monday with a 3× wagering requirement.`
      : `Wager $${usdToNext.toFixed(0)} more to unlock Bronze (5%) cashback. Top tier is Diamond at 15% weekly.`;
  const cashbackBadge = isGuest
    ? 'UP TO 15%'
    : cashbackPct > 0
      ? `${cashbackPct.toFixed(0)}% WEEKLY`
      : 'LOCKED';

  return (
    <Box sx={{ mb: 1 }}>
      <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>
        🎁 Active Promotions
      </Typography>
      <Grid container spacing={1.5}>
        {/* WELCOME 100% */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Box
              onClick={isGuest ? openAuthPrompt : () => navigate('/profile')}
              sx={{
                p: 2.5, borderRadius: 3, cursor: 'pointer',
                background: alpha(neonGreen, 0.08),
                border: `1px solid ${alpha(neonGreen, 0.25)}`,
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s',
                '&:hover': { border: `1px solid ${alpha(neonGreen, 0.55)}` },
              }}
            >
              <Chip
                label="100%"
                sx={{
                  position: 'absolute', top: 12, right: 12,
                  background: `linear-gradient(135deg, ${neonGreen}, ${alpha(neonGreen, 0.6)})`,
                  color: '#000', fontWeight: 900, fontSize: '0.85rem',
                  height: 32, '& .MuiChip-label': { px: 1.5 },
                }}
              />
              <Typography sx={{ fontWeight: 800, mb: 0.5, pr: 6 }}>Welcome bonus</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                Match 100% of your first deposit as playable bonus credit (5× wagering).
                Apply a promo code at signup or claim from your profile after depositing.
              </Typography>
              <Button
                size="small"
                sx={{
                  mt: 1.5, color: neonGreen, border: `1px solid ${alpha(neonGreen, 0.4)}`,
                  fontSize: '0.72rem', fontWeight: 700, borderRadius: 1.5,
                  '&:hover': { background: alpha(neonGreen, 0.1) },
                }}
              >
                {isGuest ? 'Sign up to claim →' : 'Open profile →'}
              </Button>
            </Box>
          </motion.div>
        </Grid>

        {/* VIP CASHBACK — copy driven by user's tier */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Box
              onClick={isGuest ? openAuthPrompt : () => navigate('/vip')}
              sx={{
                p: 2.5, borderRadius: 3, cursor: 'pointer',
                background: alpha(tierColor, 0.08),
                border: `1px solid ${alpha(tierColor, 0.25)}`,
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.2s',
                '&:hover': { border: `1px solid ${alpha(tierColor, 0.55)}` },
              }}
            >
              <Chip
                label={cashbackBadge}
                sx={{
                  position: 'absolute', top: 12, right: 12,
                  background: `linear-gradient(135deg, ${tierColor}, ${alpha(tierColor, 0.6)})`,
                  color: '#000', fontWeight: 900, fontSize: '0.7rem',
                  height: 32, '& .MuiChip-label': { px: 1.5 },
                }}
              />
              <Typography sx={{ fontWeight: 800, mb: 0.5, pr: 9 }}>{cashbackTitle}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{cashbackDesc}</Typography>
              <Button
                size="small"
                sx={{
                  mt: 1.5, color: tierColor, border: `1px solid ${alpha(tierColor, 0.4)}`,
                  fontSize: '0.72rem', fontWeight: 700, borderRadius: 1.5,
                  '&:hover': { background: alpha(tierColor, 0.1) },
                }}
              >
                {isGuest ? 'Sign in to see your level →' : cashbackPct > 0 ? 'Claim cashback →' : 'View VIP ladder →'}
              </Button>
            </Box>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
}
