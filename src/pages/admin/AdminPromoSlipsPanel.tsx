import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Alert, CircularProgress, Stack, TextField,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type PromoSlipDto } from '../../api/admin';
import { bookingCodesApi } from '../../api/bookingCodes';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

export default function AdminPromoSlipsPanel() {
  const toasts = useToasts();
  const [items, setItems] = useState<PromoSlipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form — clones selections from an existing booking code.
  const [src, setSrc]       = useState('');
  const [label, setLabel]   = useState('');
  const [campaign, setCamp] = useState('');
  const [days, setDays]     = useState('14');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const r = await adminApi.promoSlips(); setItems(r.promos); }
    catch (err) { setError(err instanceof ApiError ? err.code : 'load_failed'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (!src.trim() || !label.trim()) return;
    setCreating(true);
    try {
      const slip = await bookingCodesApi.redeem(src.trim());
      if (!slip.selections?.length) { toasts.error('Empty slip', 'That code has no selections.'); setCreating(false); return; }
      await adminApi.createPromoSlip({
        selections: slip.selections, label: label.trim(),
        campaign: campaign.trim() || undefined,
        suggestedStake: slip.suggestedStake, currency: slip.currency,
        expiresInDays: Number(days) || 14,
      });
      toasts.success('Promo slip created', label.trim());
      setSrc(''); setLabel(''); setCamp('');
      await load();
    } catch (err) {
      toasts.error('Create failed', err instanceof ApiError ? err.code : 'unknown');
    } finally { setCreating(false); }
  }

  async function remove(code: string) {
    try { await adminApi.deletePromoSlip(code); toasts.success('Deleted', code); await load(); }
    catch (err) { toasts.error('Delete failed', err instanceof ApiError ? err.code : 'unknown'); }
  }

  function shareLink(code: string) { return `${window.location.origin}/live-sports?code=${code}`; }
  async function copyLink(code: string) {
    try { await navigator.clipboard.writeText(shareLink(code)); toasts.success('Link copied', code); } catch { /* ignore */ }
  }

  return (
    <Box>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
        Influencer / campaign bet slips. Build a slip on the Live Sports page to get a booking code,
        then promote it here — every view, load, bet and the revenue it drives is tracked.
      </Typography>

      {/* Create */}
      <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}`, mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1.5 }}>Create promo slip</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField size="small" label="Source booking code" value={src} onChange={e => setSrc(e.target.value.toUpperCase())} />
          <TextField size="small" label="Label (e.g. Weekend Banker)" value={label} onChange={e => setLabel(e.target.value)} />
          <TextField size="small" label="Campaign tag (optional)" value={campaign} onChange={e => setCamp(e.target.value)} />
          <TextField size="small" label="Expires in (days)" type="number" value={days} onChange={e => setDays(e.target.value)} />
        </Box>
        <Button variant="contained" sx={{ mt: 1.5, fontWeight: 800 }} disabled={creating || !src.trim() || !label.trim()} onClick={create}>
          {creating ? <CircularProgress size={16} color="inherit" /> : 'Create promo slip'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load: {error}</Alert>}
      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No promo slips yet.</Alert>
      ) : (
        <Stack spacing={1.25}>
          {items.map(p => {
            const conv = p.redemptionCount > 0 ? (p.betsPlaced / p.redemptionCount) * 100 : 0;
            return (
              <Box key={p._id} sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                  <Typography sx={{ fontWeight: 900, fontFamily: 'monospace', color: neonBlue, letterSpacing: '0.1em' }}>{p.code}</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.label}</Typography>
                  {p.campaign && <Chip size="small" label={p.campaign} sx={{ background: alpha(neonGold, 0.15), color: neonGold }} />}
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>
                    exp {new Date(p.expiresAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  {[
                    { label: 'Views', value: p.views, color: 'text.secondary' },
                    { label: 'Loads', value: p.redemptionCount, color: neonBlue },
                    { label: 'Bets', value: p.betsPlaced, color: neonGreen },
                    { label: 'Revenue', value: `$${p.revenueUsd.toFixed(0)}`, color: neonGold },
                    { label: 'Conv.', value: `${conv.toFixed(0)}%`, color: '#a855f7' },
                  ].map(s => (
                    <Box key={s.label} sx={{ px: 1.25, py: 0.5, borderRadius: 1.5, background: alpha('#fff', 0.03), border: `1px solid ${darkBorder}` }}>
                      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', textTransform: 'uppercase' }}>{s.label}</Typography>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: s.color }}>{s.value}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => copyLink(p.code)}>Copy share link</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />} onClick={() => remove(p.code)}>Delete</Button>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
