import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Grid, Chip, Tabs, Tab,
  LinearProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import StarIcon from '@mui/icons-material/Star';
import GameCard from '../components/casino/GameCard';
import type { GameCardData } from '../components/casino/GameCard';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';

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

const LIVE_WINS = [
  { user: 'Satoshi99', game: 'Crash', mult: '24.5x', amount: '0.012 BTC', color: '#ff4757' },
  { user: 'NeonWolf', game: 'Dice', mult: '99x', amount: '0.005 BTC', color: neonBlue },
  { user: 'CryptoKing', game: 'Plinko', mult: '16x', amount: '0.008 BTC', color: '#a855f7' },
  { user: 'DiamondHands', game: 'Slots', mult: '150x', amount: '0.002 BTC', color: neonGold },
  { user: 'LuckyDragon', game: 'Roulette', mult: '35x', amount: '0.020 BTC', color: neonGreen },
];

function HeroBanner() {
  const navigate = useNavigate();

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
            Experience provably fair games with instant payouts.
            Play with BTC, ETH, SOL & 50+ cryptocurrencies.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/crash')}
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
            <Button
              variant="outlined"
              size="large"
              sx={{ borderColor: alpha(neonBlue, 0.5), color: neonBlue, px: 3, py: 1.2, fontWeight: 700 }}
            >
              Free Demo
            </Button>
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

function LiveWinsTicker() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % LIVE_WINS.length), 2000);
    return () => clearInterval(t);
  }, []);

  const win = LIVE_WINS[idx];

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
        background: alpha(darkCard, 0.8), borderRadius: 2,
        border: `1px solid ${darkBorder}`, overflow: 'hidden',
        mb: 3,
      }}
    >
      <EmojiEventsIcon sx={{ fontSize: 18, color: neonGold, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', flexShrink: 0 }}>
        LIVE WINS
      </Typography>
      <Box sx={{ width: 1, height: 16, background: darkBorder, flexShrink: 0 }} />
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}
        >
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: win.color }}>
            {win.user}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            won {win.mult} on
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
            {win.game}
          </Typography>
          <Chip
            label={win.amount}
            size="small"
            sx={{
              height: 20, fontSize: '0.65rem', fontWeight: 800,
              background: alpha(win.color, 0.15), color: win.color,
              border: `1px solid ${alpha(win.color, 0.3)}`,
            }}
          />
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}

function VIPProgress() {
  return (
    <Box
      sx={{
        p: 2.5, borderRadius: 3, mb: 3,
        background: `linear-gradient(135deg, ${alpha('#8b00ff', 0.15)}, ${alpha(neonGold, 0.08)})`,
        border: `1px solid ${alpha(neonGold, 0.2)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarIcon sx={{ color: neonGold, fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>VIP Level 5</Typography>
        </Box>
        <Chip
          label="PLATINUM"
          size="small"
          sx={{
            background: `linear-gradient(135deg, #8b00ff, #5500cc)`,
            color: '#fff', fontWeight: 800, fontSize: '0.62rem', height: 20,
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Progress to Level 6</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: neonGold, fontWeight: 700 }}>68,420 / 100,000 XP</Typography>
      </Box>
      <LinearProgress variant="determinate" value={68.42} sx={{ height: 8, borderRadius: 4 }} />
      <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
        {[
          { label: 'Cashback', value: '15%', color: neonGreen },
          { label: 'Reload', value: '10%', color: neonBlue },
          { label: 'Weekly', value: '0.05 BTC', color: neonGold },
        ].map(b => (
          <Box key={b.label}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: b.color }}>{b.value}</Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{b.label}</Typography>
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
      <LiveWinsTicker />
      <VIPProgress />

      {/* Category tabs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
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
      <Box sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', mb: 2 }}>
          🎁 Active Promotions
        </Typography>
        <Grid container spacing={1.5}>
          {[
            {
              title: 'Welcome Bonus', desc: 'Get 300% up to 1 BTC on your first deposit',
              badge: '300%', color: neonGreen, bg: alpha(neonGreen, 0.08),
            },
            {
              title: 'Daily Cashback', desc: 'Up to 15% cashback on all losses, every day',
              badge: '15%', color: neonBlue, bg: alpha(neonBlue, 0.08),
            },
            {
              title: 'Weekly Reload', desc: '50% reload bonus every Monday, max 0.5 BTC',
              badge: '50%', color: neonGold, bg: alpha(neonGold, 0.08),
            },
          ].map((promo) => (
            <Grid key={promo.title} size={{ xs: 12, sm: 4 }}>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Box
                  sx={{
                    p: 2.5, borderRadius: 3, cursor: 'pointer',
                    background: promo.bg,
                    border: `1px solid ${alpha(promo.color, 0.25)}`,
                    position: 'relative', overflow: 'hidden',
                    transition: 'all 0.2s',
                    '&:hover': { border: `1px solid ${alpha(promo.color, 0.5)}` },
                  }}
                >
                  <Chip
                    label={promo.badge}
                    sx={{
                      position: 'absolute', top: 12, right: 12,
                      background: `linear-gradient(135deg, ${promo.color}, ${alpha(promo.color, 0.6)})`,
                      color: '#000', fontWeight: 900, fontSize: '0.85rem',
                      height: 32, '& .MuiChip-label': { px: 1.5 },
                    }}
                  />
                  <Typography sx={{ fontWeight: 800, mb: 0.5, pr: 6 }}>{promo.title}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{promo.desc}</Typography>
                  <Button
                    size="small"
                    sx={{
                      mt: 1.5, color: promo.color, border: `1px solid ${alpha(promo.color, 0.4)}`,
                      fontSize: '0.72rem', fontWeight: 700, borderRadius: 1.5,
                      '&:hover': { background: alpha(promo.color, 0.1) },
                    }}
                  >
                    Claim Now →
                  </Button>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
