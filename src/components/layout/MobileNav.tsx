import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import CasinoIcon from '@mui/icons-material/Casino';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { neonGreen, darkCard, darkBorder } from '../../theme';

const items = [
  { label: 'Home', icon: <HomeIcon />, path: '/' },
  { label: 'Crash', icon: <ShowChartIcon />, path: '/crash' },
  { label: 'Dice', icon: <CasinoIcon />, path: '/dice' },
  { label: 'VIP', icon: <EmojiEventsIcon />, path: '/vip' },
  { label: 'Profile', icon: <AccountCircleIcon />, path: '/profile' },
];

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box
      sx={{
        display: { xs: 'flex', md: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        background: alpha(darkCard, 0.97),
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${darkBorder}`,
        height: 60,
        alignItems: 'center',
        justifyContent: 'space-around',
        px: 1,
      }}
    >
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <Box
            key={item.path}
            onClick={() => navigate(item.path)}
            sx={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 0.25, cursor: 'pointer', py: 0.5, px: 1.5,
              borderRadius: 2, transition: 'all 0.2s',
              color: active ? neonGreen : 'text.secondary',
              '&:hover': { color: neonGreen },
            }}
          >
            <Box sx={{ '& svg': { fontSize: 22, filter: active ? `drop-shadow(0 0 6px ${neonGreen})` : 'none' } }}>
              {item.icon}
            </Box>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1 }}>
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
