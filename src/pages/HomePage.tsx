import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, Grid, Chip, Tabs, Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BoltIcon from '@mui/icons-material/Bolt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import GameCard from '../components/casino/GameCard';
import type { GameCardData } from '../components/casino/GameCard';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';

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

interface TickerWin {
  user: string;
  game: string;
  mult: string;
  amount: string;
  color: string;
}

// Fallback roster used when the activity feed is empty (cold start / offline).
const FALLBACK_WINS: TickerWin[] = [
  { user: 'sa****9', game: 'Crash', mult: '24.5×', amount: '+$120', color: '#ff4757' },
  { user: 'ne****f', game: 'Dice', mult: '99×',  amount: '+$50',  color: neonBlue },
  { user: 'cr****g', game: 'Plinko', mult: '16×', amount: '+$80', color: '#a855f7' },
  { user: 'di****s', game: 'Slots', mult: '150×', amount: '+$220', color: neonGold },
  { user: 'lu****n', game: 'Roulette', mult: '35×', amount: '+$60', color: neonGreen },
];

const GAME_COLOR: Record<string, string> = {
  Crash: '#ff4757', Dice: neonBlue, Plinko: '#a855f7', Slots: neonGold, Roulette: neonGreen,
  Blackjack: neonBlue, Baccarat: '#ec4899', Mines: '#22c55e',
};

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
  const { isAuthenticated, openAuthPrompt } = useAuth();
  const [idx, setIdx] = useState(0);
  const [feed, setFeed] = useState<TickerWin[]>(FALLBACK_WINS);
  const [hovering, setHovering] = useState(false);

  // Fetch the real feed and merge with generated padding so the ticker
  // always has at least a dozen entries to cycle through.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Lazy import to avoid pulling activityApi into all HomePage callers.
        const { activityApi } = await import('../api/activity');
        const r = await activityApi.recent(15);
        if (cancelled) return;
        const real: TickerWin[] = r.entries.map(e => {
          const profit = e.payout - e.stake;
          const color = GAME_COLOR[e.gameName] ?? neonGreen;
          const amountStr = profit >= 0
            ? `+${profit.toFixed(2)} ${e.currency}`
            : `${profit.toFixed(2)} ${e.currency}`;
          return {
            user: e.maskedUser,
            game: e.gameName,
            mult: e.multiplier ? `${e.multiplier.toFixed(2)}×` : '—',
            amount: amountStr,
            color,
          };
        });
        // Mix real + fallback so it never feels empty.
        setFeed([...real, ...FALLBACK_WINS]);
      } catch { /* keep fallback */ }
    }
    void load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % feed.length), 2500);
    return () => clearInterval(t);
  }, [feed.length]);

  const win = feed[idx % feed.length];

  const showCta = !isAuthenticated && hovering;
  return (
    <Box
      onMouseEnter={() => !isAuthenticated && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => { if (!isAuthenticated) openAuthPrompt(); }}
      role={!isAuthenticated ? 'button' : undefined}
      tabIndex={!isAuthenticated ? 0 : undefined}
      onKeyDown={(e) => { if (!isAuthenticated && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openAuthPrompt(); } }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
        background: showCta
          ? `linear-gradient(90deg, ${alpha(neonGold, 0.1)}, ${alpha(neonGreen, 0.18)})`
          : alpha(darkCard, 0.8),
        borderRadius: 2,
        border: `1px solid ${showCta ? alpha(neonGreen, 0.4) : darkBorder}`,
        overflow: 'hidden', mb: 3,
        cursor: !isAuthenticated ? 'pointer' : 'default',
        transition: 'background 0.18s, border-color 0.18s',
      }}
    >
      <EmojiEventsIcon sx={{ fontSize: 18, color: neonGold, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', flexShrink: 0 }}>
        LIVE WINS
      </Typography>
      <Box sx={{ width: 1, height: 16, background: darkBorder, flexShrink: 0 }} />
      {showCta ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
            Sign in to claim a win like this
          </Typography>
          <Chip
            label="Start playing →"
            size="small"
            sx={{
              height: 22, fontSize: '0.7rem', fontWeight: 900,
              background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
              color: '#000',
            }}
          />
        </Box>
      ) : (
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
      )}
    </Box>
  );
}

/**
 * Auto-scrolling slider that surfaces "look — people are winning here!"
 * social proof. Reads recent activity (real + generated padding from the
 * server's /api/activity/recent feed; falls back to a local roster) and
 * cycles through 3 cards at a time on desktop, 1.5 on mobile.
 *
 * Replaces the old VIP-level progress block on the homepage.
 */
function WinningsSlider() {
  const wallet = useWallet();
  // Lazy import — saves the activity API from being pulled into every
  // HomePage caller during dev hot-reload.
  const [items, setItems] = useState<{
    user: string; game: string; mult: string; amount: string; color: string;
  }[]>(() => seedSliderItems(wallet.currency));
  const [offset, setOffset] = useState(0);

  // Try to pull real wins; fall back to the seeded roster.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { activityApi } = await import('../api/activity');
        const r = await activityApi.recent(20);
        if (cancelled) return;
        const { formatMoney } = await import('../utils/currency');
        const real = r.entries.map(e => {
          const profit = e.payout - e.stake;
          const color = profit > 100 ? neonGold : profit > 10 ? neonGreen : neonBlue;
          let amount: string;
          try { amount = formatMoney(profit, e.currency as never); }
          catch { amount = `${profit.toFixed(2)} ${e.currency}`; }
          return {
            user: e.maskedUser,
            game: e.gameName,
            mult: e.multiplier ? `${e.multiplier.toFixed(2)}×` : '—',
            amount: `+${amount}`,
            color,
          };
        });
        setItems(real.length > 0 ? [...real, ...seedSliderItems(wallet.currency)] : seedSliderItems(wallet.currency));
      } catch { /* keep seed */ }
    }
    void load();
    const t = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [wallet.currency]);

  // Auto-advance every 3.5s.
  useEffect(() => {
    const t = window.setInterval(() => setOffset(o => (o + 1) % items.length), 3500);
    return () => window.clearInterval(t);
  }, [items.length]);

  // Take 6 items starting from `offset`, wrapping for a continuous loop.
  const visible = useMemo(() => {
    const out: typeof items = [];
    for (let i = 0; i < 6; i++) out.push(items[(offset + i) % items.length]);
    return out;
  }, [items, offset]);

  return (
    <Box sx={{
      p: 2, mb: 3, borderRadius: 3,
      background: `linear-gradient(135deg, ${alpha(neonGold, 0.06)}, ${alpha(neonGreen, 0.04)})`,
      border: `1px solid ${alpha(neonGold, 0.18)}`,
      overflow: 'hidden',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <LocalFireDepartmentIcon sx={{ fontSize: 18, color: '#ff4757' }} />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.08em' }}>LATEST WINNERS</Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{
          width: 7, height: 7, borderRadius: '50%', background: neonGreen,
          animation: 'pulse 1.5s ease-in-out infinite',
          '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        }} />
        <Typography sx={{ fontSize: '0.7rem', color: neonGreen }}>Live</Typography>
      </Box>

      {/* Horizontal scrollable strip — three cards visible on desktop, scrolls smoothly. */}
      <Box
        sx={{
          display: 'flex', gap: 1.25, overflow: 'hidden',
          // Hide the scrollbar; we drive movement via state, not user input.
          maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map((w, i) => (
            <motion.div
              key={`${offset}-${i}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ flexShrink: 0 }}
            >
              <Box sx={{
                width: { xs: 200, sm: 230 },
                p: 1.25, borderRadius: 2,
                background: alpha('#fff', 0.04),
                border: `1px solid ${alpha(w.color, 0.3)}`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${w.color}, ${alpha(w.color, 0.5)})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 900, color: '#000',
                    flexShrink: 0,
                  }}>
                    {w.user.slice(0, 2).toUpperCase()}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.user}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.game}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Chip
                    size="small"
                    label={w.mult}
                    sx={{
                      height: 18, fontSize: '0.65rem', fontWeight: 800,
                      background: alpha(neonBlue, 0.15), color: neonBlue,
                      '& .MuiChip-label': { px: 0.6 },
                    }}
                  />
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 900, color: w.color, fontVariantNumeric: 'tabular-nums' }}>
                    {w.amount}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

/**
 * Generates a roster of plausible-looking winners scaled to the user's
 * currency. Mirrors the style of the live-wins ticker so the homepage
 * doesn't look empty in regions with low real-traffic.
 */
function seedSliderItems(currency: string): { user: string; game: string; mult: string; amount: string; color: string }[] {
  const games = ['Crash', 'Dice', 'Plinko', 'Slots', 'Mines', 'Roulette', 'Virtual Soccer', 'Virtual Basketball'];
  const users = ['sa****a', 'kw****e', 'le****k', 'mi****l', 'ad****o', 'th****o', 'ni****a', 'ay****a',
                 'ke****a', 'fr****e', 'pa****o', 'el****a', 'ra****l', 'no****n', 'jo****a', 'fa****a'];
  const colors = [neonGreen, neonGold, neonBlue, '#ff4757', '#a855f7', '#ff9f43'];
  // Scaled base amount per currency so the figures look right (NGN reads
  // ~₦12,000, USD reads ~$8 — both feel plausible without doing real FX).
  const base = currency === 'NGN' ? 6000
             : currency === 'KES' ? 400
             : currency === 'ZAR' ? 80
             : currency === 'GHS' ? 30
             : currency === 'GBP' ? 4
             : currency === 'EUR' ? 5
             : 6;
  return users.map((u, i) => {
    const mult = 1.5 + ((i * 7) % 50) * 0.4;
    const amount = base * (1 + ((i * 11) % 35));
    return {
      user: u,
      game: games[i % games.length],
      mult: `${mult.toFixed(2)}×`,
      amount: `+${amount.toFixed(currency === 'NGN' || currency === 'KES' ? 0 : 2)} ${currency}`,
      color: colors[i % colors.length],
    };
  });
}

export default function HomePage() {
  const [category, setCategory] = useState(0);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, pb: { xs: 10, md: 2.5 } }}>
      <HeroBanner />
      <LiveWinsTicker />
      <WinningsSlider />

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
