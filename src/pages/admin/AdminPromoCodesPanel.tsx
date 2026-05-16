import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Alert, CircularProgress, Stack, Switch,
  FormControlLabel,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type AdminPromoCode, type CreatePromoCodeBody } from '../../api/admin';
import type { PromoKind, PromoTier } from '../../api/promo';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

const KINDS: PromoKind[] = ['welcome', 'deposit', 'free-bet', 'cashback'];
const TIERS: PromoTier[] = ['public', 'influencer', 'vip', 'seasonal'];

interface FormState {
  code: string;
  kind: PromoKind;
  tier: PromoTier;
  bonusAmount: string;
  currency: string;
  maxBonus: string;
  minDeposit: string;
  rollover: string;
  maxWithdraw: string;
  eligibleCountries: string;     // comma-separated
  totalUsageLimit: string;
  perUserLimit: string;
  expiresAt: string;             // YYYY-MM-DD
}

function emptyForm(): FormState {
  return {
    code: '',
    kind: 'welcome',
    tier: 'public',
    bonusAmount: '',
    currency: '',
    maxBonus: '',
    minDeposit: '',
    rollover: '5',
    maxWithdraw: '',
    eligibleCountries: '',
    totalUsageLimit: '',
    perUserLimit: '1',
    expiresAt: '',
  };
}

export default function AdminPromoCodesPanel() {
  const toasts = useToasts();
  const [items, setItems] = useState<AdminPromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const r = await adminApi.promoCodes();
      setItems(r.codes);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function buildBody(): CreatePromoCodeBody | null {
    const code = form.code.trim().toUpperCase();
    const bonus = parseFloat(form.bonusAmount);
    if (!code || !Number.isFinite(bonus) || bonus < 0) {
      toasts.warning('Missing fields', 'Code and bonus amount are required.');
      return null;
    }
    const body: CreatePromoCodeBody = {
      code,
      kind: form.kind,
      tier: form.tier,
      bonusAmount: bonus,
    };
    if (form.currency.trim())       body.currency       = form.currency.trim().toUpperCase();
    if (form.maxBonus.trim())       body.maxBonus       = parseFloat(form.maxBonus);
    if (form.minDeposit.trim())     body.minDeposit     = parseFloat(form.minDeposit);
    if (form.rollover.trim())       body.rollover       = parseFloat(form.rollover);
    if (form.maxWithdraw.trim())    body.maxWithdraw    = parseFloat(form.maxWithdraw);
    if (form.totalUsageLimit.trim())body.totalUsageLimit= parseInt(form.totalUsageLimit, 10);
    if (form.perUserLimit.trim())   body.perUserLimit   = parseInt(form.perUserLimit, 10);
    if (form.expiresAt)             body.expiresAt      = new Date(form.expiresAt).toISOString();
    if (form.eligibleCountries.trim()) {
      body.eligibleCountries = form.eligibleCountries.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }
    return body;
  }

  async function create() {
    const body = buildBody();
    if (!body) return;
    setSaving(true);
    try {
      await adminApi.createPromoCode(body);
      toasts.success('Created', `${body.code} is live.`);
      setCreateOpen(false);
      setForm(emptyForm());
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown';
      toasts.error('Create failed', code.replace(/_/g, ' '));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: AdminPromoCode) {
    try {
      await adminApi.updatePromoCode(c.code, { active: !c.active });
      await load();
    } catch (err) {
      toasts.error('Update failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  async function remove(c: AdminPromoCode) {
    if (!window.confirm(`Delete code ${c.code}? Existing redemptions are preserved.`)) return;
    try {
      await adminApi.deletePromoCode(c.code);
      await load();
    } catch (err) {
      toasts.error('Delete failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {items.length} code{items.length === 1 ? '' : 's'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setForm(emptyForm()); setCreateOpen(true); }}
            sx={{ background: neonGreen, color: '#000', fontWeight: 700 }}
          >
            New code
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load: {error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: neonGreen }} />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No promo codes yet. Click "New code" to mint your first one.</Alert>
      ) : (
        <Stack spacing={1}>
          {items.map(c => (
            <Box key={c._id} sx={{
              p: 1.5, borderRadius: 2,
              background: darkCard,
              border: `1px solid ${darkBorder}`,
              display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
            }}>
              <Chip
                label={c.code}
                size="small"
                sx={{ fontWeight: 800, background: alpha(neonGold, 0.15), color: neonGold, fontFamily: 'monospace' }}
              />
              <Chip
                size="small" variant="outlined"
                label={c.kind}
                sx={{ textTransform: 'capitalize', borderColor: alpha(neonBlue, 0.3), color: neonBlue }}
              />
              <Chip size="small" variant="outlined" label={c.tier} sx={{ textTransform: 'capitalize' }} />
              <Typography sx={{ fontSize: '0.82rem', flex: 1, minWidth: 200 }}>
                {c.kind === 'deposit' || c.kind === 'cashback'
                  ? `${(c.bonusAmount * 100).toFixed(0)}%${c.maxBonus ? ` up to ${c.maxBonus}` : ''}`
                  : `${c.bonusAmount.toFixed(2)} ${c.currency ?? 'user-currency'}`}
                {' · '}
                Rollover {c.rollover}×
                {c.expiresAt && ` · expires ${new Date(c.expiresAt).toLocaleDateString()}`}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {c.totalRedemptions}{c.totalUsageLimit ? `/${c.totalUsageLimit}` : ''} used
              </Typography>
              <FormControlLabel
                control={<Switch size="small" checked={c.active} onChange={() => toggleActive(c)} />}
                label={<Typography sx={{ fontSize: '0.72rem' }}>{c.active ? 'active' : 'paused'}</Typography>}
              />
              <IconButton size="small" onClick={() => remove(c)} sx={{ color: '#ff6b7a' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New promo code</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, pt: 0.5 }}>
            <TextField
              label="Code" size="small"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              inputProps={{ maxLength: 32, style: { textTransform: 'uppercase', fontFamily: 'monospace' } }}
            />
            <TextField
              label="Kind" select size="small" value={form.kind}
              onChange={e => setForm(f => ({ ...f, kind: e.target.value as PromoKind }))}
            >
              {KINDS.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
            </TextField>
            <TextField
              label="Tier" select size="small" value={form.tier}
              onChange={e => setForm(f => ({ ...f, tier: e.target.value as PromoTier }))}
            >
              {TIERS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField
              label={form.kind === 'deposit' || form.kind === 'cashback' ? 'Percentage (0..1)' : 'Bonus amount'}
              size="small" type="number"
              value={form.bonusAmount}
              onChange={e => setForm(f => ({ ...f, bonusAmount: e.target.value }))}
              inputProps={{ step: form.kind === 'deposit' || form.kind === 'cashback' ? 0.01 : 1, min: 0 }}
            />
            <TextField
              label="Currency (optional)" size="small"
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
              placeholder="USD / NGN / …"
              inputProps={{ maxLength: 6, style: { textTransform: 'uppercase' } }}
            />
            <TextField
              label="Rollover ×" size="small" type="number"
              value={form.rollover}
              onChange={e => setForm(f => ({ ...f, rollover: e.target.value }))}
              inputProps={{ step: 1, min: 0 }}
            />
            {form.kind === 'deposit' && (
              <TextField
                label="Min deposit" size="small" type="number"
                value={form.minDeposit}
                onChange={e => setForm(f => ({ ...f, minDeposit: e.target.value }))}
                inputProps={{ step: 1, min: 0 }}
              />
            )}
            {(form.kind === 'deposit' || form.kind === 'cashback') && (
              <TextField
                label="Max bonus" size="small" type="number"
                value={form.maxBonus}
                onChange={e => setForm(f => ({ ...f, maxBonus: e.target.value }))}
                inputProps={{ step: 1, min: 0 }}
              />
            )}
            <TextField
              label="Total usage limit" size="small" type="number"
              value={form.totalUsageLimit}
              onChange={e => setForm(f => ({ ...f, totalUsageLimit: e.target.value }))}
              inputProps={{ step: 1, min: 0 }}
            />
            <TextField
              label="Per-user limit" size="small" type="number"
              value={form.perUserLimit}
              onChange={e => setForm(f => ({ ...f, perUserLimit: e.target.value }))}
              inputProps={{ step: 1, min: 0 }}
            />
            <TextField
              label="Max withdrawable (optional)" size="small" type="number"
              value={form.maxWithdraw}
              onChange={e => setForm(f => ({ ...f, maxWithdraw: e.target.value }))}
              inputProps={{ step: 1, min: 0 }}
            />
            <TextField
              label="Expires at" size="small" type="date"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Eligible countries (CSV)" size="small"
              value={form.eligibleCountries}
              onChange={e => setForm(f => ({ ...f, eligibleCountries: e.target.value }))}
              placeholder="NG, GH, KE"
              sx={{ gridColumn: 'span 2' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={create}
            variant="contained"
            disabled={saving}
            sx={{ background: neonGreen, color: '#000', fontWeight: 700 }}
          >
            {saving ? 'Creating…' : 'Create code'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
