import { Box, Typography, Link, IconButton, Divider } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import XIcon from '@mui/icons-material/X';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TelegramIcon from '@mui/icons-material/Telegram';
import RedditIcon from '@mui/icons-material/Reddit';
import YouTubeIcon from '@mui/icons-material/YouTube';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { neonGreen, darkBorder, darkSurface } from '../../theme';
import DiGLogo from './DiGLogo';

const SOCIALS: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: 'X / Twitter', href: 'https://x.com/durchexigames',        icon: <XIcon         sx={{ fontSize: 18 }} /> },
  { label: 'Instagram',   href: 'https://instagram.com/durchexigames', icon: <InstagramIcon sx={{ fontSize: 18 }} /> },
  { label: 'Facebook',    href: 'https://facebook.com/durchexigames',  icon: <FacebookIcon  sx={{ fontSize: 18 }} /> },
  { label: 'Telegram',    href: 'https://t.me/durchexigames',          icon: <TelegramIcon  sx={{ fontSize: 18 }} /> },
  { label: 'Reddit',      href: 'https://reddit.com/r/durchexigames',  icon: <RedditIcon    sx={{ fontSize: 18 }} /> },
  { label: 'YouTube',     href: 'https://youtube.com/@durchexigames',  icon: <YouTubeIcon   sx={{ fontSize: 18 }} /> },
  { label: 'WhatsApp',    href: 'https://wa.me/durchexigames',          icon: <WhatsAppIcon  sx={{ fontSize: 18 }} /> },
];

const LINK_GROUPS: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: 'Casino',
    links: [
      { label: 'Crash',      to: '/crash' },
      { label: 'Dice',       to: '/dice' },
      { label: 'Plinko',     to: '/plinko' },
      { label: 'Mines',      to: '/mines' },
      { label: 'Slots',      to: '/slots' },
      { label: 'Roulette',   to: '/roulette' },
      { label: 'Blackjack',  to: '/blackjack' },
      { label: 'Baccarat',   to: '/baccarat' },
    ],
  },
  {
    heading: 'Virtual Sports',
    links: [
      { label: 'Soccer',     to: '/virtual/soccer' },
      { label: 'Basketball', to: '/virtual/basketball' },
      { label: 'Hockey',     to: '/virtual/hockey' },
      { label: 'Horse Race', to: '/virtual/horseracing' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'My Profile',  to: '/profile' },
      { label: 'Bet History', to: '/bet-history' },
      { label: 'Rewards & VIP', to: '/rewards' },
      { label: 'Security',    to: '/security' },
      { label: 'Settings',    to: '/settings' },
    ],
  },
];

export default function Footer() {
  const navigate = useNavigate();

  return (
    <Box
      component="footer"
      sx={{
        mt: 4,
        background: darkSurface,
        borderTop: `1px solid ${darkBorder}`,
        color: 'text.secondary',
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.4fr repeat(3, 1fr)' },
            gap: { xs: 3, md: 4 },
          }}
        >
          {/* Brand + description */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
              <DiGLogo size={32} />
              <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', color: '#fff', letterSpacing: '-0.01em' }}>
                DURCHEXiGAMES
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.82rem', lineHeight: 1.55, color: 'text.secondary', mb: 2 }}>
              Premium Casino Games + virtual sportsbook. Provably-fair originals,
              real-name sports leagues with realistic simulations, instant deposits
              in your local currency.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {SOCIALS.map(s => (
                <IconButton
                  key={s.label}
                  size="small"
                  aria-label={s.label}
                  component="a"
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.secondary',
                    border: `1px solid ${darkBorder}`,
                    width: 34, height: 34,
                    transition: 'all 0.18s',
                    '&:hover': {
                      color: neonGreen,
                      borderColor: alpha(neonGreen, 0.6),
                      boxShadow: `0 0 12px ${alpha(neonGreen, 0.35)}`,
                    },
                  }}
                >
                  {s.icon}
                </IconButton>
              ))}
            </Box>
          </Box>

          {/* Quick link groups */}
          {LINK_GROUPS.map(group => (
            <Box key={group.heading}>
              <Typography sx={{
                fontSize: '0.68rem', fontWeight: 800, color: 'text.disabled',
                letterSpacing: '0.12em', textTransform: 'uppercase', mb: 1.25,
              }}>
                {group.heading}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {group.links.map(l => (
                  <Link
                    key={l.to}
                    component="button"
                    type="button"
                    underline="none"
                    onClick={() => navigate(l.to)}
                    sx={{
                      fontSize: '0.82rem',
                      color: 'text.secondary',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      '&:hover': { color: neonGreen },
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 3, borderColor: darkBorder }} />

        <Box sx={{
          display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between',
          gap: 1.5,
        }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
            © {new Date().getFullYear()} DurchexiGames. Play responsibly · 18+ · Gambling can be addictive.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link
              component="button" underline="none" onClick={() => navigate('/security')}
              sx={{ fontSize: '0.72rem', color: 'text.secondary', '&:hover': { color: neonGreen } }}
            >
              Privacy
            </Link>
            <Link
              component="button" underline="none" onClick={() => navigate('/security')}
              sx={{ fontSize: '0.72rem', color: 'text.secondary', '&:hover': { color: neonGreen } }}
            >
              Terms
            </Link>
            <Link
              component="button" underline="none" onClick={() => navigate('/rewards')}
              sx={{ fontSize: '0.72rem', color: 'text.secondary', '&:hover': { color: neonGreen } }}
            >
              Responsible Gaming
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
