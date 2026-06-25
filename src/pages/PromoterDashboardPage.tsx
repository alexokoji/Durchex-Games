import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, Chip, IconButton, Tooltip,
  CircularProgress, Alert, Stack,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShareIcon from '@mui/icons-material/Share';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BlockIcon from '@mui/icons-material/Block';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { promoApi, type PromoterDashboard } from '../api/promo';
import { ApiError } from '../api/client';

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export default function PromoterDashboardPage() {
  const { user, isAuthenticated, openAuthPrompt, refreshMe } = useAuth();
  const toasts = useToasts();

  const [data, setData] = useState<PromoterDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `notPromoter` means we successfully resolved that the user is signed in
  // and has a referralCode but hasn't applied yet — show the CTA panel.
  const [notPromoterFallbackCode, setNotPromoterFallbackCode] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [savingCode, setSavingCode] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    setNotPromoterFallbackCode(null);
    try {
      const r = await promoApi.promoterDashboard();
      setData(r);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'not_a_promoter') {
        const fallback = (err.details as { referralCode?: string } | undefined)?.referralCode ?? user?.referralCode ?? null;
        setNotPromoterFallbackCode(fallback);
      } else if (err instanceof ApiError) {
        setError(err.code);
      } else {
        setError('load_failed');
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const referralLink = useMemo(() => {
    const code = data?.referralCode ?? notPromoterFallbackCode ?? user?.referralCode ?? '';
    if (!code) return '';
    return `${window.location.origin}/?ref=${code}`;
  }, [data, notPromoterFallbackCode, user]);

  async function saveCode() {
    const code = codeInput.trim();
    if (code.length < 3) { toasts.warning('Too short', 'Choose at least 3 characters.'); return; }
    if (!/^[A-Za-z0-9_-]+$/.test(code)) { toasts.warning('Invalid', 'Use only letters, numbers, - and _.'); return; }
    setSavingCode(true);
    try {
      const r = await promoApi.setReferralCode(code);
      toasts.success('Link updated', `Your referral code is now ${r.referralCode}.`);
      setData(d => (d ? { ...d, referralCode: r.referralCode } : d));
      setCodeInput('');
      await refreshMe();
    } catch (err) {
      const c = err instanceof ApiError ? err.code : 'update_failed';
      toasts.error('Could not update', c === 'code_taken'
        ? 'That name is already taken — try another.'
        : c.replace(/_/g, ' '));
    } finally { setSavingCode(false); }
  }

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(
      () => toasts.success('Copied', 'Your referral link is on the clipboard.'),
      () => toasts.error('Copy failed', 'Select and copy the link manually.'),
    );
  }

  function shareLink() {
    if (!referralLink) return;
    if (navigator.share) {
      navigator.share({
        title: 'Join me on DI Games',
        text:  'Use my link to claim your welcome bonus.',
        url:   referralLink,
      }).catch(() => copyLink());
    } else {
      copyLink();
    }
  }

  async function apply() {
    setIsApplying(true);
    try {
      await promoApi.applyPromoter(applicationMessage.trim() || undefined);
      toasts.success('Application submitted', 'We review applications within 48 hours.');
      setApplicationMessage('');
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'apply_failed';
      toasts.error('Could not submit application', code.replace(/_/g, ' '));
    } finally {
      setIsApplying(false);
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Sign in required</Typography>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>Sign in to access the promoter program.</Typography>
        <Button variant="contained" onClick={openAuthPrompt}>Sign in</Button>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: neonGreen }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Could not load promoter dashboard: {error.replace(/_/g, ' ')}</Alert>
      </Box>
    );
  }

  // ─── Not yet a promoter — show the application CTA + share-link panel ────
  if (notPromoterFallbackCode || !data) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 3 }, maxWidth: 920, mx: 'auto' }}>
        <Hero
          title="Promoter program"
          subtitle="Earn commission on every referral's lifetime wager. Apply once — approved promoters unlock a dashboard, custom codes, and revenue share."
        />

        <Stack spacing={3} sx={{ mt: 3 }}>
          <Box sx={{
            p: 3, borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(neonGreen, 0.08)}, ${alpha(neonBlue, 0.04)})`,
            border: `1px solid ${darkBorder}`,
          }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>
              Your personal referral link
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                value={referralLink}
                size="small"
                fullWidth
                InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />
              <Tooltip title="Copy">
                <IconButton onClick={copyLink}><ContentCopyIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Share">
                <IconButton onClick={shareLink}><ShareIcon /></IconButton>
              </Tooltip>
            </Box>
            <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 1.5 }}>
              Anyone who signs up through this link is linked to you. Commission only accrues once you're approved as a promoter.
            </Typography>
          </Box>

          {user.promoterStatus === 'pending' ? (
            <PendingPanel />
          ) : user.promoterStatus === 'banned' ? (
            <BannedPanel />
          ) : (
            <Box sx={{
              p: 3, borderRadius: 3,
              background: darkCard,
              border: `1px solid ${darkBorder}`,
            }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <RocketLaunchIcon sx={{ color: neonGold }} />
                Apply to be a promoter
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
                Tell us a little about your audience — channel, community size, where you'd post your link. Stronger pitches get higher commission rates.
              </Typography>
              <TextField
                multiline minRows={3} maxRows={8}
                fullWidth
                placeholder="e.g. I run a 12k-subscriber YouTube channel covering crypto-friendly betting…"
                value={applicationMessage}
                onChange={e => setApplicationMessage(e.target.value)}
                inputProps={{ maxLength: 1000 }}
                sx={{ mb: 1.5 }}
              />
              <Button
                variant="contained"
                onClick={apply}
                disabled={isApplying}
                sx={{
                  background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                  color: '#000', fontWeight: 800,
                }}
              >
                {isApplying ? 'Submitting…' : 'Submit application'}
              </Button>
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  // ─── Approved or pending promoter dashboard ──────────────────────────────
  const p = data.promoter;
  const isApproved = p.status === 'approved';

  const stats = [
    { label: 'Total referred',  value: String(p.totalReferred),                color: neonBlue },
    { label: 'Active referrals', value: String(p.activeReferrals),             color: neonGreen },
    { label: 'Wagered (USD)',   value: fmtUsd(p.totalWageredUsd),              color: neonGold },
    { label: 'Earned (USD)',    value: fmtUsd(p.totalEarnedUsd),               color: neonGreen },
    { label: 'Unpaid (USD)',    value: fmtUsd(p.unpaidUsd),                    color: '#a855f7' },
    { label: 'Commission rate', value: `${(p.commissionRate * 100).toFixed(1)}%`, color: neonBlue },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 10, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Hero
        title="Promoter dashboard"
        subtitle={isApproved
          ? `Status: approved · ${(p.commissionRate * 100).toFixed(1)}% commission on referred lifetime wager.`
          : 'Status: pending — we review applications within 48 hours.'}
        status={p.status}
      />

      {/* Referral link */}
      <Box sx={{
        mt: 3, p: 3, borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(neonGreen, 0.08)}, ${alpha(neonBlue, 0.04)})`,
        border: `1px solid ${darkBorder}`,
      }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>
          Your referral link
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            value={referralLink}
            size="small"
            fullWidth
            InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
          <Tooltip title="Copy"><IconButton onClick={copyLink}><ContentCopyIcon /></IconButton></Tooltip>
          <Tooltip title="Share"><IconButton onClick={shareLink}><ShareIcon /></IconButton></Tooltip>
        </Box>

        {p.status === 'approved' && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${darkBorder}` }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>
              Customise your link
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase())}
                placeholder={data.referralCode}
                inputProps={{ maxLength: 20, style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
                helperText="3–20 letters/numbers. Becomes your ?ref= name (e.g. ?ref=JOHNNYBET)."
                sx={{ flex: 1, minWidth: 200 }}
              />
              <Button
                variant="contained" onClick={saveCode} disabled={savingCode || codeInput.trim().length < 3}
                sx={{ background: neonGreen, color: '#000', fontWeight: 700, mt: 0.25 }}
              >
                {savingCode ? 'Saving…' : 'Save name'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Stats grid — CSS grid keeps us out of MUI's v1/v2 Grid prop churn. */}
      <Box sx={{
        mt: 1,
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(6, 1fr)',
        },
      }}>
        {stats.map(s => (
          <Box key={s.label} sx={{
            p: 2, borderRadius: 2,
            background: darkCard,
            border: `1px solid ${darkBorder}`,
            textAlign: 'center', height: '100%',
          }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
              {s.label}
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
              {s.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Codes owned by this promoter */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Your codes</Typography>
        {data.codes.length === 0 ? (
          <Alert severity="info">
            No campaign codes yet. Admins can mint codes that count exclusively against your referrals — ping support if you want one.
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            {data.codes.map(c => (
              <Box key={c._id} sx={{
                p: 2, borderRadius: 2,
                border: `1px solid ${darkBorder}`,
                background: darkCard,
                display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
              }}>
                <Chip
                  label={c.code}
                  size="small"
                  sx={{ fontWeight: 800, background: alpha(neonGold, 0.15), color: neonGold, fontFamily: 'monospace' }}
                />
                <Chip
                  label={c.kind}
                  size="small"
                  variant="outlined"
                  sx={{ textTransform: 'capitalize', borderColor: alpha(neonBlue, 0.3), color: neonBlue }}
                />
                <Chip label={c.tier} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                <Typography sx={{ fontSize: '0.85rem', flex: 1 }}>
                  {c.kind === 'deposit' ? `${(c.bonusAmount * 100).toFixed(0)}% deposit match`
                    : `${c.bonusAmount.toFixed(2)} ${c.currency ?? 'USD'} bonus`}
                  {' · '}
                  Rollover {c.rollover}×
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {c.totalRedemptions}{c.totalUsageLimit ? `/${c.totalUsageLimit}` : ''} used
                </Typography>
                <Chip
                  label={c.active ? 'active' : 'inactive'}
                  size="small"
                  sx={{
                    background: c.active ? alpha(neonGreen, 0.15) : alpha('#fff', 0.06),
                    color:      c.active ? neonGreen             : 'text.secondary',
                  }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      {/* Recent referrals */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Recent referrals</Typography>
        {data.recentReferrals.length === 0 ? (
          <Alert severity="info">No referrals yet. Share your link to start earning.</Alert>
        ) : (
          <Box sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${darkBorder}` }}>
            {data.recentReferrals.map((r, i) => (
              <Box key={r._id} sx={{
                px: 2, py: 1.25,
                display: 'flex', alignItems: 'center', gap: 1.5,
                borderBottom: i < data.recentReferrals.length - 1 ? `1px solid ${darkBorder}` : 'none',
                background: i % 2 === 0 ? alpha('#fff', 0.015) : 'transparent',
              }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${neonGreen}, ${neonBlue})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, color: '#000', fontSize: '0.85rem',
                }}>
                  {r.username.slice(0, 2).toUpperCase()}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.username}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    Joined {new Date(r.createdAt).toLocaleDateString()} {r.countryCode ? ` · ${r.countryCode}` : ''}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                  Wagered <strong style={{ color: '#fff' }}>{r.totalWagered.toFixed(2)}</strong>
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function Hero({ title, subtitle, status }: { title: string; subtitle: string; status?: 'pending' | 'approved' | 'banned' }) {
  const tone = status === 'approved' ? neonGreen
    : status === 'pending' ? neonGold
    : status === 'banned'  ? '#ff6b7a'
    : neonBlue;
  return (
    <Box sx={{
      p: { xs: 2.5, md: 3.5 },
      borderRadius: 3,
      background: `linear-gradient(135deg, ${alpha(tone, 0.18)}, ${alpha(neonBlue, 0.06)})`,
      border: `1px solid ${darkBorder}`,
    }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>{subtitle}</Typography>
    </Box>
  );
}

function PendingPanel() {
  return (
    <Box sx={{
      p: 3, borderRadius: 3,
      background: alpha(neonGold, 0.08),
      border: `1px solid ${alpha(neonGold, 0.3)}`,
    }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <HourglassEmptyIcon sx={{ color: neonGold }} />
        Application pending
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        Your application is being reviewed. We get back within 48 hours.
      </Typography>
    </Box>
  );
}

function BannedPanel() {
  return (
    <Box sx={{
      p: 3, borderRadius: 3,
      background: alpha('#ff6b7a', 0.08),
      border: `1px solid ${alpha('#ff6b7a', 0.3)}`,
    }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <BlockIcon sx={{ color: '#ff6b7a' }} />
        Promoter access revoked
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
        Contact support if you think this is a mistake.
      </Typography>
    </Box>
  );
}
