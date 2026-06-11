/**
 * Expo push notifications. Sends to the user's registered Expo push tokens via
 * the Expo push API (no SDK needed — a single HTTPS POST). Safe to call with no
 * tokens (no-op). Errors are swallowed so push never blocks the caller.
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushMessage {
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

function isExpoToken(t: string): boolean {
  return /^ExponentPushToken\[.+\]$/.test(t) || /^ExpoPushToken\[.+\]$/.test(t);
}

export async function sendExpoPush(tokens: string[], msg: PushMessage): Promise<void> {
  const valid = (tokens ?? []).filter(isExpoToken);
  if (valid.length === 0) return;

  const messages = valid.map(to => ({
    to,
    title: msg.title,
    body: msg.body ?? '',
    data: msg.data ?? {},
    sound: 'default',
    priority: 'high',
  }));

  try {
    // Expo accepts an array; chunk to 100 per request to stay within limits.
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(chunk),
      });
    }
  } catch (err) {
    console.error('[push] send failed', (err as Error).message);
  }
}
