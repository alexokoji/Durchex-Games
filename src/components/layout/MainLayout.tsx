import React, { useEffect, useRef, useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import ScrollToTop from './ScrollToTop';
import Footer from './Footer';
import { darkBg } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import VerifyEmailPage from '../../pages/VerifyEmailPage';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const theme = useTheme();
  // Below the `md` breakpoint (≤ 899px) we treat the device as mobile —
  // the sidebar becomes a temporary overlay drawer, off-canvas by default.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(!isMobile);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { user, isAuthenticated } = useAuth();

  // When the viewport crosses the breakpoint, reset to the natural state for
  // that layout — collapsed-but-pinned on desktop, hidden on mobile.
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Email-verification gate: a signed-in user who hasn't verified their email
  // can't reach the dashboard — they must enter the code first. OAuth and admin
  // accounts are created already-verified, so only email/password signups hit
  // this. Logged-out visitors browse normally.
  if (isAuthenticated && user && !user.emailVerified) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: darkBg }}>
        <VerifyEmailPage />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: darkBg }}>
      <ScrollToTop scrollRef={scrollRef} />
      <Header onToggleSidebar={() => setSidebarOpen(p => !p)} />
      <LeftSidebar
        open={sidebarOpen}
        isMobile={isMobile}
        onClose={() => setSidebarOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          mt: '64px',
          minWidth: 0,
          overflow: 'hidden',
          height: 'calc(100vh - 64px)',
        }}
      >
        <Box
          ref={scrollRef}
          sx={{ flex: 1, overflowY: 'auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}
        >
          <Box sx={{ flex: 1 }}>{children}</Box>
          <Footer />
        </Box>
        <RightSidebar />
      </Box>
    </Box>
  );
}
