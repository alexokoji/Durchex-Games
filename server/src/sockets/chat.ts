import type { Server as IOServer, Socket } from 'socket.io';
import { verifyToken } from '../services/jwt';
import { User } from '../models/User';
import { ChatMessage } from '../models/ChatMessage';

// 6 messages per 10s per socket — keeps spam manageable until we add proper anti-abuse.
const RATE_LIMIT = { count: 6, windowMs: 10_000 };

interface SocketData {
  userId?: string;
  username?: string;
  sends: number[];   // timestamps within the window
}

function rateOk(s: Socket & { data: SocketData }): boolean {
  const now = Date.now();
  s.data.sends = (s.data.sends ?? []).filter((t: number) => now - t < RATE_LIMIT.windowMs);
  if (s.data.sends.length >= RATE_LIMIT.count) return false;
  s.data.sends.push(now);
  return true;
}

export function attachChat(io: IOServer): void {
  // Auth handshake: client sends `auth.token` (Socket.IO supports this on connect).
  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth as { token?: string } | undefined)?.token ??
        (socket.handshake.query?.token as string | undefined);

      if (token) {
        const payload = verifyToken(token);
        if (payload.type === 'access') {
          const user = await User.findById(payload.sub).lean();
          if (user) {
            (socket as Socket & { data: SocketData }).data.userId   = user._id.toString();
            (socket as Socket & { data: SocketData }).data.username = user.username;
          }
        }
      }
      (socket as Socket & { data: SocketData }).data.sends = [];
      next();
    } catch {
      // Unauthenticated sockets can still listen — they just can't send.
      (socket as Socket & { data: SocketData }).data.sends = [];
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = (socket as Socket & { data: SocketData }).data;

    // Authenticated sockets join their own private room so other modules can
    // target notifications at this user via `notifier.notifyUser(userId, …)`.
    if (data.userId) socket.join(`user:${data.userId}`);

    socket.on('chat:join', (channel: string) => {
      const ch = typeof channel === 'string' && channel.length <= 32 ? channel : 'global';
      socket.join(`chat:${ch}`);
    });

    socket.on('chat:leave', (channel: string) => {
      if (typeof channel === 'string') socket.leave(`chat:${channel}`);
    });

    socket.on('chat:send', async (payload: { channel?: string; text: string }) => {
      if (!data.userId) {
        socket.emit('chat:error', { code: 'auth_required' });
        return;
      }
      const text = (payload?.text ?? '').toString().slice(0, 280).trim();
      if (!text) return;
      if (!rateOk(socket as Socket & { data: SocketData })) {
        socket.emit('chat:error', { code: 'rate_limited' });
        return;
      }
      const channel = (payload?.channel && typeof payload.channel === 'string' && payload.channel.length <= 32)
        ? payload.channel
        : 'global';

      try {
        const msg = await ChatMessage.create({
          userId: data.userId,
          username: data.username ?? 'player',
          channel,
          text,
        });
        io.to(`chat:${channel}`).emit('chat:message', {
          id: msg._id.toString(),
          userId: msg.userId.toString(),
          username: msg.username,
          channel: msg.channel,
          text: msg.text,
          createdAt: msg.createdAt,
        });
      } catch (err) {
        console.error('[chat] save failed', err);
      }
    });
  });
}
