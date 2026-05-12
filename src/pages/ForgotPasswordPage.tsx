import { useState } from 'react';
import { Box, Typography, Button, TextField, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const r = await auth.forgotPassword(email);
    setSubmitting(false);
    if (r.ok) setSent(true);
    else setError(r.error);
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Box component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Reset your password</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Tell us the email on the account and we'll send a reset link.
        </Typography>
        {sent ? (
          <Alert severity="success">If that email exists, a reset link is on its way.</Alert>
        ) : (
          <>
            {error && <Alert severity="error">{error.replace(/_/g, ' ')}</Alert>}
            <TextField
              type="email" size="small" label="Email"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </>
        )}
        <Button onClick={() => navigate('/')}>Back to home</Button>
      </Box>
    </Box>
  );
}
