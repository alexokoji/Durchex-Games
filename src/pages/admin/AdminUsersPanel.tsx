import { useState } from 'react';
import {
  Box, Typography, TextField, InputAdornment, IconButton, Alert,
  CircularProgress, Chip, Dialog, DialogTitle, DialogContent, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type AdminUserSummary } from '../../api/admin';
import { ApiError } from '../../api/client';

export default function AdminUsersPanel() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 2) {
      setError('Type at least 2 characters');
      setUsers([]);
      return;
    }
    setIsLoading(true); setError(null);
    try {
      const r = await adminApi.searchUsers(q.trim());
      setUsers(r.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'search_failed');
    } finally { setIsLoading(false); }
  }

  async function openDetail(u: AdminUserSummary) {
    try {
      const r = await adminApi.userDetail(u._id);
      setDetail(r.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    }
  }

  return (
    <Box>
      <Box component="form" onSubmit={search} sx={{ display: 'flex', gap: 1, mb: 2, maxWidth: 600 }}>
        <TextField
          fullWidth size="small"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by email, username, or referral code…"
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <IconButton type="submit" sx={{ background: alpha(neonGreen, 0.15), color: neonGreen, borderRadius: 1.5 }}>
          <SearchIcon />
        </IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>
      ) : users.length === 0 ? (
        <Alert severity="info">{q.trim().length === 0 ? 'Search for users by email / username / referral code.' : 'No matches.'}</Alert>
      ) : (
        <Stack spacing={1}>
          {users.map(u => (
            <Box
              key={u._id}
              onClick={() => openDetail(u)}
              sx={{
                p: 1.5, borderRadius: 2, cursor: 'pointer',
                background: darkCard,
                border: `1px solid ${darkBorder}`,
                display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
                '&:hover': { borderColor: alpha(neonBlue, 0.5) },
              }}>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {u.username}
                  <Typography component="span" sx={{ ml: 0.75, fontSize: '0.78rem', color: 'text.secondary' }}>
                    · {u.email}
                  </Typography>
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                  Joined {new Date(u.createdAt).toLocaleDateString()}
                  {u.countryCode && ` · ${u.countryCode}`}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={`${u.currency} ${u.balance.toFixed(2)}`}
                sx={{ background: alpha(neonGold, 0.15), color: neonGold, fontWeight: 700 }}
              />
              {u.bonusBalance > 0 && (
                <Chip size="small" label={`+bonus ${u.bonusBalance.toFixed(2)}`} sx={{ background: alpha(neonBlue, 0.15), color: neonBlue }} />
              )}
              <Chip
                size="small"
                label={`wagered ${u.totalWagered.toFixed(0)}`}
                variant="outlined"
              />
              {u.promoterStatus !== 'none' && (
                <Chip
                  size="small"
                  label={`promoter: ${u.promoterStatus}`}
                  sx={{ background: alpha(neonGreen, 0.12), color: neonGreen, textTransform: 'capitalize' }}
                />
              )}
              {u.referralAbuseFlag && (
                <Chip size="small" label={`flag: ${u.referralAbuseFlag}`} sx={{ background: alpha('#ff6b7a', 0.15), color: '#ff6b7a' }} />
              )}
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle>User detail</DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              fontSize: '0.78rem', fontFamily: 'monospace',
              background: alpha('#000', 0.4),
              p: 2, borderRadius: 1,
              maxHeight: 500, overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}
          >
            {detail ? JSON.stringify(detail, null, 2) : ''}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
