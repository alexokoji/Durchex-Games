import { AppBar, Toolbar, Box, Typography, Button, IconButton, Avatar, Menu, MenuItem, Divider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../contexts/AuthContext';
import { neonGreen, neonGold, darkBorder, darkSurface } from '../../theme';
import DiGLogo from '../../components/layout/DiGLogo';

interface Props {
  children: ReactNode;
}

/**
 * Minimal chrome for the admin console — no game sidebar, no chat sidebar,
 * no install-app prompt. Just a slim top bar with: logo, page label, user
 * menu, sign-out, "Back to casino". Anything below 64px belongs to the
 * AdminPage content.
 *
 * `<MainLayout>` from the casino app is bypassed entirely; the AppBar here
 * is the only persistent chrome the admin sees.
 */
export default function AdminLayout({ children }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box sx={{ minHeight: '100vh', background: '#070a0f' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: darkSurface,
          borderBottom: `1px solid ${darkBorder}`,
        }}
      >
        <Toolbar sx={{ height: 64, gap: 1.5 }}>
          <Box
            onClick={() => navigate('/admin')}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 1, '& img': { maxHeight: 36, width: 'auto' } }}
          >
            <DiGLogo size={36} />
            <Typography sx={{
              fontSize: '0.75rem', fontWeight: 800, color: '#fff',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              borderLeft: `1px solid ${darkBorder}`, pl: 1.5, ml: 0.5,
            }}>
              Admin Console
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<HomeIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/')}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.78rem',
              '&:hover': { color: neonGreen, background: alpha(neonGreen, 0.06) },
            }}
          >
            Back to casino
          </Button>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <Avatar sx={{
              width: 30, height: 30,
              background: `linear-gradient(135deg, ${neonGold}, #cc8800)`,
              color: '#000', fontSize: '0.78rem', fontWeight: 900,
            }}>
              {user?.initials ?? 'A'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { background: darkSurface, border: `1px solid ${darkBorder}`, minWidth: 220 } } }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>{user?.username}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{user?.email}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setMenuAnchor(null); navigate('/profile'); }}>
              View profile
            </MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); navigate('/settings'); }}>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={async () => { setMenuAnchor(null); await signOut(); navigate('/'); }}
              sx={{ color: '#ff6b7a' }}
            >
              <LogoutIcon sx={{ fontSize: 16, mr: 1 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box>{children}</Box>
    </Box>
  );
}
