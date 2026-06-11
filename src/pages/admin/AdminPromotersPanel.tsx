import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, ToggleButton, ToggleButtonGroup, Alert, CircularProgress, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type AdminPromoter } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

type Filter = 'all' | 'pending' | 'approved' | 'banned';

export default function AdminPromotersPanel() {
  const toasts = useToasts();
  const [filter, setFilter] = useState<Filter>('pending');
  const [items, setItems] = useState<AdminPromoter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminPromoter | null>(null);
  const [commission, setCommission] = useState('0.20');
  const [model, setModel] = useState<'revenue_share' | 'cpa' | 'hybrid'>('revenue_share');
  const [cpa, setCpa] = useState('0');
  const [banReason, setBanReason] = useState('');
  const [banning, setBanning] = useState<AdminPromoter | null>(null);
  const [payoutFor, setPayoutFor] = useState<AdminPromoter | null>(null);
  const [payoutAmt, setPayoutAmt] = useState('');

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const r = await adminApi.promoters(filter === 'all' ? undefined : filter);
      setItems(r.promoters);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  function userOf(p: AdminPromoter) {
    if (typeof p.userId === 'string') return null;
    return p.userId;
  }

  async function approve(p: AdminPromoter, rate?: number) {
    const u = userOf(p);
    if (!u) return;
    try {
      await adminApi.approvePromoter(u._id, rate != null ? { commissionRate: rate } : undefined);
      toasts.success('Approved', `${u.username} is now an approved promoter.`);
      await load();
    } catch (err) {
      toasts.error('Approve failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  async function ban() {
    if (!banning) return;
    const u = userOf(banning);
    if (!u) return;
    try {
      await adminApi.banPromoter(u._id, banReason.trim() || undefined);
      toasts.success('Banned', `${u.username} can no longer earn promoter commission.`);
      setBanning(null);
      setBanReason('');
      await load();
    } catch (err) {
      toasts.error('Ban failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  async function saveCommission() {
    if (!editing) return;
    const u = userOf(editing);
    if (!u) return;
    const rate = parseFloat(commission);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      toasts.warning('Invalid rate', 'Commission must be between 0 and 1 (e.g. 0.2 = 20%).');
      return;
    }
    const cpaAmount = parseFloat(cpa) || 0;
    try {
      await adminApi.updatePromoter(u._id, { commissionModel: model, commissionRate: rate, cpaAmountUsd: cpaAmount });
      toasts.success('Updated', `${u.username}: ${model.replace('_', ' ')} · ${(rate * 100).toFixed(1)}%${cpaAmount ? ` · $${cpaAmount} CPA` : ''}.`);
      setEditing(null);
      await load();
    } catch (err) {
      toasts.error('Update failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  async function doPayout() {
    if (!payoutFor) return;
    const u = userOf(payoutFor);
    if (!u) return;
    const amt = parseFloat(payoutAmt);
    if (!Number.isFinite(amt) || amt <= 0) { toasts.warning('Invalid amount', 'Enter a positive USD amount.'); return; }
    try {
      const r = await adminApi.payoutPromoter(u._id, amt);
      toasts.success('Payout recorded', `$${amt.toFixed(2)} · unpaid now $${r.unpaidUsd.toFixed(2)}`);
      setPayoutFor(null); setPayoutAmt('');
      await load();
    } catch (err) {
      toasts.error('Payout failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  return (
    <Box>
      {/* Filter + refresh row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="pending">Pending</ToggleButton>
          <ToggleButton value="approved">Approved</ToggleButton>
          <ToggleButton value="banned">Banned</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
        <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load: {error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: neonGreen }} />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No promoters in this list yet.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {items.map(p => {
            const u = userOf(p);
            const isPending  = p.status === 'pending';
            const isApproved = p.status === 'approved';
            const tone = isApproved ? neonGreen : isPending ? neonGold : '#ff6b7a';
            return (
              <Box key={p._id} sx={{
                p: 2, borderRadius: 2,
                background: darkCard,
                border: `1px solid ${darkBorder}`,
                borderLeft: `4px solid ${tone}`,
                display: 'flex', flexDirection: 'column', gap: 1,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>
                      {u?.username ?? '(deleted user)'}
                      {u?.countryCode && <Chip size="small" label={u.countryCode} sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {u?.email ?? '—'} · code <code>{u?.referralCode ?? '—'}</code>
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={
                      p.commissionModel === 'cpa' ? `CPA $${p.cpaAmountUsd ?? 0}`
                      : p.commissionModel === 'hybrid' ? `Hybrid ${(p.commissionRate * 100).toFixed(0)}% + $${p.cpaAmountUsd ?? 0}`
                      : `Rev ${(p.commissionRate * 100).toFixed(1)}%`
                    }
                    sx={{ background: alpha(neonBlue, 0.15), color: neonBlue, fontWeight: 800 }}
                  />
                  <Chip
                    size="small"
                    label={`${p.totalReferred} referred · ${p.activeReferrals} active`}
                    sx={{ background: alpha('#fff', 0.06) }}
                  />
                  {p.status === 'approved' && (
                    <Chip
                      size="small"
                      label={`$${(p.totalEarnedUsd ?? 0).toFixed(2)} earned · $${Math.max(0, (p.totalEarnedUsd ?? 0) - (p.paidOutUsd ?? 0)).toFixed(2)} unpaid`}
                      sx={{ background: alpha(neonGold, 0.15), color: neonGold, fontWeight: 700 }}
                    />
                  )}
                  <Chip
                    size="small"
                    label={p.status}
                    sx={{ background: alpha(tone, 0.15), color: tone, textTransform: 'capitalize', fontWeight: 700 }}
                  />
                </Box>

                {p.applicationMessage && (
                  <Box sx={{
                    p: 1.25, borderRadius: 1.5,
                    background: alpha('#fff', 0.025),
                    fontSize: '0.82rem', color: 'text.secondary',
                    fontStyle: 'italic',
                  }}>
                    "{p.applicationMessage}"
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  {isPending && (
                    <Button
                      size="small" variant="contained"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => approve(p)}
                      sx={{ background: neonGreen, color: '#000', fontWeight: 700 }}
                    >
                      Approve
                    </Button>
                  )}
                  {!isApproved && p.status !== 'banned' && (
                    <Button
                      size="small" variant="outlined"
                      startIcon={<BlockIcon />}
                      onClick={() => { setBanning(p); setBanReason(''); }}
                      color="error"
                    >
                      Ban
                    </Button>
                  )}
                  {isApproved && (
                    <>
                      <Button
                        size="small" variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => {
                          setEditing(p);
                          setCommission(String(p.commissionRate));
                          setModel(p.commissionModel ?? 'revenue_share');
                          setCpa(String(p.cpaAmountUsd ?? 0));
                        }}
                      >
                        Commission
                      </Button>
                      <Button
                        size="small" variant="outlined"
                        onClick={() => { setPayoutFor(p); setPayoutAmt(String(Math.max(0, (p.totalEarnedUsd ?? 0) - (p.paidOutUsd ?? 0)).toFixed(2))); }}
                        disabled={Math.max(0, (p.totalEarnedUsd ?? 0) - (p.paidOutUsd ?? 0)) <= 0}
                        sx={{ color: neonGold, borderColor: alpha(neonGold, 0.5) }}
                      >
                        Pay out
                      </Button>
                      <Button
                        size="small" variant="outlined" color="error"
                        startIcon={<BlockIcon />}
                        onClick={() => { setBanning(p); setBanReason(''); }}
                      >
                        Ban
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Commission edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Commission structure</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1.5 }}>Model</Typography>
          <ToggleButtonGroup value={model} exclusive size="small" sx={{ mb: 2 }}
            onChange={(_, v) => v && setModel(v)}>
            <ToggleButton value="revenue_share">Rev share</ToggleButton>
            <ToggleButton value="cpa">CPA</ToggleButton>
            <ToggleButton value="hybrid">Hybrid</ToggleButton>
          </ToggleButtonGroup>

          {(model === 'revenue_share' || model === 'hybrid') && (
            <TextField
              label="Revenue-share rate (0–1)" fullWidth size="small" sx={{ mb: 2 }}
              value={commission} onChange={e => setCommission(e.target.value)}
              type="number" inputProps={{ step: 0.01, min: 0, max: 1 }}
              helperText="e.g. 0.2 = 20% of net gaming revenue from referrals"
            />
          )}
          {(model === 'cpa' || model === 'hybrid') && (
            <TextField
              label="CPA bounty (USD per active referral)" fullWidth size="small"
              value={cpa} onChange={e => setCpa(e.target.value)}
              type="number" inputProps={{ step: 1, min: 0 }}
              helperText="Paid once when a referred user places their first settled bet"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={saveCommission} variant="contained" sx={{ background: neonGreen, color: '#000' }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payout dialog */}
      <Dialog open={!!payoutFor} onClose={() => setPayoutFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Record commission payout</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
            Logs a payout against the promoter's unpaid balance (does not move money — settle externally).
          </Typography>
          <TextField
            label="Amount (USD)" fullWidth size="small"
            value={payoutAmt} onChange={e => setPayoutAmt(e.target.value)}
            type="number" inputProps={{ step: 0.01, min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayoutFor(null)}>Cancel</Button>
          <Button onClick={doPayout} variant="contained" sx={{ background: neonGold, color: '#000' }}>Record payout</Button>
        </DialogActions>
      </Dialog>

      {/* Ban dialog */}
      <Dialog open={!!banning} onClose={() => setBanning(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Ban promoter</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
            This deactivates all their codes and stops further commission accrual.
          </Typography>
          <TextField
            label="Reason (optional)"
            fullWidth size="small" multiline minRows={2}
            value={banReason}
            onChange={e => setBanReason(e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBanning(null)}>Cancel</Button>
          <Button onClick={ban} variant="contained" color="error">Ban</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
