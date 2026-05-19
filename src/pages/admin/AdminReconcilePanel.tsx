import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Alert, CircularProgress, Chip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import SearchIcon from '@mui/icons-material/Search';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type PendingDepositRow, type ReconcileResult, type ReconcileSweepResult } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

/** Friendly copy + tone for every possible reconcile outcome. Mirrors the
 *  server-side `ReconcileOutcome` union. */
function explainResult(r: ReconcileResult): { tone: string; label: string } {
  if (r.ok && r.status === 'credited')         return { tone: neonGreen, label: 'Credited — user balance updated' };
  if (r.ok && r.status === 'already_credited') return { tone: neonBlue,  label: 'Already credited — nothing to do' };
  if (!r.ok && r.status === 'not_successful')  return { tone: neonGold,  label: `Flutterwave status: ${r.flwStatus ?? 'unknown'} — not successful, no credit` };
  if (!r.ok && r.status === 'not_found')       return { tone: '#94a3b8', label: 'No local transaction with that reference' };
  if (!r.ok && r.status === 'user_not_found')  return { tone: '#ff6b7a', label: 'Local transaction exists but the user does not — investigate' };
  if (!r.ok && r.status === 'currency_mismatch') return { tone: '#ff6b7a', label: `Currency mismatch: expected ${r.expected}, got ${r.got}` };
  if (!r.ok && r.status === 'amount_mismatch')   return { tone: '#ff6b7a', label: `Amount mismatch: expected ${r.expected}, got ${r.got}` };
  if (!r.ok && r.status === 'not_fiat')        return { tone: '#ff6b7a', label: 'Crypto transaction — wrong reconciler' };
  if (!r.ok && r.status === 'verify_failed')   return { tone: '#ff6b7a', label: `Flutterwave verify failed: ${r.message}` };
  return { tone: '#94a3b8', label: 'unknown' };
}

export default function AdminReconcilePanel() {
  const toasts = useToasts();
  const [rows, setRows] = useState<PendingDepositRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual lookup form.
  const [lookupRef, setLookupRef] = useState('');
  const [lookupFlwId, setLookupFlwId] = useState('');
  const [trustLocal, setTrustLocal] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<ReconcileResult | null>(null);

  // Per-row reconcile state — keyed by reference so multiple rows can run.
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowResult, setRowResult] = useState<Record<string, ReconcileResult>>({});

  // Sweep dialog state.
  const [sweepOpen, setSweepOpen] = useState(false);
  const [sweepBusy, setSweepBusy] = useState(false);
  const [sweepResult, setSweepResult] = useState<ReconcileSweepResult | null>(null);

  async function load() {
    setIsLoading(true); setError(null);
    try { setRows((await adminApi.pendingDeposits()).rows); }
    catch (err) { setError(err instanceof ApiError ? err.code : 'load_failed'); }
    finally { setIsLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function reconcileOne(ref: string) {
    setRowBusy(s => ({ ...s, [ref]: true }));
    try {
      const r = await adminApi.reconcileDeposit({ txRef: ref });
      setRowResult(s => ({ ...s, [ref]: r }));
      const ex = explainResult(r);
      if (r.ok && r.status === 'credited') toasts.success('Credited', `${ref} — user wallet updated.`);
      else if (r.ok && r.status === 'already_credited') toasts.info('Already credited', ref);
      else toasts.warning('Not credited', ex.label);
      // Refresh the pending list if we successfully credited.
      if (r.ok && r.status === 'credited') void load();
    } catch (err) {
      toasts.error('Reconcile failed', err instanceof ApiError ? err.code : 'unknown');
    } finally {
      setRowBusy(s => ({ ...s, [ref]: false }));
    }
  }

  async function runLookup() {
    if (!lookupRef.trim() && !lookupFlwId.trim()) {
      toasts.warning('Need a reference', 'Paste a tx_ref or a Flutterwave transaction id.');
      return;
    }
    setLookupBusy(true);
    setLookupResult(null);
    try {
      const r = await adminApi.reconcileDeposit({
        txRef:   lookupRef.trim() || undefined,
        flwTxId: lookupFlwId.trim() || undefined,
        trustLocal,
      });
      setLookupResult(r);
      if (r.ok && r.status === 'credited') void load();
    } catch (err) {
      toasts.error('Lookup failed', err instanceof ApiError ? err.code : 'unknown');
    } finally { setLookupBusy(false); }
  }

  async function runSweep() {
    setSweepBusy(true);
    setSweepResult(null);
    try {
      const r = await adminApi.reconcileSweep();
      setSweepResult(r);
      if (r.credited > 0) toasts.success('Sweep complete', `${r.credited} of ${r.scanned} credited.`);
      else toasts.info('Sweep complete', `${r.scanned} scanned, nothing new to credit.`);
      void load();
    } catch (err) {
      toasts.error('Sweep failed', err instanceof ApiError ? err.code : 'unknown');
    } finally { setSweepBusy(false); }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Reconcile deposits</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            Recover deposits that succeeded on Flutterwave but never credited (missed webhook, signature failure, etc.).
            Every reconcile re-verifies against Flutterwave first, so double-credits are impossible.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={() => void load()}>Refresh</Button>
          <Button
            variant="contained" startIcon={<PlayCircleFilledIcon />}
            onClick={() => setSweepOpen(true)}
            sx={{ background: neonGreen, color: '#000', fontWeight: 800 }}
          >
            Reconcile all pending
          </Button>
        </Box>
      </Box>

      {/* Manual lookup form */}
      <Box sx={{
        p: 2, mb: 3, borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(neonBlue, 0.06)}, ${alpha(neonGreen, 0.03)})`,
        border: `1px solid ${darkBorder}`,
      }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, mb: 1 }}>Manual lookup</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1.5 }}>
          Paste either our internal <code>tx_ref</code> (e.g. <code>dep-1779…</code>) or Flutterwave's numeric transaction id.
          The reconciler verifies against Flutterwave then credits if eligible.
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1, mb: 1.5 }}>
          <TextField
            label="tx_ref" size="small" value={lookupRef}
            onChange={e => setLookupRef(e.target.value)}
            placeholder="dep-1779195236457-d4de1f98"
          />
          <TextField
            label="Flutterwave transaction_id" size="small" value={lookupFlwId}
            onChange={e => setLookupFlwId(e.target.value)}
            placeholder="2043565635"
          />
          <Button
            variant="contained" startIcon={<SearchIcon />}
            onClick={runLookup}
            disabled={lookupBusy}
            sx={{ background: neonBlue, color: '#000', fontWeight: 800 }}
          >
            {lookupBusy ? 'Verifying…' : 'Reconcile'}
          </Button>
        </Box>
        <FormControlLabel
          control={<Checkbox size="small" checked={trustLocal} onChange={e => setTrustLocal(e.target.checked)} />}
          label={
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              <strong style={{ color: '#ff6b7a' }}>Trust local</strong> — skip Flutterwave verification and credit based on our pending record. Use only when you have offline proof of payment.
            </Typography>
          }
        />
        {lookupResult && (
          <Alert
            severity={
              lookupResult.ok && lookupResult.status === 'credited' ? 'success'
              : lookupResult.ok ? 'info'
              : 'warning'
            }
            sx={{ mt: 1.5 }}
          >
            {explainResult(lookupResult).label}
          </Alert>
        )}
      </Box>

      {/* Pending list */}
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, mb: 1 }}>
        Pending deposits ({rows.length})
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: neonGreen }} />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="success">No pending deposits — every Flutterwave charge is accounted for.</Alert>
      ) : (
        <Stack spacing={1}>
          {rows.map(r => {
            const userInfo = typeof r.userId === 'object' ? r.userId : null;
            const result = rowResult[r.reference];
            return (
              <Box key={r._id} sx={{
                p: 1.5, borderRadius: 2,
                background: darkCard, border: `1px solid ${darkBorder}`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
                  <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: neonGold, fontVariantNumeric: 'tabular-nums' }}>
                    {r.amount.toFixed(2)} {r.currency}
                  </Typography>
                  <Chip
                    size="small" variant="outlined" label={r.method}
                    sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
                  />
                  {r.flwTxId && (
                    <Chip
                      size="small" label={`FLW ${r.flwTxId}`}
                      sx={{ fontFamily: 'monospace', fontSize: '0.7rem', background: alpha(neonBlue, 0.12), color: neonBlue }}
                    />
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>
                  {userInfo ? <>User: <strong style={{ color: '#fff' }}>{userInfo.username}</strong> · {userInfo.email}</> : <>User id: {String(r.userId)}</>}
                  {' · ref '}
                  <code>{r.reference}</code>
                </Typography>
                {result && (
                  <Alert severity={result.ok && result.status === 'credited' ? 'success' : result.ok ? 'info' : 'warning'} sx={{ mb: 1, py: 0 }}>
                    {explainResult(result).label}
                  </Alert>
                )}
                <Button
                  size="small" variant="contained"
                  disabled={!!rowBusy[r.reference]}
                  onClick={() => reconcileOne(r.reference)}
                  sx={{ background: neonGreen, color: '#000', fontWeight: 700 }}
                >
                  {rowBusy[r.reference] ? 'Verifying…' : 'Verify & credit'}
                </Button>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Sweep dialog */}
      <Dialog open={sweepOpen} onClose={() => !sweepBusy && setSweepOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reconcile all pending deposits</DialogTitle>
        <DialogContent>
          {!sweepResult && !sweepBusy && (
            <Typography sx={{ fontSize: '0.85rem' }}>
              Walk through every pending deposit transaction (up to 200), verify each against Flutterwave,
              and credit the user's wallet if eligible. Already-credited rows are skipped. This is safe to
              run repeatedly — the reconciler is idempotent.
            </Typography>
          )}
          {sweepBusy && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={24} sx={{ color: neonGreen }} />
              <Typography>Verifying each transaction with Flutterwave…</Typography>
            </Box>
          )}
          {sweepResult && (
            <Box>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, mb: 1.5 }}>
                Scanned {sweepResult.scanned} transaction{sweepResult.scanned === 1 ? '' : 's'}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 2 }}>
                <SweepStat label="Credited"      value={sweepResult.credited}        color={neonGreen} />
                <SweepStat label="Already done"  value={sweepResult.alreadyCredited} color={neonBlue} />
                <SweepStat label="Not successful" value={sweepResult.notSuccessful}   color={neonGold} />
                <SweepStat label="Failed"        value={sweepResult.failed}          color="#ff6b7a" />
              </Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, mb: 0.5 }}>Per-row outcomes</Typography>
              <Box sx={{ maxHeight: 260, overflow: 'auto', borderRadius: 1.5, border: `1px solid ${darkBorder}` }}>
                {sweepResult.details.map(d => (
                  <Box key={d.ref} sx={{
                    px: 1.5, py: 0.75,
                    borderBottom: `1px solid ${alpha('#fff', 0.04)}`,
                    fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 1,
                  }}>
                    <code style={{ flex: 1 }}>{d.ref}</code>
                    <Chip size="small" label={d.status} sx={{ height: 16, fontSize: '0.6rem' }} />
                    {d.message && <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>{d.message}</Typography>}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSweepOpen(false)} disabled={sweepBusy}>
            {sweepResult ? 'Close' : 'Cancel'}
          </Button>
          {!sweepResult && (
            <Button
              variant="contained" disabled={sweepBusy}
              onClick={runSweep}
              sx={{ background: neonGreen, color: '#000', fontWeight: 800 }}
            >
              {sweepBusy ? 'Running…' : 'Run sweep'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SweepStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box sx={{
      p: 1.25, borderRadius: 1.5,
      background: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.25)}`,
      textAlign: 'center',
    }}>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
    </Box>
  );
}
