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
import { paymentsApi, type DepositConfirmResult } from '../api/payments';

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

  // Flutterwave uses a few different status strings depending on the flow:
  //   • 'completed' / 'successful' / 'success' — charge captured
  //   • 'cancelled' — user backed out of the checkout
  //   • 'failed' — card declined / 3DS failed
  // Normalise to one of three buckets so the UI stays simple.
  const rawStatus = (params.get('status') ?? '').toLowerCase();
  const status: 'success' | 'failed' | 'cancelled' | '' =
    ['completed', 'successful', 'success'].includes(rawStatus) ? 'success'
    : rawStatus === 'cancelled' ? 'cancelled'
    : rawStatus === 'failed'    ? 'failed'
    : '';
  const txRef   = params.get('tx_ref') ?? params.get('txref') ?? '';
  const flwTxId = params.get('transaction_id') ?? params.get('flwTxId') ?? '';

  const initialBalanceRef = useRef<number | null>(null);
  const [confirmed, setConfirmed] = useState<{ delta: number } | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmAttempts, setConfirmAttempts] = useState(0);

  // Stable ref to wallet.refresh so the polling effect doesn't tear down
  // every time the wallet context object changes (which it does on every
  // balance/socket update — *exactly* the thing we're waiting for).
  const refreshRef = useRef(wallet.refresh);
  useEffect(() => { refreshRef.current = wallet.refresh; }, [wallet.refresh]);

  // Snapshot the wallet balance once on mount so we can detect deltas. We
  // only seed it; later balance changes are read directly from `wallet.balance`
  // in the detection effect below.
  useEffect(() => {
    if (initialBalanceRef.current === null) initialBalanceRef.current = wallet.balance;
  }, [wallet.balance]);

  // Detect the deposit credit. Runs on every wallet.balance change — the
  // socket-driven update (or the polling refresh) flips us to "confirmed".
  // Splitting detection from polling avoids the previous bug where the
  // polling effect's deps included the whole `wallet` object, tearing the
  // interval down on every state update and never accumulating ticks.
  useEffect(() => {
    if (confirmed) return;
    if (status === 'failed' || status === 'cancelled') return;
    const base = initialBalanceRef.current;
    if (base === null) return;
    const delta = wallet.balance - base;
    if (delta > 0.001) setConfirmed({ delta });
  }, [confirmed, status, wallet.balance]);

  // Poll every 4s for ~90s — just nudges the backend to re-pull the wallet
  // snapshot in case the webhook lags or the socket dropped. The detection
  // effect above does the actual flip-to-confirmed work.
  useEffect(() => {
    if (confirmed) return;
    if (status === 'failed' || status === 'cancelled') return;
    let ticks = 0;
    const TICKS_MAX = 22;   // ~90s @ 4s
    const id = window.setInterval(() => {
      ticks++;
      void refreshRef.current().catch(() => { /* keep polling */ });
      if (ticks >= TICKS_MAX) {
        setTimedOut(true);
        window.clearInterval(id);
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [confirmed, status]);

  // Client-driven confirmation — DOES NOT rely on the webhook.
  //
  // Flutterwave's webhook is best-effort: sometimes it fails (signature
  // mismatch, server downtime, dashboard URL not updated, etc.) and the
  // deposit just stays pending forever. So on landing we tell our backend
  // directly: "here's the tx_ref + transaction_id from the URL — please
  // verify and credit me." The endpoint re-verifies against Flutterwave so
  // it's safe even if the URL params are tampered with.
  //
  // We retry up to 3 times with 6s backoff in case Flutterwave's verify API
  // is briefly lagging behind their checkout (it sometimes takes a few
  // seconds after capture for verify to return `successful`).
  useEffect(() => {
    if (confirmed) return;
    if (status !== 'success') return;
    if (!txRef && !flwTxId) return;
    let cancelled = false;
    const MAX_ATTEMPTS = 3;
    async function attempt(n: number) {
      if (cancelled) return;
      try {
        const result: DepositConfirmResult = await paymentsApi.confirmDeposit({
          txRef:   txRef || undefined,
          flwTxId: flwTxId || undefined,
        });
        if (cancelled) return;
        if (result.ok && (result.status === 'credited' || result.status === 'already_credited')) {
          // Fire a wallet refresh so the balance update lands fast. The
          // detection effect will catch the new balance and flip to
          // "confirmed" with the actual delta.
          void refreshRef.current().catch(() => { /* ignored */ });
          return;
        }
        if (!result.ok && result.status === 'not_successful' && n < MAX_ATTEMPTS) {
          // Verify lag: try again shortly.
          window.setTimeout(() => void attempt(n + 1), 6000);
          return;
        }
        if (!result.ok) {
          // Friendly per-status messages. The error is informational —
          // we still rely on the polling/socket path as a backup.
          setConfirmError(
            result.status === 'not_successful' ? `Flutterwave reports status: ${('flwStatus' in result ? result.flwStatus : undefined) ?? 'unknown'}`
            : result.status === 'not_found' ? 'Reference not found — contact support.'
            : result.status === 'verify_failed' ? `Could not verify with Flutterwave: ${('message' in result ? result.message : undefined) ?? 'unknown'}`
            : result.status === 'currency_mismatch' ? 'Currency mismatch — contact support.'
            : result.status === 'amount_mismatch' ? 'Amount mismatch — contact support.'
            : result.status,
          );
        }
      } catch (err) {
        if (cancelled) return;
        if (n < MAX_ATTEMPTS) {
          window.setTimeout(() => void attempt(n + 1), 6000);
          return;
        }
        setConfirmError((err as Error).message ?? 'Network error');
      } finally {
        if (!cancelled) setConfirmAttempts(c => c + 1);
      }
    }
    void attempt(1);
    return () => { cancelled = true; };
  }, [status, txRef, flwTxId, confirmed]);

  // Pick the right state to render.
  const display = useMemo<{
    tone: string;
    icon: React.ReactNode;
    title: string;
    sub: string;
    primaryLabel: string;
    primaryAction: () => void;
  }>(() => {
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
        sub: confirmError
          ? `${confirmError} — please contact support with the reference below if your balance doesn\'t update soon.`
          : 'Flutterwave is finalising the transfer. It usually shows up in a couple of minutes — refresh your wallet later if you don\'t see it yet.',
        primaryLabel: 'Back to Games',
        primaryAction: () => navigate('/'),
      };
    }
    // Default: in-flight
    return {
      tone: neonGold,
      icon: <CircularProgress size={48} sx={{ color: neonGold }} />,
      title: 'Confirming your deposit…',
      sub: confirmAttempts === 0
        ? 'Talking to Flutterwave. This usually takes 5–30 seconds.'
        : 'Verifying — sometimes takes a few seconds after the card is captured.',
      primaryLabel: 'Back to casino',
      primaryAction: () => navigate('/'),
    };
  }, [status, confirmed, timedOut, wallet.currency, navigate, confirmError, confirmAttempts]);

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
