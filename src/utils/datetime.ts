/**
 * Site-wide time formatting. The platform operates on West Africa Time (WAT,
 * UTC+1, no daylight saving), so all user-facing times are rendered in WAT
 * regardless of the viewer's device timezone — this keeps displayed kickoff
 * times, schedules and countdowns correlated with the operator's clock.
 */
export const SITE_TIME_ZONE = 'Africa/Lagos'; // WAT (UTC+1, no DST)
export const SITE_TZ_LABEL = 'WAT';

/** "Sat, 14 Jun · 19:30 WAT" */
export function fmtDateTimeWAT(value: string | number | Date): string {
  const d = new Date(value);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: SITE_TIME_ZONE });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SITE_TIME_ZONE });
  return `${date} · ${time} ${SITE_TZ_LABEL}`;
}

/** "19:30" (WAT) */
export function fmtTimeWAT(value: string | number | Date): string {
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SITE_TIME_ZONE });
}

/** "Sat 19:30" (WAT) — compact day + time. */
export function fmtDayHourWAT(value: string | number | Date): string {
  return new Date(value).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SITE_TIME_ZONE });
}
