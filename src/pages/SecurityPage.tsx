import { useState } from 'react';
import { Box, Typography, Button, Switch, TextField, Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import DevicesIcon from '@mui/icons-material/Devices';
import { neonGreen, neonBlue, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';

export default function SecurityPage() {
  const { isAuthenticated, openAuthPrompt, user } = useAuth();
  const [twoFA, setTwoFA] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);
  const [withdrawConfirm, setWithdrawConfirm] = useState(true);

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
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>Security</Typography>
      <Typography sx={{ color: 'text.secondary', mb: 3, fontSize: '0.9rem' }}>
        Manage how you sign in, what gets confirmed, and where the account is active.
      </Typography>

      {/* Password */}
      <SectionCard title="Password" icon={<LockIcon sx={{ color: neonBlue }} />}>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1.5 }}>
          Last changed: never. We recommend rotating every 90 days.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <TextField type="password" size="small" placeholder="Current password" fullWidth />
          <TextField type="password" size="small" placeholder="New password" fullWidth />
          <TextField type="password" size="small" placeholder="Confirm new password" fullWidth />
        </Box>
        <Button variant="contained" sx={{ mt: 1.5 }} disabled>Update password (backend pending)</Button>
      </SectionCard>

      {/* 2FA */}
      <SectionCard title="Two-Factor Authentication" icon={<VerifiedUserIcon sx={{ color: neonGreen }} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>Authenticator app</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              Requires a 6-digit code from Google Authenticator / Authy on sign-in.
            </Typography>
          </Box>
          <Switch checked={twoFA} onChange={e => setTwoFA(e.target.checked)} />
        </Box>
        {twoFA && (
          <Chip
            label="2FA pending backend wiring"
            size="small"
            sx={{ mt: 1.5, background: alpha(neonGreen, 0.12), color: neonGreen, fontWeight: 700 }}
          />
        )}
      </SectionCard>

      {/* Confirmations */}
      <SectionCard title="Confirmations" icon={<LockIcon sx={{ color: '#ff9f43' }} />}>
        <ToggleRow
          label="Confirm withdrawals by email"
          desc="We'll send a one-time code before any withdrawal is processed."
          checked={withdrawConfirm}
          onChange={setWithdrawConfirm}
        />
        <ToggleRow
          label="Email me on sign-in from new device"
          desc="You'll get a notification any time someone signs in from an unrecognized browser or location."
          checked={emailNotify}
          onChange={setEmailNotify}
        />
      </SectionCard>

      {/* Sessions */}
      <SectionCard title="Active Sessions" icon={<DevicesIcon sx={{ color: '#a855f7' }} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700 }}>This browser</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Started just now · {user.email}
            </Typography>
          </Box>
          <Chip
            label="Active"
            size="small"
            sx={{ background: alpha(neonGreen, 0.15), color: neonGreen, fontWeight: 700 }}
          />
        </Box>
        <Button variant="outlined" color="error" sx={{ mt: 1.5 }} disabled>
          Sign out all other devices (backend pending)
        </Button>
      </SectionCard>
    </Box>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2, mb: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {icon}
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>{title}</Typography>
      </Box>
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
