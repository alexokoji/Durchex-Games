import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Landing page for the OAuth redirect. The server appends the token pair as
 * URL fragment params (#access=...&refresh=...) — we read them, hand them
 * to AuthContext, then push the user back to home.
 */
export default function OAuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) { setError('No tokens in callback URL.'); return; }
    const params = new URLSearchParams(hash);
    const err     = params.get('error');
    if (err) { setError(err); return; }
    const access  = params.get('access');
    const refresh = params.get('refresh');
    if (!access || !refresh) { setError('Missing tokens in callback.'); return; }

    auth.acceptOAuthTokens(access, refresh).then(r => {
      if (r.ok) {
        // Wipe the fragment so a hard refresh doesn't replay the tokens.
        window.history.replaceState({}, '', window.location.pathname);
        navigate('/', { replace: true });
      } else {
        setError(r.error);
      }
    });
  }, [auth, navigate]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
      {error ? (
        <>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Sign-in failed</Typography>
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 380 }}>
            {error.replace(/_/g, ' ')}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>Back to home</Button>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography sx={{ color: 'text.secondary' }}>Signing you in…</Typography>
        </>
      )}
    </Box>
  );
}
