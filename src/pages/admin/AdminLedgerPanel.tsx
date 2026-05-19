import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Alert, CircularProgress } from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type LedgerRow } from '../../api/admin';
import { ApiError } from '../../api/client';

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export default function AdminLedgerPanel() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true); setError(null);
    try { setRows((await adminApi.ledger(120)).rows); }
    catch (err) { setError(err instanceof ApiError ? err.code : 'load_failed'); }
    finally { setIsLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Daily ledger</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            One row per UTC day. All amounts in USD-equivalent (FX from the static reference table).
          </Typography>
        </Box>
        <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">No ledger rows yet — settled bets will create rows automatically.</Alert>
      ) : (
        <Box sx={{ overflow: 'auto', borderRadius: 2, border: `1px solid ${darkBorder}`, background: darkCard }}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '120px repeat(6, 1fr)',
            gap: 1, px: 2, py: 1.25,
            fontSize: '0.7rem', fontWeight: 800, color: 'text.disabled',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            borderBottom: `1px solid ${darkBorder}`,
            background: alpha('#fff', 0.025),
          }}>
            <Box>Date</Box>
            <Box sx={{ textAlign: 'right' }}>Bets</Box>
            <Box sx={{ textAlign: 'right' }}>Stakes</Box>
            <Box sx={{ textAlign: 'right' }}>Payouts</Box>
            <Box sx={{ textAlign: 'right' }}>P/L</Box>
            <Box sx={{ textAlign: 'right' }}>Deposits</Box>
            <Box sx={{ textAlign: 'right' }}>Withdrawals</Box>
          </Box>
          {rows.map((r, i) => {
            const tone = r.houseProfitUsd >= 0 ? neonGreen : '#ff6b7a';
            return (
              <Box key={r._id} sx={{
                display: 'grid',
                gridTemplateColumns: '120px repeat(6, 1fr)',
                gap: 1, px: 2, py: 1.25,
                fontSize: '0.82rem',
                borderBottom: i < rows.length - 1 ? `1px solid ${darkBorder}` : 'none',
                background: i % 2 === 0 ? alpha('#fff', 0.015) : 'transparent',
              }}>
                <Box sx={{ fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{r._id}</Box>
                <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.betsCount.toLocaleString()}</Box>
                <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(r.totalStakeUsd)}</Box>
                <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(r.totalPayoutUsd)}</Box>
                <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: tone }}>
                  {r.houseProfitUsd >= 0 ? '+' : ''}{fmtUsd(r.houseProfitUsd)}
                </Box>
                <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: neonGreen }}>{fmtUsd(r.depositVolumeUsd)}</Box>
                <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: neonGold }}>{fmtUsd(r.withdrawVolumeUsd)}</Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
