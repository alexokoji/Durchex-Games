/**
 * Absolute season clock + match identity.
 *
 * The virtual season cycles every `total` weeks, anchored to UTC midnight for
 * DISPLAY (so the day "starts" on week 1). But betting needs settlement to be
 * correct forever — even if the user books a match late in the day and returns
 * the next day, or books many cycles ahead. To guarantee that, every match is
 * keyed by an ABSOLUTE slot index and its simulation seed derives from that
 * slot — never from a day-rotating seed. Replaying any slot therefore yields
 * the identical result for all time, which makes settlement deterministic
 * regardless of when the user comes back.
 *
 *   slot       = whole number of WEEK_SECONDS windows since SLOT_EPOCH (UTC).
 *   matchId    = `${leagueId}-s${slot}-${homeId}-${awayId}`
 *   seed       = matchSeed(leagueId, slot, homeId, awayId)   (absolute)
 *
 * Legacy match IDs (`${leagueId}-w${week}-…`) are still parseable so bets
 * placed before this change continue to settle via the old path.
 */

export const BETTING_S  = 360; // 6 min
export const LIVE_S      = 180; // 3 min
export const FINISHED_S  = 60;  // 1 min
export const WEEK_SECONDS = BETTING_S + LIVE_S + FINISHED_S; // 600s = 10 min
const DAY_SECONDS = 86_400;
export const SLOTS_PER_DAY = DAY_SECONDS / WEEK_SECONDS; // 144

// Fixed, midnight-aligned epoch. Slots are absolute integers from here.
export const SLOT_EPOCH_MS = Date.UTC(2020, 0, 1);

// The site runs on West Africa Time (UTC+1, no DST). The virtual "day" resets
// at WAT midnight so today's slate correlates with the local calendar day.
const WAT_OFFSET_MS = 60 * 60 * 1000;

export function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** WAT (UTC+1) midnight expressed as a UTC timestamp — the virtual day anchor. */
export function dayAnchorMs(now = Date.now()): number {
  const shifted = now + WAT_OFFSET_MS;                       // pretend WAT clock is UTC
  const dayStart = Math.floor(shifted / 86_400_000) * 86_400_000;
  return dayStart - WAT_OFFSET_MS;                           // back to the real UTC instant
}

/** Slot index of the day's WAT-midnight anchor (slots are day-aligned: 144/day). */
export function daySlotBase(now = Date.now()): number {
  return Math.round((dayAnchorMs(now) - SLOT_EPOCH_MS) / (WEEK_SECONDS * 1000));
}

/** Wall-clock start (ms) of a given absolute slot. */
export function slotStartMs(slot: number): number {
  return SLOT_EPOCH_MS + slot * WEEK_SECONDS * 1000;
}

/** Absolute slot active at `now`. */
export function currentSlot(now = Date.now()): number {
  return Math.floor((now - SLOT_EPOCH_MS) / (WEEK_SECONDS * 1000));
}

/** Last slot that still starts before the next WAT midnight (today's final slot). */
export function endOfDaySlot(now = Date.now()): number {
  const nextMidnight = dayAnchorMs(now) + DAY_SECONDS * 1000;
  return Math.floor((nextMidnight - 1 - SLOT_EPOCH_MS) / (WEEK_SECONDS * 1000));
}

/** 1-indexed cyclic week for a (0-indexed) week offset from midnight. */
export function cyclicWeek(weekIdxFromMidnight: number, total: number): number {
  if (total <= 0) return 1;
  return (((weekIdxFromMidnight % total) + total) % total) + 1;
}

/** Deterministic, absolute per-match seed. Independent of the viewing day. */
export function matchSeed(leagueId: string, slot: number, homeId: string, awayId: string): number {
  return (hashStr(leagueId) ^ (Math.imul(slot >>> 0, 2654435761) >>> 0) ^ hashStr(`${homeId}|${awayId}`)) >>> 0;
}

export function buildMatchId(leagueId: string, slot: number, homeId: string, awayId: string): string {
  return `${leagueId}-s${slot}-${homeId}-${awayId}`;
}

export interface ParsedMatchId {
  leagueId: string;
  slot: number | null;   // new absolute-slot IDs
  week: number | null;   // legacy cyclic-week IDs
  homeId: string;
  awayId: string;
}
export function parseMatchId(matchId: string): ParsedMatchId | null {
  const parts = matchId.split('-');
  if (parts.length !== 4) return null;
  const [leagueId, tag, homeId, awayId] = parts;
  if (tag[0] === 's') {
    const slot = parseInt(tag.slice(1), 10);
    return Number.isFinite(slot) ? { leagueId, slot, week: null, homeId, awayId } : null;
  }
  if (tag[0] === 'w') {
    const week = parseInt(tag.slice(1), 10);
    return Number.isFinite(week) && week >= 1 ? { leagueId, slot: null, week, homeId, awayId } : null;
  }
  return null;
}

export type SlotPhase = 'upcoming' | 'betting' | 'live' | 'finished';
export function slotPhase(slot: number, now = Date.now()): { phase: SlotPhase; secondsInto: number } {
  const sec = Math.floor((now - slotStartMs(slot)) / 1000);
  if (sec < 0)                       return { phase: 'upcoming', secondsInto: sec };
  if (sec < BETTING_S)               return { phase: 'betting',  secondsInto: sec };
  if (sec < BETTING_S + LIVE_S)      return { phase: 'live',     secondsInto: sec };
  return { phase: 'finished', secondsInto: sec };
}

/** A slot's match has played and is settle-able. */
export function slotFinished(slot: number, now = Date.now()): boolean {
  return now >= slotStartMs(slot) + (BETTING_S + LIVE_S) * 1000;
}
