import { useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, Alert, CircularProgress, Stack, Chip,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type AuditEntry } from '../../api/admin';
import { ApiError } from '../../api/client';

type Filter = 'all' | 'promoter' | 'promocode' | 'risk' | 'cashback' | 'user';

const ACTION_TONE: Record<string, string> = {
  'promoter.approve':            neonGreen,
  'promoter.ban':                '#ff6b7a',
  'promoter.commission_update':  neonBlue,
  'promocode.create':            neonGreen,
  'promocode.update':            neonBlue,
  'promocode.delete':            '#ff6b7a',
  'risk.update':                 neonGold,
  'cashback.run':                neonBlue,
  'user.view':                   '#888',
};

function matchesFilter(entry: AuditEntry, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'cashback') return entry.action === 'cashback.run';
  if (filter === 'risk')     return entry.action.startsWith('risk.');
  if (filter === 'user')     return entry.action.startsWith('user.');
  return entry.action.startsWith(`${filter}.`);
}

export default function AdminAuditPanel() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  async function load() {
    setIsLoading(true); setError(null);
    try {
      const r = await adminApi.auditLog({ limit: 200 });
      setItems(r.entries);
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    } finally { setIsLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const filtered = items.filter(e => matchesFilter(e, filter));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="promoter">Promoter</ToggleButton>
          <ToggleButton value="promocode">Promo code</ToggleButton>
          <ToggleButton value="risk">Risk</ToggleButton>
          <ToggleButton value="cashback">Cashback</ToggleButton>
          <ToggleButton value="user">User</ToggleButton>
        </ToggleButtonGroup>
        <IconButton onClick={() => void load()}><RefreshIcon /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load: {error}</Alert>}
      {isLoading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: neonGreen }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Alert severity="info">No audit entries.</Alert>
      ) : (
        <Stack spacing={0.75}>
          {filtered.map(e => {
            const tone = ACTION_TONE[e.action] ?? neonBlue;
            const ts = new Date(e.createdAt);
            return (
              <Box key={e._id} sx={{
                px: 1.5, py: 1, borderRadius: 1.5,
                background: darkCard,
                border: `1px solid ${darkBorder}`,
                borderLeft: `3px solid ${tone}`,
                display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
              }}>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontFamily: 'monospace', minWidth: 140 }}>
                  {ts.toLocaleString()}
                </Typography>
                <Chip
                  size="small"
                  label={e.action}
                  sx={{ background: alpha(tone, 0.15), color: tone, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.7rem' }}
                />
                <Typography sx={{ fontSize: '0.78rem', flex: 1, minWidth: 150 }}>
                  <strong>{e.actorEmail}</strong>
                  {e.targetId && <Typography component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>· {e.targetType}:{e.targetId}</Typography>}
                </Typography>
                {e.payload && Object.keys(e.payload).length > 0 && (
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontFamily: 'monospace', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(e.payload)}
                  </Typography>
                )}
                {e.ip && (
                  <Chip size="small" variant="outlined" label={e.ip} sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }} />
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
