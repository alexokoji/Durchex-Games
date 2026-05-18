import { apiGet } from './client';

export interface ActivityEntry {
  maskedUser: string;
  gameName: string;
  payout: number;
  stake: number;
  currency: string;
  multiplier?: number;
  settledAt: string;
}

export const activityApi = {
  recent: (limit = 25) =>
    apiGet<{ entries: ActivityEntry[] }>(`/activity/recent?limit=${limit}`, { skipAuth: true }),
};
