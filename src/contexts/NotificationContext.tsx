import {
  createContext, useCallback, useContext, useEffect, useState,
  type ReactNode,
} from 'react';

export type NotificationKind =
  | 'wallet:update'
  | 'deposit:completed'
  | 'deposit:failed'
  | 'withdraw:queued'
  | 'withdraw:completed'
  | 'withdraw:failed'
  | 'bet:settled'
  | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  createdAt: number;
  read: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: { kind: NotificationKind; title: string; body?: string }) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);
const STORAGE = 'duchex.notifications.v1';

function loadCached(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadCached);

  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(notifications.slice(0, 50))); }
    catch { /* quota */ }
  }, [notifications]);

  const push = useCallback<NotificationContextValue['push']>(({ kind, title, body }) => {
    // wallet:update isn't user-facing — skip it in the bell.
    if (kind === 'wallet:update') return;
    setNotifications(prev => [{
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind, title, body,
      createdAt: Date.now(),
      read: false,
    }, ...prev].slice(0, 50));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);
  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);
  const clear = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.reduce((n, x) => n + (x.read ? 0 : 1), 0);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markAllRead, markRead, clear }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
