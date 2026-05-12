import { useState } from 'react';
import { Box, Typography, Button, Switch, TextField, Select, MenuItem } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useBetSlip } from '../virtual-sports/core/BetSlipContext';
import type { OddsFormat } from '../virtual-sports/core/types';
import { darkBorder, darkCard, neonBlue } from '../theme';

export default function SettingsPage() {
  const { isAuthenticated, openAuthPrompt, user } = useAuth();
  const slip = useBetSlip();
  const [username, setUsername] = useState(user?.username ?? '');
  const [emailNotify, setEmailNotify] = useState(true);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [animations, setAnimations] = useState(true);

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
        <Button variant="contained" sx={{ mt: 1 }} disabled>Save changes (backend pending)</Button>
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
