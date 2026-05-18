import { useState, useRef } from 'react';
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
import PersonIcon from '@mui/icons-material/Person';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import WalletModal from '../wallet/WalletModal';
import BalanceMenu from '../wallet/BalanceMenu';
import NotificationsMenu from '../notifications/NotificationsMenu';
import ProfileMenu from '../profile/ProfileMenu';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatMoney, symbolOf, usdApprox } from '../../utils/currency';
import DiGLogo from './DiGLogo';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut, openAuthPrompt } = useAuth();
  const { balance, currency } = useWallet();
  const { unreadCount: liveUnread } = useNotifications();

  const [walletOpen, setWalletOpen] = useState(false);

  const balanceAnchor = useRef<HTMLDivElement | null>(null);
  const notifAnchor = useRef<HTMLButtonElement | null>(null);
  const profileAnchor = useRef<HTMLDivElement | null>(null);

  const [balanceOpen, setBalanceOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = liveUnread;

  function handleDepositClick() {
    if (!isAuthenticated) {
      openAuthPrompt();
      return;
    }
    setWalletOpen(true);
  }

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
          <IconButton onClick={onToggleSidebar} size="small" sx={{ mr: 0.5 }}>
            <MenuIcon fontSize="small" />
          </IconButton>

          {/* Logo only — the wordmark used to sit beside this. We sized the
              image past the AppBar's natural 64px and constrained it with
              maxHeight so the toolbar height itself stays fixed. */}
          <motion.div whileHover={{ scale: 1.03 }} onClick={() => navigate('/')}>
            <Box sx={{
              display: 'flex', alignItems: 'center', cursor: 'pointer',
              height: 64,
              '& img': { maxHeight: 56, width: 'auto', height: 'auto' },
            }}>
              <DiGLogo size={56} />
            </Box>
          </motion.div>

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

          {isAuthenticated && (
            <Box
              ref={balanceAnchor}
              onClick={() => setBalanceOpen(true)}
              sx={{
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                background: alpha('#fff', 0.04),
                border: `1px solid ${balanceOpen ? alpha(neonGold, 0.4) : darkBorder}`,
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
                  background: `linear-gradient(135deg, ${neonGold}, #cc8800)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontSize: '0.62rem', fontWeight: 900, color: '#000' }}>
                  {symbolOf(currency).slice(0, 2)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: neonGold, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(balance, currency)}
                </Typography>
                {currency !== 'USD' && (
                  <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', fontVariantNumeric: 'tabular-nums', mt: 0.15 }}>
                    {usdApprox(balance, currency)}
                  </Typography>
                )}
              </Box>
              <ExpandMoreIcon
                sx={{
                  fontSize: 16, color: 'text.secondary',
                  transition: 'transform 0.2s',
                  transform: balanceOpen ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            </Box>
          )}

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 16 }} />}
              onClick={handleDepositClick}
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

          {isAuthenticated && (
            <IconButton
              ref={notifAnchor}
              size="small"
              onClick={() => setNotifOpen(true)}
            >
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem' } }}
              >
                <NotificationsIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          )}

          <Tooltip title={isAuthenticated ? user!.username : 'Sign in'}>
            <motion.div
              ref={profileAnchor}
              whileHover={{ scale: 1.05 }}
              onClick={() => setProfileOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              <Avatar
                sx={{
                  width: 34, height: 34,
                  background: isAuthenticated
                    ? `linear-gradient(135deg, ${neonBlue}, #0080aa)`
                    : alpha('#fff', 0.06),
                  border: `2px solid ${isAuthenticated ? alpha(neonBlue, 0.4) : darkBorder}`,
                  fontSize: '0.8rem', fontWeight: 700,
                }}
              >
                {isAuthenticated
                  ? user!.initials
                  : <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
              </Avatar>
            </motion.div>
          </Tooltip>

          {isAuthenticated && (
            <Chip
              label={`VIP ${user!.vipLevel}`}
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
          )}
        </Toolbar>
      </AppBar>

      {isAuthenticated && (
        <>
          <BalanceMenu
            anchorEl={balanceAnchor.current}
            open={balanceOpen}
            onClose={() => setBalanceOpen(false)}
            onDeposit={() => setWalletOpen(true)}
            onWithdraw={() => setWalletOpen(true)}
          />

          <NotificationsMenu
            anchorEl={notifAnchor.current}
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
        </>
      )}

      <ProfileMenu
        anchorEl={profileAnchor.current}
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        isAuthenticated={isAuthenticated}
        user={user ?? undefined}
        onSignInClick={openAuthPrompt}
        onLogout={signOut}
      />

      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}
