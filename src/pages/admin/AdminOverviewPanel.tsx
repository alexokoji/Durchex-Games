import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PaymentsIcon from '@mui/icons-material/Payments';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type LedgerSummary } from '../../api/admin';
import { formatMoney, FIAT, usdApprox } from '../../utils/currency';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

function fmtNgnFromUsd(n: number, opts: { sign?: boolean } = {}): string {
  // Convert USD-denominated amount to NGN using static reference rate and format
  const ngn = Number.isFinite(n) ? n / FIAT.NGN.usdPerUnit : 0;
  return formatMoney(ngn, 'NGN', { compact: false, sign: !!opts.sign });
}

function fmtNgnWithUsdSuffix(n: number, opts: { sign?: boolean } = {}): string {
  const ngn = Number.isFinite(n) ? n / FIAT.NGN.usdPerUnit : 0;
  const formatted = formatMoney(ngn, 'NGN', { compact: false, sign: !!opts.sign });
  const approx = usdApprox(ngn, 'NGN');
  return approx ? `${formatted} ${approx}` : formatted;
}

export default function AdminOverviewPanel({ onJumpToPayouts }: { onJumpToPayouts?: () => void }) {
  const toasts = useToasts();
  const [data, setData] = useState<LedgerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function load() {
    setIsLoading(true); setError(null);
    try {
      setData(await adminApi.ledgerSummary());
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    } finally { setIsLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function sendDailySummary() {
    setSending(true);
    try {
      const r = await adminApi.runDailySummary(true);
      if (r.sent) toasts.success('Sent', 'Daily summary email dispatched.');
      else        toasts.info('Skipped', r.reason?.replace(/_/g, ' ') ?? 'no activity');
    } catch (err) {
      toasts.error('Failed', err instanceof ApiError ? err.code : 'unknown');
    } finally { setSending(false); }
  }

  if (isLoading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>;
  if (error || !data) return <Alert severity="error">Failed to load: {error ?? 'unknown'}</Alert>;

  const profit = data.today?.houseProfitUsd ?? 0;
  const profitColor = profit >= 0 ? neonGreen : '#ff6b7a';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>Dashboard</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            House P/L is shown in NGN-equivalent. Rates pull from the static FX table in `currencies.ts`.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={() => void load()}>Refresh</Button>
          <Button
            variant="outlined" size="small"
            startIcon={<MailOutlineIcon />}
            onClick={sendDailySummary}
            disabled={sending}
            sx={{ borderColor: alpha(neonBlue, 0.5), color: neonBlue, textTransform: 'none' }}
          >
            {sending ? 'Sending…' : 'Send daily summary'}
          </Button>
        </Box>
      </Box>

      {/* Pending payouts banner */}
      {data.pendingPayouts > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={onJumpToPayouts ? <Button color="inherit" size="small" onClick={onJumpToPayouts}>Review</Button> : undefined}
        >
          {data.pendingPayouts} payout request{data.pendingPayouts === 1 ? '' : 's'} awaiting action.
        </Alert>
      )}

      {/* P/L hero */}
      <Box sx={{
        p: 3, borderRadius: 3, mb: 2,
        background: `linear-gradient(135deg, ${alpha(profitColor, 0.1)}, ${alpha(neonGreen, 0.04)})`,
        border: `1px solid ${alpha(profitColor, 0.3)}`,
      }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Today's house P/L (so far)
        </Typography>
        <Typography sx={{ fontSize: '2.4rem', fontWeight: 900, color: profitColor, lineHeight: 1.05, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
          {fmtNgnFromUsd(profit, { sign: true })}
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
          <Stat label="Bets settled"    value={(data.today?.betsCount ?? 0).toLocaleString()} />
          <Stat label="Total stakes"    value={fmtNgnFromUsd(data.today?.totalStakeUsd ?? 0)} />
          <Stat label="Total payouts"   value={fmtNgnFromUsd(data.today?.totalPayoutUsd ?? 0)} />
          <Stat label="Deposit vol."    value={fmtNgnFromUsd(data.today?.depositVolumeUsd ?? 0)} color={neonGreen} />
          <Stat label="Withdrawal vol." value={fmtNgnFromUsd(data.today?.withdrawVolumeUsd ?? 0)} color={neonGold} />
          <Stat label="Bonus credited"  value={fmtNgnFromUsd(data.today?.bonusCreditedUsd ?? 0)} />
        </Box>
      </Box>

      {/* Trend grid */}
      <Box sx={{
        display: 'grid', gap: 2, mb: 2,
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
      }}>
        <RollupCard title="Last 7 days"  data={data.last7}  />
        <RollupCard title="Last 30 days" data={data.last30} />
      </Box>

      {/* Series chart (sparkline-style bars) */}
      <Box sx={{ p: 2, borderRadius: 3, background: darkCard, border: `1px solid ${darkBorder}`, mb: 2 }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, mb: 1.5 }}>House P/L · last 30 days</Typography>
        <SparkBars series={data.series} />
      </Box>

      {/* Recent payouts */}
      <Box sx={{ p: 2, borderRadius: 3, background: darkCard, border: `1px solid ${darkBorder}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>Recent payouts</Typography>
          {onJumpToPayouts && (
            <Button size="small" onClick={onJumpToPayouts} endIcon={<PaymentsIcon sx={{ fontSize: 14 }} />}>
              All payouts
            </Button>
          )}
        </Box>
        {data.recentPayouts.length === 0 ? (
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', py: 1 }}>
            No payout requests yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {data.recentPayouts.slice(0, 5).map(p => {
              const tone = p.status === 'completed' ? neonGreen
                : p.status === 'requested' ? neonGold
                : p.status === 'in_progress' ? neonBlue
                : '#ff6b7a';
              return (
                <Box key={p._id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 1, py: 0.75, borderRadius: 1.5,
                  borderLeft: `3px solid ${tone}`,
                  background: alpha('#fff', 0.025),
                }}>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: 100 }}>
                    {fmtNgnWithUsdSuffix(p.amountUsd)}
                  </Typography>
                  <Chip
                    size="small"
                    label={p.status}
                    sx={{
                      height: 18, fontSize: '0.65rem', fontWeight: 700,
                      background: alpha(tone, 0.15), color: tone, textTransform: 'capitalize',
                    }}
                  />
                  <Typography sx={{ flex: 1, fontSize: '0.74rem', color: 'text.secondary' }}>
                    {p.requestedByEmail}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                    {new Date(p.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: color ?? '#fff', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  );
}

function RollupCard({ title, data }: { title: string; data: LedgerSummary['last7'] | LedgerSummary['last30'] }) {
  const tone = data.houseProfitUsd >= 0 ? neonGreen : '#ff6b7a';
  return (
    <Box sx={{ p: 2, borderRadius: 3, background: darkCard, border: `1px solid ${darkBorder}` }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>{title}</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{data.days} active day{data.days === 1 ? '' : 's'}</Typography>
      </Box>
      <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: tone, fontVariantNumeric: 'tabular-nums', mt: 0.5 }}>
        {fmtNgnWithUsdSuffix(data.houseProfitUsd, { sign: true })}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5 }}>
        <SmallRow label="Stakes"   value={fmtNgnWithUsdSuffix(data.totalStakeUsd)} />
        <SmallRow label="Payouts"  value={fmtNgnWithUsdSuffix(data.totalPayoutUsd)} />
        <SmallRow label="Deposits" value={fmtNgnWithUsdSuffix(data.depositVolumeUsd)} color={neonGreen} />
        <SmallRow label="Withdraws"value={fmtNgnWithUsdSuffix(data.withdrawVolumeUsd)} color={neonGold} />
      </Box>
    </Box>
  );
}

function SmallRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: color ?? '#fff', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}

/** Sparkline-style bar chart for the 30-day series. Negative bars hang down,
 *  positive bars go up — same axis. CSS-only, no chart library. */
function SparkBars({ series }: { series: LedgerSummary['series'] }) {
  if (series.length === 0) return <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No activity in the window.</Typography>;
  const max = Math.max(1, ...series.map(s => Math.abs(s.houseProfitUsd)));
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, height: 96, position: 'relative' }}>
      {/* zero-axis line */}
      <Box sx={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: darkBorder }} />
      {series.map(s => {
        const pct = (s.houseProfitUsd / max) * 50; // ±50% of container height
        const pos = pct >= 0;
        return (
          <Box key={s._id} sx={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Box
              title={`${s._id} · ${fmtNgnWithUsdSuffix(s.houseProfitUsd, { sign: true })}`}
              sx={{
                position: 'absolute',
                top: pos ? `${50 - pct}%` : '50%',
                height: `${Math.abs(pct)}%`,
                width: '70%',
                background: pos ? neonGreen : '#ff6b7a',
                borderRadius: 0.5,
                opacity: 0.85,
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

