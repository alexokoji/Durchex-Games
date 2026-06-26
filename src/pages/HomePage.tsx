import { useState } from 'react';
import {
  Box, Typography, Button, Grid, Chip, Tabs, Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BoltIcon from '@mui/icons-material/Bolt';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
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
  {
    id: 'hilo', title: 'Hi-Lo', provider: 'Nexus Originals', rtp: '98.50%', players: 1456,
    badge: 'NEW', badgeColor: '#a855f7', path: '/hilo',
    gradient: 'linear-gradient(135deg, #1a0520 0%, #2d0a4d 50%, #aa00ff22 100%)',
    image: '/assets/Games Images/Hi-Lo.png',
  },
  {
    id: 'coinflip', title: 'Coin Flip', provider: 'Nexus Originals', rtp: '98.50%', players: 2341,
    badge: 'NEW', badgeColor: '#a855f7', path: '/coinflip',
    gradient: 'linear-gradient(135deg, #05051a 0%, #0a0a2e 50%, #ffff0022 100%)',
    image: '/assets/Games Images/Coin Flip.png',
  },
  {
    id: 'limbo', title: 'Limbo', provider: 'Nexus Originals', rtp: '98.50%', players: 1823,
    badge: 'NEW', badgeColor: '#a855f7', path: '/limbo',
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d0a5c 50%, #ff00ff22 100%)',
    image: '/assets/Games Images/Limbo.png',
  },
  {
    id: 'colorprediction', title: 'Color Prediction', provider: 'Nexus Originals', rtp: '98.50%', players: 2156,
    badge: 'NEW', badgeColor: '#a855f7', path: '/colorprediction',
    gradient: 'linear-gradient(135deg, #0a1a2e 0%, #1a0a2e 50%, #ff00ff22 100%)',
    image: '/assets/Games Images/Color Prediction.png',
  },
  {
    id: 'diceduel', title: 'Dice Duel', provider: 'Nexus Originals', rtp: '98.50%', players: 1567,
    badge: 'NEW', badgeColor: '#a855f7', path: '/diceduel',
    gradient: 'linear-gradient(135deg, #2e0a0a 0%, #1a0a2e 50%, #00ffff22 100%)',
    image: '/assets/Games Images/Dice Duel.png',
  },
  {
    id: 'keno', title: 'Keno', provider: 'Nexus Originals', rtp: '98.50%', players: 1234,
    badge: 'NEW', badgeColor: '#a855f7', path: '/keno',
    gradient: 'linear-gradient(135deg, #1a2e0a 0%, #0a2e1a 50%, #00ff6622 100%)',
    image: '/assets/Games Images/Keno.png',
  },
  {
    id: 'treasurehunt', title: 'Treasure Hunt', provider: 'Nexus Originals', rtp: '98.50%', players: 1891,
    badge: 'NEW', badgeColor: '#a855f7', path: '/treasurehunt',
    gradient: 'linear-gradient(135deg, #2e1a0a 0%, #2e2a0a 50%, #ffaa0022 100%)',
    image: '/assets/Games Images/Treasure Hunt.png',
  },
  { id: 'dragontower', title: 'Dragon Tower', provider: 'Nexus Originals', rtp: '98.50%', players: 2012, badge: 'NEW', badgeColor: '#a855f7', path: '/dragontower', gradient: 'linear-gradient(135deg, #2e0a1a 0%, #3d0a2e 50%, #ff00ff22 100%)', image: '/assets/Games Images/Dragon Tower.png' },
  { id: 'rocketescape', title: 'Rocket Escape', provider: 'Nexus Originals', rtp: '98.50%', players: 1734, badge: 'NEW', badgeColor: '#a855f7', path: '/rocketescape', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #0a1a3d 50%, #00ffff22 100%)', image: '/assets/Games Images/Rocket Escape.png' },
  { id: 'luckycards', title: 'Lucky Cards', provider: 'Nexus Originals', rtp: '98.50%', players: 1456, badge: 'NEW', badgeColor: '#a855f7', path: '/luckycards', gradient: 'linear-gradient(135deg, #1a2e0a 0%, #0a3d1a 50%, #00ff0022 100%)', image: '/assets/Games Images/Lucky Cards.png' },
  { id: 'treasurechests', title: 'Treasure Chests', provider: 'Nexus Originals', rtp: '98.50%', players: 1678, badge: 'NEW', badgeColor: '#a855f7', path: '/treasurechests', gradient: 'linear-gradient(135deg, #2e1a0a 0%, #3d1a0a 50%, #ff660022 100%)', image: '/assets/Games Images/Treasure Chests.png' },
  { id: 'luckydoor', title: 'Lucky Door', provider: 'Nexus Originals', rtp: '98.50%', players: 1523, badge: 'NEW', badgeColor: '#a855f7', path: '/luckydoor', gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2e0a3d 50%, #aa00ff22 100%)', image: '/assets/Games Images/Lucky Door.png' },
  { id: 'bombsquad', title: 'Bomb Squad', provider: 'Nexus Originals', rtp: '98.50%', players: 1845, badge: 'NEW', badgeColor: '#a855f7', path: '/bombsquad', gradient: 'linear-gradient(135deg, #2e0a0a 0%, #3d0a1a 50%, #ff330022 100%)', image: '/assets/Games Images/Bomb Squad.png' },
  { id: 'luckywheel', title: 'Lucky Wheel Plus', provider: 'Nexus Originals', rtp: '98.50%', players: 1967, badge: 'NEW', badgeColor: '#a855f7', path: '/luckywheel', gradient: 'linear-gradient(135deg, #1a1a0a 0%, #2e2a0a 50%, #ffff0022 100%)', image: '/assets/Games Images/Lucky Wheel Plus.png' },
  { id: 'numberduel', title: 'Number Duel', provider: 'Nexus Originals', rtp: '98.50%', players: 1612, badge: 'NEW', badgeColor: '#a855f7', path: '/numberduel', gradient: 'linear-gradient(135deg, #0a1a2e 0%, #0a2e3d 50%, #00ccff22 100%)', image: '/assets/Games Images/Number Duel.png' },
];

const CATEGORIES = ['All', 'Originals', 'Slots', 'Live', 'Table', 'Sports'] as const;

type CategoryLabel = (typeof CATEGORIES)[number];

function gameMatchesCategory(game: GameCardData, category: CategoryLabel) {
  if (category === 'All') return true;
  switch (category) {
    case 'Originals':
      return game.provider.includes('Nexus Originals');
    case 'Slots':
      return game.id === 'slots';
    case 'Live':
      return game.badge === 'LIVE';
    case 'Table':
      return ['blackjack', 'baccarat'].includes(game.id);
    case 'Sports':
      return game.path?.startsWith('/virtual/');
    default:
      return true;
  }
}

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
            The Future of<br />Crypto Gaming
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
        {GAMES.filter(game => gameMatchesCategory(game, CATEGORIES[category] as CategoryLabel)).map((game, i) => (
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

      {/* Download the App */}
      <DownloadAppSection />
    </Box>
  );
}

// ─── Download App Section ───────────────────────────────────────────────────

function StoreBadge({
  icon,
  line1,
  line2,
  color,
  href,
}: {
  icon: React.ReactNode;
  line1: string;
  line2: string;
  color: string;
  /** When provided, the badge is a live download link (no "Coming Soon"). */
  href?: string;
}) {
  const isLive = Boolean(href);
  return (
    <Box
      component={isLive ? 'a' : 'div'}
      {...(isLive ? { href, download: true } : {})}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        px: 2, py: 1.25, borderRadius: 2,
        background: alpha(color, isLive ? 0.12 : 0.08),
        border: `1px solid ${alpha(color, isLive ? 0.5 : 0.3)}`,
        minWidth: 160, position: 'relative',
        textDecoration: 'none',
        cursor: isLive ? 'pointer' : 'default',
        transition: 'all 0.18s',
        ...(isLive && {
          '&:hover': {
            background: alpha(color, 0.18),
            borderColor: alpha(color, 0.7),
            boxShadow: `0 0 18px ${alpha(color, 0.35)}`,
            transform: 'translateY(-1px)',
          },
        }),
      }}
    >
      <Box sx={{ color, fontSize: 28, display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.1 }}>{line1}</Typography>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>{line2}</Typography>
      </Box>
      {/* Coming Soon overlay — only for stores that aren't live yet */}
      {!isLive && (
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: 2,
          background: alpha('#0a0c10', 0.65),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)',
        }}>
          <Chip
            label="Coming Soon"
            size="small"
            sx={{
              fontSize: '0.6rem', fontWeight: 800,
              background: alpha(color, 0.2),
              color,
              border: `1px solid ${alpha(color, 0.45)}`,
            }}
          />
        </Box>
      )}
    </Box>
  );
}

/** Public URL of the hosted Android APK (served from project/public/downloads). */
const ANDROID_APK_URL = '/downloads/durchexigames.apk';

function DownloadAppSection() {
  return (
    <Box
      sx={{
        mt: 4, mb: 1,
        borderRadius: 3, overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a1628 0%, #111826 50%, #0d1520 100%)',
        border: `1px solid ${darkBorder}`,
        position: 'relative',
      }}
    >
      {/* Glow orbs */}
      <Box sx={{
        position: 'absolute', top: -80, right: 60, width: 280, height: 280,
        borderRadius: '50%', background: alpha(neonBlue, 0.07),
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: -60, left: 40, width: 200, height: 200,
        borderRadius: '50%', background: alpha(neonGreen, 0.06),
        filter: 'blur(50px)', pointerEvents: 'none',
      }} />

      <Box sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: { xs: 3, md: 4 },
        px: { xs: 3, md: 5 },
        py: { xs: 3.5, md: 4.5 },
      }}>
        {/* Phone icon decorative */}
        <Box sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center', justifyContent: 'center',
          width: 90, height: 90, borderRadius: '24px',
          background: `linear-gradient(135deg, ${alpha(neonBlue, 0.18)}, ${alpha(neonGreen, 0.12)})`,
          border: `1px solid ${alpha(neonBlue, 0.4)}`,
          flexShrink: 0,
          boxShadow: `0 0 32px ${alpha(neonBlue, 0.25)}`,
        }}>
          <PhoneIphoneIcon sx={{ fontSize: 48, color: neonBlue }} />
        </Box>

        {/* Text */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
            <PhoneIphoneIcon sx={{ fontSize: 18, color: neonBlue, display: { md: 'none' } }} />
            <Typography sx={{
              fontSize: '0.65rem', fontWeight: 800, color: neonBlue,
              letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              Mobile App
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.75, lineHeight: 1.2 }}>
            Download the App for Android
          </Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 460, lineHeight: 1.55 }}>
            All your favourite games and virtual sports in your pocket.
            Instant deposits, live bet history, push notifications for big wins —
            optimised for mobile with offline caching.
          </Typography>

          {/* Feature chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
            {['Provably Fair', 'Local Currency', 'Push Notifications', 'Dark Mode', 'Biometric Login'].map(f => (
              <Chip
                key={f}
                label={f}
                size="small"
                sx={{
                  fontSize: '0.62rem', fontWeight: 700, height: 22,
                  background: alpha(neonGreen, 0.08),
                  color: 'text.secondary',
                  border: `1px solid ${alpha(neonGreen, 0.2)}`,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Store badges */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'row', md: 'column' },
          gap: 1.5,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          <StoreBadge
            icon={
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C3.6818 10.8557 2.1905 13.1 2 15.8h20c-.1905-2.7-1.6818-4.9443-4.1185-6.4786" />
              </svg>
            }
            line1="Direct APK · Android"
            line2="Download Now"
            color={neonGreen}
            href={ANDROID_APK_URL}
          />
          <StoreBadge
            icon={
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
              </svg>
            }
            line1="Download on the"
            line2="App Store"
            color={neonBlue}
          />

          {/* Install hint */}
          <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', lineHeight: 1.4, maxWidth: 200, mt: 0.5 }}>
            Android only. After downloading, open the file and allow installs
            from your browser if prompted.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Promotions ──────────────────────────────────────────────────────────────

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
