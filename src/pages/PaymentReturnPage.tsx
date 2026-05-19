import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, Button, Chip, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { neonGreen, neonGold, darkBorder, darkCard } from '../theme';
import { useWallet } from '../contexts/WalletContext';
import { formatMoney } from '../utils/currency';

/**
 * Landing page for Flutterwave's `redirect_url` callback after a deposit.
 * Flutterwave appends `?status=successful|failed|cancelled&tx_ref=…&transaction_id=…`
 *
 * We:
 *  1. Show a status chip immediately based on the `status` query param.
 *  2. Poll the wallet snapshot every 4s for up to 90s — once the balance
 *     bumps up we flip to "Deposit confirmed" with the actual amount.
 *  3. Fall back to "Still processing" if the webhook is slow (it lands
 *     server-side; the user can keep playing while we wait).
 */
export default function PaymentReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const wallet = useWallet();

  const status   = (params.get('status') ?? '').toLowerCase();
  const txRef    = params.get('tx_ref') ?? params.get('txref') ?? '';
  const flwTxId  = params.get('transaction_id') ?? params.get('flwTxId') ?? '';

  const initialBalanceRef = useRef<number | null>(null);
  const [confirmed, setConfirmed] = useState<{ delta: number } | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Snapshot the wallet balance once on mount so we can detect deltas.
  useEffect(() => {
    if (initialBalanceRef.current === null) initialBalanceRef.current = wallet.balance;
  }, [wallet.balance]);

  // Poll every 4s for ~90s. We refresh the wallet snapshot to pick up the
  // webhook-driven credit. We don't fight with the live socket — it'll
  // sometimes update faster, sometimes the polling beats it.
  useEffect(() => {
    if (confirmed) return;
    if (status === 'failed' || status === 'cancelled') return;
    let cancelled = false;
    let ticks = 0;
    const TICKS_MAX = 22;   // ~90s @ 4s
    const id = window.setInterval(async () => {
      if (cancelled) return;
      ticks++;
      try { await wallet.refresh(); } catch { /* keep polling */ }
      const base = initialBalanceRef.current ?? 0;
      const delta = wallet.balance - base;
      if (delta > 0.001) {
        setConfirmed({ delta });
        window.clearInterval(id);
        return;
      }
      if (ticks >= TICKS_MAX) {
        setTimedOut(true);
        window.clearInterval(id);
      }
    }, 4000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [confirmed, status, wallet]);

  // Pick the right state to render.
  const display = useMemo(() => {
    if (status === 'failed' || status === 'cancelled') {
      return {
        tone: '#ff6b7a',
        icon: <ErrorOutlineIcon sx={{ fontSize: 56 }} />,
        title: status === 'cancelled' ? 'Payment cancelled' : 'Payment failed',
        sub: 'Your card or bank declined the transaction. No funds were moved.',
        primaryLabel: 'Try again',
        primaryAction: () => navigate('/profile'),
      };
    }
    if (confirmed) {
      return {
        tone: neonGreen,
        icon: <CheckCircleIcon sx={{ fontSize: 56 }} />,
        title: 'Deposit confirmed',
        sub: `Your balance is up by ${formatMoney(confirmed.delta, wallet.currency)}.`,
        primaryLabel: 'Start playing',
        primaryAction: () => navigate('/'),
      };
    }
    if (timedOut) {
      return {
        tone: neonGold,
        icon: <HourglassEmptyIcon sx={{ fontSize: 56 }} />,
        title: 'Still processing',
        sub: 'Flutterwave is finalising the transfer. It usually shows up in a couple of minutes — refresh your wallet later if you don\'t see it yet.',
        primaryLabel: 'Back to casino',
        primaryAction: () => navigate('/'),
      };
    }
    // Default: in-flight
    return {
      tone: neonGold,
      icon: <CircularProgress size={48} sx={{ color: neonGold }} />,
      title: 'Confirming your deposit…',
      sub: 'Talking to Flutterwave. This usually takes 5–30 seconds.',
      primaryLabel: 'Back to casino',
      primaryAction: () => navigate('/'),
    };
  }, [status, confirmed, timedOut, wallet.currency, navigate]);

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: { xs: 2, md: 4 },
    }}>
      <Box sx={{
        maxWidth: 480, width: '100%',
        p: { xs: 3, md: 4 }, borderRadius: 3,
        background: darkCard, border: `1px solid ${darkBorder}`,
        textAlign: 'center',
      }}>
        <Box sx={{ color: display.tone, mb: 1.5 }}>{display.icon}</Box>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>{display.title}</Typography>
        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 3 }}>
          {display.sub}
        </Typography>

        {/* Reference chips for support follow-up. Only shown when we actually
            have refs — Flutterwave's failed/cancelled redirects sometimes
            omit them. */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'center', mb: 3 }}>
          {txRef && (
            <Chip
              size="small"
              label={`Ref ${txRef}`}
              sx={{ fontFamily: 'monospace', fontSize: '0.68rem', background: alpha('#fff', 0.04) }}
            />
          )}
          {flwTxId && (
            <Chip
              size="small"
              label={`FLW ${flwTxId}`}
              sx={{ fontFamily: 'monospace', fontSize: '0.68rem', background: alpha('#fff', 0.04) }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={display.primaryAction}
            sx={{
              background: `linear-gradient(135deg, ${display.tone}, ${alpha(display.tone, 0.7)})`,
              color: '#000', fontWeight: 800, px: 3,
            }}
          >
            {display.primaryLabel}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/bet-history')}>
            View history
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
