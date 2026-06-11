import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, IconButton, Alert, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type AnalyticsDto } from '../../api/admin';
import { ApiError } from '../../api/client';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}`, minWidth: 0 }}>
      <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.25rem', fontWeight: 900, color: color ?? 'text.primary', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
    </Box>
  );
}

export default function AdminAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await adminApi.analytics()); }
    catch (err) { setError(err instanceof ApiError ? err.code : 'load_failed'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>;
  if (error || !data) return <Alert severity="error">Failed to load analytics{error ? `: ${error}` : ''}.</Alert>;

  const maxExpo = Math.max(1, ...data.exposure.map(e => e.liabilityUsd));
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  const grid = { display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 } as const;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
      </Box>

      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>USERS</Typography>
      <Box sx={grid}>
        <Stat label="Active (24h)" value={String(data.users.active24h)} color={neonGreen} />
        <Stat label="New today" value={String(data.users.newToday)} color={neonBlue} />
        <Stat label="Depositors today" value={String(data.users.depositorsToday)} color={neonGold} />
        <Stat label="High-risk users" value={String(data.risk.highRiskUsers)} color={data.risk.highRiskUsers > 0 ? '#ff4757' : undefined} />
      </Box>

      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>BETTING (24h)</Typography>
      <Box sx={grid}>
        <Stat label="Bets today" value={String(data.betting.betsToday)} color={neonGreen} />
        <Stat label="RTP (24h)" value={`${(data.betting.rtp24h * 100).toFixed(1)}%`} color={neonBlue} />
        <Stat label="Turnover (24h)" value={fmt(data.betting.turnoverUsd)} color={neonGold} />
        <Stat label="Payouts (24h)" value={fmt(data.betting.payoutUsd)} />
      </Box>

      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>EXPOSURE HEATMAP</Typography>
      <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}`, mb: 2 }}>
        {data.exposure.length === 0 ? (
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>No open liability right now.</Typography>
        ) : data.exposure.map(e => {
          const pct = (e.liabilityUsd / maxExpo) * 100;
          const tone = pct > 66 ? '#ff4757' : pct > 33 ? neonGold : neonGreen;
          return (
            <Box key={e.gameId} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <Typography sx={{ fontSize: '0.74rem', fontWeight: 700 }}>{e.gameId}</Typography>
                <Typography sx={{ fontSize: '0.74rem', color: tone, fontWeight: 800 }}>{fmt(e.liabilityUsd)}</Typography>
              </Box>
              <Box sx={{ height: 8, borderRadius: 4, background: alpha('#fff', 0.06), overflow: 'hidden' }}>
                <Box sx={{ width: `${pct}%`, height: '100%', background: tone }} />
              </Box>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>PROMOTERS & PROMO SLIPS</Typography>
      <Box sx={grid}>
        <Stat label="Promoter earned" value={fmt(data.promoters.earnedUsd)} color={neonGreen} />
        <Stat label="Promoter unpaid" value={fmt(data.promoters.unpaidUsd)} color={neonGold} />
        <Stat label="Promoter conv." value={`${data.promoters.conversionPct.toFixed(0)}%`} color={neonBlue} />
        <Stat label="Bonus-abuse alerts" value={String(data.risk.openBonusAbuse)} color={data.risk.openBonusAbuse > 0 ? '#ff4757' : undefined} />
      </Box>
      <Box sx={grid}>
        <Stat label="Slip views" value={String(data.promoSlips.views)} />
        <Stat label="Slip loads" value={String(data.promoSlips.loads)} color={neonBlue} />
        <Stat label="Slip bets" value={String(data.promoSlips.bets)} color={neonGreen} />
        <Stat label="Slip revenue" value={fmt(data.promoSlips.revenue)} color={neonGold} />
      </Box>
    </Box>
  );
}
