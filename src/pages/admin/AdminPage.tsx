import { useState } from 'react';
import { Box, Typography, Alert, Button, Drawer, IconButton, useMediaQuery, ToggleButton, ToggleButtonGroup, TextField, CircularProgress } from '@mui/material';
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
import CasinoIcon from '@mui/icons-material/Casino';
import EmailIcon from '@mui/icons-material/Email';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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
import AdminRiskFlagsPanel  from './AdminRiskFlagsPanel';
import AdminPromoSlipsPanel  from './AdminPromoSlipsPanel';
import AdminAnalyticsPanel   from './AdminAnalyticsPanel';
import AdminBettingExposurePanel from './AdminBettingExposurePanel';
import AdminEmailPanel        from './AdminEmailPanel';
import AdminAuditPanel      from './AdminAuditPanel';
import AdminJobsPanel       from './AdminJobsPanel';
import AdminRiskPanel       from './AdminRiskPanel';
import AdminUsersPanel      from './AdminUsersPanel';
import AdminVirtualSportsPanel    from './AdminVirtualSportsPanel';
import AdminCasinoPredictionsPanel from './AdminCasinoPredictionsPanel';
import { AdminCurrencyProvider, useAdminCurrency, type AdminDisplayCurrency } from './AdminCurrencyContext';

type TabId =
  | 'overview' | 'payouts' | 'ledger' | 'reconcile'
  | 'users' | 'promoters' | 'codes' | 'flagged'
  | 'riskflags' | 'risk' | 'jobs' | 'audit' | 'virtualsports' | 'casinopredictions' | 'promoslips' | 'analytics'
  | 'exposure' | 'email';

interface NavItem {
  id: TabId;
  label: string;
  description: string;
  icon: React.ReactNode;
  group: 'Operate' | 'People' | 'Safety' | 'Games' | 'System';
}

const NAV: NavItem[] = [
  { id: 'overview',  label: 'Overview',     description: 'Live KPIs and house balance',          icon: <DashboardIcon fontSize="small" />,       group: 'Operate' },
  { id: 'analytics', label: 'Analytics',    description: 'Exposure, conversion & abuse signals', icon: <DashboardIcon fontSize="small" />,       group: 'Operate' },
  { id: 'exposure',  label: 'Live activity', description: 'All games: turnover, P/L, exposure & live bet feed', icon: <TrendingUpIcon fontSize="small" />, group: 'Operate' },
  { id: 'payouts',   label: 'Payouts',      description: 'Approve withdrawals',                 icon: <PaymentsIcon fontSize="small" />,        group: 'Operate' },
  { id: 'ledger',    label: 'Ledger',       description: 'House money trail by day',             icon: <ReceiptLongIcon fontSize="small" />,     group: 'Operate' },
  { id: 'reconcile', label: 'Reconcile',    description: 'Match wallets vs gameplay totals',    icon: <CompareArrowsIcon fontSize="small" />,   group: 'Operate' },
  { id: 'users',         label: 'Users',      description: 'Search, tier, block, refund',      icon: <PeopleIcon fontSize="small" />,            group: 'People' },
  { id: 'promoters',     label: 'Promoters',  description: 'Affiliates & their performance',    icon: <VolunteerActivismIcon fontSize="small" />, group: 'People' },
  { id: 'codes',         label: 'Promo codes', description: 'Bonuses, referral & promo codes', icon: <LocalOfferIcon fontSize="small" />,        group: 'People' },
  { id: 'promoslips',    label: 'Promo slips', description: 'Influencer bet slips & tracking',  icon: <ReceiptLongIcon fontSize="small" />,       group: 'People' },
  { id: 'flagged',  label: 'Flagged',  description: 'Suspicious accounts & bets',           icon: <FlagIcon fontSize="small" />,            group: 'Safety' },
  { id: 'riskflags', label: 'Risk flags', description: 'Risk scores, multi-account & abuse alerts', icon: <ShieldIcon fontSize="small" />,    group: 'Safety' },
  { id: 'risk',     label: 'Risk',     description: 'Per-game win/loss tuning (advanced)',  icon: <ShieldIcon fontSize="small" />,          group: 'Safety' },
  { id: 'virtualsports',      label: 'Virtual Sports',  description: 'Accurate predictions for all upcoming kickoffs',   icon: <SportsSoccerIcon fontSize="small" />, group: 'Games' },
  { id: 'casinopredictions', label: 'Casino Predictions', description: 'Crash, Dice, Mines, Roulette, Plinko, Slots tips', icon: <CasinoIcon fontSize="small" />,        group: 'Games' },
  { id: 'email',    label: 'Email Hub', description: 'Compose & send emails to players',    icon: <EmailIcon fontSize="small" />,           group: 'System' },
  { id: 'jobs',     label: 'Jobs',     description: 'Background workers & schedules',       icon: <EventNoteIcon fontSize="small" />,       group: 'System' },
  { id: 'audit',    label: 'Audit log', description: 'Every admin action, who did what',    icon: <HistoryIcon fontSize="small" />,         group: 'System' },
];

const SIDEBAR_WIDTH = 264;

function AdminLogin({ signedInNonAdmin }: { signedInNonAdmin: boolean }) {
  const { adminLogin, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!username.trim() || !password) { setError('Enter your admin username and password.'); return; }
    setBusy(true); setError(null);
    const r = await adminLogin(username.trim(), password);
    setBusy(false);
    if (!r.ok) setError((r.error ?? 'admin_login_failed').replace(/_/g, ' '));
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', p: 2 }}>
      <Box sx={{ width: '100%', maxWidth: 380, background: darkSurface, border: `1px solid ${darkBorder}`, borderRadius: 3, p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>Admin sign in</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.82rem', mb: 2.5 }}>
          Staff only. Use the admin credentials configured for this site.
        </Typography>

        {signedInNonAdmin && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You're signed in as a regular user. Sign in with admin credentials below
            {' '}(<Button size="small" onClick={() => void signOut()} sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline' }}>switch account</Button>).
          </Alert>
        )}

        {/* Hidden dummy fields absorb the browser's saved-login autofill so the
            real admin fields stay empty for manual entry. */}
        <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} aria-hidden tabIndex={-1} />
        <input type="password" name="password" autoComplete="current-password" style={{ display: 'none' }} aria-hidden tabIndex={-1} />

        <TextField fullWidth size="small" label="Admin username" value={username} autoFocus
          name="admin-console-user"
          autoComplete="off"
          inputProps={{ autoComplete: 'off', 'data-lpignore': 'true', 'data-1p-ignore': 'true' }}
          onChange={e => setUsername(e.target.value)} sx={{ mb: 1.5 }}
          onKeyDown={e => { if (e.key === 'Enter') void submit(); }} />
        <TextField fullWidth size="small" label="Password" type="password" value={password}
          name="admin-console-secret"
          autoComplete="new-password"
          inputProps={{ autoComplete: 'new-password', 'data-lpignore': 'true', 'data-1p-ignore': 'true' }}
          onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }}
          onKeyDown={e => { if (e.key === 'Enter') void submit(); }} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Button fullWidth variant="contained" disabled={busy} onClick={submit}
          sx={{ fontWeight: 900, background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`, color: '#000' }}>
          {busy ? <CircularProgress size={20} color="inherit" /> : 'Sign in to admin'}
        </Button>
      </Box>
    </Box>
  );
}

function AdminPageContent() {
  const { user, adminAuthed } = useAuth();
  const [tab, setTab] = useState<TabId>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { displayCurrency, setDisplayCurrency } = useAdminCurrency();

  // The console always requires an explicit admin-credential login this session —
  // a restored regular-user session never auto-opens it.
  if (!adminAuthed || !user?.isAdmin) {
    return <AdminLayout><AdminLogin signedInNonAdmin={!!user} /></AdminLayout>;
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
            {tab === 'riskflags'     && <AdminRiskFlagsPanel  />}
            {tab === 'promoslips'    && <AdminPromoSlipsPanel />}
            {tab === 'analytics'     && <AdminAnalyticsPanel  />}
            {tab === 'exposure'      && <AdminBettingExposurePanel />}
            {tab === 'email'         && <AdminEmailPanel       />}
            {tab === 'risk'          && <AdminRiskPanel       />}
            {tab === 'virtualsports'      && <AdminVirtualSportsPanel />}
            {tab === 'casinopredictions' && <AdminCasinoPredictionsPanel />}
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
