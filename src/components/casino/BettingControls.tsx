import {
  Box, Typography, TextField, Button, ToggleButton, ToggleButtonGroup,
  InputAdornment,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { neonGreen, darkBorder, darkCard } from '../../theme';

interface BettingControlsProps {
  betAmount: string;
  onBetChange: (v: string) => void;
  onBet: () => void;
  isRunning?: boolean;
  stopLabel?: string;
  betLabel?: string;
  autoBet?: boolean;
  onAutoChange?: (v: boolean) => void;
  children?: React.ReactNode;
}

export default function BettingControls({
  betAmount, onBetChange, onBet, isRunning = false,
  stopLabel = 'Stop', betLabel = 'Bet', autoBet = false,
  onAutoChange, children,
}: BettingControlsProps) {

  function adjust(mult: number) {
    const v = parseFloat(betAmount) || 0;
    onBetChange((v * mult).toFixed(5));
  }

  return (
    <Box
      sx={{
        background: darkCard,
        border: `1px solid ${darkBorder}`,
        borderRadius: 3,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Mode toggle */}
      <ToggleButtonGroup
        value={autoBet ? 'auto' : 'manual'}
        exclusive
        onChange={(_, v) => { if (v && onAutoChange) onAutoChange(v === 'auto'); }}
        size="small"
        sx={{
          '& .MuiToggleButton-root': {
            flex: 1, fontSize: '0.75rem', fontWeight: 700, py: 0.6,
            border: `1px solid ${darkBorder}`,
            color: 'text.secondary',
            '&.Mui-selected': { color: neonGreen, background: alpha(neonGreen, 0.1), borderColor: alpha(neonGreen, 0.4) },
          },
        }}
      >
        <ToggleButton value="manual">Manual</ToggleButton>
        <ToggleButton value="auto">Auto</ToggleButton>
      </ToggleButtonGroup>

      {/* Bet amount */}
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 0.5, fontWeight: 600 }}>
          BET AMOUNT
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <TextField
            value={betAmount}
            onChange={e => onBetChange(e.target.value)}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box
                    sx={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #f7931a, #ffb347)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.55rem', fontWeight: 900, color: '#000',
                    }}
                  >
                    ₿
                  </Box>
                </InputAdornment>
              ),
            }}
          />
          <Button
            size="small" variant="outlined"
            onClick={() => adjust(0.5)}
            sx={{ minWidth: 36, px: 1, fontSize: '0.7rem', borderColor: darkBorder, color: 'text.secondary' }}
          >
            ½
          </Button>
          <Button
            size="small" variant="outlined"
            onClick={() => adjust(2)}
            sx={{ minWidth: 36, px: 1, fontSize: '0.7rem', borderColor: darkBorder, color: 'text.secondary' }}
          >
            2×
          </Button>
        </Box>
      </Box>

      {/* Quick amounts */}
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {['0.001', '0.01', '0.05', '0.1'].map(v => (
          <Box
            key={v}
            onClick={() => onBetChange(v)}
            sx={{
              flex: 1, textAlign: 'center', py: 0.5, borderRadius: 1,
              background: alpha('#fff', 0.04), border: `1px solid ${darkBorder}`,
              cursor: 'pointer', transition: 'all 0.15s',
              '&:hover': { borderColor: alpha(neonGreen, 0.5), background: alpha(neonGreen, 0.08) },
            }}
          >
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary' }}>{v}</Typography>
          </Box>
        ))}
      </Box>

      {/* Extra controls (passed as children) */}
      {children}

      {/* Main bet button */}
      <Button
        variant="contained"
        fullWidth
        onClick={onBet}
        sx={{
          py: 1.5, fontWeight: 900, fontSize: '0.95rem',
          background: isRunning
            ? `linear-gradient(135deg, #ff4757, #cc2233)`
            : `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
          color: '#000',
          boxShadow: isRunning
            ? '0 0 20px rgba(255,71,87,0.4)'
            : `0 0 20px ${alpha(neonGreen, 0.4)}`,
          '&:hover': {
            boxShadow: isRunning
              ? '0 0 30px rgba(255,71,87,0.6)'
              : `0 0 30px ${alpha(neonGreen, 0.6)}`,
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s',
        }}
      >
        {isRunning ? stopLabel : betLabel}
      </Button>
    </Box>
  );
}
