import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, Button,
  Tabs, Tab, IconButton, TextField, Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', balance: '0.04821', usd: '3,214.32', color: '#f7931a', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', balance: '1.2400', usd: '2,928.10', color: '#627eea', icon: 'Ξ' },
  { symbol: 'SOL', name: 'Solana', balance: '42.50', usd: '8,711.25', color: '#9945ff', icon: '◎' },
  { symbol: 'USDT', name: 'Tether', balance: '500.00', usd: '500.00', color: '#26a17b', icon: '₮' },
];

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

export default function WalletModal({ open, onClose }: WalletModalProps) {
  const [tab, setTab] = useState(0);
  const [selectedCoin, setSelectedCoin] = useState(0);
  const [copied, setCopied] = useState(false);

  const addr = '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12';

  function handleCopy() {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          borderRadius: 3,
          maxWidth: 460,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Wallet</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Total Balance */}
        <Box
          sx={{
            p: 2, borderRadius: 2, mb: 2,
            background: `linear-gradient(135deg, ${alpha(neonGreen, 0.1)}, ${alpha(neonBlue, 0.1)})`,
            border: `1px solid ${alpha(neonGreen, 0.2)}`,
          }}
        >
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>Total Balance</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: neonGold }}>$15,353.67</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.5 }}>≈ 0.23104 BTC</Typography>
        </Box>

        {/* Coin selector */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {COINS.map((coin, i) => (
            <motion.div key={coin.symbol} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Box
                onClick={() => setSelectedCoin(i)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.8,
                  borderRadius: 2, cursor: 'pointer',
                  border: `1px solid ${selectedCoin === i ? coin.color : darkBorder}`,
                  background: selectedCoin === i ? alpha(coin.color, 0.12) : alpha('#fff', 0.03),
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${coin.color}, ${alpha(coin.color, 0.5)})`,
                    fontSize: '0.7rem', fontWeight: 900, color: '#000',
                  }}
                >
                  {coin.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.2 }}>{coin.symbol}</Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>${coin.usd}</Typography>
                </Box>
              </Box>
            </motion.div>
          ))}
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 40 }}>
          <Tab label="Deposit" sx={{ minHeight: 40, fontSize: '0.82rem' }} />
          <Tab label="Withdraw" sx={{ minHeight: 40, fontSize: '0.82rem' }} />
          <Tab label="History" sx={{ minHeight: 40, fontSize: '0.82rem' }} />
        </Tabs>

        {tab === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              {/* QR Code placeholder */}
              <Box
                sx={{
                  width: 140, height: 140, flexShrink: 0,
                  background: '#fff', borderRadius: 2, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  border: `2px solid ${alpha(neonGreen, 0.3)}`,
                  mx: { xs: 'auto', sm: 0 },
                }}
              >
                <QrCode2Icon sx={{ fontSize: 100, color: '#000' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1 }}>
                  Send {COINS[selectedCoin].symbol} to this address:
                </Typography>
                <Box
                  sx={{
                    p: 1.5, borderRadius: 2, mb: 1.5,
                    background: alpha('#fff', 0.04),
                    border: `1px solid ${darkBorder}`,
                    display: 'flex', alignItems: 'center', gap: 1,
                  }}
                >
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', flex: 1, wordBreak: 'break-all' }}>
                    {addr}
                  </Typography>
                  <IconButton size="small" onClick={handleCopy}>
                    <ContentCopyIcon sx={{ fontSize: 14, color: copied ? neonGreen : 'text.secondary' }} />
                  </IconButton>
                </Box>
                <Chip
                  label={copied ? 'Copied!' : 'Copy Address'}
                  onClick={handleCopy}
                  size="small"
                  sx={{
                    background: copied ? alpha(neonGreen, 0.2) : alpha('#fff', 0.06),
                    color: copied ? neonGreen : 'text.secondary',
                    border: `1px solid ${copied ? alpha(neonGreen, 0.4) : darkBorder}`,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                />
              </Box>
            </Box>
          </motion.div>
        )}

        {tab === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <TextField
              fullWidth label="Withdraw Address" variant="outlined" size="small" sx={{ mb: 1.5 }}
            />
            <TextField
              fullWidth label={`Amount (${COINS[selectedCoin].symbol})`} variant="outlined"
              size="small" sx={{ mb: 1.5 }}
              InputProps={{
                endAdornment: (
                  <Typography sx={{ fontSize: '0.75rem', color: neonGreen, fontWeight: 700, pr: 0.5 }}>MAX</Typography>
                ),
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Available: {COINS[selectedCoin].balance} {COINS[selectedCoin].symbol}</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Fee: ~0.0001 {COINS[selectedCoin].symbol}</Typography>
            </Box>
            <Button variant="contained" fullWidth sx={{ py: 1.2, fontWeight: 800 }}>
              Withdraw {COINS[selectedCoin].symbol}
            </Button>
          </motion.div>
        )}

        {tab === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {[
              { type: 'Deposit', amount: '+0.01 BTC', usd: '$667.20', status: 'Confirmed', color: neonGreen },
              { type: 'Withdraw', amount: '-0.005 ETH', usd: '$11.80', status: 'Confirmed', color: '#ff4757' },
              { type: 'Deposit', amount: '+100 USDT', usd: '$100.00', status: 'Confirmed', color: neonGreen },
              { type: 'Withdraw', amount: '-0.002 BTC', usd: '$133.44', status: 'Pending', color: neonGold },
            ].map((tx, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', alignItems: 'center', py: 1.2,
                  borderBottom: i < 3 ? `1px solid ${darkBorder}` : 'none',
                }}
              >
                <Box
                  sx={{
                    width: 32, height: 32, borderRadius: '50%', mr: 1.5,
                    background: alpha(tx.color, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${alpha(tx.color, 0.3)}`,
                  }}
                >
                  <SwapHorizIcon sx={{ fontSize: 16, color: tx.color }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{tx.type}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{tx.usd}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: tx.color }}>{tx.amount}</Typography>
                  <Chip
                    label={tx.status}
                    size="small"
                    sx={{
                      height: 18, fontSize: '0.6rem', fontWeight: 700,
                      background: alpha(tx.color, 0.15), color: tx.color,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
