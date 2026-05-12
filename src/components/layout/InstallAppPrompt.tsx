import { useEffect, useState } from 'react';
import {
  Snackbar, Box, Typography, Button, IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import IosShareIcon from '@mui/icons-material/IosShare';
import { motion, AnimatePresence } from 'framer-motion';
import { neonGreen, darkBorder, darkCard } from '../../theme';
import DiGLogo from './DiGLogo';

/**
 * `beforeinstallprompt` is a non-standard Chrome event that fires when the
 * site qualifies for installation. We don't have it in @types — declare it.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'duchex.installPromptDismissed.v1';
const COOLDOWN_DAYS = 7;

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function isStandalone(): boolean {
  // Already running as an installed PWA — don't prompt again.
  // Android/desktop fires display-mode: standalone; iOS sets navigator.standalone.
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
  return false;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  // Android / desktop Chrome: capture the install event so we can fire it
  // from our own UI rather than letting the browser bury it.
  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setOpen(true);
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setOpen(false);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari doesn't fire beforeinstallprompt — show the manual hint
    // once per cooldown period if the user is on iOS mobile and not already
    // installed.
    if (isIos() && isMobile()) {
      const t = window.setTimeout(() => setShowIosHint(true), 4000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
    setOpen(false);
    setShowIosHint(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setDeferredPrompt(null);
        setOpen(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    }
  }

  return (
    <>
      {/* Android / desktop install card */}
      <Snackbar
        open={open && !!deferredPrompt}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ pointerEvents: 'none' }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ pointerEvents: 'auto' }}
            >
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.5, pr: 1, borderRadius: 2,
                background: darkCard,
                border: `1px solid ${alpha(neonGreen, 0.4)}`,
                boxShadow: `0 12px 40px ${alpha('#000', 0.5)}, 0 0 24px ${alpha(neonGreen, 0.2)}`,
                maxWidth: 360,
              }}>
                <DiGLogo size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '0.88rem', fontWeight: 800 }}>
                    Install DuchexiGames
                  </Typography>
                  <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', lineHeight: 1.3 }}>
                    One tap to launch, full-screen, no browser bars.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={install}
                  sx={{
                    background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                    color: '#000', fontWeight: 800, fontSize: '0.74rem', px: 1.5,
                    boxShadow: 'none',
                  }}
                >
                  Install
                </Button>
                <IconButton size="small" onClick={dismiss}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Snackbar>

      {/* iOS Safari hint — no programmatic install, so we show the gesture. */}
      <Snackbar
        open={showIosHint}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ pointerEvents: 'none' }}
      >
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25,
            p: 1.5, pr: 1, borderRadius: 2,
            background: darkCard,
            border: `1px solid ${darkBorder}`,
            pointerEvents: 'auto',
            maxWidth: 340,
          }}
        >
          <DiGLogo size={36} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>
              Add to Home Screen
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Tap <IosShareIcon sx={{ fontSize: 14, verticalAlign: 'middle' }} /> in Safari, then "Add to Home Screen".
            </Typography>
          </Box>
          <IconButton size="small" onClick={dismiss}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Snackbar>
    </>
  );
}
