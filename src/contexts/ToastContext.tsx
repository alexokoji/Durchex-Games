import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastKind = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
  duration: number;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  success: (title: string, body?: string) => string;
  info:    (title: string, body?: string) => string;
  warning: (title: string, body?: string) => string;
  error:   (title: string, body?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback<ToastContextValue['push']>((toast) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const next: Toast = { duration: 4500, ...toast, id };
    setToasts(prev => [...prev.slice(-4), next]);  // cap to 5 concurrent toasts
    if (next.duration > 0) {
      window.setTimeout(() => dismiss(id), next.duration);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((title: string, body?: string) => push({ kind: 'success', title, body }), [push]);
  const info    = useCallback((title: string, body?: string) => push({ kind: 'info',    title, body }), [push]);
  const warning = useCallback((title: string, body?: string) => push({ kind: 'warning', title, body }), [push]);
  const error   = useCallback((title: string, body?: string) => push({ kind: 'error',   title, body, duration: 6000 }), [push]);

  return (
    <ToastContext.Provider value={{ push, success, info, warning, error, dismiss }}>
      {children}
      <Snackbar
        open={toasts.length > 0}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ pointerEvents: 'none' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pointerEvents: 'auto' }}>
          <AnimatePresence initial={false}>
            {toasts.map(t => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0,  scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Alert
                  severity={t.kind}
                  onClose={() => dismiss(t.id)}
                  variant="filled"
                  sx={{ minWidth: 280, maxWidth: 360, alignItems: 'flex-start' }}
                >
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>{t.title}</Typography>
                  {t.body && <Typography sx={{ fontSize: '0.78rem', opacity: 0.9 }}>{t.body}</Typography>}
                </Alert>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used inside <ToastProvider>');
  return ctx;
}
