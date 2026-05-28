import { useState } from 'react';
import { Box, Typography, Button, Switch, TextField, Select, MenuItem, Chip, Alert, CircularProgress, FormControl, InputLabel } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useBetSlip } from '../virtual-sports/core/BetSlipContext';
import { useToasts } from '../contexts/ToastContext';
import type { OddsFormat } from '../virtual-sports/core/types';
import { FIAT, ALL_FIAT_CODES, type FiatCurrency } from '../utils/currency';
import { darkBorder, darkCard, neonBlue, neonGreen } from '../theme';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SaveIcon from '@mui/icons-material/Save';

export default function SettingsPage() {
  const { isAuthenticated, openAuthPrompt, user, redetectCurrency } = useAuth();
  const wallet = useWallet();
  const slip = useBetSlip();
  const toasts = useToasts();
  const [username, setUsername] = useState(user?.username ?? '');
  const [emailNotify, setEmailNotify] = useState(true);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [detecting, setDetecting] = useState(false);

  // Currency selector state — seeded from current wallet currency.
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrency>(wallet.currency);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const currencyChanged = selectedCurrency !== wallet.currency;

  async function handleRedetect() {
    setDetecting(true);
    const r = await redetectCurrency();
    setDetecting(false);
    if (r.ok) {
      setSelectedCurrency(r.currency);
      toasts.success('Currency updated', `Set to ${r.currency} based on your location.`);
    } else {
      toasts.error('Detection failed', r.error.replace(/_/g, ' '));
    }
  }

  async function handleSaveCurrency() {
    if (!currencyChanged) return;
    setSavingCurrency(true);
    const result = await wallet.changeCurrency(selectedCurrency);
    setSavingCurrency(false);
    if (result.ok) {
      toasts.success(
        'Currency changed',
        `Your account is now in ${selectedCurrency}. Balance converted at reference rates.`,
      );
    } else if (result.error === 'currency_change_blocked_pending_bets') {
      toasts.error(
        'Cannot change currency',
        `You have ${result.pendingCount ?? 'open'} unsettled bet${(result.pendingCount ?? 2) > 1 ? 's' : ''}. Wait for them to settle first.`,
      );
      setSelectedCurrency(wallet.currency);   // revert selector
    } else {
      toasts.error('Currency change failed', result.error.replace(/_/g, ' '));
      setSelectedCurrency(wallet.currency);
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sign in required</Typography>
        <Button variant="contained" onClick={openAuthPrompt}>Sign in</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 3 }, maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>Settings</Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem' }}>
        Tweak how the platform looks and behaves for you.
      </Typography>

      <SectionCard title="Account">
        <FieldRow label="Username">
          <TextField size="small" value={username} onChange={e => setUsername(e.target.value)} />
        </FieldRow>
        <FieldRow label="Email">
          <TextField size="small" value={user.email} disabled />
        </FieldRow>
        <FieldRow label="Currency">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={selectedCurrency}
                label="Currency"
                onChange={e => setSelectedCurrency(e.target.value as FiatCurrency)}
              >
                {ALL_FIAT_CODES.map(code => {
                  const m = FIAT[code];
                  return (
                    <MenuItem key={code} value={code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 700, minWidth: 42 }}>{code}</Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {m.symbol} · {m.name}
                        </Typography>
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="outlined"
              startIcon={detecting ? <CircularProgress size={13} /> : <MyLocationIcon sx={{ fontSize: 16 }} />}
              onClick={handleRedetect}
              disabled={detecting}
              sx={{ borderColor: neonGreen, color: neonGreen, textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              {detecting ? 'Detecting…' : 'Auto-detect'}
            </Button>
          </Box>
        </FieldRow>

        {currencyChanged && (
          <Alert severity="warning" sx={{ mt: 1, mb: 0.5, fontSize: '0.78rem', py: 0.5 }}>
            Your balance will be converted to <strong>{selectedCurrency}</strong> at reference exchange rates.
            Any unsettled bets must be settled first.
          </Alert>
        )}

        <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            disabled={!currencyChanged || savingCurrency}
            startIcon={savingCurrency ? <CircularProgress size={13} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
            onClick={handleSaveCurrency}
            sx={{ textTransform: 'none' }}
          >
            {savingCurrency ? 'Saving…' : 'Save currency'}
          </Button>
          {currencyChanged && (
            <Button
              size="small" variant="text"
              onClick={() => setSelectedCurrency(wallet.currency)}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </SectionCard>

      <SectionCard title="Betting">
        <FieldRow label="Odds format">
          <Select
            size="small"
            value={slip.oddsFormat}
            onChange={e => slip.setOddsFormat(e.target.value as OddsFormat)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="decimal">Decimal (1.85)</MenuItem>
            <MenuItem value="fractional">Fractional (17/20)</MenuItem>
            <MenuItem value="american">American (-118)</MenuItem>
          </Select>
        </FieldRow>
      </SectionCard>

      <SectionCard title="Display">
        <ToggleRow label="Hide balance amounts" desc="Mask balances and bets behind dots — useful in public spaces." checked={hideAmounts} onChange={setHideAmounts} />
        <ToggleRow label="Reduced motion" desc="Disable non-essential animations." checked={!animations} onChange={(v) => setAnimations(!v)} />
      </SectionCard>

      <SectionCard title="Notifications">
        <ToggleRow label="Email me promo offers" desc="Get cashback reminders, weekly reload alerts, and tournament invites." checked={emailNotify} onChange={setEmailNotify} />
      </SectionCard>
    </Box>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2, mb: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
      <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', mb: 1.5, color: neonBlue, letterSpacing: '0.05em' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.75 }}>
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</Typography>
      {children}
    </Box>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{desc}</Typography>
      </Box>
      <Switch checked={checked} onChange={e => onChange(e.target.checked)} />
    </Box>
  );
}
