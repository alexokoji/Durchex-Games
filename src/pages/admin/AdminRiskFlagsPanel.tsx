import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Alert, CircularProgress, Stack, Tabs, Tab,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type RiskFlagDto, type RiskUserDto } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

const SEV_TONE: Record<string, string> = { high: '#ff4757', medium: '#ff9f43', low: neonGold };
const LEVEL_TONE: Record<string, string> = { high: '#ff4757', medium: '#ff9f43', low: neonGreen };

const TYPE_LABEL: Record<string, string> = {
  multi_account: 'Multi-account', self_referral: 'Self-referral', bonus_abuse: 'Bonus abuse',
  sharp_bettor: 'Sharp bettor', velocity: 'Velocity', suspicious_betting: 'Suspicious betting',
};

export default function AdminRiskFlagsPanel() {
  const toasts = useToasts();
  const [tab, setTab] = useState<'flags' | 'users'>('flags');
  const [flags, setFlags] = useState<RiskFlagDto[]>([]);
  const [users, setUsers] = useState<RiskUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      if (tab === 'flags') { const r = await adminApi.riskFlags({ status: 'open' }); setFlags(r.flags); }
      else { const r = await adminApi.riskUsers('medium'); setUsers(r.users); }
    } catch (err) { setError(err instanceof ApiError ? err.code : 'load_failed'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  async function resolve(f: RiskFlagDto, status: 'reviewed' | 'dismissed') {
    try {
      await adminApi.resolveFlag(f._id, status);
      toasts.success('Flag updated', `Marked ${status}.`);
      await load();
    } catch (err) { toasts.error('Update failed', err instanceof ApiError ? err.code : 'unknown'); }
  }

  async function rescan(userId: string) {
    try { const r = await adminApi.scanUser(userId); toasts.info('Re-scanned', `Score ${r.score} · ${r.level}`); await load(); }
    catch (err) { toasts.error('Scan failed', err instanceof ApiError ? err.code : 'unknown'); }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36 }}>
          <Tab value="flags" label="Open flags" sx={{ minHeight: 36, fontWeight: 800 }} />
          <Tab value="users" label="High-risk users" sx={{ minHeight: 36, fontWeight: 800 }} />
        </Tabs>
        <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load: {error}</Alert>}

      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>
      ) : tab === 'flags' ? (
        flags.length === 0 ? <Alert severity="success">No open risk flags.</Alert> : (
          <Stack spacing={1.5}>
            {flags.map(f => {
              const tone = SEV_TONE[f.severity] ?? neonGold;
              const u = typeof f.userId === 'object' ? f.userId : null;
              return (
                <Box key={f._id} sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}`, borderLeft: `4px solid ${tone}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                    <Chip size="small" label={`${TYPE_LABEL[f.type] ?? f.type} · ${f.severity.toUpperCase()}`}
                      sx={{ background: alpha(tone, 0.15), color: tone, fontWeight: 800 }} />
                    {u && (
                      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                        {u.username} <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>· {u.email}</Typography>
                      </Typography>
                    )}
                    <Box sx={{ flex: 1 }} />
                    {u?.riskScore != null && (
                      <Chip size="small" label={`Score ${u.riskScore}`}
                        sx={{ background: alpha(LEVEL_TONE[u.riskLevel ?? 'low'], 0.15), color: LEVEL_TONE[u.riskLevel ?? 'low'], fontWeight: 800 }} />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: '0.82rem', mb: 1 }}>{f.detail}</Typography>
                  {f.evidence && (
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontFamily: 'monospace', mb: 1.5, wordBreak: 'break-word' }}>
                      {JSON.stringify(f.evidence)}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" color="error" onClick={() => resolve(f, 'reviewed')}>Mark reviewed</Button>
                    <Button size="small" variant="outlined" onClick={() => resolve(f, 'dismissed')}>Dismiss (false positive)</Button>
                    {u && <Button size="small" onClick={() => rescan(u._id)}>Re-scan</Button>}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )
      ) : (
        users.length === 0 ? <Alert severity="success">No medium/high-risk users.</Alert> : (
          <Stack spacing={1}>
            {users.map(u => {
              const tone = LEVEL_TONE[u.riskLevel] ?? neonGreen;
              return (
                <Box key={u._id} sx={{ p: 1.5, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}`, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`${u.riskLevel.toUpperCase()} · ${u.riskScore}`} sx={{ background: alpha(tone, 0.15), color: tone, fontWeight: 800 }} />
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{u.username} · <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>{u.email}</Typography></Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                      Wagered {u.totalWagered.toFixed(2)} · Bal {u.balance.toFixed(2)} · Bonus {u.bonusBalance.toFixed(2)}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => rescan(u._id)}>Re-scan</Button>
                </Box>
              );
            })}
          </Stack>
        )
      )}
    </Box>
  );
}
