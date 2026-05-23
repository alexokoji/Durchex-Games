import { useState } from 'react';
import { Box, Typography, Alert, Button, Drawer, IconButton, useMediaQuery, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PeopleIcon from '@mui/icons-material/People';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FlagIcon from '@mui/icons-material/Flag';
import ShieldIcon from '@mui/icons-material/Shield';
import EventNoteIcon from '@mui/icons-material/EventNote';
import HistoryIcon from '@mui/icons-material/History';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import { useAuth } from '../../contexts/AuthContext';
import { neonGreen, darkBorder, darkSurface } from '../../theme';
import AdminLayout         from './AdminLayout';
import AdminOverviewPanel  from './AdminOverviewPanel';
import AdminPayoutsPanel   from './AdminPayoutsPanel';
import AdminLedgerPanel    from './AdminLedgerPanel';
import AdminReconcilePanel from './AdminReconcilePanel';
import AdminPromotersPanel  from './AdminPromotersPanel';
import AdminPromoCodesPanel from './AdminPromoCodesPanel';
import AdminFlaggedPanel    from './AdminFlaggedPanel';
import AdminAuditPanel      from './AdminAuditPanel';
import AdminJobsPanel       from './AdminJobsPanel';
import AdminRiskPanel       from './AdminRiskPanel';
import AdminUsersPanel      from './AdminUsersPanel';
import AdminVirtualSportsPanel from './AdminVirtualSportsPanel';
import { AdminCurrencyProvider, useAdminCurrency, type AdminDisplayCurrency } from './AdminCurrencyContext';

type TabId =
  | 'overview' | 'payouts' | 'ledger' | 'reconcile'
  | 'users' | 'promoters' | 'codes' | 'flagged'
  | 'risk' | 'jobs' | 'audit' | 'virtualsports';

interface NavItem {
  id: TabId;
  label: string;
  description: string;
  icon: React.ReactNode;
  group: 'Operate' | 'People' | 'Safety' | 'Games' | 'System';
}

const NAV: NavItem[] = [
  { id: 'overview',  label: 'Overview',     description: 'Live KPIs and house balance',          icon: <DashboardIcon fontSize="small" />,       group: 'Operate' },
  { id: 'payouts',   label: 'Payouts',      description: 'Approve withdrawals',                 icon: <PaymentsIcon fontSize="small" />,        group: 'Operate' },
  { id: 'ledger',    label: 'Ledger',       description: 'House money trail by day',             icon: <ReceiptLongIcon fontSize="small" />,     group: 'Operate' },
  { id: 'reconcile', label: 'Reconcile',    description: 'Match wallets vs gameplay totals',    icon: <CompareArrowsIcon fontSize="small" />,   group: 'Operate' },
  { id: 'users',         label: 'Users',      description: 'Search, tier, block, refund',      icon: <PeopleIcon fontSize="small" />,            group: 'People' },
  { id: 'promoters',     label: 'Promoters',  description: 'Affiliates & their performance',    icon: <VolunteerActivismIcon fontSize="small" />, group: 'People' },
  { id: 'codes',         label: 'Promo codes', description: 'Bonuses, referral & promo codes', icon: <LocalOfferIcon fontSize="small" />,        group: 'People' },
  { id: 'flagged',  label: 'Flagged',  description: 'Suspicious accounts & bets',           icon: <FlagIcon fontSize="small" />,            group: 'Safety' },
  { id: 'risk',     label: 'Risk',     description: 'Per-game win/loss tuning (advanced)',  icon: <ShieldIcon fontSize="small" />,          group: 'Safety' },
  { id: 'virtualsports', label: 'Virtual Sports', description: 'Generate accurate predictions for upcoming kickoffs', icon: <SportsSoccerIcon fontSize="small" />, group: 'Games' },
  { id: 'jobs',     label: 'Jobs',     description: 'Background workers & schedules',       icon: <EventNoteIcon fontSize="small" />,       group: 'System' },
  { id: 'audit',    label: 'Audit log', description: 'Every admin action, who did what',    icon: <HistoryIcon fontSize="small" />,         group: 'System' },
];

const SIDEBAR_WIDTH = 264;

function AdminPageContent() {
  const { user, isAuthenticated, openAuthPrompt } = useAuth();
  const [tab, setTab] = useState<TabId>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { displayCurrency, setDisplayCurrency } = useAdminCurrency();

  if (!isAuthenticated || !user) {
    return (
      <AdminLayout>
        <Box sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sign in required</Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>The admin console is for staff only.</Typography>
          <Button variant="contained" onClick={openAuthPrompt}>Sign in</Button>
        </Box>
      </AdminLayout>
    );
  }
  if (!user.isAdmin) {
    return (
      <AdminLayout>
        <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
          <Alert severity="warning">
            Admin only. Add your email to <code>ADMIN_EMAILS</code> in the server <code>.env</code> if you should have access here.
          </Alert>
        </Box>
      </AdminLayout>
    );
  }

  const grouped = NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
    (acc[item.group] ||= []).push(item);
    return acc;
  }, {});

  const sidebar = (
    <Box sx={{
      width: SIDEBAR_WIDTH,
      height: '100%',
      background: darkSurface,
      borderRight: `1px solid ${darkBorder}`,
      overflowY: 'auto',
      p: 1.5,
    }}>
      <Typography sx={{
        fontSize: '0.62rem', fontWeight: 800, color: 'text.disabled',
        letterSpacing: '0.14em', mb: 1.25, px: 1,
      }}>
        ADMIN NAVIGATION
      </Typography>
      {Object.entries(grouped).map(([group, items]) => (
        <Box key={group} sx={{ mb: 1.5 }}>
          <Typography sx={{
            fontSize: '0.65rem', fontWeight: 800,
            color: 'text.disabled', letterSpacing: '0.1em',
            px: 1, mb: 0.5, textTransform: 'uppercase',
          }}>
            {group}
          </Typography>
          {items.map(item => {
            const active = tab === item.id;
            return (
              <Box
                key={item.id}
                onClick={() => { setTab(item.id); setMobileOpen(false); }}
                sx={{
                  display: 'flex', alignItems: 'flex-start', gap: 1.25,
                  px: 1, py: 1, borderRadius: 1.5, cursor: 'pointer',
                  background: active ? alpha(neonGreen, 0.1) : 'transparent',
                  border: `1px solid ${active ? alpha(neonGreen, 0.35) : 'transparent'}`,
                  color: active ? neonGreen : 'inherit',
                  transition: 'background 0.15s, border-color 0.15s',
                  '&:hover': {
                    background: active ? alpha(neonGreen, 0.14) : alpha('#fff', 0.04),
                  },
                  mb: 0.25,
                }}
              >
                <Box sx={{ mt: 0.25, color: active ? neonGreen : 'text.secondary' }}>
                  {item.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.2 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', lineHeight: 1.25, mt: 0.25 }}>
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );

  const activeItem = NAV.find(n => n.id === tab);

  return (
    <AdminLayout>
      <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
        {isDesktop ? (
          <Box sx={{ flexShrink: 0 }}>{sidebar}</Box>
        ) : (
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            slotProps={{ paper: { sx: { background: 'transparent', border: 'none' } } }}
          >
            {sidebar}
          </Drawer>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {!isDesktop && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1.5, py: 1, borderBottom: `1px solid ${darkBorder}`,
              background: darkSurface,
            }}>
              <IconButton size="small" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800 }}>
                {activeItem?.label}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 0.5 }}>
                · {activeItem?.description}
              </Typography>
            </Box>
          )}
          <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
              <Box>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Admin currency display</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                  Toggle how currency amounts are rendered across admin reports.
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={displayCurrency}
                exclusive
                onChange={(_, value) => { if (value) setDisplayCurrency(value as AdminDisplayCurrency); }}
                size="small"
                sx={{ background: darkSurface, border: `1px solid ${darkBorder}`, borderRadius: 2 }}
              >
                <ToggleButton value="NGN" sx={{ color: 'inherit' }}>NGN</ToggleButton>
                <ToggleButton value="USD" sx={{ color: 'inherit' }}>USD</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {tab === 'overview'      && <AdminOverviewPanel onJumpToPayouts={() => setTab('payouts')} />}
            {tab === 'payouts'       && <AdminPayoutsPanel   />}
            {tab === 'ledger'        && <AdminLedgerPanel    />}
            {tab === 'reconcile'     && <AdminReconcilePanel />}
            {tab === 'users'         && <AdminUsersPanel     />}
            {tab === 'promoters'     && <AdminPromotersPanel />}
            {tab === 'codes'         && <AdminPromoCodesPanel />}
            {tab === 'flagged'       && <AdminFlaggedPanel    />}
            {tab === 'risk'          && <AdminRiskPanel       />}
            {tab === 'virtualsports' && <AdminVirtualSportsPanel />}
            {tab === 'jobs'          && <AdminJobsPanel       />}
            {tab === 'audit'         && <AdminAuditPanel      />}
          </Box>
        </Box>
      </Box>
    </AdminLayout>
  );
}

export default function AdminPage() {
  return (
    <AdminCurrencyProvider>
      <AdminPageContent />
    </AdminCurrencyProvider>
  );
}
