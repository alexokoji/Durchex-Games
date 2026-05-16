import { useState } from 'react';
import {
  Popover, Box, Typography, IconButton, Button, Divider, Chip, LinearProgress, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import LockIcon from '@mui/icons-material/Lock';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { motion } from 'framer-motion';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { useWallet } from '../../contexts/WalletContext';
import { CRYPTO, FIAT, formatMoney, type CryptoCurrency } from '../../utils/currency';

interface BalanceMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export default function BalanceMenu({ anchorEl, open, onClose, onDeposit, onWithdraw }: BalanceMenuProps) {
  const [hidden, setHidden] = useState(false);
  const { balance, bonusBalance, bonusRollover, currency, cryptoBalances } = useWallet();

  function mask<T>(value: T): T | string {
    return hidden ? '••••••' : (value as unknown as T);
  }

  const fiatMeta = FIAT[currency];

  // Rollover progress: we don't track the starting amount, just the remaining
  // obligation. Use bonusBalance × a heuristic factor (5 by default) as the
  // visual baseline if we ever want a bar — for now just show the remaining
  // figure, which is the actionable number.
  const rolloverPending = bonusRollover > 0;
  const rolloverProgress = rolloverPending && bonusBalance > 0
    ? Math.max(0, Math.min(100, 100 * (1 - bonusRollover / (bonusBalance * 5))))
    : 0;

  // Crypto subaccounts only render when they hold something. Since we route
  // crypto deposits through Flutterwave (which converts to fiat), these are
  // 0 most of the time — we hide the section entirely when empty so the
  // primary fiat balance stays the focus.
  const cryptoRows: { code: CryptoCurrency; amount: number; usd: number }[] = (['BTC', 'USDT', 'USDC'] as CryptoCurrency[])
    .map(code => {
      const amount = cryptoBalances[code] ?? 0;
      return { code, amount, usd: amount * CRYPTO[code].usdPerUnit };
    })
    .filter(r => r.amount > 0);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            mt: 1,
            width: 380,
            maxWidth: 'calc(100vw - 32px)',
            background: darkCard,
            border: `1px solid ${darkBorder}`,
            borderRadius: 2,
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Primary fiat balance — local currency at the top */}
      <Box sx={{
        p: 2.25,
        background: `linear-gradient(135deg, ${alpha(neonGold, 0.18)}, ${alpha(neonGreen, 0.06)})`,
        borderBottom: `1px solid ${darkBorder}`,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 18, color: neonGold }} />
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 600 }}>
              Withdrawable · {fiatMeta.name}
            </Typography>
            <Tooltip title="Real balance — yours to withdraw anytime (once any active rollover clears).">
              <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            </Tooltip>
          </Box>
          <IconButton size="small" onClick={() => setHidden(p => !p)}>
            {hidden ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 900, color: neonGold, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
          {hidden ? '••••••' : formatMoney(balance, currency)}
        </Typography>
        <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 0.5 }}>
          Bets and payouts settle in this account.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mt: 1.75 }}>
          <Button
            fullWidth size="small"
            onClick={() => { onDeposit(); onClose(); }}
            sx={{
              background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
              color: '#000', fontWeight: 800, fontSize: '0.74rem', py: 0.7,
              boxShadow: `0 0 15px ${alpha(neonGreen, 0.4)}`,
            }}
          >
            Deposit
          </Button>
          <Button
            fullWidth size="small" variant="outlined"
            onClick={() => { onWithdraw(); onClose(); }}
            sx={{
              borderColor: alpha(neonBlue, 0.5), color: neonBlue,
              fontWeight: 800, fontSize: '0.74rem', py: 0.7,
              '&:hover': { borderColor: neonBlue, background: alpha(neonBlue, 0.08) },
            }}
          >
            Withdraw
          </Button>
        </Box>
      </Box>

      {(bonusBalance > 0 || rolloverPending) && (
        <Box sx={{
          px: 2, py: 1.5,
          background: alpha(neonBlue, 0.05),
          borderBottom: `1px solid ${darkBorder}`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CardGiftcardIcon sx={{ fontSize: 16, color: neonBlue }} />
              <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: neonBlue }}>
                Bonus balance
              </Typography>
              <Tooltip title="Spent first on bets. Winnings are credited to your withdrawable balance; the bonus itself stays locked until rollover is cleared.">
                <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              </Tooltip>
            </Box>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 900, color: neonBlue, fontVariantNumeric: 'tabular-nums' }}>
              {hidden ? '••••••' : formatMoney(bonusBalance, currency)}
            </Typography>
          </Box>

          {rolloverPending && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LockIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                    Wager {hidden ? '••••' : formatMoney(bonusRollover, currency)} more to unlock withdrawals
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={rolloverProgress}
                sx={{
                  height: 4, borderRadius: 2,
                  backgroundColor: alpha(neonBlue, 0.15),
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${neonBlue}, ${neonGreen})`,
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {cryptoRows.length > 0 && (
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Crypto subaccounts
          </Typography>
        </Box>
      )}

      <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
        {cryptoRows.map((row, i) => {
          const meta = CRYPTO[row.code];
          const change = row.code === 'BTC' ? 2.4 : 0;
          const isUp = change > 0;
          const trendColor = change === 0 ? 'text.secondary' : isUp ? neonGreen : '#ff6b7a';
          return (
            <motion.div
              key={row.code}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                px: 2, py: 1.25,
                borderBottom: i < cryptoRows.length - 1 ? `1px solid ${darkBorder}` : 'none',
              }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${meta.color}, ${alpha(meta.color, 0.5)})`,
                  fontSize: '0.85rem', fontWeight: 900, color: '#000', flexShrink: 0,
                }}>
                  {meta.symbol}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>{row.code}</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{meta.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {change !== 0 && (isUp
                      ? <TrendingUpIcon sx={{ fontSize: 12, color: trendColor }} />
                      : <TrendingDownIcon sx={{ fontSize: 12, color: trendColor }} />)}
                    <Typography sx={{ fontSize: '0.68rem', color: trendColor, fontWeight: 700 }}>
                      {change === 0 ? '—' : `${isUp ? '+' : ''}${change.toFixed(2)}%`}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {mask(row.amount.toFixed(meta.decimals))}
                  </Typography>
                  <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
                    {hidden ? '••••••' : formatMoney(row.usd, 'USD')}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>

      <Divider />
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2, py: 1.25, gap: 1,
        background: alpha(neonGold, 0.04),
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
          <CardGiftcardIcon sx={{ fontSize: 18, color: neonGold, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.2 }}>
              Rakeback available
            </Typography>
            <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
              Claim your daily rewards
            </Typography>
          </Box>
        </Box>
        <Chip
          label="Claim"
          size="small"
          sx={{
            background: `linear-gradient(135deg, ${neonGold}, #cc8800)`,
            color: '#000', fontWeight: 800, fontSize: '0.66rem', cursor: 'pointer',
          }}
        />
      </Box>
    </Popover>
  );
}
