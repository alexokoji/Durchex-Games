// Tiny pub/sub on top of Socket.IO so the rest of the server (routes,
// webhooks, settlement loops) can push live events to a specific user
// without holding a reference to the io instance.

import type { Server as IOServer } from 'socket.io';

export type NotificationKind =
  | 'wallet:update'      // balance changed — frontend should refetch
  | 'deposit:completed'
  | 'deposit:failed'
  | 'withdraw:queued'
  | 'withdraw:completed'
  | 'withdraw:failed'
  | 'bet:settled'
  | 'bet:cashout'
  | 'bet:void'
  | 'system';

export interface UserNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

let io: IOServer | null = null;

export function setIoInstance(server: IOServer): void {
  io = server;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Push a notification to every connected socket of a user, persist it to the
 *  unified feed, and fan out an Expo push to the user's devices. Transient
 *  `wallet:update` pings are emitted only (not persisted / pushed). */
export function notifyUser(userId: string, notification: Omit<UserNotification, 'id' | 'createdAt'>): void {
  const payload: UserNotification = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...notification,
  };
  if (io) io.to(userRoom(userId)).emit('notification', payload);

  // Persist + push for meaningful notifications only.
  if (notification.kind === 'wallet:update') return;
  void persistAndPush(userId, notification).catch(() => { /* never throw from notify */ });
}

async function persistAndPush(
  userId: string,
  n: Omit<UserNotification, 'id' | 'createdAt'>,
): Promise<void> {
  const [{ Notification }, { User }, { sendExpoPush }] = await Promise.all([
    import('../models/Notification'),
    import('../models/User'),
    import('../services/push'),
  ]);
  await Notification.create({ userId, kind: n.kind, title: n.title, body: n.body, data: n.data });
  const user = await User.findById(userId).select('pushTokens');
  if (user?.pushTokens?.length) {
    await sendExpoPush(user.pushTokens, { title: n.title, body: n.body, data: { ...n.data, kind: n.kind } });
  }
}

/** Shorthand for wallet:update — the frontend should re-pull /wallet on this. */
export function notifyWalletUpdate(userId: string, reason?: string): void {
  notifyUser(userId, {
    kind: 'wallet:update',
    title: 'Wallet updated',
    body: reason,
  });
}

/** Broadcast an arbitrary event to all connected sockets. */
export function broadcast(event: string, payload?: unknown): void {
  if (!io) return;
  io.emit(event, payload ?? {});
}
