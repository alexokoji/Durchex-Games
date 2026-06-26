import type { ReactNode } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import GameLeaderboard from './GameLeaderboard';

interface GamePageWrapperProps {
  gameId: string;
  gameName: string;
  children: ReactNode;
}

/**
 * Responsive wrapper for all game pages
 * Handles:
 * - Mobile/tablet/desktop responsive layouts
 * - Leaderboard display
 * - Proper spacing and margins
 */
export default function GamePageWrapper({ gameId, children }: GamePageWrapperProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const containerPadding = isMobile ? 2 : 3;
  const maxWidth = isMobile ? '100%' : isTablet ? 700 : 1200;
  const gameCardMaxWidth = isMobile ? '100%' : 500;
  const leaderboardMaxWidth = isMobile ? '100%' : 350;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
        p: containerPadding,
      }}
    >
      <Box
        sx={{
          maxWidth,
          mx: 'auto',
          display: isMobile ? 'flex' : 'grid',
          flexDirection: 'column',
          gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 350px',
          gap: 3,
        }}
      >
        {/* Main game container */}
        <Box sx={{ maxWidth: gameCardMaxWidth, mx: isMobile ? 'auto' : 0 }}>{children}</Box>

        {/* Leaderboard sidebar (hidden on mobile) */}
        {!isMobile && !isTablet && (
          <Box sx={{ maxWidth: leaderboardMaxWidth, height: 'fit-content', position: 'sticky', top: 20 }}>
            <GameLeaderboard gameId={gameId} limit={10} />
          </Box>
        )}
      </Box>

      {/* Mobile leaderboard (shown at bottom on mobile) */}
      {isMobile && (
        <Box sx={{ maxWidth: 500, mx: 'auto', mt: 3 }}>
          <GameLeaderboard gameId={gameId} limit={10} />
        </Box>
      )}
    </Box>
  );
}
