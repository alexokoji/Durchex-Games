import { useEffect } from 'react';
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
import HomeIcon from '@mui/icons-material/Home';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsHockeyIcon from '@mui/icons-material/SportsHockey';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GrassIcon from '@mui/icons-material/Grass';
import CampaignIcon from '@mui/icons-material/Campaign';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../../contexts/AuthContext';
import { neonGreen, neonBlue, neonGold, darkBorder, darkSurface } from '../../theme';

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

interface LeftSidebarProps {
  open: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

const MOBILE_DRAWER_WIDTH = 280;

const navItems = [
  {
    section: 'HOUSE',
    items: [
      { label: 'Home',     icon: <HomeIcon />,     path: '/',         color: neonGreen },
    ],
  },
  {
    section: 'ORIGINALS',
    items: [
      { label: 'Crash',     icon: <ShowChartIcon />,      path: '/crash',     color: '#ff4757' },
      { label: 'Dice',      icon: <CasinoIcon />,         path: '/dice',      color: neonBlue },
      { label: 'Plinko',    icon: <DiamondIcon />,        path: '/plinko',    color: '#a855f7' },
      { label: 'Mines',     icon: <GrassIcon />,          path: '/mines',     color: '#22c55e' },
    ],
  },
  {
    section: 'TABLE & SLOTS',
    items: [
      { label: 'Blackjack', icon: <CasinoIcon />,         path: '/blackjack', color: '#0ea5e9' },
      { label: 'Baccarat',  icon: <CasinoIcon />,         path: '/baccarat',  color: '#ec4899' },
      { label: 'Roulette',  icon: <CasinoIcon />,         path: '/roulette',  color: '#f59e0b' },
      { label: 'Slots',     icon: <SportsEsportsIcon />,  path: '/slots',     color: '#ff9f43' },
    ],
  },
  {
    section: 'VIRTUAL SPORTS',
    items: [
      { label: 'Soccer',     icon: <SportsSoccerIcon />,     path: '/virtual/soccer',     color: '#10b981' },
      { label: 'Basketball', icon: <SportsBasketballIcon />, path: '/virtual/basketball', color: '#f97316' },
      { label: 'Hockey',     icon: <SportsHockeyIcon />,     path: '/virtual/hockey',     color: '#3b82f6' },
      { label: 'Horse Race', icon: <DirectionsRunIcon />,    path: '/virtual/horseracing', color: '#a16207' },
    ],
  },
  {
    section: 'ACCOUNT',
    items: [
      { label: 'My Profile',  icon: <PersonIcon />,        path: '/profile',     color: neonBlue },
      { label: 'Bet History', icon: <HistoryIcon />,       path: '/bet-history', color: '#a855f7' },
      { label: 'Promoter',    icon: <CampaignIcon />,      path: '/promoter',    color: '#ec4899' },
      { label: 'VIP Club',    icon: <MilitaryTechIcon />,  path: '/vip',         color: neonGold },
    ],
  },
];

export default function LeftSidebar({ open, isMobile = false, onClose }: LeftSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Append the admin section only for users on the ADMIN_EMAILS allowlist.
  // We rebuild the items array each render so the panel disappears the moment
  // the user signs out without forcing a remount.
  const itemsForUser = user?.isAdmin
    ? [
        ...navItems,
        {
          section: 'ADMIN',
          items: [
            { label: 'Admin console', icon: <AdminPanelSettingsIcon />, path: '/admin', color: '#ff6b7a' },
          ],
        },
      ]
    : navItems;

  // Close the drawer automatically after a navigation on mobile.
  useEffect(() => {
    if (isMobile && open && onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // On mobile the sidebar is the temporary overlay, so we always show the
  // full content (no collapsed/icon-only state).
  const expanded = isMobile ? true : open;
  const drawerWidth = isMobile ? MOBILE_DRAWER_WIDTH : (expanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED);

  const drawerContent = (
    <Box
      sx={{
        width: drawerWidth,
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        // On mobile the drawer slides over the AppBar, but the AppBar still
        // renders on top — pad the content down so the first menu item
        // (Home) clears the 64px header instead of being hidden behind it.
        pt: isMobile ? '72px' : '64px',
      }}
    >
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
        {itemsForUser.map((group, gi) => (
          <Box key={gi} sx={{ mb: 0.5 }}>
            <AnimatePresence>
              {expanded && (
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
                // Highlight the current page. "/" must be an exact match (otherwise
                // it would match every route). Everything else also matches its
                // sub-routes (e.g. "/virtual/soccer" highlights when on a deeper
                // soccer sub-path, and "/bet-history/x" still highlights Bet History).
                const active = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.path
                    || location.pathname.startsWith(item.path + '/');
                const btn = (
                  <motion.div
                    key={item.path}
                    whileHover={{ x: expanded ? 4 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ListItemButton
                      selected={active}
                      onClick={() => navigate(item.path)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.25,
                        minHeight: 42,
                        justifyContent: expanded ? 'flex-start' : 'center',
                        px: expanded ? 1.5 : 1,
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
                          minWidth: expanded ? 36 : 'auto',
                          color: active ? item.color : 'text.secondary',
                          transition: 'all 0.2s',
                          filter: active ? `drop-shadow(0 0 6px ${item.color})` : 'none',
                          '& svg': { fontSize: 20 },
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <AnimatePresence>
                        {expanded && (
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

                return expanded ? btn : (
                  <Tooltip key={item.path} title={item.label} placement="right">
                    {btn}
                  </Tooltip>
                );
              })}
            </List>
            {gi < itemsForUser.length - 1 && (
              <Divider sx={{ my: 1, mx: 1.5, borderColor: darkBorder }} />
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );

  if (isMobile) {
    // Temporary overlay drawer — tappable backdrop, slides out from the left,
    // floats above content. The hamburger in the Header toggles `open`.
    return (
      <Drawer
        variant="temporary"
        anchor="left"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}   // smoother re-open
        sx={{
          '& .MuiDrawer-paper': {
            width: MOBILE_DRAWER_WIDTH,
            backgroundColor: darkSurface,
            border: 'none',
            borderRight: `1px solid ${darkBorder}`,
            zIndex: (theme) => theme.zIndex.drawer + 2,  // above the AppBar
          },
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop — permanent, collapses to a 64px icon rail when `open` is false.
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
