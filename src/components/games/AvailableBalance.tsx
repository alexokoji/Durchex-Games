import { Box, Typography, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { neonGreen, neonBlue } from '../../theme';
import { formatMoney, type AnyCurrency } from '../../utils/currency';

interface AvailableBalanceProps {
  balance: number;
  bonusBalance: number;
  currency: AnyCurrency;
}

export default function AvailableBalance({ balance, bonusBalance, currency }: AvailableBalanceProps) {
  const totalAvailable = balance + bonusBalance;
  const hasBonusBalance = bonusBalance > 0;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mb: 1 }}>
        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
          Available for Betting
        </Typography>
        <Tooltip title="Total includes both your deposited balance and bonus (which can be used for betting). Winnings from bonus bets go to your deposited balance.">
          <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
        </Tooltip>
      </Box>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: neonGreen, mb: 0.5 }}>
        {formatMoney(totalAvailable, currency)}
      </Typography>
      {hasBonusBalance && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(balance, currency)} deposited + <span style={{ color: neonBlue }}>{formatMoney(bonusBalance, currency)} bonus</span>
        </Typography>
      )}
    </Box>
  );
}
