import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button, Alert } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type State = 'verifying' | 'ok' | 'error';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const email = params.get('email');
    const token = params.get('token');
    if (!email || !token) {
      setState('error');
      setError('Missing email or token in the verification link.');
      return;
    }
    auth.verifyEmail(email, token).then(r => {
      if (r.ok) setState('ok');
      else { setState('error'); setError(r.error); }
    });
  }, [params, auth]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
      {state === 'verifying' && (
        <>
          <CircularProgress />
          <Typography sx={{ color: 'text.secondary' }}>Verifying your email…</Typography>
        </>
      )}
      {state === 'ok' && (
        <>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>✓ Verified</Typography>
          <Typography sx={{ color: 'text.secondary' }}>Your email is verified. You're all set.</Typography>
          <Button variant="contained" onClick={() => navigate('/')}>Go to home</Button>
        </>
      )}
      {state === 'error' && (
        <>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Verification failed</Typography>
          <Alert severity="error" sx={{ maxWidth: 420 }}>{error?.replace(/_/g, ' ')}</Alert>
          <Button variant="outlined" onClick={() => navigate('/')}>Back to home</Button>
        </>
      )}
    </Box>
  );
}
