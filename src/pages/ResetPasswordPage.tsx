import { useState } from 'react';
import { Box, Typography, Button, TextField, Alert } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';

  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !token) { setError('Missing email or token in the link.'); return; }
    if (pwd.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (pwd !== pwd2)   { setError("Passwords don't match.");                  return; }
    setSubmitting(true);
    const r = await auth.resetPassword(email, token, pwd);
    setSubmitting(false);
    if (r.ok) setDone(true);
    else setError(r.error);
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Box component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Choose a new password</Typography>
        {done ? (
          <>
            <Alert severity="success">Your password has been reset.</Alert>
            <Button variant="contained" onClick={() => navigate('/')}>Go to home</Button>
          </>
        ) : (
          <>
            {error && <Alert severity="error">{error.replace(/_/g, ' ')}</Alert>}
            <TextField size="small" label="New password" type="password" value={pwd}  onChange={e => setPwd(e.target.value)}  required />
            <TextField size="small" label="Confirm new password" type="password" value={pwd2} onChange={e => setPwd2(e.target.value)} required />
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
