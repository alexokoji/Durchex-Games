import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import LeftSportsPanel from './LeftSportsPanel';
import RightBetSlipPanel from './RightBetSlipPanel';
import type { SportKey } from '../core/types';

interface SportsbookLayoutProps {
  sport: SportKey;
  activeLeagueId: string;
  onSelectLeague: (id: string) => void;
  /** When provided, sport tabs switch in-page instead of navigating. */
  onSelectSport?: (sport: SportKey) => void;
  children: ReactNode;
}

export default function SportsbookLayout({
  sport,
  activeLeagueId,
  onSelectLeague,
  onSelectSport,
  children,
}: SportsbookLayoutProps) {
  return (
    <Box sx={{ p: { xs: 1, md: 1.5 }, pb: { xs: 10, md: 1.5 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: 'flex-start' }}>
        <LeftSportsPanel
          activeSport={sport}
          activeLeagueId={activeLeagueId}
          onSelectLeague={onSelectLeague}
          onSelectSport={onSelectSport}
        />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0, width: '100%' }}>
          {children}
        </Box>
        <RightBetSlipPanel />
      </Box>
    </Box>
  );
}
