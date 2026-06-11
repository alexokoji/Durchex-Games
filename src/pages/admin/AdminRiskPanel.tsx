import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Alert, CircularProgress, TextField, Chip, LinearProgress, Slider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type RiskSnapshot, type RiskConfigDto } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useToasts } from '../../contexts/ToastContext';
import { formatMoney, FIAT, usdApprox } from '../../utils/currency';

type Field = keyof RiskConfigDto;

/**
 * Each field carries:
 *  • `label`  — plain-English name a layman can grasp
 *  • `tech`   — the technical key/name (for staff already familiar)
 *  • `unit`   — how the value displays ('%', 'x', 'days', 'USD')
 *  • `help`   — full sentence explanation of what the dial does
 *  • `scale`  — 'percent' multiplies by 100 for display, 'identity' shows raw
 */
interface FieldDef {
  key: Field;
  label: string;
  tech: string;
  unit: '%' | '×' | 'days' | 'USD' | '';
  step: number;
  min: number;
  max: number;
  help: string;
  scale: 'percent' | 'identity';
}

interface Section {
  id: string;
  title: string;
  blurb: string;
  fields: FieldDef[];
}

const SECTIONS: Section[] = [
  {
    id: 'payout-band',
    title: 'Player payout band',
    blurb:
      'How much money the platform pays back to players over time. This is the most important dial — keep it just below 1 (100%) so the house stays profitable but players still feel like they\'re winning.',
    fields: [
      {
        key: 'rtpTargetMin', label: 'Pay back at least', tech: 'rtpTargetMin',
        unit: '%', step: 0.5, min: 70, max: 100, scale: 'percent',
        help: 'The floor of the player-return band. If the platform pays back LESS than this over a day, the engine quietly nudges luck back toward players. Lower this to keep more money in the house.',
      },
      {
        key: 'rtpTargetMax', label: 'Pay back at most', tech: 'rtpTargetMax',
        unit: '%', step: 0.5, min: 70, max: 110, scale: 'percent',
        help: 'The ceiling. If players are winning MORE than this over a day, the engine tightens up. Don\'t set this above 100% unless you want to run loss-leader promos.',
      },
      {
        key: 'baseOverround', label: 'Default house edge', tech: 'baseOverround',
        unit: '×', step: 0.005, min: 1.0, max: 1.5, scale: 'identity',
        help: 'The built-in margin baked into every odds price. 1.05 = 5% house edge. Raising this makes the house more profitable but odds look worse to bettors.',
      },
    ],
  },
  {
    id: 'sports-feel',
    title: 'Virtual sports feel',
    blurb: 'How wild or predictable the simulated matches are. These don\'t fix outcomes — they bias the random match engine.',
    fields: [
      {
        key: 'volatility', label: 'Match craziness', tech: 'volatility',
        unit: '×', step: 0.05, min: 0.3, max: 2.5, scale: 'identity',
        help: 'How dramatic match results swing. 1.0 is normal. Higher = more high-scoring games and shocks. Lower = more predictable scorelines.',
      },
      {
        key: 'drawRate', label: 'Draws & ties', tech: 'drawRate',
        unit: '×', step: 0.05, min: 0.3, max: 2.5, scale: 'identity',
        help: 'How often matches end level. 1.0 is realistic. Higher = more draws (good for soccer realism, kills cup-style markets).',
      },
      {
        key: 'upsetRate', label: 'Underdog wins', tech: 'upsetRate',
        unit: '×', step: 0.05, min: 0.3, max: 2.5, scale: 'identity',
        help: 'How often the weaker team beats the favourite. 1.0 = realistic. Higher = more shocks (favourites pay out less, popular bets lose more often).',
      },
    ],
  },
  {
    id: 'crash',
    title: 'Crash — Multiplier game',
    blurb: 'Controls the bust curve for the Crash game. "Bust" = where the multiplier crashes.',
    fields: [
      {
        key: 'crashHouseEdge', label: 'Crash house edge', tech: 'crashHouseEdge',
        unit: '%', step: 0.1, min: 0, max: 20, scale: 'percent',
        help: 'How much the house keeps on average. 1% means players get ~99% back over many rounds. Higher = more profit but players notice the burn.',
      },
      {
        key: 'crashInstaBustRate', label: 'Insta-bust chance (≤ 1.10×)', tech: 'crashInstaBustRate',
        unit: '%', step: 0.5, min: 0, max: 50, scale: 'percent',
        help: 'Probability a round dies almost immediately (before 1.10×). High value = more "burned" feel; players who try to grab quick 1.01×–1.10× cashouts lose more often.',
      },
      {
        key: 'crashMoonshotRate', label: 'Moonshot chance (≥ 10×)', tech: 'crashMoonshotRate',
        unit: '%', step: 0.5, min: 0, max: 50, scale: 'percent',
        help: 'Probability a round flies to 10× or higher. These hook players ("I almost got rich"). Low = stingy game; high = generous, sticky game.',
      },
    ],
  },
  {
    id: 'other-games',
    title: 'Other games',
    blurb: 'House edge dial for each game. Lower = more generous, higher = more profitable. Industry typical: 1–3%.',
    fields: [
      {
        key: 'diceHouseEdge', label: 'Dice house edge', tech: 'diceHouseEdge',
        unit: '%', step: 0.1, min: 0, max: 20, scale: 'percent',
        help: 'How much the house keeps on Dice rolls. 1% is provably-fair industry standard.',
      },
      {
        key: 'plinkoHouseEdge', label: 'Plinko house edge', tech: 'plinkoHouseEdge',
        unit: '%', step: 0.1, min: 0, max: 20, scale: 'percent',
        help: 'Multiplier payout reduction for Plinko. 1% nets ~99% RTP across all risk modes.',
      },
      {
        key: 'slotsRtp', label: 'Slots payback', tech: 'slotsRtp',
        unit: '%', step: 0.5, min: 70, max: 100, scale: 'percent',
        help: 'Average return for slot spins. 95% is a healthy mid-market slot.',
      },
      {
        key: 'minesHouseEdge', label: 'Mines house edge', tech: 'minesHouseEdge',
        unit: '%', step: 0.1, min: 0, max: 20, scale: 'percent',
        help: 'How much Mines pays out below "true odds". 1% means cashouts run ~1% below mathematical fairness.',
      },
      {
        key: 'rouletteHouseEdge', label: 'Roulette house edge', tech: 'rouletteHouseEdge',
        unit: '%', step: 0.1, min: 0, max: 20, scale: 'percent',
        help: 'Edge baked into roulette payouts. 2.7% matches European single-zero; 5.26% matches American double-zero.',
      },
    ],
  },
  {
    id: 'safety-caps',
    title: 'Exposure caps',
    blurb: 'Hard limits that stop catastrophic losses. The platform refuses bets once these are breached.',
    fields: [
      {
        key: 'maxLiabilityUsd', label: 'Max risk per market', tech: 'maxLiabilityUsd',
        unit: 'USD', step: 100, min: 1, max: 1e9, scale: 'identity',
        help: 'The biggest possible payout the platform will accept on any single market. New bets get rejected once this is reached.',
      },
      {
        key: 'maxUserConcentration', label: 'Max share per player', tech: 'maxUserConcentration',
        unit: '%', step: 5, min: 5, max: 100, scale: 'percent',
        help: 'No single player can hold more than this percentage of a market. Prevents one whale from cornering an outcome.',
      },
      {
        key: 'bookingCodeDays', label: 'Bet code lifespan', tech: 'bookingCodeDays',
        unit: 'days', step: 1, min: 1, max: 30, scale: 'identity',
        help: 'How long a shared betslip code stays valid before expiring.',
      },
    ],
  },
];

/** All fields in flat form, for round-tripping with the server. */
const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);

function displayValue(f: FieldDef, raw: number): number {
  return f.scale === 'percent' ? raw * 100 : raw;
}
function storageValue(f: FieldDef, displayed: number): number {
  return f.scale === 'percent' ? displayed / 100 : displayed;
}

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

  function setField(f: FieldDef, displayedStr: string) {
    const displayed = parseFloat(displayedStr);
    if (!Number.isFinite(displayed)) {
      setDraft(d => { const next = { ...d }; delete next[f.key]; return next; });
      return;
    }
    setDraft(d => ({ ...d, [f.key]: storageValue(f, displayed) }));
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
      toasts.success('Settings saved', `${Object.keys(draft).length} dial(s) updated.`);
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
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, mb: 0.5 }}>Risk Controls</Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          Tune how the platform balances player wins against house profit. All
          dials here shape <i>random</i> outcomes — none of them fix a result.
        </Typography>
      </Box>

      {/* Live stats */}
      <Box sx={{
        display: 'grid', gap: 2, mb: 3,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      }}>
        <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What we paid back today
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
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.75 }}>
            Players got back this share of their wagers in the last 24h. Inside the band = healthy.
          </Typography>
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current house edge
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: neonBlue }}>
              {((overround.adjusted - 1) * 100).toFixed(2)}%
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              base {((overround.base - 1) * 100).toFixed(2)}%
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.75 }}>
            Margin currently baked into odds. Higher means the house keeps more of every bet.
          </Typography>
        </Box>
        <Box sx={{ p: 2, borderRadius: 2, background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Markets with action
          </Typography>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: neonGold, mt: 0.5 }}>
            {exposure.length}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.75 }}>
            Open markets that currently have at least one player stake on them.
          </Typography>
        </Box>
      </Box>

      {/* Exposure list */}
      {exposure.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Where the house is most at risk</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>
            Markets ranked by the biggest possible payout we'd owe if every bet on them wins.
          </Typography>
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
                    {(() => {
                      const ngn = Number.isFinite(e.liabilityUsd) ? e.liabilityUsd / FIAT.NGN.usdPerUnit : 0;
                      return `${formatMoney(ngn, 'NGN')} ${usdApprox(ngn, 'NGN')}`;
                    })()}
                  </Typography>
                  <Chip size="small" label={`${e.count} bets`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Save bar */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 2,
        py: 1.5, mb: 2,
        background: alpha('#070a0f', 0.92),
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${darkBorder}`,
        display: 'flex', alignItems: 'center', gap: 1,
      }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
          {Object.keys(draft).length === 0
            ? 'No unsaved changes'
            : `${Object.keys(draft).length} unsaved change${Object.keys(draft).length === 1 ? '' : 's'}`}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button startIcon={<RefreshIcon />} onClick={() => void load()}>Reset</Button>
        <Button
          startIcon={<SaveIcon />}
          variant="contained"
          disabled={saving || Object.keys(draft).length === 0}
          onClick={save}
          sx={{ background: neonGreen, color: '#000', fontWeight: 800 }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </Box>

      {/* Section blocks */}
      {SECTIONS.map(section => (
        <Box key={section.id} sx={{ mb: 3 }}>
          <Box sx={{ mb: 1.25 }}>
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 800 }}>
              {section.title}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.25 }}>
              {section.blurb}
            </Typography>
          </Box>
          <Box sx={{
            display: 'grid', gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          }}>
            {section.fields.map(f => {
              // All editable risk fields are numeric; coerce in case the DTO
              // also carries non-numeric config (e.g. cash-out toggles).
              const rawCurrent = Number(draft[f.key] != null ? draft[f.key]! : config[f.key] ?? 0);
              const displayed = displayValue(f, rawCurrent);
              const isDirty = draft[f.key] != null && draft[f.key] !== config[f.key];
              const showSlider = f.unit !== 'USD'; // USD is too big a range for a slider
              return (
                <Box key={f.key} sx={{
                  p: 2, borderRadius: 2, background: darkCard,
                  border: `1px solid ${isDirty ? alpha(neonGold, 0.5) : darkBorder}`,
                  boxShadow: isDirty ? `0 0 0 3px ${alpha(neonGold, 0.08)}` : 'none',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 800 }}>
                      {f.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled', fontFamily: 'monospace' }}>
                      {f.tech}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TextField
                      size="small" type="number"
                      value={displayed}
                      onChange={e => setField(f, e.target.value)}
                      inputProps={{ step: f.step, min: f.min, max: f.max }}
                      sx={{ width: 130 }}
                    />
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 700 }}>
                      {f.unit}
                    </Typography>
                    {isDirty && (
                      <Chip
                        size="small" label="changed"
                        sx={{
                          ml: 'auto',
                          background: alpha(neonGold, 0.12),
                          color: neonGold,
                          fontWeight: 800,
                          fontSize: '0.65rem',
                          height: 20,
                        }}
                      />
                    )}
                  </Box>
                  {showSlider && (
                    <Slider
                      value={Number.isFinite(displayed) ? displayed : f.min}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      onChange={(_, v) => setField(f, String(v))}
                      sx={{
                        color: isDirty ? neonGold : neonGreen,
                        py: 0.5,
                        '& .MuiSlider-thumb': { width: 14, height: 14 },
                      }}
                    />
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mt: 0.5 }}>
                    <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.2 }} />
                    <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.4 }}>
                      {f.help}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}

      {/* Lint guard for unused — keeps Field type in scope when ALL_FIELDS shrinks */}
      <Box sx={{ display: 'none' }}>{ALL_FIELDS.length}</Box>
    </Box>
  );
}
