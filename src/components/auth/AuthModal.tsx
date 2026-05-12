import { useState } from 'react';
import {
  Dialog, Box, Typography, Button, TextField, IconButton,
  Tabs, Tab, Divider, InputAdornment, Checkbox, FormControlLabel, Link, Alert,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { motion } from 'framer-motion';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import DiGLogo from '../layout/DiGLogo';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'register';
}

type Mode = 'signin' | 'register' | 'forgot';

function GoogleIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Box>
  );
}

function AppleIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 18, height: 18, fill: '#fff' }}>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Box>
  );
}

function humanError(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case 'invalid_credentials': return "That email and password don't match an account.";
    case 'email_taken':         return 'An account with that email already exists.';
    case 'username_taken':      return 'That username is already taken.';
    case 'validation_error':    return 'Some of the details look wrong — double-check the form.';
    case 'http_429':            return 'Too many attempts — wait a minute and try again.';
    default:                    return code.replace(/_/g, ' ');
  }
}

export default function AuthModal({ open, onClose, initialMode = 'signin' }: AuthModalProps) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [accepted, setAccepted] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  function reset() {
    setLocalError(null);
    setForgotSent(false);
  }

  function close() {
    reset();
    setPassword('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (mode === 'forgot') {
      const r = await auth.forgotPassword(email);
      if (r.ok) setForgotSent(true);
      else setLocalError(humanError(r.error));
      return;
    }
    if (mode === 'register' && !accepted) {
      setLocalError('Please accept the terms to continue.');
      return;
    }
    if (!email || !password) {
      setLocalError('Email and password are required.');
      return;
    }
    if (mode === 'register' && username.length < 3) {
      setLocalError('Username must be at least 3 characters.');
      return;
    }

    const result = mode === 'signin'
      ? await auth.signIn(email, password)
      : await auth.signUp(email, username, password);
    if (!result.ok) {
      setLocalError(humanError(result.error));
    }
  }

  const isForgot   = mode === 'forgot';
  const isRegister = mode === 'register';
  const errorText  = localError ?? humanError(auth.authError);

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          position: 'relative',
          background: `linear-gradient(135deg, ${alpha(neonGreen, 0.12)}, ${alpha(neonBlue, 0.1)})`,
          px: 3, pt: 3, pb: 2,
          borderBottom: `1px solid ${darkBorder}`,
        }}
      >
        <IconButton onClick={close} size="small" sx={{ position: 'absolute', top: 8, right: 8 }}>
          <CloseIcon fontSize="small" />
        </IconButton>

        {isForgot && (
          <IconButton onClick={() => { setMode('signin'); reset(); }} size="small" sx={{ position: 'absolute', top: 8, left: 8 }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <DiGLogo size={28} />
          <Typography variant="h6" sx={{
            fontWeight: 900,
            background: `linear-gradient(90deg, ${neonGreen}, ${neonBlue})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            DUCHEXiGAMES
          </Typography>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
          {isForgot ? 'Reset password' : isRegister ? 'Create account' : 'Welcome back'}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>
          {isForgot
            ? "We'll email you a link to set a new password."
            : isRegister
              ? 'Start playing in seconds — 100% provably fair.'
              : 'Sign in to keep playing.'}
        </Typography>
      </Box>

      {/* Mode tabs */}
      {!isForgot && (
        <Tabs
          value={mode}
          onChange={(_, v) => { setMode(v); reset(); }}
          variant="fullWidth"
          sx={{ borderBottom: `1px solid ${darkBorder}` }}
        >
          <Tab label="Sign in"     value="signin" />
          <Tab label="Create account" value="register" />
        </Tabs>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* OAuth row only on signin/register */}
        {!isForgot && (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth variant="outlined" startIcon={<GoogleIcon />}
                onClick={() => auth.signInWithGoogle()}
                sx={{ borderColor: darkBorder, color: 'text.primary', fontWeight: 700, '&:hover': { borderColor: alpha('#4285F4', 0.5) } }}
              >
                Google
              </Button>
              <Button
                fullWidth variant="outlined" startIcon={<AppleIcon />}
                onClick={() => auth.signInWithApple()}
                sx={{ borderColor: darkBorder, color: 'text.primary', fontWeight: 700, '&:hover': { borderColor: '#fff' } }}
              >
                Apple
              </Button>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Divider sx={{ flex: 1, borderColor: darkBorder }} />
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', letterSpacing: '0.1em' }}>OR</Typography>
              <Divider sx={{ flex: 1, borderColor: darkBorder }} />
            </Box>
          </>
        )}

        {errorText && <Alert severity="error" sx={{ py: 0, fontSize: '0.78rem' }}>{errorText}</Alert>}
        {forgotSent && <Alert severity="success" sx={{ py: 0, fontSize: '0.78rem' }}>If that email exists, a reset link is on its way.</Alert>}

        {isRegister && (
          <TextField
            label="Username" size="small" value={username}
            onChange={e => setUsername(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }}
          />
        )}

        <TextField
          label="Email" size="small" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment> }}
        />

        {!isForgot && (
          <TextField
            label="Password" size="small"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd(p => !p)}>
                    {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        {isRegister && (
          <FormControlLabel
            control={<Checkbox size="small" checked={accepted} onChange={e => setAccepted(e.target.checked)} />}
            label={<Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>I'm 18+ and accept the terms of service.</Typography>}
          />
        )}

        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={auth.isSubmitting}
            sx={{
              py: 1.1, fontWeight: 900, fontSize: '0.95rem',
              background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
              color: '#000',
              boxShadow: `0 0 20px ${alpha(neonGreen, 0.4)}`,
              '&:hover': { boxShadow: `0 0 30px ${alpha(neonGreen, 0.6)}` },
              '&.Mui-disabled': { background: alpha('#fff', 0.06), color: 'text.disabled' },
            }}
          >
            {auth.isSubmitting
              ? 'Please wait…'
              : isForgot ? 'Send reset link'
              : isRegister ? 'Create account'
              : 'Sign in'}
          </Button>
        </motion.div>

        {!isForgot && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => { setMode('forgot'); reset(); }}
              sx={{ fontSize: '0.78rem', color: neonBlue }}
            >
              Forgot password?
            </Link>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>
              {isRegister ? '0.05 BTC welcome' : null}
            </Typography>
          </Box>
        )}

        {isRegister && (
          <Box sx={{
            mt: 1, p: 1.25, borderRadius: 1.5,
            background: alpha(neonGold, 0.05),
            border: `1px solid ${alpha(neonGold, 0.2)}`,
          }}>
            <Typography sx={{ fontSize: '0.72rem', color: neonGold, fontWeight: 700 }}>
              🎁 Welcome bonus
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              We'll credit a small playable balance the first time you sign in.
            </Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}
