import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Alert, CircularProgress, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type FlaggedReferral } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

const FLAG_LABELS: Record<FlaggedReferral['referralAbuseFlag'], { text: string; tone: string }> = {
  self_device:      { text: 'Same device as inviter',  tone: '#ff6b7a' },
  self_ip:          { text: 'Same IP as inviter',      tone: neonGold },
  duplicate_device: { text: 'Duplicate device (sibling referee)', tone: '#ff6b7a' },
  duplicate_ip:     { text: 'Duplicate IP (sibling referee)',     tone: neonGold },
};

export default function AdminFlaggedPanel() {
  const toasts = useToasts();
  const [items, setItems] = useState<FlaggedReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const r = await adminApi.flaggedReferrals();
      setItems(r.flagged);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function clear(u: FlaggedReferral) {
    try {
      await adminApi.clearFlag(u._id);
      toasts.success('Flag cleared', `${u.username} no longer marked.`);
      await load();
    } catch (err) {
      toasts.error('Clear failed', err instanceof ApiError ? err.code : 'unknown');
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          Users whose referral attribution tripped an anti-abuse signal. Signup itself succeeded; the inviter just doesn't get credit.
        </Typography>
        <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load: {error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: neonGreen }} />
        </Box>
      ) : items.length === 0 ? (
        <Alert severity="success">No flagged signups in the recent window.</Alert>
      ) : (
        <Stack spacing={1.5}>
          {items.map(u => {
            const flag = FLAG_LABELS[u.referralAbuseFlag];
            const inviter = u.referredBy && typeof u.referredBy === 'object' ? u.referredBy : null;
            return (
              <Box key={u._id} sx={{
                p: 2, borderRadius: 2,
                background: darkCard,
                border: `1px solid ${darkBorder}`,
                borderLeft: `4px solid ${flag.tone}`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {u.username} <Typography component="span" sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>· {u.email}</Typography>
                    </Typography>
                    <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>
                      Joined {new Date(u.createdAt).toLocaleString()}
                      {u.countryCode && ` · ${u.countryCode}`}
                      {` · wagered ${u.totalWagered.toFixed(2)}`}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={flag.text}
                    sx={{ background: alpha(flag.tone, 0.15), color: flag.tone, fontWeight: 700 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  {inviter && (
                    <Chip size="small" variant="outlined"
                      label={`Inviter: ${inviter.username} (${inviter.referralCode})`}
                    />
                  )}
                  {u.signupIp && (
                    <Chip size="small" variant="outlined" label={`IP: ${u.signupIp}`} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                  )}
                  {u.signupDeviceSignature && (
                    <Chip size="small" variant="outlined" label={`Device: ${u.signupDeviceSignature.slice(0, 12)}…`} sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                  )}
                </Box>
                <Button size="small" variant="outlined" onClick={() => clear(u)}>
                  Clear flag (false positive)
                </Button>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
