import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, TextField, Chip, LinearProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type RiskSnapshot, type RiskConfigDto } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';

type Field = keyof RiskConfigDto;

const FIELDS: { key: Field; label: string; step: number; min: number; max: number; help: string }[] = [
  { key: 'rtpTargetMin',         label: 'RTP target min',     step: 0.005, min: 0.7,  max: 1.0,  help: 'Lower bound on the 24h RTP band. The engine nudges randomness up when RTP drifts below this.' },
  { key: 'rtpTargetMax',         label: 'RTP target max',     step: 0.005, min: 0.7,  max: 1.1,  help: 'Upper bound on the 24h RTP band.' },
  { key: 'baseOverround',        label: 'Base overround',     step: 0.005, min: 1.0,  max: 1.5,  help: 'Built-in book margin. 1.05 = 5% house edge before adjustment.' },
  { key: 'volatility',           label: 'Volatility',         step: 0.05,  min: 0.3,  max: 2.5,  help: 'Spread of outcome distributions. Higher = more dispersion in goals/points.' },
  { key: 'drawRate',             label: 'Draw rate',          step: 0.05,  min: 0.3,  max: 2.5,  help: 'Multiplier on the natural draw probability in soccer/hockey.' },
  { key: 'upsetRate',            label: 'Upset rate',         step: 0.05,  min: 0.3,  max: 2.5,  help: 'How often the underdog wins relative to baseline.' },
  { key: 'maxLiabilityUsd',      label: 'Max liability (USD)',step: 100,   min: 1,    max: 1e9,  help: 'Per-market liability cap. Bets rejected once breached.' },
  { key: 'maxUserConcentration', label: 'Max user share',     step: 0.05,  min: 0.05, max: 1,    help: 'Cap on what fraction of a market a single user can hold.' },
  { key: 'bookingCodeDays',      label: 'Booking code TTL (days)', step: 1, min: 1, max: 30, help: 'How long a shared betslip code stays redeemable.' },
];

export default function AdminRiskPanel() {
  const toasts = useToasts();
  const [snap, setSnap] = useState<RiskSnapshot | null>(null);
  const [draft, setDraft] = useState<Partial<RiskConfigDto>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setIsLoading(true); setError(null);
    try {
      const r = await adminApi.risk();
      setSnap(r);
      setDraft({});
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'load_failed');
    } finally { setIsLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function setField(k: Field, v: string) {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) {
      setDraft(d => { const next = { ...d }; delete next[k]; return next; });
      return;
    }
    setDraft(d => ({ ...d, [k]: n }));
  }

  async function save() {
    if (!snap) return;
    if (Object.keys(draft).length === 0) {
      toasts.info('Nothing to save', 'Edit a value first.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateRisk(draft);
      toasts.success('Risk config updated', `${Object.keys(draft).length} field(s) saved.`);
      await load();
    } catch (err) {
      toasts.error('Save failed', err instanceof ApiError ? err.code : 'unknown');
    } finally { setSaving(false); }
  }

  if (isLoading) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: neonGreen }} /></Box>;
  }
  if (error || !snap) {
    return <Alert severity="error">Failed to load: {error ?? 'unknown'}</Alert>;
  }

  const { config, rtp24h, overround, exposure } = snap;
  const rtpInBand = rtp24h >= config.rtpTargetMin && rtp24h <= config.rtpTargetMax;
  const rtpPct = Math.max(0, Math.min(100, ((rtp24h - config.rtpTargetMin) / (config.rtpTargetMax - config.rtpTargetMin)) * 100));

  return (
    <Box>
      {/* Top stats */}
      <Box sx={{
        display: 'grid', gap: 2, mb: 3,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      }}>
        <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            24h RTP
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: rtpInBand ? neonGreen : neonGold }}>
              {(rtp24h * 100).toFixed(2)}%
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              target {(config.rtpTargetMin * 100).toFixed(1)}–{(config.rtpTargetMax * 100).toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={rtpPct}
            sx={{
              mt: 1, height: 5, borderRadius: 2,
              backgroundColor: alpha(neonGreen, 0.15),
              '& .MuiLinearProgress-bar': { background: rtpInBand ? neonGreen : neonGold },
            }}
          />
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Overround
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: neonBlue }}>
              {((overround.adjusted - 1) * 100).toFixed(2)}%
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              base {((overround.base - 1) * 100).toFixed(2)}%
            </Typography>
          </Box>
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Open markets
          </Typography>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: neonGold, mt: 0.5 }}>
            {exposure.length}
          </Typography>
        </Box>
      </Box>

      {/* Exposure list */}
      {exposure.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Liability by market</Typography>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${darkBorder}` }}>
            {exposure.slice(0, 20).map((e, i) => {
              const ratio = Math.min(1, e.liabilityUsd / Math.max(1, config.maxLiabilityUsd));
              const tone = ratio > 0.8 ? '#ff6b7a' : ratio > 0.5 ? neonGold : neonGreen;
              return (
                <Box key={e.market} sx={{
                  px: 2, py: 1.25,
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  borderBottom: i < Math.min(exposure.length, 20) - 1 ? `1px solid ${darkBorder}` : 'none',
                  background: i % 2 === 0 ? alpha('#fff', 0.015) : 'transparent',
                }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 140 }}>{e.market}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={ratio * 100}
                      sx={{
                        height: 6, borderRadius: 2,
                        backgroundColor: alpha(tone, 0.15),
                        '& .MuiLinearProgress-bar': { background: tone },
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums', minWidth: 120, textAlign: 'right' }}>
                    ${e.liabilityUsd.toFixed(2)}
                  </Typography>
                  <Chip size="small" label={`${e.count} bets`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Config form */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Tuning</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<RefreshIcon />} onClick={() => void load()}>Reset</Button>
          <Button
            startIcon={<SaveIcon />}
            variant="contained"
            disabled={saving || Object.keys(draft).length === 0}
            onClick={save}
            sx={{ background: neonGreen, color: '#000', fontWeight: 800 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Box>
      </Box>
      <Box sx={{
        display: 'grid', gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
      }}>
        {FIELDS.map(f => {
          const current = draft[f.key] != null ? draft[f.key]! : config[f.key];
          const isDirty = draft[f.key] != null && draft[f.key] !== config[f.key];
          return (
            <Box key={f.key} sx={{
              p: 1.5, borderRadius: 2, background: darkCard,
              border: `1px solid ${isDirty ? alpha(neonGold, 0.5) : darkBorder}`,
            }}>
              <TextField
                label={f.label}
                size="small" fullWidth type="number"
                value={current}
                onChange={e => setField(f.key, e.target.value)}
                inputProps={{ step: f.step, min: f.min, max: f.max }}
              />
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.75 }}>
                {f.help}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
