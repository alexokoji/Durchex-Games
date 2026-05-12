import React, { useRef, useState } from 'react';
import { Box } from '@mui/material';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MobileNav from './MobileNav';
import ScrollToTop from './ScrollToTop';
import { darkBg } from '../../theme';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: darkBg }}>
      <ScrollToTop scrollRef={scrollRef} />
      <Header onToggleSidebar={() => setSidebarOpen(p => !p)} />
      <LeftSidebar open={sidebarOpen} />
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
        <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {children}
        </Box>
        <RightSidebar />
      </Box>
      <MobileNav />
    </Box>
  );
}
