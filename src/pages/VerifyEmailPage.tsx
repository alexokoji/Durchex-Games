import { useState } from 'react';
import { Box, Typography, Button, Alert, TextField, CircularProgress } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { neonGreen } from '../theme';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const navigate = useNavigate();

  const email = auth.user?.email ?? params.get('email') ?? '';
  const [code, setCode] = useState(params.get('token') ?? params.get('code') ?? '');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resentMsg, setResentMsg] = useState<string | null>(null);

  async function submit() {
    if (!email) { setError('We could not determine your email — please sign in again.'); return; }
    if (code.trim().length < 4) { setError('Enter the code from your email.'); return; }
    setBusy(true); setError(null);
    const r = await auth.verifyEmail(email, code.trim());
    setBusy(false);
    if (r.ok) setDone(true);
    else setError((r.error ?? 'verification_failed').replace(/_/g, ' '));
  }

  async function resend() {
    setResending(true); setError(null); setResentMsg(null);
    const r = await auth.resendVerification();
    setResending(false);
    if (r.ok) setResentMsg('A new code is on its way to your inbox.');
    else setError((r.error ?? 'resend_failed').replace(/_/g, ' '));
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
      {done ? (
        <>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>✓ Verified</Typography>
          <Typography sx={{ color: 'text.secondary' }}>Your email is verified. You're all set.</Typography>
          <Button variant="contained" onClick={() => navigate('/')}>Go to home</Button>
        </>
      ) : (
        <Box sx={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Verify your email</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 0.5 }}>
            Enter the 6-digit code we sent to
          </Typography>
          <Typography sx={{ fontWeight: 700, mb: 2.5 }}>{email || 'your email'}</Typography>

          <TextField
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="••••••"
            inputProps={{ inputMode: 'numeric', style: { textAlign: 'center', fontSize: 28, letterSpacing: 12, fontWeight: 800, fontFamily: 'monospace' } }}
            fullWidth
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
            sx={{ mb: 2 }}
          />

          {error && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{error}</Alert>}
          {resentMsg && <Alert severity="success" sx={{ mb: 2, textAlign: 'left' }}>{resentMsg}</Alert>}

          <Button
            fullWidth variant="contained" onClick={submit} disabled={busy || code.trim().length < 4}
            sx={{ fontWeight: 900, background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`, color: '#000', mb: 1.5 }}>
            {busy ? <CircularProgress size={20} color="inherit" /> : 'Verify email'}
          </Button>

          <Button fullWidth size="small" onClick={resend} disabled={resending}
            sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {resending ? 'Sending…' : "Didn't get it? Resend code"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
