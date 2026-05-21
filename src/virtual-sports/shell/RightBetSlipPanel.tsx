import { useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, ToggleButtonGroup, ToggleButton, Button, Chip, LinearProgress,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SportsScoreIcon from '@mui/icons-material/SportsScore';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { useToasts } from '../../contexts/ToastContext';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard, darkSurface } from '../../theme';
import { useBetSlip } from '../core/BetSlipContext';
import { formatOdds } from '../core/oddsEngine';
import type { BetMode, OddsFormat, BetSelection, BetTicket } from '../core/types';
import { deriveMatchState, type MatchStateForSelection } from '../core/matchStateForSelection';
import { bookingCodesApi } from '../../api/bookingCodes';
import { ApiError } from '../../api/client';
import { formatMoney, usdApprox, minVirtualBetFor, virtualQuickStakes, type FiatCurrency } from '../../utils/currency';

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
  const wallet = useWallet();
  const toasts = useToasts();
  const slip = useBetSlip();
  const { selections, mode, stake, systemK, oddsFormat, computedOdds, potentialPayout, totalStake, systemLines } = slip;

  // Spendable = real + bonus pots, matching the server's atomic placement rule.
  const spendable = isAuthenticated ? wallet.balance + wallet.bonusBalance : 0;
  const insufficient = isAuthenticated && totalStake > spendable + 1e-9;
  const shortBy = Math.max(0, totalStake - spendable);

  // Virtual-sports minimum bet, expressed in the user's currency. Anchored to
  // 100 NGN — see utils/currency.ts.
  const minBet = minVirtualBetFor(wallet.currency);
  const belowMin = totalStake > 0 && totalStake < minBet - 1e-9;
  const quickStakes = virtualQuickStakes(wallet.currency);
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
              inputProps={{ min: minBet, step: Math.max(0.01, minBet / 10) }}
              value={stake}
              onChange={e => slip.setStake(Math.max(0, parseFloat(e.target.value) || 0))}
              sx={{
                fontSize: '0.85rem', fontWeight: 800, color: '#fff', width: 90,
                '& input': { textAlign: 'right', p: 0 },
              }}
            />
            <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>{wallet.currency}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 0.75 }}>
          {quickStakes.map(s => (
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
              {formatMoney(s, wallet.currency)}
            </Box>
          ))}
        </Box>

        {belowMin && (
          <Typography sx={{ fontSize: '0.65rem', color: '#ff6b7a', mb: 0.5, textAlign: 'right' }}>
            Min stake {formatMoney(minBet, wallet.currency)}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            {mode === 'system' ? `${systemLines} combinations` : 'Total stake'}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(totalStake, wallet.currency)}
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
            {formatMoney(potentialPayout, wallet.currency)}
          </Typography>
        </Box>
      </Box>

      {/* Balance / shortfall hint — only shown for signed-in users so guests
          aren't nagged before they've even chosen to bet. */}
      {isAuthenticated && selections.length > 0 && (
        <Box sx={{
          mb: 1, px: 1, py: 0.75, borderRadius: 1,
          background: insufficient ? alpha('#ff6b7a', 0.1) : alpha(neonGreen, 0.06),
          border: `1px solid ${insufficient ? alpha('#ff6b7a', 0.3) : alpha(neonGreen, 0.2)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
        }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {insufficient
              ? `Short by ${formatMoney(shortBy, wallet.currency)}`
              : `Balance: ${formatMoney(spendable, wallet.currency)}`}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
            {usdApprox(spendable, wallet.currency)}
          </Typography>
        </Box>
      )}

      <Button
        fullWidth
        disabled={selections.length === 0 || stake <= 0 || insufficient || belowMin}
        onClick={() => {
          if (!isAuthenticated) { requireAuth(); return; }
          if (belowMin) {
            toasts.warning('Stake too small', `Minimum bet is ${formatMoney(minBet, wallet.currency)}.`);
            return;
          }
          if (insufficient) {
            toasts.error('Insufficient balance', `Top up ${formatMoney(shortBy, wallet.currency)} to place this slip.`);
            return;
          }
          // slip.placeBet is async — charges the wallet, then opens the ticket.
          // Fire-and-forget: the button stays in its disabled state until the
          // wallet round-trip completes (~200ms typical), then re-enables.
          // Capture a snapshot of the current slip so we can mint a booking
          // code after the wallet placement completes (placeBet clears the
          // selections on success). Fire-and-forget; minting failures are
          // non-blocking and surfaced via the booking row UI / toast.
          const snapSelections = [...selections];
          const snapStake = stake;
          void slip.placeBet().then(async ticket => {
              if (!ticket) return;
              toasts.success('Bet placed', `Stake ${formatMoney(totalStake, wallet.currency)} locked in.`);
              // Auto-mint booking code for the placed slip. Keep errors
              // local to the booking row state so the user can still place
              // bets even if minting fails.
              try {
                setCodeStatus({ kind: 'minting' });
                const r = await bookingCodesApi.mint({
                  selections: snapSelections,
                  suggestedStake: snapStake,
                  currency: 'USD',
                  label: `${snapSelections.length}-leg slip`,
                });
                setMintedCode(r.code);
                setCodeStatus({ kind: 'ok', message: `Code ${r.code} ready — copy & share` });
              } catch (err) {
                setCodeStatus({ kind: 'error', message: err instanceof ApiError ? err.code : 'mint_failed' });
              }
            });
        }}
        sx={{
          py: 1, fontWeight: 900, fontSize: '0.85rem',
          background: (insufficient || belowMin)
            ? `linear-gradient(135deg, #6b3a3a, #4a2424)`
            : `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
          color: (insufficient || belowMin) ? '#fff' : '#000',
          '&:hover': (insufficient || belowMin)
            ? undefined
            : { boxShadow: `0 0 30px ${alpha(neonGreen, 0.5)}` },
          '&.Mui-disabled': { background: alpha('#fff', 0.08), color: 'text.disabled' },
        }}
      >
        {!isAuthenticated
          ? 'Sign in to bet'
          : belowMin
            ? `Min ${formatMoney(minBet, wallet.currency)}`
            : insufficient
              ? 'Insufficient balance'
              : 'Place Bet'}
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
// OPEN BETS — live updating cards showing per-selection state
// ────────────────────────────────────────────────────────────────────────────

/** Shared 1s tick so every open card re-renders together. Cheaper than each
 *  card running its own setInterval. */
function useSecondTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return tick;
}

function OpenBetsBody() {
  const { openTickets } = useBetSlip();
  const wallet = useWallet();
  const tick = useSecondTick();

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
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {openTickets.map(t => (
        <OpenTicketCard key={t.id} ticket={t} currency={wallet.currency} tick={tick} />
      ))}
    </Box>
  );
}

/** Aggregate ticket-level phase from the worst-progressed leg. If any leg is
 *  still in 'betting' we treat the whole ticket as pre-match. This drives
 *  the banner copy and decides whether to show projected outcomes. */
function aggregatePhase(states: (MatchStateForSelection | null)[]): 'betting' | 'live' | 'finished' | 'unknown' {
  if (states.some(s => s == null)) return 'unknown';
  if (states.some(s => s!.phase === 'betting')) return 'betting';
  if (states.some(s => s!.phase === 'live'))    return 'live';
  return 'finished';
}

/** Seconds until the earliest selection's match kicks off (live phase begins).
 *  Used for the "kicks off in X" countdown on the banner. Returns 0 if all
 *  matches have already started. */
function secondsToFirstKickoff(states: (MatchStateForSelection | null)[]): number {
  // We can't recover absolute startsAt from a state object, but we can
  // approximate: every match has a 6 min betting window before kickoff. So
  // when phase === 'betting' the matches start sometime in the next 6 min.
  // Pulling the real seconds requires re-deriving from the matchId — out of
  // scope; a coarse "kicks off soon" message is plenty for the open card.
  return states.some(s => s?.phase === 'betting') ? -1 : 0;
}

function OpenTicketCard({ ticket, currency, tick }: { ticket: BetTicket; currency: FiatCurrency; tick: number }) {
  // tick is unused directly — its mere presence triggers a re-render every
  // second so deriveMatchState() returns fresh numbers below.
  void tick;
  const [expanded, setExpanded] = useState(true);

  const states = ticket.selections.map(s => deriveMatchState(s));
  const ticketPhase = aggregatePhase(states);

  // HARD RULE: the OPEN list NEVER reveals win/loss. It only mirrors the
  // live-games view — scores during live phase, time remaining, status
  // wording. Per-leg and total results only appear in HISTORY, after the
  // ticket has settled. This keeps the live phase a real wait, not a
  // pre-revealed reveal.
  const tone = ticketPhase === 'live' ? '#ff4757'
    : ticketPhase === 'finished' ? neonGold
    : neonGold;
  void secondsToFirstKickoff;

  // Collapsed-state header bits — purely descriptive. No outcome hints.
  const statusLabel = ticketPhase === 'finished'
    ? 'Awaiting settle'
    : ticketPhase === 'live'
      ? 'LIVE · matches in progress'
      : ticketPhase === 'betting'
        ? 'Awaiting kickoff'
        : 'Pending';

  return (
    <Box
      sx={{
        borderRadius: 1.5,
        background: darkSurface,
        border: `1px solid ${alpha(tone, 0.35)}`,
        boxShadow: `0 0 0 1px ${alpha(tone, 0.08)} inset`,
        overflow: 'hidden',
      }}
    >
      {/* Collapsible header — clicking toggles expanded state. Always visible. */}
      <Box
        onClick={() => setExpanded(v => !v)}
        sx={{
          px: 1.25, py: 0.9, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 1,
          background: alpha(tone, 0.05),
          '&:hover': { background: alpha(tone, 0.1) },
        }}
      >
        <Chip
          size="small"
          label={
            ticket.mode === 'system'
              ? `SYS ${ticket.systemK}/${ticket.selections.length}`
              : ticket.mode === 'multi'
                ? `${ticket.selections.length}-LEG`
                : 'SINGLE'
          }
          sx={{
            height: 18, fontSize: '0.58rem', fontWeight: 800,
            background: alpha(neonBlue, 0.15), color: neonBlue,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {ticketPhase === 'live' && (
            <FiberManualRecordIcon
              sx={{
                fontSize: 10, color: '#ff4757',
                animation: 'pulse 1.4s ease-in-out infinite',
                '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
              }}
            />
          )}
          <Typography sx={{
            fontSize: '0.66rem', fontWeight: 800, color: tone,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {statusLabel}
          </Typography>
        </Box>
        <Typography sx={{
          fontSize: '0.72rem', fontWeight: 900, color: neonGreen,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatMoney(ticket.potentialPayout, currency)}
        </Typography>
        <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Expanded body */}
      {expanded && (
        <Box sx={{ p: 1.25, pt: 1 }}>
          {/* Live progress banner — phase-aware, no spoilers during betting */}
          <Box sx={{
            mb: 0.75, px: 0.75, py: 0.5,
            background: alpha(tone, 0.08),
            border: `1px solid ${alpha(tone, 0.25)}`,
            borderRadius: 1,
            fontSize: '0.66rem', color: tone, fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 0.5,
          }}>
            {ticketPhase === 'betting' ? (
              <>
                <SportsScoreIcon sx={{ fontSize: 12 }} />
                <span>Matches kick off shortly — sit tight and watch them play</span>
              </>
            ) : ticketPhase === 'live' ? (
              <>
                <FiberManualRecordIcon
                  sx={{
                    fontSize: 10,
                    animation: 'pulse 1.4s ease-in-out infinite',
                    '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
                  }}
                />
                <span>Live — matches in progress</span>
              </>
            ) : ticketPhase === 'finished' ? (
              <>
                <SportsScoreIcon sx={{ fontSize: 12 }} />
                <span>Matches finished — settling, result will appear in History</span>
              </>
            ) : (
              <>
                <RadioButtonUncheckedIcon sx={{ fontSize: 12 }} />
                <span>Awaiting result</span>
              </>
            )}
          </Box>

          {/* Per-leg list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.75 }}>
            {ticket.selections.map((s, i) => (
              <OpenSelectionRow key={s.id} sel={s} state={states[i]} />
            ))}
          </Box>

          {/* Footer — stake / potential payout / placed time */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', letterSpacing: '0.05em' }}>STAKE</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800 }}>{formatMoney(ticket.totalStake, currency)}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', letterSpacing: '0.05em' }}>PLACED</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {new Date(ticket.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', letterSpacing: '0.05em' }}>POTENTIAL PAYOUT</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 900, color: neonGreen }}>
                {formatMoney(ticket.potentialPayout, currency)}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function OpenSelectionRow({ sel, state }: { sel: BetSelection; state: MatchStateForSelection | null }) {
  const phase = state?.phase ?? 'unknown';
  // Score chip appears as soon as the match kicks off. NO result-coloring
  // is applied anywhere in this component — the OPEN list is informational
  // only. Win/loss markings only appear in the HISTORY tab.
  const showScore = state != null && (phase === 'live' || phase === 'finished');
  const score = showScore ? state!.liveScore : null;

  // Remaining time = total match span minus elapsed minutes. Mirrors the
  // live-games list copy "LIVE · 47'".
  const sportSpan = state?.sport === 'soccer' ? 90 : state?.sport === 'basketball' ? 48 : 60;
  const elapsedMin = state && (phase === 'live' || phase === 'finished')
    ? Math.floor(state.liveProgress * sportSpan)
    : 0;
  const remainingMin = state && phase === 'live'
    ? Math.max(0, sportSpan - elapsedMin)
    : 0;

  // Neutral border / tone — never reveals outcome.
  const phaseTone = phase === 'live' ? '#ff4757'
    : phase === 'finished' ? neonGold
    : 'text.disabled';

  return (
    <Box sx={{
      p: 0.75, borderRadius: 1,
      background: alpha('#fff', 0.025),
      border: `1px solid ${phase === 'live' ? alpha('#ff4757', 0.25) : darkBorder}`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        {phase === 'live' ? (
          <FiberManualRecordIcon
            sx={{
              fontSize: 12, color: '#ff4757',
              animation: 'pulse 1.4s ease-in-out infinite',
              '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
            }}
          />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: '0.62rem', color: 'text.disabled',
            textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1,
          }}>
            {sel.marketLabel}
          </Typography>
          {/* Pick label stays neutral white throughout — no green/red leak. */}
          <Typography sx={{
            fontSize: '0.75rem', fontWeight: 800,
            color: '#fff',
            lineHeight: 1.2,
          }}>
            {sel.optionLabel}
          </Typography>
        </Box>
        <Typography sx={{
          fontSize: '0.7rem', fontWeight: 900, color: neonGold,
          fontVariantNumeric: 'tabular-nums',
        }}>
          @{sel.odds.toFixed(2)}
        </Typography>
      </Box>

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        fontSize: '0.65rem', color: 'text.secondary',
      }}>
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sel.homeTeam} vs {sel.awayTeam}
        </Box>
        {score ? (
          <Box sx={{
            px: 0.6, py: 0.1, borderRadius: 0.5,
            background: alpha(phase === 'live' ? '#ff4757' : neonGold, 0.12),
            color: phase === 'live' ? '#ff4757' : neonGold,
            fontWeight: 900, fontVariantNumeric: 'tabular-nums',
            fontSize: '0.72rem',
          }}>
            {score.home}–{score.away}
          </Box>
        ) : null}
      </Box>

      {/* Status line — score + time remaining, just like the live games list. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
        <Typography sx={{ fontSize: '0.6rem', color: phaseTone, fontWeight: 700 }}>
          {phase === 'live'
            ? `LIVE · ${elapsedMin}'${remainingMin > 0 ? ` · ${remainingMin}' to go` : ''}`
            : phase === 'finished'
              ? 'Awaiting settle'
              : phase === 'betting'
                ? 'Match starts soon'
                : 'Awaiting kickoff'}
        </Typography>
        {phase === 'live' && state && (
          <LinearProgress
            variant="determinate"
            value={state.liveProgress * 100}
            sx={{
              flex: 1, ml: 0.5, height: 3, borderRadius: 1.5,
              backgroundColor: alpha('#ff4757', 0.15),
              '& .MuiLinearProgress-bar': { background: '#ff4757' },
            }}
          />
        )}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HISTORY — settled tickets with per-leg final scores
// ────────────────────────────────────────────────────────────────────────────

function HistoryBody() {
  const { history } = useBetSlip();
  const wallet = useWallet();

  if (history.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <HistoryIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 1 }} />
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>No settled bets yet</Typography>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>
          Bets are decided when the match round finishes — sit tight, no early cashouts.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {history.map(t => (
        <HistoryTicketCard key={t.id} ticket={t} currency={wallet.currency} />
      ))}
    </Box>
  );
}

function HistoryTicketCard({ ticket, currency }: { ticket: BetTicket; currency: FiatCurrency }) {
  // History entries stack up fast — start collapsed and let the user expand
  // to see per-leg detail.
  const [expanded, setExpanded] = useState(false);

  const won  = ticket.status === 'won' || (ticket.status === 'partial' && (ticket.settledPayout ?? 0) > 0);
  const lost = ticket.status === 'lost';
  const tone = won ? neonGreen : lost ? '#ff6b7a' : neonGold;
  const profit = (ticket.settledPayout ?? 0) - ticket.totalStake;
  const resultMap = new Map(
    (ticket.selectionResults ?? []).map(r => [r.selectionId, r]),
  );

  return (
    <Box
      sx={{
        borderRadius: 1.5,
        background: darkSurface,
        border: `1px solid ${alpha(tone, 0.35)}`,
        boxShadow: `0 0 0 1px ${alpha(tone, 0.06)} inset`,
        overflow: 'hidden',
      }}
    >
      {/* Collapsed header — always visible. Click anywhere to toggle. */}
      <Box
        onClick={() => setExpanded(v => !v)}
        sx={{
          px: 1.25, py: 0.9, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 1,
          background: alpha(tone, 0.05),
          '&:hover': { background: alpha(tone, 0.1) },
        }}
      >
        <Chip
          size="small"
          label={ticket.status.toUpperCase()}
          sx={{
            height: 18, fontSize: '0.58rem', fontWeight: 800,
            background: alpha(tone, 0.15), color: tone,
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ticket.mode === 'system'
              ? `System ${ticket.systemK}/${ticket.selections.length}`
              : ticket.mode === 'multi'
                ? `${ticket.selections.length}-leg accumulator`
                : 'Single bet'}
            {ticket.settledAt && ` · ${new Date(ticket.settledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </Typography>
        </Box>
        <Typography sx={{
          fontSize: '0.78rem', fontWeight: 900, color: tone,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {won
            ? `+${formatMoney((ticket.settledPayout ?? 0) - ticket.totalStake, currency)}`
            : `${profit >= 0 ? '+' : ''}${formatMoney(profit, currency)}`}
        </Typography>
        <IconButton size="small" sx={{ p: 0, color: 'text.secondary' }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Expanded body — per-leg results + footer */}
      {expanded && (
        <Box sx={{ p: 1.25, pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 0.75 }}>
            {ticket.selections.map(s => {
              const res = resultMap.get(s.id);
              const win = res?.result === 'win';
              const loss = res?.result === 'loss';
              const score = res?.finalScore;
              return (
                <Box key={s.id} sx={{
                  p: 0.6, borderRadius: 1,
                  background: alpha(win ? neonGreen : loss ? '#ff6b7a' : neonGold, 0.06),
                  border: `1px solid ${alpha(win ? neonGreen : loss ? '#ff6b7a' : neonGold, 0.25)}`,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {win ? (
                      <CheckCircleIcon sx={{ fontSize: 13, color: neonGreen }} />
                    ) : loss ? (
                      <CancelIcon sx={{ fontSize: 13, color: '#ff6b7a' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 13, color: neonGold }} />
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontSize: '0.58rem', color: 'text.disabled',
                        textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1,
                      }}>
                        {s.marketLabel}
                      </Typography>
                      <Typography sx={{
                        fontSize: '0.72rem', fontWeight: 800,
                        color: win ? neonGreen : loss ? '#ff6b7a' : neonGold,
                        lineHeight: 1.2,
                      }}>
                        {s.optionLabel}
                      </Typography>
                    </Box>
                    <Typography sx={{
                      fontSize: '0.68rem', fontWeight: 900, color: neonGold,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      @{s.odds.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'inline' }}>
                        {s.homeTeam} vs {s.awayTeam}
                      </Typography>
                    </Box>
                    {score ? (
                      <Box sx={{
                        px: 0.5, py: 0.05, borderRadius: 0.5,
                        background: alpha(neonGold, 0.12),
                        color: neonGold, fontWeight: 800,
                        fontVariantNumeric: 'tabular-nums', fontSize: '0.65rem',
                      }}>
                        {score.home}–{score.away}
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled' }}>—</Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Footer */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', letterSpacing: '0.05em' }}>STAKE</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800 }}>{formatMoney(ticket.totalStake, currency)}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.58rem', color: 'text.disabled', letterSpacing: '0.05em' }}>
                {won ? 'PAYOUT' : 'PROFIT'}
              </Typography>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: tone, fontVariantNumeric: 'tabular-nums' }}>
                {won
                  ? formatMoney(ticket.settledPayout ?? 0, currency)
                  : `${profit >= 0 ? '+' : ''}${formatMoney(profit, currency)}`}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
