import { Types } from 'mongoose';
import { User } from '../models/User';
import { Bet } from '../models/Bet';
import { Transaction } from '../models/Transaction';
import { RiskFlag, type RiskFlagType, type RiskSeverity } from '../models/RiskFlag';
import { broadcast } from '../sockets/notifier';

// Severity → score weight.
const WEIGHT: Record<RiskSeverity, number> = { low: 10, medium: 25, high: 45 };

interface Detected {
  type: RiskFlagType;
  severity: RiskSeverity;
  detail: string;
  evidence?: Record<string, unknown>;
}

// ─── Individual detectors ────────────────────────────────────────────────────

/** Other accounts sharing this user's device signature or signup IP. */
async function detectMultiAccount(user: any): Promise<Detected | null> {
  const or: Record<string, unknown>[] = [];
  if (user.signupDeviceSignature) or.push({ signupDeviceSignature: user.signupDeviceSignature });
  if (user.signupIp)              or.push({ signupIp: user.signupIp });
  if (or.length === 0) return null;

  const others = await User.find({ _id: { $ne: user._id }, $or: or })
    .select('email signupDeviceSignature signupIp').limit(10).lean();
  if (others.length === 0) return null;

  const sharedDevice = others.filter(o => o.signupDeviceSignature && o.signupDeviceSignature === user.signupDeviceSignature).length;
  const severity: RiskSeverity = sharedDevice >= 2 || others.length >= 3 ? 'high'
    : sharedDevice >= 1 || others.length >= 2 ? 'medium' : 'low';
  return {
    type: 'multi_account', severity,
    detail: `${others.length} other account(s) share this device/IP`,
    evidence: { linked: others.map(o => o.email), sharedDevice },
  };
}

/** Referred by an account that shares device/IP (incentivised self-invite). */
async function detectSelfReferral(user: any): Promise<Detected | null> {
  if (user.referralAbuseFlag) {
    return {
      type: 'self_referral', severity: 'high',
      detail: `Referral attribution flagged: ${user.referralAbuseFlag}`,
      evidence: { flag: user.referralAbuseFlag },
    };
  }
  if (!user.referredBy) return null;
  const inviter = await User.findById(user.referredBy).select('signupDeviceSignature signupIp email').lean();
  if (!inviter) return null;
  const sameDevice = inviter.signupDeviceSignature && inviter.signupDeviceSignature === user.signupDeviceSignature;
  const sameIp     = inviter.signupIp && inviter.signupIp === user.signupIp;
  if (!sameDevice && !sameIp) return null;
  return {
    type: 'self_referral', severity: sameDevice ? 'high' : 'medium',
    detail: `Shares ${sameDevice ? 'device' : 'IP'} with inviter ${inviter.email}`,
    evidence: { inviter: inviter.email, sameDevice: !!sameDevice, sameIp: !!sameIp },
  };
}

/** Bonus farming: withdrawing/winning with little or no real deposit. */
async function detectBonusAbuse(user: any): Promise<Detected | null> {
  const [deposits, withdrawals] = await Promise.all([
    Transaction.countDocuments({ userId: user._id, kind: 'deposit', status: 'completed' }),
    Transaction.countDocuments({ userId: user._id, kind: 'withdraw' }),
  ]);
  if (deposits > 0) return null;             // funded a real deposit → not farming
  if (withdrawals === 0 && (user.totalWon ?? 0) <= 0) return null;
  const severity: RiskSeverity = withdrawals > 0 ? 'high' : 'medium';
  return {
    type: 'bonus_abuse', severity,
    detail: `No real deposits; ${withdrawals} withdrawal attempt(s), bonus-funded play`,
    evidence: { deposits, withdrawals, totalWon: user.totalWon },
  };
}

/** Sharp bettor: sustained positive ROI / high win-rate over enough volume. */
async function detectSharpBettor(user: any): Promise<Detected | null> {
  const bets = await Bet.find({ userId: user._id, status: { $in: ['won', 'lost', 'cashout'] } })
    .select('stake payout status').limit(500).lean();
  if (bets.length < 20) return null;
  const staked = bets.reduce((s, b) => s + b.stake, 0);
  const returned = bets.reduce((s, b) => s + (b.payout || 0), 0);
  if (staked <= 0) return null;
  const roi = (returned - staked) / staked;
  const wins = bets.filter(b => b.status === 'won' || b.status === 'cashout').length;
  const winRate = wins / bets.length;
  if (roi < 0.08 && winRate < 0.62) return null;
  const severity: RiskSeverity = roi > 0.25 || winRate > 0.72 ? 'high' : 'medium';
  return {
    type: 'sharp_bettor', severity,
    detail: `ROI ${(roi * 100).toFixed(1)}% · win-rate ${(winRate * 100).toFixed(0)}% over ${bets.length} bets`,
    evidence: { roi, winRate, bets: bets.length },
  };
}

/** Velocity: abnormally high bet frequency in the last hour. */
async function detectVelocity(user: any): Promise<Detected | null> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await Bet.countDocuments({ userId: user._id, placedAt: { $gte: since } });
  if (count < 120) return null;
  return {
    type: 'velocity', severity: count >= 300 ? 'high' : 'medium',
    detail: `${count} bets in the last hour`,
    evidence: { lastHour: count },
  };
}

// ─── Aggregate scan ──────────────────────────────────────────────────────────

export interface ScanResult {
  userId: string;
  score: number;
  level: 'low' | 'medium' | 'high';
  flags: { type: RiskFlagType; severity: RiskSeverity; detail: string }[];
}

/**
 * Run all detectors for a user, upsert open RiskFlags (one per type), retire
 * flags that no longer fire, recompute the aggregate score, and emit an admin
 * alert if the user crosses into HIGH risk.
 */
export async function scanUser(userId: Types.ObjectId | string): Promise<ScanResult | null> {
  const user = await User.findById(userId);
  if (!user) return null;

  const detectors = [detectMultiAccount, detectSelfReferral, detectBonusAbuse, detectSharpBettor, detectVelocity];
  const detected: Detected[] = [];
  for (const d of detectors) {
    try { const r = await d(user); if (r) detected.push(r); } catch { /* skip detector errors */ }
  }

  const foundTypes = new Set(detected.map(d => d.type));

  // Upsert current detections as open flags.
  for (const d of detected) {
    await RiskFlag.findOneAndUpdate(
      { userId: user._id, type: d.type, status: 'open' },
      { $set: { severity: d.severity, weight: WEIGHT[d.severity], detail: d.detail, evidence: d.evidence } },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
  // Auto-dismiss previously-open flags that no longer fire.
  await RiskFlag.updateMany(
    { userId: user._id, status: 'open', type: { $nin: Array.from(foundTypes) } },
    { $set: { status: 'dismissed', reviewedAt: new Date() } },
  );

  const openFlags = await RiskFlag.find({ userId: user._id, status: 'open' }).lean();
  const score = Math.min(100, openFlags.reduce((s, f) => s + f.weight, 0));
  const level: 'low' | 'medium' | 'high' = score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low';

  const prevLevel = user.riskLevel;
  user.riskScore = score;
  user.riskLevel = level;
  user.riskUpdatedAt = new Date();
  await user.save();

  // Alert admins when a user newly escalates to HIGH.
  if (level === 'high' && prevLevel !== 'high') {
    broadcast('risk:alert', {
      userId: user._id.toString(), email: user.email, score,
      flags: detected.filter(d => d.severity === 'high').map(d => d.type),
    });
  }

  return {
    userId: user._id.toString(), score, level,
    flags: detected.map(d => ({ type: d.type, severity: d.severity, detail: d.detail })),
  };
}

/** Scan users active recently — cheap periodic sweep. */
export async function scanRecentlyActive(limit = 200): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ids = await Bet.distinct('userId', { placedAt: { $gte: since } });
  let scanned = 0;
  for (const id of ids.slice(0, limit)) { await scanUser(id); scanned++; }
  return scanned;
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let started = false;
export function startRiskScanScheduler(): void {
  if (started) return;
  started = true;
  const everyMs = 15 * 60 * 1000; // every 15 min
  setTimeout(() => { void scanRecentlyActive().catch(() => {}); }, 30_000);
  setInterval(() => { void scanRecentlyActive().catch(() => {}); }, everyMs);
  console.log('[risk] scan scheduler started · every 15m');
}
