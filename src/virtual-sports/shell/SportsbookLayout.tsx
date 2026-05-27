import { useState } from 'react';
import { Box, Drawer, Fab, Badge } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import LeftSportsPanel from './LeftSportsPanel';
import RightBetSlipPanel from './RightBetSlipPanel';
import { useBetSlip } from '../core/BetSlipContext';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import { neonGreen } from '../../theme';
import { formatMoney } from '../../utils/currency';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
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
  const { selections, openTickets } = useBetSlip();
  const wallet = useWallet();
  const { isAuthenticated } = useAuth();
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);

  const badgeCount = selections.length + openTickets.length;

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

        {/* Desktop: sticky right panel */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <RightBetSlipPanel />
        </Box>
      </Box>

      {/* ── Mobile: floating action button + bottom drawer ─────────────────── */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Fab
          onClick={() => setMobileSlipOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 72,
            right: 16,
            zIndex: 1200,
            background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
            color: '#000',
            width: 56,
            height: 56,
            boxShadow: `0 4px 20px ${alpha(neonGreen, 0.5)}`,
            '&:hover': { boxShadow: `0 4px 28px ${alpha(neonGreen, 0.7)}` },
          }}
        >
          <Badge
            badgeContent={badgeCount}
            color="error"
            sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
          >
            <ReceiptLongIcon sx={{ fontSize: 24 }} />
          </Badge>
        </Fab>

        {/* Balance chip — only for signed-in users */}
        {isAuthenticated && (
          <Box
            onClick={() => setMobileSlipOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 72,
              right: 80,
              zIndex: 1200,
              px: 1.5, py: 0.75,
              borderRadius: 99,
              background: alpha('#000', 0.85),
              border: `1px solid ${alpha(neonGreen, 0.4)}`,
              color: neonGreen,
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              boxShadow: `0 2px 12px ${alpha('#000', 0.4)}`,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatMoney(wallet.balance + wallet.bonusBalance, wallet.currency)}
          </Box>
        )}

        <Drawer
          anchor="bottom"
          open={mobileSlipOpen}
          onClose={() => setMobileSlipOpen(false)}
          PaperProps={{
            sx: {
              borderRadius: '16px 16px 0 0',
              maxHeight: '88vh',
              background: 'transparent',
              boxShadow: 'none',
            },
          }}
        >
          {/* Drag handle */}
          <Box sx={{
            display: 'flex', justifyContent: 'center', pt: 1.25, pb: 0.5,
            background: '#121212',
            borderRadius: '16px 16px 0 0',
          }}>
            <Box sx={{ width: 36, height: 4, borderRadius: 2, background: alpha('#fff', 0.2) }} />
          </Box>
          <Box sx={{ overflowY: 'auto', background: '#121212' }}>
            <RightBetSlipPanel />
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
}
