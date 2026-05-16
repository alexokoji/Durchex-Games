import { useState } from 'react';
import {
  Box, Typography, IconButton, ToggleButtonGroup, ToggleButton, Button, Chip,
  InputBase, Select, MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import { useAuth } from '../../contexts/AuthContext';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard, darkSurface } from '../../theme';
import { useBetSlip, QUICK_STAKE_PRESETS } from '../core/BetSlipContext';
import { formatOdds } from '../core/oddsEngine';
import type { BetMode, OddsFormat, BetSelection } from '../core/types';
import { bookingCodesApi } from '../../api/bookingCodes';
import { ApiError } from '../../api/client';

interface CodeStatus { kind: 'idle' | 'minting' | 'redeeming' | 'error' | 'ok'; message?: string }

export default function RightBetSlipPanel() {
  const [tab, setTab] = useState<'slip' | 'open' | 'history'>('slip');
  const { selections, openTickets, history } = useBetSlip();

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 320 },
        flexShrink: 0,
        background: darkCard,
        border: `1px solid ${darkBorder}`,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        alignSelf: 'flex-start',
        '@media (min-width: 900px)': {
          position: 'sticky',
          top: '12px',
          maxHeight: 'calc(100vh - 76px)',
        },
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: `1px solid ${darkBorder}` }}>
        <TabBtn label="Slip" count={selections.length} active={tab === 'slip'} onClick={() => setTab('slip')} icon={<ReceiptLongIcon sx={{ fontSize: 14 }} />} />
        <TabBtn label="Open" count={openTickets.length} active={tab === 'open'} onClick={() => setTab('open')} icon={<LockOpenIcon sx={{ fontSize: 14 }} />} />
        <TabBtn label="History" count={history.length} active={tab === 'history'} onClick={() => setTab('history')} icon={<HistoryIcon sx={{ fontSize: 14 }} />} />
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, maxHeight: { xs: 480, md: 'none' } }}>
        {tab === 'slip' && <BetSlipBody />}
        {tab === 'open' && <OpenBetsBody />}
        {tab === 'history' && <HistoryBody />}
      </Box>
    </Box>
  );
}

function TabBtn({ label, count, active, onClick, icon }: { label: string; count: number; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
        cursor: 'pointer',
        background: active ? alpha(neonGreen, 0.12) : 'transparent',
        borderBottom: active ? `2px solid ${neonGreen}` : '2px solid transparent',
        '&:hover': { background: alpha(neonGreen, 0.06) },
      }}
    >
      <Box sx={{ color: active ? neonGreen : 'text.secondary', display: 'flex', alignItems: 'center' }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: active ? neonGreen : 'text.secondary' }}>{label}</Typography>
      {count > 0 && (
        <Chip
          label={count} size="small"
          sx={{
            height: 16, fontSize: '0.58rem', fontWeight: 800, minWidth: 18,
            background: active ? neonGreen : alpha('#fff', 0.1),
            color: active ? '#000' : 'text.secondary',
            '& .MuiChip-label': { px: 0.6 },
          }}
        />
      )}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BET SLIP BODY
// ────────────────────────────────────────────────────────────────────────────

function BetSlipBody() {
  const { isAuthenticated, requireAuth } = useAuth();
  const slip = useBetSlip();
  const { selections, mode, stake, systemK, oddsFormat, computedOdds, potentialPayout, totalStake, systemLines } = slip;
  const [codeInput, setCodeInput] = useState('');
  const [mintedCode, setMintedCode] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<{ kind: 'idle' | 'minting' | 'redeeming' | 'error' | 'ok'; message?: string }>({ kind: 'idle' });

  async function mintCode() {
    if (!isAuthenticated) { requireAuth(); return; }
    if (selections.length === 0) return;
    setCodeStatus({ kind: 'minting' });
    try {
      const r = await bookingCodesApi.mint({
        selections,                    // captured BetSelection[] snapshot
        suggestedStake: stake,
        currency: 'USD',
        label: `${selections.length}-leg slip`,
      });
      setMintedCode(r.code);
      setCodeStatus({ kind: 'ok', message: `Code ${r.code} ready — copy & share` });
    } catch (err) {
      setCodeStatus({ kind: 'error', message: err instanceof ApiError ? err.code : 'mint_failed' });
    }
  }

  async function copyCode() {
    if (!mintedCode) return;
    try { await navigator.clipboard.writeText(mintedCode); } catch { /* ignore */ }
  }

  async function redeemCode() {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setCodeStatus({ kind: 'redeeming' });
    try {
      const r = await bookingCodesApi.redeem(code);
      // Replay each selection into the slip — same shape as a normal pick.
      const sels = (r.selections ?? []) as BetSelection[];
      slip.clearSlip();
      for (const sel of sels) slip.addSelection(sel);
      if (typeof r.suggestedStake === 'number' && r.suggestedStake > 0) slip.setStake(r.suggestedStake);
      setCodeStatus({ kind: 'ok', message: `Loaded ${sels.length} selection${sels.length === 1 ? '' : 's'} from ${code}` });
      setCodeInput('');
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'redeem_failed';
      const msg = code === 'code_not_found' ? 'Code not found'
                : code === 'code_expired'   ? 'Code expired'
                : code;
      setCodeStatus({ kind: 'error', message: msg });
    }
  }

  if (selections.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 0.5 }}>
          Your slip is empty
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1.5 }}>
          Tap any market button to add a selection — or paste a booking code below.
        </Typography>
        <BookingCodeRow
          codeInput={codeInput} setCodeInput={setCodeInput}
          onRedeem={redeemCode} status={codeStatus}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {selections.length} {selections.length === 1 ? 'selection' : 'selections'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Select
            size="small"
            value={oddsFormat}
            onChange={e => slip.setOddsFormat(e.target.value as OddsFormat)}
            sx={{
              height: 22, fontSize: '0.65rem', minWidth: 70,
              '& .MuiSelect-select': { py: 0.25, px: 1 },
            }}
          >
            <MenuItem value="decimal">Decimal</MenuItem>
            <MenuItem value="fractional">Fractional</MenuItem>
            <MenuItem value="american">American</MenuItem>
          </Select>
          <IconButton size="small" onClick={slip.clearSlip} title="Clear slip">
            <DeleteSweepIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <BookingCodeRow
        codeInput={codeInput}
        setCodeInput={setCodeInput}
        onRedeem={redeemCode}
        status={codeStatus}
        canMint
        onMint={mintCode}
        mintedCode={mintedCode}
        onCopy={copyCode}
      />

      {/* Mode toggle — every slip is one ticket. Multi = all-or-nothing; System = k-of-n. */}
      <ToggleButtonGroup
        value={mode === 'single' ? 'multi' : mode}
        exclusive
        size="small"
        onChange={(_, v) => v && slip.setMode(v as BetMode)}
        sx={{
          width: '100%',
          '& .MuiToggleButton-root': {
            flex: 1, py: 0.6, fontSize: '0.7rem', fontWeight: 800,
            border: `1px solid ${darkBorder}`,
            color: 'text.secondary',
            '&.Mui-selected': { background: alpha(neonGreen, 0.18), color: neonGreen, borderColor: alpha(neonGreen, 0.4) },
          },
        }}
      >
        <ToggleButton value="multi">
          {selections.length <= 1 ? 'Single bet' : `Accumulator · ${selections.length}`}
        </ToggleButton>
        <ToggleButton value="system" disabled={selections.length < 3}>System</ToggleButton>
      </ToggleButtonGroup>
      {mode !== 'system' && selections.length >= 2 && (
        <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', textAlign: 'center', lineHeight: 1.3 }}>
          All selections must win for the ticket to pay.
        </Typography>
      )}

      {mode === 'system' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, background: alpha('#fff', 0.03), borderRadius: 1 }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>System</Typography>
          <Select
            size="small"
            value={Math.min(systemK, selections.length)}
            onChange={e => slip.setSystemK(Number(e.target.value))}
            sx={{ height: 22, fontSize: '0.7rem' }}
          >
            {Array.from({ length: Math.max(0, selections.length - 1) }, (_, i) => i + 2).map(k => (
              <MenuItem key={k} value={k}>{k}/{selections.length}</MenuItem>
            ))}
          </Select>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
            {systemLines} lines
          </Typography>
        </Box>
      )}

      {/* Selections list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <AnimatePresence initial={false}>
          {selections.map(sel => (
            <motion.div
              key={sel.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                sx={{
                  p: 0.9, borderRadius: 1.5,
                  background: alpha(neonGreen, 0.05),
                  border: `1px solid ${alpha(neonGreen, 0.2)}`,
                  position: 'relative',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.3 }}>
                  <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                      {sel.marketLabel}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: neonGreen, lineHeight: 1.2 }}>
                      {sel.optionLabel}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.2 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, color: neonGold, fontVariantNumeric: 'tabular-nums' }}>
                      {formatOdds(sel.odds, oddsFormat)}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => slip.removeSelection(sel.id)}
                      sx={{ p: 0, color: 'text.disabled', '&:hover': { color: '#ff4757' } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sel.homeTeam} vs {sel.awayTeam}
                </Typography>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>

      {/* Stake controls */}
      <Box sx={{ background: alpha('#fff', 0.025), p: 1, borderRadius: 1.5, border: `1px solid ${darkBorder}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {mode === 'system' ? 'Stake / line' : 'Stake'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1, py: 0.4, background: '#000', borderRadius: 1,
              border: `1px solid ${darkBorder}`,
            }}
          >
            <InputBase
              type="number"
              inputProps={{ min: 0, step: 0.001 }}
              value={stake}
              onChange={e => slip.setStake(Math.max(0, parseFloat(e.target.value) || 0))}
              sx={{
                fontSize: '0.85rem', fontWeight: 800, color: '#fff', width: 80,
                '& input': { textAlign: 'right', p: 0 },
              }}
            />
            <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>BTC</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 0.75 }}>
          {QUICK_STAKE_PRESETS.map(s => (
            <Box
              key={s}
              onClick={() => slip.setStake(s)}
              sx={{
                py: 0.4, textAlign: 'center', borderRadius: 0.75, cursor: 'pointer',
                background: alpha(neonBlue, 0.08),
                border: `1px solid ${alpha(neonBlue, 0.2)}`,
                color: neonBlue,
                fontSize: '0.62rem', fontWeight: 800,
                '&:hover': { background: alpha(neonBlue, 0.16) },
              }}
            >
              {s.toFixed(s < 0.01 ? 3 : 2)}
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {mode === 'system' ? `${systemLines} combinations` : 'Total stake'}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {totalStake.toFixed(4)}
          </Typography>
        </Box>

        {mode !== 'system' && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              {selections.length > 1 ? 'Combined odds' : 'Odds'}
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: neonGold, fontVariantNumeric: 'tabular-nums' }}>
              {formatOdds(computedOdds, oddsFormat)}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            Potential payout
          </Typography>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: neonGreen, fontVariantNumeric: 'tabular-nums' }}>
            {potentialPayout.toFixed(4)}
          </Typography>
        </Box>
      </Box>

      <Button
        fullWidth
        disabled={selections.length === 0 || stake <= 0}
        onClick={() => {
          if (!isAuthenticated) { requireAuth(); return; }
          slip.placeBet();
        }}
        sx={{
          py: 1, fontWeight: 900, fontSize: '0.85rem',
          background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
          color: '#000',
          '&:hover': { boxShadow: `0 0 30px ${alpha(neonGreen, 0.5)}` },
          '&.Mui-disabled': { background: alpha('#fff', 0.08), color: 'text.disabled' },
        }}
      >
        {isAuthenticated ? 'Place Bet' : 'Sign in to bet'}
      </Button>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BOOKING CODE ROW — share + redeem
// ────────────────────────────────────────────────────────────────────────────

interface BookingCodeRowProps {
  codeInput: string;
  setCodeInput: (v: string) => void;
  onRedeem: () => void;
  status: CodeStatus;
  canMint?: boolean;
  onMint?: () => void;
  mintedCode?: string | null;
  onCopy?: () => void;
}
function BookingCodeRow(props: BookingCodeRowProps) {
  const { codeInput, setCodeInput, onRedeem, status, canMint, onMint, mintedCode, onCopy } = props;
  return (
    <Box sx={{
      p: 1, borderRadius: 1.5,
      background: alpha(neonGold, 0.04),
      border: `1px solid ${alpha(neonGold, 0.18)}`,
      display: 'flex', flexDirection: 'column', gap: 0.5,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LinkIcon sx={{ fontSize: 13, color: neonGold }} />
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: neonGold, letterSpacing: '0.08em' }}>
          BOOKING CODE
        </Typography>
      </Box>

      {/* Redeem row — always available */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <Box sx={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: alpha('#fff', 0.06),
          border: `1px solid ${darkBorder}`,
          borderRadius: 1, px: 1,
        }}>
          <InputBase
            placeholder="AX92LM"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            sx={{ fontSize: '0.78rem', letterSpacing: '0.08em', flex: 1, fontFamily: 'monospace' }}
            onKeyDown={e => { if (e.key === 'Enter') onRedeem(); }}
          />
        </Box>
        <Button
          size="small"
          disabled={!codeInput || status.kind === 'redeeming'}
          onClick={onRedeem}
          sx={{
            fontSize: '0.66rem', fontWeight: 800, py: 0.4, px: 1,
            background: alpha(neonBlue, 0.18),
            color: neonBlue,
            border: `1px solid ${alpha(neonBlue, 0.4)}`,
            '&:hover': { background: alpha(neonBlue, 0.26) },
          }}
        >
          Load
        </Button>
      </Box>

      {/* Mint row — only when there's a slip to share */}
      {canMint && (
        mintedCode ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
              flex: 1, px: 1, py: 0.4,
              background: alpha(neonGreen, 0.1),
              border: `1px solid ${alpha(neonGreen, 0.45)}`,
              borderRadius: 1,
              fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 800,
              color: neonGreen, letterSpacing: '0.18em', textAlign: 'center',
            }}>
              {mintedCode}
            </Box>
            <IconButton size="small" onClick={onCopy} title="Copy code">
              <ContentCopyIcon sx={{ fontSize: 14, color: neonGreen }} />
            </IconButton>
          </Box>
        ) : (
          <Button
            size="small"
            startIcon={<ShareIcon sx={{ fontSize: 13 }} />}
            disabled={status.kind === 'minting'}
            onClick={onMint}
            sx={{
              fontSize: '0.66rem', fontWeight: 800, py: 0.4,
              background: alpha(neonGold, 0.14),
              color: neonGold,
              border: `1px solid ${alpha(neonGold, 0.35)}`,
              '&:hover': { background: alpha(neonGold, 0.22) },
            }}
          >
            {status.kind === 'minting' ? 'Saving…' : 'Save & share slip'}
          </Button>
        )
      )}

      {status.message && (
        <Typography sx={{
          fontSize: '0.62rem',
          color: status.kind === 'error' ? '#ff6b7a' : status.kind === 'ok' ? neonGreen : 'text.secondary',
          mt: 0.25,
        }}>
          {status.message}
        </Typography>
      )}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// OPEN BETS
// ────────────────────────────────────────────────────────────────────────────

function OpenBetsBody() {
  const { openTickets, cashout, oddsFormat } = useBetSlip();

  if (openTickets.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <LockOpenIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, mb: 0.5 }}>No open bets</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          Place a bet to see it here while it settles.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {openTickets.map(t => (
        <Box
          key={t.id}
          sx={{
            p: 1, borderRadius: 1.5,
            background: darkSurface,
            border: `1px solid ${darkBorder}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Chip
              size="small"
              label={t.mode === 'system' ? `SYSTEM ${t.systemK}/${t.selections.length}` : t.mode === 'multi' ? `MULTI · ${t.selections.length}` : 'SINGLE'}
              sx={{
                height: 18, fontSize: '0.58rem', fontWeight: 800,
                background: alpha(neonBlue, 0.15), color: neonBlue,
              }}
            />
            <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
              {new Date(t.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 0.5 }}>
            {t.selections.map(s => (
              <Typography key={s.id} sx={{ fontSize: '0.65rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong style={{ color: '#fff' }}>{s.optionLabel}</strong> · {s.homeTeam} vs {s.awayTeam}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Box>
              <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>Stake</Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800 }}>{t.totalStake.toFixed(4)}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled' }}>To win</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: neonGreen }}>
                {t.potentialPayout.toFixed(4)}
              </Typography>
            </Box>
          </Box>
          <Button
            fullWidth size="small"
            onClick={() => cashout(t.id)}
            sx={{
              py: 0.5, fontSize: '0.7rem', fontWeight: 800,
              background: alpha(neonGold, 0.15),
              color: neonGold,
              border: `1px solid ${alpha(neonGold, 0.4)}`,
              '&:hover': { background: alpha(neonGold, 0.25) },
            }}
          >
            Cash out ≈ {(Math.max(t.totalStake * 0.5, t.potentialPayout * 0.8)).toFixed(4)}
          </Button>
        </Box>
      ))}
      <Box sx={{ display: 'none' }}>{oddsFormat}</Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HISTORY
// ────────────────────────────────────────────────────────────────────────────

function HistoryBody() {
  const { history } = useBetSlip();

  if (history.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <HistoryIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>No settled bets yet</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {history.map(t => {
        const won  = t.status === 'won' || (t.status === 'partial' && (t.settledPayout ?? 0) > 0);
        const lost = t.status === 'lost';
        const cash = t.status === 'cashout';
        const color = won ? neonGreen : lost ? '#ff4757' : cash ? neonGold : 'text.secondary';
        return (
          <Box
            key={t.id}
            sx={{
              p: 0.75, borderRadius: 1.5,
              background: darkSurface,
              border: `1px solid ${alpha(typeof color === 'string' ? color : '#fff', 0.18)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
              <Chip
                size="small"
                label={t.status.toUpperCase()}
                sx={{
                  height: 16, fontSize: '0.58rem', fontWeight: 800,
                  background: alpha(typeof color === 'string' ? color : '#fff', 0.15), color,
                }}
              />
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
                {won ? '+' : ''}{((t.settledPayout ?? 0) - t.totalStake).toFixed(4)}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
              {t.selections.length} pick · {t.totalStake.toFixed(4)} stake
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
