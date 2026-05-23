import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type HousePayout } from '../../api/admin';
import { ApiError } from '../../api/client';
import { formatMoney, FIAT } from '../../utils/currency';
import { useToasts } from '../../contexts/ToastContext';

const STATUS_TONE: Record<HousePayout['status'], string> = {
  requested:   neonGold,
  in_progress: neonBlue,
  completed:   neonGreen,
  cancelled:   '#94a3b8',
  failed:      '#ff6b7a',
};

export default function AdminPayoutsPanel() {
  const toasts = useToasts();
  const [items, setItems] = useState<HousePayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<HousePayout | null>(null);

  // Create form fields.
  const [amountUsd, setAmountUsd] = useState('');
  const [currency, setCurrency]   = useState('NGN');
  const [notes, setNotes]         = useState('');
  const [bank, setBank]           = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setIsLoading(true); setError(null);
    try { setItems((await adminApi.payouts()).payouts); }
    catch (err) { setError(err instanceof ApiError ? err.code : 'load_failed'); }
    finally { setIsLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function create() {
    const amount = parseFloat(amountUsd);
    if (!Number.isFinite(amount) || amount <= 0) {
      toasts.warning('Invalid amount', 'Enter a positive USD value.');
      return;
    }
    setSaving(true);
    try {
      const destination: Record<string, string> = {};
      if (bank.trim()) destination.bank = bank.trim();
      if (accountNo.trim()) destination.accountNumber = accountNo.trim();
      if (accountName.trim()) destination.beneficiaryName = accountName.trim();
      await adminApi.createPayout({
        amountUsd: amount, currency: currency.trim().toUpperCase() || 'NGN',
        notes: notes.trim() || undefined,
        destination,
      });
      toasts.success('Payout requested', `Email sent to ADMIN_EMAILS — action it in Flutterwave next.`);
      setCreating(false);
      setAmountUsd(''); setNotes(''); setBank(''); setAccountNo(''); setAccountName('');
      await load();
    } catch (err) {
      toasts.error('Request failed', err instanceof ApiError ? err.code : 'unknown');
    } finally { setSaving(false); }
  }

  async function setStatus(p: HousePayout, status: HousePayout['status'], extra?: { flutterwaveReference?: string; notes?: string }) {
    try {
      await adminApi.updatePayout(p._id, { status, ...extra });
      toasts.success('Updated', `Marked as ${status}.`);
      await load();
    } catch (err) {
      toasts.error('Update failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>House payouts</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            Record-and-email model: requests email all admins and you action them manually in the Flutterwave dashboard.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={() => void load()}>Refresh</Button>
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => setCreating(true)}
            sx={{ background: neonGreen, color: '#000', fontWeight: 800 }}
          >
            New payout
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No payout requests yet.</Alert>
      ) : (
        <Stack spacing={1}>
          {items.map(p => {
            const tone = STATUS_TONE[p.status];
            return (
              <Box key={p._id} sx={{
                p: 1.5, borderRadius: 2,
                background: darkCard, border: `1px solid ${darkBorder}`,
                borderLeft: `4px solid ${tone}`,
                display: 'flex', flexDirection: 'column', gap: 0.75,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', minWidth: 110 }}>
                      {formatMoney(Number.isFinite(p.amountUsd) ? p.amountUsd / FIAT.NGN.usdPerUnit : 0, 'NGN')}
                    </Typography>
                  <Chip
                    size="small" label={p.status}
                    sx={{ background: alpha(tone, 0.15), color: tone, fontWeight: 700, textTransform: 'capitalize' }}
                  />
                  <Chip size="small" variant="outlined" label={`Destination: ${p.currency}`} />
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    {new Date(p.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, fontSize: '0.78rem', color: 'text.secondary' }}>
                  <span>Requested by <strong style={{ color: '#fff' }}>{p.requestedByEmail}</strong></span>
                  {p.actionedByEmail && <span>· Actioned by <strong style={{ color: '#fff' }}>{p.actionedByEmail}</strong></span>}
                  {p.flutterwaveReference && <span>· FLW ref: <code>{p.flutterwaveReference}</code></span>}
                </Box>
                {Object.keys(p.destination ?? {}).length > 0 && (
                  <Box sx={{ p: 1, borderRadius: 1, background: alpha('#fff', 0.025), fontSize: '0.72rem', color: 'text.secondary' }}>
                    {Object.entries(p.destination).map(([k, v]) => (
                      <Box key={k}><strong>{k}:</strong> {String(v)}</Box>
                    ))}
                  </Box>
                )}
                {p.notes && (
                  <Typography sx={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'text.secondary' }}>"{p.notes}"</Typography>
                )}
                {p.status === 'requested' && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    <Button size="small" variant="outlined" onClick={() => setStatus(p, 'in_progress')}>Mark in-progress</Button>
                    <Button size="small" variant="contained" onClick={() => setEditing(p)} sx={{ background: neonGreen, color: '#000' }}>
                      Mark completed
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => setStatus(p, 'cancelled')}>Cancel</Button>
                  </Box>
                )}
                {p.status === 'in_progress' && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    <Button size="small" variant="contained" onClick={() => setEditing(p)} sx={{ background: neonGreen, color: '#000' }}>
                      Mark completed
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => setStatus(p, 'failed')}>Mark failed</Button>
                  </Box>
                )}
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onClose={() => setCreating(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request house payout</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, pt: 1 }}>
            <TextField
              label="Amount (USD)" size="small" type="number" required
              value={amountUsd} onChange={e => setAmountUsd(e.target.value)}
              inputProps={{ step: 0.01, min: 0 }}
            />
            <TextField
              select size="small" label="Destination currency"
              value={currency} onChange={e => setCurrency(e.target.value)}
            >
              {['NGN', 'USD', 'EUR', 'GBP', 'KES', 'GHS', 'ZAR'].map(c =>
                <MenuItem key={c} value={c}>{c}</MenuItem>,
              )}
            </TextField>
            <TextField
              label="Bank name" size="small" sx={{ gridColumn: 'span 2' }}
              value={bank} onChange={e => setBank(e.target.value)}
            />
            <TextField
              label="Account number" size="small"
              value={accountNo} onChange={e => setAccountNo(e.target.value)}
            />
            <TextField
              label="Beneficiary name" size="small"
              value={accountName} onChange={e => setAccountName(e.target.value)}
            />
            <TextField
              label="Notes (optional)" size="small" multiline minRows={2}
              sx={{ gridColumn: 'span 2' }}
              value={notes} onChange={e => setNotes(e.target.value)}
              inputProps={{ maxLength: 500 }}
            />
          </Box>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 1.5 }}>
            All admins will receive an email summary. Action the actual transfer in Flutterwave's dashboard, then mark this request <strong>completed</strong> here with the FLW reference.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreating(false)}>Cancel</Button>
          <Button
            variant="contained" disabled={saving}
            onClick={create}
            sx={{ background: neonGreen, color: '#000', fontWeight: 800 }}
          >
            {saving ? 'Submitting…' : 'Submit request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark-completed dialog */}
      {editing && (
        <CompleteDialog
          payout={editing}
          onClose={() => setEditing(null)}
          onDone={async (ref, notes) => {
            await setStatus(editing, 'completed', { flutterwaveReference: ref || undefined, notes: notes || undefined });
            setEditing(null);
          }}
        />
      )}
    </Box>
  );
}

function CompleteDialog({ payout, onClose, onDone }: { payout: HousePayout; onClose: () => void; onDone: (ref: string, notes: string) => void }) {
  const [ref, setRef] = useState(payout.flutterwaveReference ?? '');
  const [notes, setNotes] = useState(payout.notes ?? '');
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark payout completed</DialogTitle>
      <DialogContent>
        <TextField
          label="Flutterwave reference" size="small" fullWidth sx={{ mb: 1.5, mt: 1 }}
          value={ref} onChange={e => setRef(e.target.value)}
        />
        <TextField
          label="Notes" size="small" fullWidth multiline minRows={2}
          value={notes} onChange={e => setNotes(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onDone(ref, notes)} sx={{ background: neonGreen, color: '#000' }}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
