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

/** Push a notification to every connected socket of a user. */
export function notifyUser(userId: string, notification: Omit<UserNotification, 'id' | 'createdAt'>): void {
  if (!io) return;
  const payload: UserNotification = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...notification,
  };
  io.to(userRoom(userId)).emit('notification', payload);
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
