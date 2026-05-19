import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { neonGreen, darkBorder } from '../../theme';
import AdminLayout         from './AdminLayout';
import AdminOverviewPanel  from './AdminOverviewPanel';
import AdminPayoutsPanel   from './AdminPayoutsPanel';
import AdminLedgerPanel    from './AdminLedgerPanel';
import AdminPromotersPanel  from './AdminPromotersPanel';
import AdminPromoCodesPanel from './AdminPromoCodesPanel';
import AdminFlaggedPanel    from './AdminFlaggedPanel';
import AdminAuditPanel      from './AdminAuditPanel';
import AdminJobsPanel       from './AdminJobsPanel';
import AdminRiskPanel       from './AdminRiskPanel';
import AdminUsersPanel      from './AdminUsersPanel';

type TabId =
  | 'overview' | 'payouts' | 'ledger'
  | 'users' | 'promoters' | 'codes' | 'flagged'
  | 'risk' | 'jobs' | 'audit';

export default function AdminPage() {
  const { user, isAuthenticated, openAuthPrompt } = useAuth();
  const [tab, setTab] = useState<TabId>('overview');

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

  return (
    <AdminLayout>
      <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
        <Tabs
          value={tab}
          onChange={(_, v: TabId) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: `1px solid ${darkBorder}`,
            mb: 3,
            '& .Mui-selected': { color: `${neonGreen} !important` },
            '& .MuiTabs-indicator': { backgroundColor: neonGreen },
          }}
        >
          <Tab label="Overview"     value="overview" />
          <Tab label="Payouts"      value="payouts" />
          <Tab label="Ledger"       value="ledger" />
          <Tab label="Users"        value="users" />
          <Tab label="Promoters"    value="promoters" />
          <Tab label="Promo codes"  value="codes" />
          <Tab label="Flagged"      value="flagged" />
          <Tab label="Risk"         value="risk" />
          <Tab label="Jobs"         value="jobs" />
          <Tab label="Audit log"    value="audit" />
        </Tabs>

        {tab === 'overview'  && <AdminOverviewPanel onJumpToPayouts={() => setTab('payouts')} />}
        {tab === 'payouts'   && <AdminPayoutsPanel   />}
        {tab === 'ledger'    && <AdminLedgerPanel    />}
        {tab === 'users'     && <AdminUsersPanel     />}
        {tab === 'promoters' && <AdminPromotersPanel />}
        {tab === 'codes'     && <AdminPromoCodesPanel />}
        {tab === 'flagged'   && <AdminFlaggedPanel    />}
        {tab === 'risk'      && <AdminRiskPanel       />}
        {tab === 'jobs'      && <AdminJobsPanel       />}
        {tab === 'audit'     && <AdminAuditPanel      />}
      </Box>
    </AdminLayout>
  );
}
