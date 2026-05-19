import { HouseLedger, ledgerKeyFor, type IHouseLedger } from '../models/HouseLedger';
import { HousePayout } from '../models/HousePayout';
import { JobState } from '../models/JobState';
import { sendMail } from './email';
import { env } from '../config/env';

const JOB_ID = 'daily_summary';
const DAY_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 30 * 60 * 1000;   // re-evaluate every 30 min

let timer: NodeJS.Timeout | null = null;
let running = false;

function adminEmails(): string[] {
  const raw = (process.env.ADMIN_EMAILS ?? '').trim();
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

/**
 * Builds the HTML body for the daily summary email — a tight table with
 * yesterday's totals so the admin can decide whether to action a payout.
 */
function buildSummaryHtml(dayKey: string, row: IHouseLedger, pendingPayoutsCount: number): string {
  const profit = row.houseProfitUsd ?? 0;
  const profitColor = profit >= 0 ? '#10b981' : '#ef4444';
  const profitSign  = profit >= 0 ? '+' : '';
  const dashboardUrl = `${env.clientUrl}/admin`;
  return `
<!doctype html><html><body style="margin:0;padding:24px;background:#0a0c10;color:#e2e8f0;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#11151c;border:1px solid #1f2937;border-radius:12px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #1f2937">
      <div style="font-size:11px;letter-spacing:0.12em;color:#94a3b8;font-weight:700">DUCHEXIGAMES · DAILY SUMMARY</div>
      <div style="font-size:20px;font-weight:900;margin-top:4px">${dayKey}</div>
    </div>
    <div style="padding:24px;text-align:center;border-bottom:1px solid #1f2937">
      <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-bottom:6px">House P/L (USD)</div>
      <div style="font-size:36px;font-weight:900;color:${profitColor}">${profitSign}${fmtUsd(profit)}</div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <tbody style="font-size:14px">
        ${row.betsCount ? `<tr><td style="padding:10px 24px;color:#94a3b8">Bets settled</td><td style="padding:10px 24px;text-align:right;font-weight:700">${row.betsCount.toLocaleString()}</td></tr>` : ''}
        <tr><td style="padding:10px 24px;color:#94a3b8;border-top:1px solid #1f2937">Total stakes</td>
            <td style="padding:10px 24px;text-align:right;font-weight:700;border-top:1px solid #1f2937">${fmtUsd(row.totalStakeUsd  ?? 0)}</td></tr>
        <tr><td style="padding:10px 24px;color:#94a3b8;border-top:1px solid #1f2937">Total payouts</td>
            <td style="padding:10px 24px;text-align:right;font-weight:700;border-top:1px solid #1f2937">${fmtUsd(row.totalPayoutUsd ?? 0)}</td></tr>
        <tr><td style="padding:10px 24px;color:#94a3b8;border-top:1px solid #1f2937">Deposit volume</td>
            <td style="padding:10px 24px;text-align:right;font-weight:700;border-top:1px solid #1f2937;color:#10b981">+${fmtUsd(row.depositVolumeUsd ?? 0)}</td></tr>
        <tr><td style="padding:10px 24px;color:#94a3b8;border-top:1px solid #1f2937">Withdrawal volume</td>
            <td style="padding:10px 24px;text-align:right;font-weight:700;border-top:1px solid #1f2937;color:#f59e0b">-${fmtUsd(row.withdrawVolumeUsd ?? 0)}</td></tr>
        <tr><td style="padding:10px 24px;color:#94a3b8;border-top:1px solid #1f2937">Bonus credited</td>
            <td style="padding:10px 24px;text-align:right;font-weight:700;border-top:1px solid #1f2937">${fmtUsd(row.bonusCreditedUsd ?? 0)}</td></tr>
        ${pendingPayoutsCount ? `<tr><td colspan="2" style="padding:14px 24px;background:#f59e0b15;color:#f59e0b;font-weight:700;border-top:1px solid #1f2937">⚠ ${pendingPayoutsCount} payout request${pendingPayoutsCount === 1 ? '' : 's'} pending review</td></tr>` : ''}
      </tbody>
    </table>
    <div style="padding:24px;text-align:center;border-top:1px solid #1f2937">
      <a href="${dashboardUrl}" style="display:inline-block;padding:12px 22px;background:linear-gradient(135deg,#00ff88,#00cc6a);color:#000;font-weight:800;text-decoration:none;border-radius:8px">Open admin dashboard →</a>
      <div style="font-size:12px;color:#64748b;margin-top:14px">If house profit looks healthy, consider initiating a house payout request from the dashboard. The platform email is generated automatically each day.</div>
    </div>
  </div>
</body></html>`;
}

/**
 * Run the daily summary once for yesterday's ledger. Idempotent — if the
 * email already went out (lastRunAt within the day), skips.
 */
export async function runDailySummaryOnce(opts: { force?: boolean } = {}): Promise<{ sent: boolean; reason?: string }> {
  if (running) return { sent: false, reason: 'already_running' };
  running = true;
  try {
    const state = await JobState.findById(JOB_ID);
    const now = new Date();
    // Want one fire per UTC day. Day-key check guards against same-day re-run.
    const todayKey = ledgerKeyFor(now);
    const lastRunKey = state ? ledgerKeyFor(new Date(state.lastRunAt)) : null;
    if (!opts.force && lastRunKey === todayKey) {
      return { sent: false, reason: 'already_sent_today' };
    }

    // Summarise yesterday's ledger.
    const yesterday = new Date(now.getTime() - DAY_MS);
    const yKey = ledgerKeyFor(yesterday);
    const row = await HouseLedger.findById(yKey);
    if (!row) {
      // No activity yesterday — still mark the job as run so we don't loop.
      await JobState.findByIdAndUpdate(JOB_ID, { _id: JOB_ID, lastRunAt: now, lastRunCount: 0, updatedAt: now }, { upsert: true, setDefaultsOnInsert: true });
      return { sent: false, reason: 'no_activity' };
    }

    const pendingPayouts = await HousePayout.countDocuments({ status: 'requested' });
    const html = buildSummaryHtml(yKey, row, pendingPayouts);
    const recipients = adminEmails();
    if (recipients.length === 0) {
      console.warn('[dailySummary] no ADMIN_EMAILS configured — skipping');
      return { sent: false, reason: 'no_admins' };
    }

    await Promise.all(recipients.map(to =>
      sendMail({ to, subject: `DuchexiGames daily summary · ${yKey}`, html }).catch(err => {
        console.error('[dailySummary] send failed for', to, err);
      }),
    ));

    await JobState.findByIdAndUpdate(JOB_ID, {
      _id: JOB_ID, lastRunAt: now, lastRunCount: recipients.length, updatedAt: now,
    }, { upsert: true, setDefaultsOnInsert: true });

    console.log(`[dailySummary] sent to ${recipients.length} admin(s) for ${yKey}`);
    return { sent: true };
  } catch (err) {
    console.error('[dailySummary] failed', err);
    await JobState.findByIdAndUpdate(JOB_ID, {
      _id: JOB_ID, lastRunAt: new Date(), lastRunError: (err as Error).message ?? 'unknown',
    }, { upsert: true, setDefaultsOnInsert: true }).catch(() => {});
    return { sent: false, reason: 'error' };
  } finally {
    running = false;
  }
}

/**
 * Schedule a check every 30 minutes. The job fires when (a) we haven't sent
 * today AND (b) it's at least 01:00 UTC, ensuring yesterday's ledger has
 * fully closed before the summary goes out.
 */
export function startDailySummaryScheduler(): void {
  if (timer) return;
  const FIRST_TICK = 45_000;
  function maybeRun() {
    const hour = new Date().getUTCHours();
    if (hour < 1) return;  // wait until 01:00 UTC before sending yesterday's summary
    void runDailySummaryOnce();
  }
  setTimeout(maybeRun, FIRST_TICK);
  timer = setInterval(maybeRun, TICK_MS);
  timer.unref?.();
}

export function stopDailySummaryScheduler(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
