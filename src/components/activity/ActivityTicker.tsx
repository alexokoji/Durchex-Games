import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { activityApi, type ActivityEntry } from '../../api/activity';
import { formatMoney, type FiatCurrency } from '../../utils/currency';
import { useAuth } from '../../contexts/AuthContext';

const GENERATED_NAMES = [
  'jo*****a', 'kw*****e', 'sa*****o', 'em****a', 'lu****s', 'ad*****o',
  'ch*****d', 'mi****l', 'ni*****a', 'th****o', 'pa****o', 'fa*****a',
  'le*****k', 'ki****a', 'da*****a', 'ay*****a', 'tu*****u', 'ke****a',
  'fr****e', 'ra****l', 'no****n', 'el****a', 'ar****n', 'fe****o',
];
const GENERATED_GAMES = [
  'Crash', 'Dice', 'Plinko', 'Mines', 'Blackjack',
  'Baccarat', 'Roulette', 'Slots', 'Virtual Soccer',
  'Virtual Basketball', 'Virtual Hockey', 'Horse Race',
];
const GENERATED_CCY: FiatCurrency[] = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR'];

interface DisplayEntry {
  key: string;
  user: string;
  game: string;
  amount: number;       // in `currency`
  multiplier?: number;
  currency: string;
  ageMs: number;
  isReal: boolean;
}

function asDisplay(e: ActivityEntry): DisplayEntry {
  return {
    key: `r-${e.settledAt}-${e.maskedUser}`,
    user: e.maskedUser,
    game: e.gameName,
    amount: e.payout - e.stake,    // show profit, not gross payout
    multiplier: e.multiplier,
    currency: e.currency,
    ageMs: Date.now() - new Date(e.settledAt).getTime(),
    isReal: true,
  };
}

function generateOne(seed: number): DisplayEntry {
  // Deterministic-ish entry from a seed so the list animates predictably.
  const r = (n: number) => Math.floor(((seed * 9301 + 49297 + n * 3) % 233280) / 233280 * 1000) / 1000;
  const user = GENERATED_NAMES[Math.floor(r(1) * GENERATED_NAMES.length)];
  const game = GENERATED_GAMES[Math.floor(r(2) * GENERATED_GAMES.length)];
  const ccy  = GENERATED_CCY[Math.floor(r(3) * GENERATED_CCY.length)];
  // Long-tail amount distribution — most wins are small, occasional whales.
  const tail = r(4);
  const base = ccy === 'NGN' ? 5000 : ccy === 'KES' ? 800 : ccy === 'ZAR' ? 200 : 8;
  const amount = base * (tail < 0.7 ? (1 + tail * 4) : tail < 0.95 ? (5 + tail * 30) : (30 + tail * 200));
  const multiplier = 1.2 + r(5) * 18;
  return {
    key: `g-${seed}`,
    user,
    game,
    amount: Math.round(amount * 100) / 100,
    multiplier,
    currency: ccy,
    ageMs: Math.floor(r(6) * 90 * 60 * 1000),    // 0–90 min ago
    isReal: false,
  };
}

function timeAgo(ms: number): string {
  if (ms < 30_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}

export default function ActivityTicker({ maxItems = 20 }: { maxItems?: number }) {
  const { isAuthenticated, openAuthPrompt } = useAuth();
  const [real, setReal] = useState<DisplayEntry[]>([]);
  const [, setTick] = useState(0);
  // Single-row "claim" hover state. -1 = nothing hovered. Used so we render
  // the CTA only on the active row (cheaper than per-row :hover styles).
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  // Fetch real entries every 60s (cheap public endpoint).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await activityApi.recent(15);
        if (!cancelled) setReal(r.entries.map(asDisplay));
      } catch { /* offline / 500 — fall back to all generated */ }
    }
    void load();
    const t = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, []);

  // Re-tick every 5s so generated entries' "ageMs" stays fresh and the
  // displayed pool rotates slowly even when the real feed is quiet.
  useEffect(() => {
    const t = window.setInterval(() => setTick(x => x + 1), 5_000);
    return () => window.clearInterval(t);
  }, []);

  const display = useMemo<DisplayEntry[]>(() => {
    const generatedSeedBase = Math.floor(Date.now() / 60_000); // changes once a minute
    const generated: DisplayEntry[] = [];
    const need = Math.max(0, maxItems - real.length);
    for (let i = 0; i < need + 5; i++) generated.push(generateOne(generatedSeedBase + i));
    // Interleave so the list doesn't look segregated: take alternating items.
    const out: DisplayEntry[] = [];
    let ri = 0, gi = 0;
    while (out.length < maxItems && (ri < real.length || gi < generated.length)) {
      if (out.length % 3 === 0 && ri < real.length) out.push(real[ri++]);
      else if (gi < generated.length) out.push(generated[gi++]);
      else if (ri < real.length) out.push(real[ri++]);
    }
    return out;
  }, [real, maxItems]);

  return (
    <Box sx={{
      p: 1.5, borderRadius: 2,
      background: darkCard, border: `1px solid ${darkBorder}`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <TrendingUpIcon sx={{ fontSize: 18, color: neonGreen }} />
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>Live wins</Typography>
        <Box sx={{
          ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5,
          fontSize: '0.7rem', color: neonGreen,
        }}>
          <Box sx={{
            width: 7, height: 7, borderRadius: '50%', background: neonGreen,
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
          }} />
          Live
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, maxHeight: 320, overflowY: 'auto' }}>
        {display.map(e => {
          const amountStr = (() => {
            try { return formatMoney(e.amount, e.currency as FiatCurrency); }
            catch { return `${e.amount.toFixed(2)} ${e.currency}`; }
          })();
          const isFiat = !['BTC', 'USDT', 'USDC'].includes(e.currency);
          const showCta = !isAuthenticated && hoverKey === e.key;
          return (
            <Box
              key={e.key}
              onMouseEnter={() => !isAuthenticated && setHoverKey(e.key)}
              onMouseLeave={() => hoverKey === e.key && setHoverKey(null)}
              onClick={() => { if (!isAuthenticated) openAuthPrompt(); }}
              sx={{
                position: 'relative',
                px: 1, py: 0.75, borderRadius: 1.2,
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 1, alignItems: 'center',
                fontSize: '0.78rem',
                background: e.isReal ? alpha(neonGreen, 0.04) : 'transparent',
                cursor: !isAuthenticated ? 'pointer' : 'default',
                transition: 'background 0.15s',
                '&:hover': !isAuthenticated ? {
                  background: alpha(neonGreen, 0.12),
                } : undefined,
              }}>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.user}
                  </Typography>
                  {e.isReal && (
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', background: neonGreen, flexShrink: 0 }} />
                  )}
                </Box>
                <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.game} · {timeAgo(e.ageMs)} ago
                </Typography>
              </Box>
              {e.multiplier && e.multiplier > 1 && (
                <Chip
                  size="small"
                  label={`×${e.multiplier.toFixed(2)}`}
                  sx={{
                    height: 18, fontSize: '0.65rem', fontWeight: 800,
                    background: alpha(neonBlue, 0.15), color: neonBlue,
                    '& .MuiChip-label': { px: 0.6 },
                    visibility: showCta ? 'hidden' : 'visible',
                  }}
                />
              )}
              <Typography sx={{
                fontSize: '0.82rem', fontWeight: 900,
                color: neonGold, fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
                visibility: showCta ? 'hidden' : 'visible',
              }}>
                +{isFiat ? amountStr : `${e.amount.toFixed(4)} ${e.currency}`}
              </Typography>

              {/* Hover CTA — absolutely positioned over the right side of the
                  row so we don't reflow on hover. Only renders for the
                  active row and only for guests. */}
              {showCta && (
                <Box sx={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  pr: 1,
                  background: `linear-gradient(90deg, transparent, ${alpha(darkCard, 0.85)} 30%)`,
                  borderRadius: 1.2,
                  pointerEvents: 'none', // clicks pass through to the row
                }}>
                  <Button
                    size="small"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      py: 0.25, px: 1,
                      minHeight: 0,
                      fontSize: '0.7rem', fontWeight: 800,
                      background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                      color: '#000',
                      pointerEvents: 'auto',
                      '&:hover': { background: `linear-gradient(135deg, ${neonGreen}, #00b366)` },
                    }}
                  >
                    Sign in to claim a win like this
                  </Button>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Footer CTA on mobile / no-hover devices — desktop hover handles the
          per-row case, but on touch screens the user can't hover. */}
      {!isAuthenticated && (
        <Box sx={{
          mt: 1, pt: 1, borderTop: `1px solid ${darkBorder}`,
          display: { xs: 'block', md: 'none' },
        }}>
          <Button
            fullWidth
            size="small"
            onClick={openAuthPrompt}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontWeight: 800, fontSize: '0.78rem',
              background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
              color: '#000',
            }}
          >
            Sign in to start winning
          </Button>
        </Box>
      )}
    </Box>
  );
}
