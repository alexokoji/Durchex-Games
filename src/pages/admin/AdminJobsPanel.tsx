import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Chip, Switch, FormControlLabel,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type CashbackJobInfo } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

export default function AdminJobsPanel() {
  const toasts = useToasts();
  const [info, setInfo] = useState<CashbackJobInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  const [running, setRunning] = useState(false);

  async function load() {
    setIsLoading(true); setError(null);
    try {
      setInfo(await adminApi.cashbackInfo());
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    } finally { setIsLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function run() {
    setRunning(true);
    try {
      const r = await adminApi.runCashback(force);
      if (r.ran) toasts.success('Cashback ran', `Credited ${r.credited}, skipped ${r.skipped}.`);
      else       toasts.info('Cashback skipped', r.reason ?? 'unknown reason');
      await load();
    } catch (err) {
      toasts.error('Run failed', err instanceof ApiError ? err.code : 'unknown');
    } finally { setRunning(false); }
  }

  if (isLoading) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>;
  }
  if (error) {
    return <Alert severity="error">Failed to load: {error}</Alert>;
  }

  const state = info?.state;
  const sinceMs = state ? Date.now() - new Date(state.lastRunAt).getTime() : null;
  const daysSince = sinceMs != null ? sinceMs / (24 * 60 * 60 * 1000) : null;

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Box sx={{
        p: 3, borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(neonBlue, 0.1)}, ${alpha(neonGreen, 0.04)})`,
        border: `1px solid ${darkBorder}`,
        mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Weekly cashback</Typography>
          <Box>
            <Chip
              size="small"
              label={`Code: ${info?.cashbackCode ?? '—'}`}
              sx={{ fontFamily: 'monospace', fontWeight: 700, background: alpha(neonGold, 0.15), color: neonGold, mr: 1 }}
            />
            <Chip
              size="small"
              label={state?.lastRunError ? `error: ${state.lastRunError}` : state ? 'healthy' : 'not yet run'}
              sx={{
                background: alpha(state?.lastRunError ? '#ff6b7a' : neonGreen, 0.15),
                color:      state?.lastRunError ? '#ff6b7a' : neonGreen,
                fontWeight: 700,
              }}
            />
          </Box>
        </Box>

        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
          Job runs every hour and credits cashback when the last successful run is ≥ 7 days old. Per-user limits on the campaign code prevent double-credit.
        </Typography>

        {state ? (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, mb: 2 }}>
            <StatCard label="Last run"          value={new Date(state.lastRunAt).toLocaleString()} tone={neonBlue} />
            <StatCard label="Users credited"    value={String(state.lastRunCount)}                  tone={neonGreen} />
            <StatCard label="Days since"        value={daysSince != null ? daysSince.toFixed(1) : '—'} tone={daysSince != null && daysSince >= 7 ? neonGold : 'text.secondary'} />
          </Box>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            The job hasn't recorded a run yet. Create a <code>{info?.cashbackCode}</code> promo code with kind=<code>cashback</code> to activate it, then click "Run now".
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Switch size="small" checked={force} onChange={e => setForce(e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.78rem' }}>Force (bypass 7-day window)</Typography>}
          />
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            disabled={running}
            onClick={run}
            sx={{ background: neonGreen, color: '#000', fontWeight: 800 }}
          >
            {running ? 'Running…' : 'Run now'}
          </Button>
          <Button startIcon={<RefreshIcon />} onClick={() => void load()}>Refresh</Button>
        </Box>
      </Box>
    </Box>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Box sx={{
      p: 1.5, borderRadius: 2,
      background: darkCard,
      border: `1px solid ${darkBorder}`,
    }}>
      <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1rem', fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums', mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}
