import { useEffect, useState } from 'react';
import {
  Box, Typography, TextField, Button, ToggleButton, ToggleButtonGroup,
  Alert, CircularProgress, Chip, Divider,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type EmailCampaignDto } from '../../api/admin';

type Audience = 'all' | 'verified' | 'unverified' | 'single';

export default function AdminEmailPanel() {
  const [audience, setAudience] = useState<Audience>('all');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [counts, setCounts] = useState<{ all: number; verified: number; unverified: number } | null>(null);
  const [campaigns, setCampaigns] = useState<EmailCampaignDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [c, camps] = await Promise.all([adminApi.emailAudienceCount(), adminApi.emailCampaigns()]);
      setCounts(c); setCampaigns(camps.campaigns);
    } catch { /* ignore */ }
  }
  useEffect(() => { void refresh(); }, []);

  const recipientCount = !counts ? '—'
    : audience === 'all' ? counts.all
    : audience === 'verified' ? counts.verified
    : audience === 'unverified' ? counts.unverified
    : 1;

  async function send() {
    setError(null); setMsg(null);
    if (!subject.trim() || !html.trim()) { setError('Subject and body are required.'); return; }
    if (audience === 'single' && !email.trim()) { setError('Enter a recipient email.'); return; }
    setBusy(true);
    try {
      const r = await adminApi.sendEmail({ subject: subject.trim(), html, audience, email: email.trim() || undefined });
      setMsg(`Queued to ${r.recipientCount} recipient${r.recipientCount === 1 ? '' : 's'}.`);
      setSubject(''); setHtml(''); setEmail('');
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Could not send. Try again.');
    } finally { setBusy(false); }
  }

  const audienceBtns: { v: Audience; label: string }[] = [
    { v: 'all', label: `All users${counts ? ` (${counts.all})` : ''}` },
    { v: 'verified', label: `Verified${counts ? ` (${counts.verified})` : ''}` },
    { v: 'unverified', label: `Unverified${counts ? ` (${counts.unverified})` : ''}` },
    { v: 'single', label: 'Single user' },
  ];

  return (
    <Box>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, mb: 0.5 }}>Email Hub</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
        Compose and send emails to your players. HTML is supported. Sends via Resend when configured.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
        {/* Compose */}
        <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'text.disabled', letterSpacing: '0.08em', mb: 1 }}>AUDIENCE</Typography>
          <ToggleButtonGroup
            value={audience} exclusive size="small"
            onChange={(_, v) => v && setAudience(v)}
            sx={{ flexWrap: 'wrap', mb: 1.5, '& .MuiToggleButton-root': { color: 'inherit', textTransform: 'none', fontSize: '0.74rem' } }}>
            {audienceBtns.map(b => <ToggleButton key={b.v} value={b.v}>{b.label}</ToggleButton>)}
          </ToggleButtonGroup>

          {audience === 'single' && (
            <TextField fullWidth size="small" label="Recipient email" type="email" value={email}
              onChange={e => setEmail(e.target.value)} sx={{ mb: 1.5 }} />
          )}

          <TextField fullWidth size="small" label="Subject" value={subject}
            onChange={e => setSubject(e.target.value)} sx={{ mb: 1.5 }} />
          <TextField fullWidth multiline minRows={8} size="small" label="Body (HTML supported)" value={html}
            onChange={e => setHtml(e.target.value)} sx={{ mb: 1.5, '& textarea': { fontFamily: 'monospace', fontSize: '0.78rem' } }} />

          {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
          {msg && <Alert severity="success" sx={{ mb: 1.5 }}>{msg}</Alert>}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              disabled={busy} onClick={send}
              sx={{ fontWeight: 800, background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`, color: '#000' }}>
              Send
            </Button>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              → <b style={{ color: neonGold }}>{recipientCount}</b> recipient{recipientCount === 1 ? '' : 's'}
            </Typography>
          </Box>
        </Box>

        {/* Live preview */}
        <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: 'text.disabled', letterSpacing: '0.08em', mb: 1 }}>PREVIEW</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, mb: 1 }}>{subject || <i style={{ color: '#64748b' }}>Subject…</i>}</Typography>
          <Box sx={{ background: '#fff', color: '#111', borderRadius: 1, p: 1.5, minHeight: 160, overflow: 'auto', fontSize: '0.82rem' }}
            dangerouslySetInnerHTML={{ __html: html || '<i style="color:#888">Body preview…</i>' }} />
          <Typography sx={{ mt: 1, fontSize: '0.68rem', color: 'text.disabled' }}>
            Your message is automatically wrapped in the branded logo header and footer before sending.
          </Typography>
        </Box>
      </Box>

      {/* Recent campaigns */}
      <Divider sx={{ my: 3 }} />
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, mb: 1 }}>Recent campaigns</Typography>
      {campaigns.length === 0 ? (
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>No emails sent yet.</Typography>
      ) : campaigns.map(c => (
        <Box key={c._id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: `1px solid ${darkBorder}` }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }} noWrap>{c.subject}</Typography>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
              {c.audience}{c.targetEmail ? ` · ${c.targetEmail}` : ''} · by {c.sentByEmail} · {new Date(c.createdAt).toLocaleString()}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{c.sentCount}/{c.recipientCount}{c.failedCount ? ` · ${c.failedCount} failed` : ''}</Typography>
          <Chip size="small" label={c.status}
            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800,
              background: c.status === 'sent' ? `${neonGreen}22` : c.status === 'failed' ? '#ff475722' : '#88888822',
              color: c.status === 'sent' ? neonGreen : c.status === 'failed' ? '#ff4757' : 'text.secondary' }} />
        </Box>
      ))}
    </Box>
  );
}
