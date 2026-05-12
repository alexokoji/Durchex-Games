import { apiGet, getAccessToken, socketUrl } from './client';
import { io, type Socket } from 'socket.io-client';

export interface ApiChatMessage {
  _id?: string;
  id?: string;
  userId: string;
  username: string;
  channel: string;
  text: string;
  createdAt: string;
}

export const chatApi = {
  history: (channel = 'global', limit = 50) =>
    apiGet<{ messages: ApiChatMessage[] }>(`/chat/history?channel=${channel}&limit=${limit}`),
};

let socket: Socket | null = null;

/**
 * Lazily opens a single Socket.IO connection and re-uses it across the app.
 * Updates its auth token whenever called so a fresh login is picked up.
 */
export function getChatSocket(): Socket {
  const token = getAccessToken();
  if (socket) {
    // Refresh auth in case a new login happened — keeps the same connection alive.
    socket.auth = { token: token ?? undefined } as { token?: string };
    return socket;
  }
  socket = io(socketUrl(), {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    auth: { token: token ?? undefined },
  });
  return socket;
}

export function closeChatSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
