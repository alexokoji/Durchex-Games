import { Router, type Request, type Response } from 'express';
import { Bet } from '../models/Bet';
import { User } from '../models/User';

const router = Router();

/**
 * Public activity feed — recent settled WINS, with usernames partially
 * masked. Used by the homepage / ticker to surface "this site has people
 * playing right now" without leaking PII.
 *
 * No auth — this is a homepage social-proof feature. We hide the user id
 * and ship only the masked name + game + payout + currency + age.
 */
router.get('/recent', async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 25, 50);
  // Pull recent winning bets, biggest payouts first within a 6h window. We
  // join the User for the username, then mask it.
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const bets = await Bet.find({
    status: 'won',
    settledAt: { $gte: since },
    payout: { $gt: 0 },
  })
    .sort({ settledAt: -1 })
    .limit(limit * 3)         // overfetch so we can dedupe by user
    .lean();

  if (bets.length === 0) { res.json({ entries: [] }); return; }

  const userIds = [...new Set(bets.map(b => b.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('_id username')
    .lean();
  const usernameOf = new Map(users.map(u => [u._id.toString(), u.username]));

  const seen = new Set<string>();
  const out = [];
  for (const b of bets) {
    const uid = b.userId.toString();
    if (seen.has(uid)) continue;  // one entry per user in the window
    seen.add(uid);
    const username = usernameOf.get(uid) ?? 'player';
    out.push({
      maskedUser: maskUsername(username),
      gameName:   b.gameName,
      payout:     b.payout,
      stake:      b.stake,
      currency:   b.currency,
      multiplier: b.multiplier,
      settledAt:  b.settledAt,
    });
    if (out.length >= limit) break;
  }

  res.json({ entries: out });
});

/**
 * Mask a username for public display: keep the first 2 chars, replace the
 * middle with asterisks, keep the last character. "alexokoji" → "al*****i".
 * Short names get less revealed: "joe" → "j*e".
 */
function maskUsername(name: string): string {
  if (name.length <= 2) return name[0] + '*';
  if (name.length <= 4) return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  return name.slice(0, 2) + '*'.repeat(Math.min(5, name.length - 3)) + name[name.length - 1];
}

export default router;
