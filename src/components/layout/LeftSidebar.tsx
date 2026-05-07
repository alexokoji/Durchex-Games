import {
  Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CasinoIcon from '@mui/icons-material/Casino';
import DiamondIcon from '@mui/icons-material/Diamond';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import BoltIcon from '@mui/icons-material/Bolt';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { neonGreen, neonBlue, neonGold, darkBorder, darkSurface } from '../../theme';

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

interface LeftSidebarProps {
  open: boolean;
}

const navItems = [
  {
    section: 'CASINO',
    items: [
      { label: 'Originals', icon: <BoltIcon />, path: '/', color: neonGreen },
      { label: 'Crash', icon: <ShowChartIcon />, path: '/crash', color: '#ff4757' },
      { label: 'Dice', icon: <CasinoIcon />, path: '/dice', color: neonBlue },
      { label: 'Plinko', icon: <DiamondIcon />, path: '/plinko', color: '#a855f7' },
    ],
  },
  {
    section: 'GAMES',
    items: [
      { label: 'Slots', icon: <SportsEsportsIcon />, path: '/slots', color: '#ff9f43' },
      { label: 'Live Casino', icon: <TableRestaurantIcon />, path: '/live', color: '#ee5a24' },
      { label: 'Table Games', icon: <CasinoIcon />, path: '/tables', color: neonBlue },
    ],
  },
  {
    section: 'MORE',
    items: [
      { label: 'Favorites', icon: <FavoriteIcon />, path: '/favorites', color: '#ff4757' },
      { label: 'Promotions', icon: <LocalOfferIcon />, path: '/promotions', color: neonGold },
      { label: 'VIP Club', icon: <MilitaryTechIcon />, path: '/vip', color: neonGold },
      { label: 'Tournaments', icon: <EmojiEventsIcon />, path: '/tournaments', color: '#a855f7' },
    ],
  },
];

export default function LeftSidebar({ open }: LeftSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const drawerContent = (
    <Box
      sx={{
        width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED,
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        pt: '64px',
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {navItems.map((group, gi) => (
          <Box key={gi} sx={{ mb: 0.5 }}>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      px: 2,
                      py: 0.5,
                      color: 'text.disabled',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      fontSize: '0.65rem',
                    }}
                  >
                    {group.section}
                  </Typography>
                </motion.div>
              )}
            </AnimatePresence>
            <List dense disablePadding sx={{ px: 1 }}>
              {group.items.map((item) => {
                const active = location.pathname === item.path;
                const btn = (
                  <motion.div
                    key={item.path}
                    whileHover={{ x: open ? 4 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ListItemButton
                      selected={active}
                      onClick={() => navigate(item.path)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.25,
                        minHeight: 42,
                        justifyContent: open ? 'flex-start' : 'center',
                        px: open ? 1.5 : 1,
                        ...(active && {
                          background: alpha(item.color, 0.12),
                          boxShadow: `inset 0 0 0 1px ${alpha(item.color, 0.3)}`,
                        }),
                        '&:hover': {
                          background: alpha(item.color, 0.1),
                          '& .sidebar-icon': { color: item.color, filter: `drop-shadow(0 0 6px ${item.color})` },
                          '& .sidebar-text': { color: '#fff' },
                        },
                      }}
                    >
                      <ListItemIcon
                        className="sidebar-icon"
                        sx={{
                          minWidth: open ? 36 : 'auto',
                          color: active ? item.color : 'text.secondary',
                          transition: 'all 0.2s',
                          filter: active ? `drop-shadow(0 0 6px ${item.color})` : 'none',
                          '& svg': { fontSize: 20 },
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ListItemText
                              primary={item.label}
                              className="sidebar-text"
                              primaryTypographyProps={{
                                fontSize: '0.84rem',
                                fontWeight: active ? 700 : 500,
                                color: active ? '#fff' : 'text.secondary',
                                sx: { transition: 'color 0.2s' },
                              }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </ListItemButton>
                  </motion.div>
                );

                return open ? btn : (
                  <Tooltip key={item.path} title={item.label} placement="right">
                    {btn}
                  </Tooltip>
                );
              })}
            </List>
            {gi < navItems.length - 1 && (
              <Divider sx={{ my: 1, mx: 1.5, borderColor: darkBorder }} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: open ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED,
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          backgroundColor: darkSurface,
          border: 'none',
          borderRight: `1px solid ${darkBorder}`,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
