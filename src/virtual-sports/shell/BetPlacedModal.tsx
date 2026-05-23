import { Box, Dialog, Typography, Button, IconButton, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { formatMoney, type FiatCurrency } from '../../utils/currency';

interface BetPlacedModalProps {
  open: boolean;
  onClose: () => void;
  bookingCode: string | null;
  stake: number;
  payout: number;
  currency: FiatCurrency;
  selections: number;
  mode: string;
}

export default function BetPlacedModal({
  open,
  onClose,
  bookingCode,
  stake,
  payout,
  currency,
  selections,
  mode,
}: BetPlacedModalProps) {
  const handleCopyCode = async () => {
    if (bookingCode) {
      try {
        await navigator.clipboard.writeText(bookingCode);
      } catch (err) {
        // ignore
      }
    }
  };

  const handleShare = async () => {
    if (!bookingCode) return;
    const text = `Check out this ${selections}-leg ${mode} bet on Durchex Games! Code: ${bookingCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Durchex Games Bet Slip',
          text,
          url: window.location.href,
        });
      } catch (err) {
        // ignore if user cancels
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        // ignore
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: darkCard,
          border: `1px solid ${alpha(neonGreen, 0.35)}`,
          borderRadius: 3,
        },
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={{ p: 3, position: 'relative' }}>
          {/* Close button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              color: 'text.secondary',
              '&:hover': { color: '#fff' },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Success icon */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, repeat: 1 }}
            >
              <CheckCircleIcon
                sx={{
                  fontSize: 64,
                  color: neonGreen,
                  filter: `drop-shadow(0 0 12px ${alpha(neonGreen, 0.6)})`,
                }}
              />
            </motion.div>
          </Box>

          {/* Title */}
          <Typography
            sx={{
              fontSize: '1.2rem',
              fontWeight: 900,
              textAlign: 'center',
              mb: 0.5,
              color: neonGreen,
            }}
          >
            Bet Placed Successfully
          </Typography>

          {/* Subtitle */}
          <Typography
            sx={{
              fontSize: '0.85rem',
              color: 'text.secondary',
              textAlign: 'center',
              mb: 2.5,
            }}
          >
            Your {selections}-leg {mode} bet is now active
          </Typography>

          {/* Bet details */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              background: alpha('#fff', 0.03),
              border: `1px solid ${darkBorder}`,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                Total Stake
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(stake, currency)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                Potential Payout
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: neonGreen,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(payout, currency)}
              </Typography>
            </Box>
          </Box>

          {/* Booking code section */}
          {bookingCode && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: alpha(neonGold, 0.08),
                border: `1px solid ${alpha(neonGold, 0.25)}`,
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: neonGold,
                  letterSpacing: '0.08em',
                  mb: 0.75,
                  textTransform: 'uppercase',
                }}
              >
                Booking Code
              </Typography>
              <Box
                sx={{
                  p: 1,
                  background: alpha('#000', 0.3),
                  border: `1px solid ${alpha(neonGold, 0.3)}`,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    color: neonGold,
                    letterSpacing: '0.15em',
                    flex: 1,
                  }}
                >
                  {bookingCode}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCopyCode}
                  title="Copy code"
                  sx={{
                    color: neonGold,
                    '&:hover': { background: alpha(neonGold, 0.1) },
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: 'text.secondary',
                  mt: 0.75,
                  lineHeight: 1.4,
                }}
              >
                Share this code with friends so they can load your exact bet slip.
              </Typography>
            </Box>
          )}

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {bookingCode && (
              <Button
                startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
                fullWidth
                onClick={handleShare}
                sx={{
                  py: 0.75,
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: alpha(neonGold, 0.15),
                  color: neonGold,
                  border: `1px solid ${alpha(neonGold, 0.35)}`,
                  '&:hover': { background: alpha(neonGold, 0.25) },
                }}
              >
                Share Code
              </Button>
            )}
            <Button
              fullWidth
              onClick={onClose}
              sx={{
                py: 0.75,
                fontSize: '0.8rem',
                fontWeight: 800,
                background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                color: '#000',
                '&:hover': {
                  boxShadow: `0 0 20px ${alpha(neonGreen, 0.5)}`,
                },
              }}
            >
              Continue Betting
            </Button>
          </Box>
        </Box>
      </motion.div>
    </Dialog>
  );
}
