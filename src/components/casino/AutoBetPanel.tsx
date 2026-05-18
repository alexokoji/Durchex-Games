import { useState } from 'react';
import {
  Box, Typography, TextField, ToggleButton, ToggleButtonGroup, Button, Chip,
  InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { neonGreen, neonBlue, darkBorder, darkCard } from '../../theme';
import type { AutoConfig, Progression, UseAutoBetResult } from './useAutoBet';

interface Props {
  /** Result of `useAutoBet()`. */
  auto: UseAutoBetResult;
  /** Currency-formatter for stake / profit displays. */
  formatMoney: (n: number) => string;
  /** Game-side runtime guard — e.g. disable starting while a manual bet is mid-flight. */
  disabled?: boolean;
}

export default function AutoBetPanel({ auto, formatMoney, disabled }: Props) {
  const [totalBets,    setTotalBets]    = useState('10');
  const [stopOnProfit, setStopOnProfit] = useState('');
  const [stopOnLoss,   setStopOnLoss]   = useState('');
  const [onWin,        setOnWin]        = useState<Progression>('reset');
  const [onWinPct,     setOnWinPct]     = useState('100');
  const [onLoss,       setOnLoss]       = useState<Progression>('reset');
  const [onLossPct,    setOnLossPct]    = useState('100');

  function buildCfg(): AutoConfig {
    return {
      totalBets:     Math.max(0, parseInt(totalBets, 10) || 0),
      stopOnProfit:  Math.max(0, parseFloat(stopOnProfit) || 0),
      stopOnLoss:    Math.max(0, parseFloat(stopOnLoss)   || 0),
      onWin,
      onWinPct:  Math.max(0, parseFloat(onWinPct)  || 0),
      onLoss,
      onLossPct: Math.max(0, parseFloat(onLossPct) || 0),
    };
  }

  const profitColor =
    auto.cumulativeProfit > 0 ? neonGreen :
    auto.cumulativeProfit < 0 ? '#ff6b7a' : 'text.secondary';

  return (
    <Box sx={{
      p: 1.5,
      borderRadius: 2,
      border: `1px solid ${darkBorder}`,
      background: darkCard,
      display: 'flex',
      flexDirection: 'column',
      gap: 1.25,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <RefreshIcon sx={{ fontSize: 18, color: neonBlue }} />
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>Auto bet</Typography>
        {auto.isRunning && (
          <Chip
            size="small"
            label={`Running ${auto.betsDone}${auto.betsRemaining ? `/${auto.betsDone + auto.betsRemaining}` : ''}`}
            sx={{
              background: alpha(neonGreen, 0.15),
              color: neonGreen, fontWeight: 700, fontSize: '0.7rem', height: 20,
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
            }}
          />
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <TextField
          label="Total bets"
          size="small"
          type="number"
          value={totalBets}
          onChange={e => setTotalBets(e.target.value)}
          inputProps={{ min: 0 }}
          helperText="0 = ∞"
          FormHelperTextProps={{ sx: { fontSize: '0.62rem', mt: 0.25, mx: 0 } }}
          disabled={auto.isRunning}
        />
        <TextField
          label="Stop on profit"
          size="small"
          type="number"
          value={stopOnProfit}
          onChange={e => setStopOnProfit(e.target.value)}
          inputProps={{ min: 0, step: 0.01 }}
          disabled={auto.isRunning}
        />
        <TextField
          label="Stop on loss"
          size="small"
          type="number"
          value={stopOnLoss}
          onChange={e => setStopOnLoss(e.target.value)}
          inputProps={{ min: 0, step: 0.01 }}
          disabled={auto.isRunning}
        />
        <Box />
      </Box>

      <ProgressionRow
        label="On win"
        icon={<TrendingUpIcon sx={{ fontSize: 14, color: neonGreen }} />}
        mode={onWin}
        setMode={setOnWin}
        pct={onWinPct}
        setPct={setOnWinPct}
        disabled={auto.isRunning}
      />
      <ProgressionRow
        label="On loss"
        icon={<TrendingDownIcon sx={{ fontSize: 14, color: '#ff6b7a' }} />}
        mode={onLoss}
        setMode={setOnLoss}
        pct={onLossPct}
        setPct={setOnLossPct}
        disabled={auto.isRunning}
      />

      {/* Live stats */}
      <Box sx={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
        p: 1, borderRadius: 1.5,
        background: alpha('#fff', 0.025),
      }}>
        <Stat label="Bets" value={String(auto.betsDone)} />
        <Stat label="Next stake" value={formatMoney(auto.currentStake)} />
        <Stat label="P/L" value={`${auto.cumulativeProfit >= 0 ? '+' : ''}${formatMoney(auto.cumulativeProfit)}`} color={profitColor} />
      </Box>

      {!auto.isRunning ? (
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => auto.start(buildCfg())}
          disabled={disabled}
          sx={{
            py: 1, fontWeight: 800,
            background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
            color: '#000',
            '&.Mui-disabled': { background: alpha('#fff', 0.08), color: 'text.disabled' },
          }}
        >
          Start auto
        </Button>
      ) : (
        <Button
          variant="contained"
          startIcon={<StopIcon />}
          onClick={() => auto.stop('manual')}
          sx={{
            py: 1, fontWeight: 800,
            background: `linear-gradient(135deg, #ff6b7a, #cc3344)`,
            color: '#000',
          }}
        >
          Stop
        </Button>
      )}

      {auto.lastStopReason && !auto.isRunning && auto.lastStopReason !== 'manual' && (
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', textAlign: 'center', fontStyle: 'italic' }}>
          Stopped: {reasonLabel(auto.lastStopReason)}
        </Typography>
      )}
    </Box>
  );
}

function ProgressionRow({ label, icon, mode, setMode, pct, setPct, disabled }: {
  label: string;
  icon: React.ReactNode;
  mode: Progression;
  setMode: (m: Progression) => void;
  pct: string;
  setPct: (s: string) => void;
  disabled?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', minWidth: 56, display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
        {icon}{label}
      </Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        size="small"
        onChange={(_, v) => v && setMode(v as Progression)}
        disabled={disabled}
        sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.25, fontSize: '0.7rem' } }}
      >
        <ToggleButton value="reset">Reset</ToggleButton>
        <ToggleButton value="increase">Increase</ToggleButton>
      </ToggleButtonGroup>
      <TextField
        size="small"
        type="number"
        value={pct}
        onChange={e => setPct(e.target.value)}
        disabled={disabled || mode === 'reset'}
        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        inputProps={{ min: 0, step: 1 }}
        sx={{ flex: 1, '& input': { textAlign: 'right' } }}
      />
    </Box>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: color ?? '#fff', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  );
}

function reasonLabel(r: NonNullable<UseAutoBetResult['lastStopReason']>): string {
  switch (r) {
    case 'limit':       return 'Total-bets limit reached';
    case 'profit_cap':  return 'Profit target hit';
    case 'loss_cap':    return 'Loss limit reached';
    case 'error':       return 'A bet failed — auto stopped';
    default:            return 'Stopped';
  }
}
