import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Divider, Accordion, AccordionSummary,
  AccordionDetails, Chip, Grid, Paper,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChatIcon from '@mui/icons-material/Chat';
import EmailIcon from '@mui/icons-material/Email';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TelegramIcon from '@mui/icons-material/Telegram';
import TwitterIcon from '@mui/icons-material/Twitter';
import QuizIcon from '@mui/icons-material/Quiz';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { neonGreen, neonBlue, darkBorder, darkCard } from '../theme';

// Tawk_API is injected globally by index.html.
declare const Tawk_API: {
  showWidget: () => void;
  hideWidget: () => void;
  toggle: () => void;
  maximize: () => void;
} | undefined;

const FAQ_ITEMS = [
  {
    q: 'How do I deposit funds?',
    a: 'Click the "Deposit" button in the top navigation bar. We accept bank transfers, cards, and major cryptocurrencies. Deposits are processed instantly for crypto and within minutes for card payments.',
  },
  {
    q: 'How long do withdrawals take?',
    a: 'Crypto withdrawals are sent within 1 hour. Bank/card withdrawals typically settle in 1–3 business days depending on your bank. Make sure your account is verified before withdrawing.',
  },
  {
    q: 'Why is my bet showing "Awaiting Settle"?',
    a: 'Virtual sports matches run on a 10-minute cycle. Once the match your bet is placed on enters its "finished" phase the result is settled automatically. If you placed the bet on an earlier cycle, just stay on the sport page for a few seconds — the catch-up settler will resolve it.',
  },
  {
    q: 'Why doesn\'t my balance update after winning?',
    a: 'Winnings are credited automatically when the match finishes. The balance updates immediately in the UI. If you see a delay, try refreshing the page — the wallet syncs with the server every 30 seconds. Contact support if it hasn\'t updated after 2 minutes.',
  },
  {
    q: 'What happens if I close the browser mid-game?',
    a: 'Your bets are safely stored in our servers. Open bets are also saved locally and restored when you return. Winnings are credited automatically by our server scheduler even when you\'re offline.',
  },
  {
    q: 'Are the virtual sports results fair?',
    a: 'Yes — all virtual matches use a deterministic, seeded random number generator anchored to the UTC date. Every viewer at the same moment sees the same match outcomes. The season seed changes daily, creating fresh fixtures every 24 hours.',
  },
  {
    q: 'How do I reset my password?',
    a: 'Click "Sign In", then "Forgot Password". Enter your email address and we\'ll send a reset link. The link expires after 1 hour for security.',
  },
  {
    q: 'What is the minimum bet amount?',
    a: 'The minimum bet is equivalent to $0.01 USD in your chosen currency. The exact minimum is shown in the bet slip before you confirm your bet.',
  },
];

const CONTACT_CHANNELS = [
  {
    icon: <EmailIcon sx={{ fontSize: 28 }} />,
    label: 'Email Support',
    value: 'support@duchexigames.com',
    description: 'Typical response within 24 hours',
    color: neonGreen,
    href: 'mailto:support@duchexigames.com',
    buttonLabel: 'Send Email',
  },
  {
    icon: <TelegramIcon sx={{ fontSize: 28 }} />,
    label: 'Telegram',
    value: '@DuchexiGames',
    description: 'Fastest response · usually < 1 hour',
    color: '#26a5e4',
    href: 'https://t.me/DuchexiGames',
    buttonLabel: 'Open Telegram',
  },
  {
    icon: <TwitterIcon sx={{ fontSize: 28 }} />,
    label: 'X (Twitter)',
    value: '@DuchexiGames',
    description: 'News, updates, and support',
    color: '#1d9bf0',
    href: 'https://twitter.com/DuchexiGames',
    buttonLabel: 'Follow & DM',
  },
];

export default function SupportPage() {
  const [chatReady, setChatReady] = useState(false);

  // Show the tawk.to widget while on this page, hide it when leaving.
  useEffect(() => {
    function tryShow() {
      if (typeof Tawk_API !== 'undefined') {
        Tawk_API.showWidget();
        setChatReady(true);
        return true;
      }
      return false;
    }

    // Widget may not have loaded yet — poll briefly.
    if (!tryShow()) {
      const interval = setInterval(() => {
        if (tryShow()) clearInterval(interval);
      }, 300);
      return () => {
        clearInterval(interval);
        if (typeof Tawk_API !== 'undefined') Tawk_API.hideWidget();
      };
    }

    return () => {
      if (typeof Tawk_API !== 'undefined') Tawk_API.hideWidget();
    };
  }, []);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(neonBlue, 0.12)}, ${alpha(neonGreen, 0.08)})`,
          border: `1px solid ${darkBorder}`,
          p: { xs: 3, md: 4 },
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <SupportAgentIcon sx={{ fontSize: 48, color: neonGreen, flexShrink: 0 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>
            How can we help?
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Our support team is available around the clock. Start a live chat,
            send us an email, or browse the FAQ below.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
            <AccessTimeIcon sx={{ fontSize: 14, color: neonGreen }} />
            <Typography sx={{ fontSize: '0.75rem', color: neonGreen, fontWeight: 700 }}>
              24 / 7 support · Average response &lt; 5 min on live chat
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Live Chat CTA ─────────────────────────────────────────────────── */}
      <Paper
        sx={{
          background: darkCard,
          border: `1px solid ${alpha(neonGreen, 0.35)}`,
          borderRadius: 2,
          p: 3,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          boxShadow: `0 0 24px ${alpha(neonGreen, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: '50%',
              background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChatIcon sx={{ fontSize: 24, color: '#000' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>
              Live Chat
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
              <Box
                sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: chatReady ? neonGreen : '#888',
                  boxShadow: chatReady ? `0 0 6px ${neonGreen}` : 'none',
                }}
              />
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                {chatReady ? 'Widget loaded — click to open' : 'Loading chat widget…'}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<ChatIcon />}
          disabled={!chatReady}
          onClick={() => {
            if (typeof Tawk_API !== 'undefined') Tawk_API.maximize();
          }}
          sx={{
            background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
            color: '#000',
            fontWeight: 800,
            px: 3,
            boxShadow: `0 0 20px ${alpha(neonGreen, 0.4)}`,
            '&:hover': { boxShadow: `0 0 30px ${alpha(neonGreen, 0.6)}` },
            '&.Mui-disabled': { background: alpha('#fff', 0.06), color: 'text.disabled' },
          }}
        >
          Start Live Chat
        </Button>
      </Paper>

      {/* ── Contact channels ──────────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
        Other Ways to Reach Us
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {CONTACT_CHANNELS.map((ch) => (
          <Grid item xs={12} sm={4} key={ch.label}>
            <Paper
              sx={{
                background: darkCard,
                border: `1px solid ${darkBorder}`,
                borderRadius: 2,
                p: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                transition: 'border-color 0.2s',
                '&:hover': { borderColor: alpha(ch.color, 0.45) },
              }}
            >
              <Box sx={{ color: ch.color }}>{ch.icon}</Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                  {ch.label}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: ch.color, fontWeight: 600 }}>
                  {ch.value}
                </Typography>
                <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary', mt: 0.25 }}>
                  {ch.description}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="outlined"
                size="small"
                href={ch.href}
                target={ch.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noopener noreferrer"
                sx={{
                  borderColor: alpha(ch.color, 0.45),
                  color: ch.color,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  '&:hover': {
                    borderColor: ch.color,
                    background: alpha(ch.color, 0.08),
                  },
                }}
              >
                {ch.buttonLabel}
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <QuizIcon sx={{ color: neonBlue }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Frequently Asked Questions
        </Typography>
        <Chip
          label={`${FAQ_ITEMS.length} answers`}
          size="small"
          sx={{
            background: alpha(neonBlue, 0.12),
            color: neonBlue,
            fontWeight: 700,
            fontSize: '0.7rem',
            height: 20,
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {FAQ_ITEMS.map((item, i) => (
          <Accordion
            key={i}
            disableGutters
            elevation={0}
            sx={{
              background: darkCard,
              border: `1px solid ${darkBorder}`,
              borderRadius: '8px !important',
              '&:before': { display: 'none' },
              '&.Mui-expanded': {
                borderColor: alpha(neonBlue, 0.35),
                boxShadow: `0 0 12px ${alpha(neonBlue, 0.06)}`,
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
              sx={{ px: 2, py: 0.5, minHeight: 48 }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                {item.q}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2, pt: 0, pb: 2 }}>
              <Typography sx={{ fontSize: '0.83rem', color: 'text.secondary', lineHeight: 1.65 }}>
                {item.a}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* ── Footer nudge ──────────────────────────────────────────────────── */}
      <Box
        sx={{
          mt: 4, p: 2.5, borderRadius: 2, textAlign: 'center',
          background: alpha('#fff', 0.02),
          border: `1px solid ${darkBorder}`,
        }}
      >
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
          Still have questions?{' '}
          <Box
            component="span"
            onClick={() => { if (typeof Tawk_API !== 'undefined') Tawk_API.maximize(); }}
            sx={{
              color: neonGreen, fontWeight: 700, cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Start a live chat
          </Box>
          {' '}or email us at{' '}
          <Box
            component="a"
            href="mailto:support@duchexigames.com"
            sx={{ color: neonGreen, fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            support@duchexigames.com
          </Box>
        </Typography>
      </Box>
    </Box>
  );
}
