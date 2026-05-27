import {
  Popover, Box, Typography, Button, Divider, Avatar, Chip,
  List, ListItemButton, ListItemIcon, ListItemText, LinearProgress,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SecurityIcon from '@mui/icons-material/Security';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import type { AuthUser } from '../../contexts/AuthContext';

interface ProfileMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  user?: AuthUser;
  onSignInClick: () => void;
  onLogout: () => void;
}

export default function ProfileMenu({
  anchorEl, open, onClose, isAuthenticated, user, onSignInClick, onLogout,
}: ProfileMenuProps) {
  const navigate = useNavigate();
  function go(path: string) { navigate(path); onClose(); }
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
            width: 320,
            background: darkCard,
            border: `1px solid ${darkBorder}`,
            borderRadius: 2,
            overflow: 'hidden',
          },
        },
      }}
    >
      {!isAuthenticated ? (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ p: 2.5, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 56, height: 56, mx: 'auto', mb: 1.5,
                background: alpha('#fff', 0.06),
                border: `1px solid ${darkBorder}`,
              }}
            >
              <PersonIcon sx={{ fontSize: 28, color: 'text.secondary' }} />
            </Avatar>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem', mb: 0.5 }}>
              Welcome to DurchexiGames
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 2 }}>
              Sign in or create an account to start playing
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                size="small"
                startIcon={<LoginIcon sx={{ fontSize: 16 }} />}
                onClick={() => { onSignInClick(); onClose(); }}
                sx={{
                  background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                  color: '#000', fontWeight: 800, fontSize: '0.78rem',
                  py: 0.9,
                  boxShadow: `0 0 20px ${alpha(neonGreen, 0.4)}`,
                  '&:hover': { boxShadow: `0 0 30px ${alpha(neonGreen, 0.6)}` },
                }}
              >
                Sign In
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<PersonAddIcon sx={{ fontSize: 16 }} />}
                onClick={() => { onSignInClick(); onClose(); }}
                sx={{
                  borderColor: alpha(neonBlue, 0.5),
                  color: neonBlue,
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  py: 0.9,
                  '&:hover': {
                    borderColor: neonBlue,
                    background: alpha(neonBlue, 0.08),
                  },
                }}
              >
                Register
              </Button>
            </Box>
          </Box>
        </motion.div>
      ) : user ? (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <Box
            sx={{
              p: 2,
              background: `linear-gradient(135deg, ${alpha(neonBlue, 0.12)}, ${alpha(neonGreen, 0.08)})`,
              borderBottom: `1px solid ${darkBorder}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Avatar
                sx={{
                  width: 48, height: 48, fontSize: '0.95rem', fontWeight: 800,
                  background: `linear-gradient(135deg, ${neonBlue}, #0080aa)`,
                  border: `2px solid ${alpha(neonBlue, 0.4)}`,
                }}
              >
                {user.initials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                  {user.username}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem', color: 'text.secondary',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {user.email}
                </Typography>
              </Box>
              <Chip
                label={`VIP ${user.vipLevel}`}
                size="small"
                sx={{
                  background: `linear-gradient(135deg, ${neonGold}, #cc8800)`,
                  color: '#000', fontWeight: 800, fontSize: '0.62rem', height: 20,
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                Wagered: {user.wagered}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: neonGold, fontWeight: 700 }}>
                {user.vipProgress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={user.vipProgress}
              sx={{
                height: 5, borderRadius: 3,
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${neonGold}, ${neonGreen})`,
                },
              }}
            />
          </Box>

          <List sx={{ py: 0.5 }} dense>
            {[
              { label: 'My Profile',    icon: <PersonIcon sx={{ fontSize: 18 }} />,        path: '/profile' },
              { label: 'Bet History',   icon: <HistoryIcon sx={{ fontSize: 18 }} />,       path: '/bet-history' },
              { label: 'Rewards & VIP', icon: <EmojiEventsIcon sx={{ fontSize: 18 }} />,   path: '/rewards',  hl: neonGold },
              { label: 'Security',      icon: <SecurityIcon sx={{ fontSize: 18 }} />,      path: '/security' },
              { label: 'Settings',      icon: <SettingsIcon sx={{ fontSize: 18 }} />,      path: '/settings' },
              { label: 'Support',       icon: <SupportAgentIcon sx={{ fontSize: 18 }} />,  path: '/support',  hl: neonBlue },
            ].map((item) => (
              <ListItemButton key={item.label} onClick={() => go(item.path)} sx={{ mx: 1, my: 0.25, borderRadius: 1 }}>
                <ListItemIcon sx={{ minWidth: 32, color: item.hl ?? 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
                />
              </ListItemButton>
            ))}
          </List>

          <Divider />

          <Box sx={{ p: 1 }}>
            <ListItemButton
              onClick={() => { onLogout(); onClose(); }}
              sx={{ borderRadius: 1, color: '#ff6b7a' }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: '#ff6b7a' }}>
                <LogoutIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary="Sign Out"
                primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 700 }}
              />
            </ListItemButton>
          </Box>
        </motion.div>
      ) : null}
    </Popover>
  );
}
