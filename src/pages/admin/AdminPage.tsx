import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Alert, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { neonGreen, darkBorder } from '../../theme';
import AdminPromotersPanel  from './AdminPromotersPanel';
import AdminPromoCodesPanel from './AdminPromoCodesPanel';
import AdminFlaggedPanel    from './AdminFlaggedPanel';
import AdminAuditPanel      from './AdminAuditPanel';
import AdminJobsPanel       from './AdminJobsPanel';
import AdminRiskPanel       from './AdminRiskPanel';
import AdminUsersPanel      from './AdminUsersPanel';

type TabId = 'promoters' | 'codes' | 'flagged' | 'audit' | 'jobs' | 'risk' | 'users';

export default function AdminPage() {
  const { user, isAuthenticated, openAuthPrompt } = useAuth();
  const [tab, setTab] = useState<TabId>('promoters');

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sign in required</Typography>
        <Button variant="contained" onClick={openAuthPrompt}>Sign in</Button>
      </Box>
    );
  }
  if (!user.isAdmin) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="warning">
          Admin only. Add your email to <code>ADMIN_EMAILS</code> in the server <code>.env</code> if you should have access here.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>Admin console</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
          Approve promoter applications, manage commission rates, and mint promo codes.
        </Typography>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v: TabId) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: `1px solid ${darkBorder}`,
          mb: 2,
          '& .Mui-selected': { color: `${neonGreen} !important` },
          '& .MuiTabs-indicator': { backgroundColor: neonGreen },
        }}
      >
        <Tab label="Promoters"   value="promoters" />
        <Tab label="Promo codes" value="codes" />
        <Tab label="Flagged"     value="flagged" />
        <Tab label="Users"       value="users" />
        <Tab label="Risk"        value="risk" />
        <Tab label="Jobs"        value="jobs" />
        <Tab label="Audit log"   value="audit" />
      </Tabs>

      {tab === 'promoters' && <AdminPromotersPanel  />}
      {tab === 'codes'     && <AdminPromoCodesPanel />}
      {tab === 'flagged'   && <AdminFlaggedPanel    />}
      {tab === 'users'     && <AdminUsersPanel      />}
      {tab === 'risk'      && <AdminRiskPanel       />}
      {tab === 'jobs'      && <AdminJobsPanel       />}
      {tab === 'audit'     && <AdminAuditPanel      />}
    </Box>
  );
}
