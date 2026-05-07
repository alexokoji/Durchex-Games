import { useState } from 'react';
import {
  AppBar, Toolbar, Box, Typography, IconButton, Button, Avatar,
  InputBase, Badge, Chip, Tooltip,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuIcon from '@mui/icons-material/Menu';
import { motion } from 'framer-motion';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import WalletModal from '../wallet/WalletModal';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const theme = useTheme();
  const [walletOpen, setWalletOpen] = useState(false);

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          background: alpha(darkCard, 0.95),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${darkBorder}`,
          height: 64,
        }}
      >
        <Toolbar sx={{ height: 64, gap: 1, px: { xs: 1, md: 2 } }}>
          {/* Menu toggle */}
          <IconButton onClick={onToggleSidebar} size="small" sx={{ mr: 0.5 }}>
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* Logo */}
          <motion.div whileHover={{ scale: 1.03 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
              <Box
                sx={{
                  width: 32, height: 32, borderRadius: '8px',
                  background: `linear-gradient(135deg, ${neonGreen}, ${neonBlue})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 15px ${alpha(neonGreen, 0.5)}`,
                }}
              >
                <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: '#000' }}>N</Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  background: `linear-gradient(90deg, ${neonGreen}, ${neonBlue})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                NEXUS.BET
              </Typography>
            </Box>
          </motion.div>

          {/* Search */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              background: alpha('#fff', 0.04),
              border: `1px solid ${darkBorder}`,
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              ml: 2,
              gap: 1,
              flex: '0 0 220px',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: alpha(neonGreen, 0.4),
                background: alpha(neonGreen, 0.04),
              },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <InputBase
              placeholder="Search games..."
              sx={{ fontSize: '0.82rem', color: 'text.primary', flex: 1 }}
            />
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Balance */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              background: alpha('#fff', 0.04),
              border: `1px solid ${darkBorder}`,
              borderRadius: 2,
              px: 1.5,
              py: 0.8,
              gap: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { borderColor: alpha(neonGold, 0.4) },
            }}
          >
            <Box
              sx={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f7931a, #ffb347)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#000' }}>₿</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: neonGold }}>
              0.04821
            </Typography>
            <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Box>

          {/* Deposit button */}
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 16 }} />}
              onClick={() => setWalletOpen(true)}
              sx={{
                background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                color: '#000',
                fontWeight: 800,
                fontSize: '0.78rem',
                px: 2,
                py: 0.8,
                boxShadow: `0 0 20px ${alpha(neonGreen, 0.4)}`,
                '&:hover': { boxShadow: `0 0 30px ${alpha(neonGreen, 0.6)}` },
              }}
            >
              Deposit
            </Button>
          </motion.div>

          {/* Notifications */}
          <IconButton size="small">
            <Badge badgeContent={3} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem' } }}>
              <NotificationsIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          {/* Avatar */}
          <Tooltip title="Profile">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Avatar
                sx={{
                  width: 34, height: 34, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${neonBlue}, #0080aa)`,
                  border: `2px solid ${alpha(neonBlue, 0.4)}`,
                  fontSize: '0.8rem', fontWeight: 700,
                }}
              >
                VX
              </Avatar>
            </motion.div>
          </Tooltip>

          {/* VIP Chip */}
          <Chip
            label="VIP 5"
            size="small"
            sx={{
              background: `linear-gradient(135deg, ${neonGold}, #cc8800)`,
              color: '#000',
              fontWeight: 800,
              fontSize: '0.65rem',
              height: 22,
              display: { xs: 'none', lg: 'flex' },
            }}
          />
        </Toolbar>
      </AppBar>

      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}
