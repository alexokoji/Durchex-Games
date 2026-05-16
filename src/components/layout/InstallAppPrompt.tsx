import { useEffect, useState } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { motion, AnimatePresence } from 'framer-motion';
import { neonGreen, darkCard } from '../../theme';
import DiGLogo from './DiGLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'duchex.installPromptDismissed.v2';
// Cooldown reduced from 7d to 24h so users who change their mind get the
// prompt back the next day.
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
// How long to wait for `beforeinstallprompt` before showing the manual
// Android Chrome hint as a fallback (covers cases where the user already
// dismissed the native banner, or hasn't met engagement criteria yet).
const ANDROID_FALLBACK_DELAY = 4500;

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < COOLDOWN_MS;
  } catch { return false; }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}
function isAndroid(): boolean { return /Android/i.test(navigator.userAgent); }
function isMobile():  boolean { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

// Detect in-app browsers (Instagram, Facebook, TikTok…) — they can't install.
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|Twitter/i.test(ua);
}

type Mode = 'native' | 'android-fallback' | 'ios-fallback' | 'inapp-fallback' | null;

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    if (isStandalone()) return;            // already installed
    if (isDismissedRecently()) return;     // honour the cooldown

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('native');
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setMode(null);
      // Clear dismissal so re-installing later re-prompts naturally.
      try { localStorage.removeItem(DISMISSED_KEY); } catch {}
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // Schedule a fallback hint that only fires if no native prompt arrived.
    const fallbackTimer = window.setTimeout(() => {
      if (mode !== null) return;  // already showing a native prompt
      if (isInAppBrowser()) { setMode('inapp-fallback'); return; }
      if (isIos() && isMobile())   { setMode('ios-fallback'); return; }
      if (isAndroid() && isMobile()) { setMode('android-fallback'); return; }
      // Desktop: don't pester. The URL bar already shows an install icon
      // when the site is installable.
    }, ANDROID_FALLBACK_DELAY);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
    setMode(null);
  }

  async function install() {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setDeferredPrompt(null);
        setMode(null);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Render — using a plain fixed-position Box rather than <Snackbar>. The
  // Snackbar wraps its child in a MUI <Grow> transition whose `onEnter`
  // tries to read DOM properties on the child via a ref, but AnimatePresence
  // doesn't render a real DOM node and Grow crashes with
  // "Cannot read properties of null (reading 'scrollTop')". Hand-rolling
  // the positioning sidesteps the conflict entirely.

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: (theme) => theme.zIndex.snackbar,
        bottom: { xs: 12, sm: 24 },
        left:   { xs: 12, sm: 24 },
        right:  { xs: 12, sm: 'auto' },
        maxWidth: 380,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {mode !== null && (
        <motion.div
          key={mode}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ pointerEvents: 'auto', width: '100%' }}
        >
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            p: 1.5, pr: 1, borderRadius: 2,
            background: darkCard,
            border: `1px solid ${alpha(neonGreen, 0.4)}`,
            boxShadow: `0 12px 40px ${alpha('#000', 0.5)}, 0 0 24px ${alpha(neonGreen, 0.18)}`,
          }}>
            <DiGLogo size={42} />

            {mode === 'native' && (
              <>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 800 }}>
                    Install DuchexiGames
                  </Typography>
                  <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.3 }}>
                    One-tap launch, full-screen, no browser bars.
                  </Typography>
                </Box>
                <Button
                  size="small" variant="contained" onClick={install}
                  sx={{
                    background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                    color: '#000', fontWeight: 800, fontSize: '0.74rem', px: 1.5,
                    boxShadow: 'none',
                  }}
                >
                  Install
                </Button>
              </>
            )}

            {mode === 'ios-fallback' && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  Add to Home Screen
                </Typography>
                <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.35 }}>
                  Tap <IosShareIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mx: 0.25 }} /> in Safari,
                  then <strong>"Add to Home Screen"</strong>.
                </Typography>
              </Box>
            )}

            {mode === 'android-fallback' && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  Install DuchexiGames
                </Typography>
                <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.35 }}>
                  Tap <MoreVertIcon sx={{ fontSize: 14, verticalAlign: 'text-bottom', mx: 0.25 }} /> in Chrome →
                  <strong> "Install app"</strong>.
                </Typography>
              </Box>
            )}

            {mode === 'inapp-fallback' && (
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  Open in your browser
                </Typography>
                <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.35 }}>
                  In-app browsers can't install apps. Tap <strong>"Open in browser"</strong> from this app's menu first.
                </Typography>
              </Box>
            )}

            <IconButton size="small" onClick={dismiss} aria-label="Dismiss">
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
