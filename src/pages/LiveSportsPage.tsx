import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import {
  Box, Typography, Button, Chip, Tabs, Tab, TextField, CircularProgress,
  Select, MenuItem, Drawer, Badge,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import BoltIcon from '@mui/icons-material/Bolt';
import CloseIcon from '@mui/icons-material/Close';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IosShareIcon from '@mui/icons-material/IosShare';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useToasts } from '../contexts/ToastContext';
import { formatMoney } from '../utils/currency';
import {
  liveSportsApi, type LiveEvent, type LiveSportSummary, type LiveMarket, type LiveMarketKey,
} from '../api/liveSports';
import { bookingCodesApi } from '../api/bookingCodes';
import type { ApiBet } from '../api/bets';

interface SlipItem {
  key: string;
  eventId: string;
  label: string;
  marketKey: LiveMarketKey;
  outcomeName: string;
  point?: number;
  price: number;
}

// Market display metadata — title + how to render. Order = display order.
const MARKET_META: { key: LiveMarketKey; title: string; primary?: boolean }[] = [
  { key: 'h2h',           title: 'Match Result', primary: true },
  { key: 'h2h_3_way',     title: 'Match Result (3-Way)' },
  { key: 'totals',        title: 'Total (Over/Under)', primary: true },
  { key: 'spreads',       title: 'Handicap' },
  { key: 'double_chance', title: 'Double Chance' },
  { key: 'draw_no_bet',   title: 'Draw No Bet' },
  { key: 'btts',          title: 'Both Teams To Score' },
];

function selKey(eventId: string, marketKey: string, name: string, point?: number) {
  return `${eventId}:${marketKey}:${name}:${point ?? ''}`;
}

/** Exact kickoff date + time, e.g. "Sat, 14 Jun · 19:30". */
function fmtKickoff(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

/** Short countdown until kickoff (for the badge). */
function kickoffIn(iso: string): string {
  const diff = (new Date(iso).getTime() - Date.now()) / 60000;
  if (diff <= 0) return 'LIVE';
  if (diff < 60) return `in ${Math.round(diff)}m`;
  if (diff < 1440) return `in ${Math.round(diff / 60)}h`;
  return `in ${Math.round(diff / 1440)}d`;
}

// ─── Team crest + competition flag ─────────────────────────────────────────
// The Odds API supplies only team-name strings (no logos), so we render a
// deterministic monogram crest per team — the same name always yields the
// same colour + initials, mirroring the Virtual Sports emblems.
function teamHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const CREST_NOISE = /^(fc|cf|sc|afc|ac|if|sk|cd|bk|club|de|the|los|las|el|la|al)$/i;
function teamInitials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const meaningful = words.filter(w => !CREST_NOISE.test(w));
  const src = meaningful.length ? meaningful : words;
  if (src.length >= 2) return (src[0][0] + src[1][0]).toUpperCase();
  return (src[0] ?? name).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
}
function TeamCrest({ name, size = 22 }: { name: string; size?: number }) {
  const seed = teamHash(name);
  const hue = seed % 360;
  const id = `tc-${seed}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-label={name} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 65% 46%)`} />
          <stop offset="100%" stopColor={`hsl(${(hue + 26) % 360} 70% 28%)`} />
        </linearGradient>
      </defs>
      <path d="M24 2 L42 7 L42 24 C42 36 34 42 24 46 C14 42 6 36 6 24 L6 7 Z"
        fill={`url(#${id})`} stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" />
      <rect x="6" y="21" width="36" height="2.5" fill="#fff" opacity="0.45" />
      <text x="24" y="30" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" fontFamily="Arial">
        {teamInitials(name)}
      </text>
    </svg>
  );
}

// ─── Real team badges via TheSportsDB (free, CORS-open) ────────────────────
// The Odds API gives only team-name strings, so we resolve the real club crest
// by name from TheSportsDB and cache it in localStorage (badges rarely change),
// with request dedupe + a small concurrency cap to stay under the free-tier
// rate limit. Clubs it doesn't know fall back to the monogram TeamCrest.
const TSDB_KEY = '3'; // free public key
const badgeMem = new Map<string, string | null>();
const badgePending = new Map<string, Promise<string | null>>();
const badgeQueue: (() => void)[] = [];
let badgeActive = 0;
const normName = (n: string) => n.trim().toLowerCase();

function pumpBadgeQueue() {
  while (badgeActive < 4 && badgeQueue.length) (badgeQueue.shift()!)();
}

function resolveBadge(name: string): Promise<string | null> {
  const key = normName(name);
  if (badgeMem.has(key)) return Promise.resolve(badgeMem.get(key)!);
  if (badgePending.has(key)) return badgePending.get(key)!;

  let stored: string | null | undefined;
  try { stored = localStorage.getItem(`tsdb:badge:${key}`); } catch { stored = null; }
  if (stored != null) { const v = stored || null; badgeMem.set(key, v); return Promise.resolve(v); }

  const p = new Promise<string | null>((resolve) => {
    const job = async () => {
      badgeActive++;
      let url: string | null = null;
      let ok = false;
      try {
        const r = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${TSDB_KEY}/searchteams.php?t=${encodeURIComponent(name)}`,
        );
        if (r.ok) {
          ok = true;
          const data = await r.json();
          const team = Array.isArray(data?.teams) ? data.teams[0] : null;
          url = (team?.strBadge as string) || (team?.strTeamBadge as string) || null;
        }
      } catch { /* network error — retry next session, don't persist */ }
      finally { badgeActive--; pumpBadgeQueue(); }

      badgeMem.set(key, url);
      if (ok) { try { localStorage.setItem(`tsdb:badge:${key}`, url ?? ''); } catch { /* quota */ } }
      badgePending.delete(key);
      resolve(url);
    };
    badgeQueue.push(job);
    pumpBadgeQueue();
  });
  badgePending.set(key, p);
  return p;
}

function useTeamBadge(name: string): string | null {
  const [url, setUrl] = useState<string | null>(() => badgeMem.get(normName(name)) ?? null);
  useEffect(() => {
    let on = true;
    void resolveBadge(name).then(u => { if (on) setUrl(u); });
    return () => { on = false; };
  }, [name]);
  return url;
}

/** Real club badge when known, else the deterministic monogram crest. */
function TeamLogo({ name, size = 24 }: { name: string; size?: number }) {
  const badge = useTeamBadge(name);
  const [broken, setBroken] = useState(false);
  if (badge && !broken) {
    return (
      <img src={badge} alt={name} width={size} height={size} loading="lazy"
        onError={() => setBroken(true)}
        style={{ objectFit: 'contain', flexShrink: 0 }} />
    );
  }
  return <TeamCrest name={name} size={size} />;
}

// Real flag image (flagcdn) for a competition, by ISO-3166 code derived from
// its Odds-API sport key. Emoji flags render as plain letters on Windows, so
// we use PNGs. Returns null for multi-country comps where no single flag fits.
function competitionIso(sportKey: string): string {
  const k = (sportKey || '').toLowerCase();
  const exact: Record<string, string> = {
    soccer_epl: 'gb-eng', soccer_efl_champ: 'gb-eng', soccer_england_efl_cup: 'gb-eng',
    soccer_usa_mls: 'us', soccer_mexico_ligamx: 'mx', soccer_brazil_campeonato: 'br',
    basketball_nba: 'us', basketball_wnba: 'us', basketball_ncaab: 'us', basketball_euroleague: 'eu',
    americanfootball_nfl: 'us', americanfootball_ncaaf: 'us', icehockey_nhl: 'us',
    baseball_mlb: 'us', rugbyleague_nrl: 'au',
  };
  if (exact[k]) return exact[k];
  const tokens: [string, string][] = [
    ['spain', 'es'], ['italy', 'it'], ['germany', 'de'], ['france', 'fr'],
    ['netherlands', 'nl'], ['portugal', 'pt'], ['turkey', 'tr'], ['england', 'gb-eng'],
    ['usa', 'us'], ['brazil', 'br'], ['mexico', 'mx'], ['argentina', 'ar'],
    ['wimbledon', 'gb-eng'], ['french_open', 'fr'], ['aus_open', 'au'], ['us_open', 'us'],
  ];
  for (const [tok, code] of tokens) if (k.includes(tok)) return code;
  if (k.includes('uefa')) return 'eu';
  return '';
}

function CompFlag({ sportKey }: { sportKey: string }) {
  const iso = competitionIso(sportKey);
  if (!iso) return null;
  return (
    <img src={`https://flagcdn.com/w20/${iso}.png`} alt="" height={12}
      style={{ borderRadius: 1, marginRight: 5, verticalAlign: 'middle' }} />
  );
}

export default function LiveSportsPage() {
  const { isAuthenticated, openAuthPrompt } = useAuth();
  const wallet = useWallet();
  const toasts = useToasts();

  const [sports, setSports]         = useState<LiveSportSummary[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('');  // sport, e.g. 'Soccer'
  const [activeComp, setActiveComp]   = useState<string>('');  // competition sportKey
  const [events, setEvents]   = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [slip, setSlip]       = useState<SlipItem[]>([]);
  const [stake, setStake]     = useState('');
  const [placing, setPlacing] = useState(false);
  const [myBets, setMyBets]   = useState<ApiBet[]>([]);
  const [mobileSlipOpen, setMobileSlipOpen] = useState(false);

  // Booking codes
  const [params] = useSearchParams();
  const [bookedCode, setBookedCode] = useState<string | null>(null);
  const [qrUrl, setQrUrl]           = useState<string | null>(null);
  const [loadInput, setLoadInput]   = useState('');
  const [loadedFromCode, setLoadedFromCode] = useState<string | null>(null);

  const loadCode = useCallback(async (code: string, silent = false) => {
    try {
      const r = await bookingCodesApi.redeem(code);
      void bookingCodesApi.view(code);
      const items: SlipItem[] = (r.selections as SlipItem[]).map(s => ({
        ...s, key: selKey(s.eventId, s.marketKey, s.outcomeName, s.point),
      }));
      setSlip(items);
      setLoadedFromCode(r.code);
      if (r.suggestedStake > 0) setStake(String(r.suggestedStake));
      if (!silent) toasts.success('Slip loaded', `${items.length} selection(s) from ${r.code}`);
    } catch (e: any) {
      if (!silent) toasts.error('Code not found', e?.message ?? 'That code is invalid or expired.');
    }
  }, [toasts]);

  // Auto-load a shared code from ?code=
  useEffect(() => {
    const c = params.get('code');
    if (c) void loadCode(c, true);
  }, [params, loadCode]);

  async function book() {
    if (slip.length === 0) return;
    try {
      const r = await bookingCodesApi.mint({
        selections: slip.map(({ eventId, label, marketKey, outcomeName, point, price }) =>
          ({ eventId, label, marketKey, outcomeName, point, price })),
        suggestedStake: parseFloat(stake) || 0,
        currency: wallet.currency,
      });
      setBookedCode(r.code);
      const url = `${window.location.origin}/live-sports?code=${r.code}`;
      QRCode.toDataURL(url, { margin: 1, width: 180 }).then(setQrUrl).catch(() => setQrUrl(null));
      setLoadedFromCode(r.code);
    } catch (e: any) {
      toasts.error('Could not create code', e?.message ?? 'Try again.');
    }
  }

  function shareUrl(): string { return `${window.location.origin}/live-sports?code=${bookedCode}`; }
  async function copyCode() {
    try { await navigator.clipboard.writeText(bookedCode!); toasts.success('Copied', `Code ${bookedCode} copied.`); } catch { /* ignore */ }
  }
  async function shareCode() {
    const url = shareUrl();
    if (navigator.share) { try { await navigator.share({ title: 'My bet slip', text: `Booking code ${bookedCode}`, url }); return; } catch { /* fall through */ } }
    try { await navigator.clipboard.writeText(url); toasts.success('Link copied', 'Share link copied to clipboard.'); } catch { /* ignore */ }
  }

  // ── Load sports once ──
  useEffect(() => {
    liveSportsApi.sports().then(r => {
      setSports(r.sports);
      const first = r.sports[0];
      if (first) {
        setActiveGroup(g => g || first.sportGroup);
        setActiveComp(c => c || first.sportKey);
      }
    }).catch(() => {});
  }, []);

  // Sport groups (top tabs) and the competitions within the selected sport.
  const groups = useMemo(() => {
    const seen = new Set<string>(); const out: string[] = [];
    for (const s of sports) if (!seen.has(s.sportGroup)) { seen.add(s.sportGroup); out.push(s.sportGroup); }
    return out;
  }, [sports]);
  const comps = useMemo(() => sports.filter(s => s.sportGroup === activeGroup), [sports, activeGroup]);

  function pickGroup(g: string) {
    setActiveGroup(g);
    setActiveComp(sports.find(s => s.sportGroup === g)?.sportKey ?? '');
  }

  // Keep the competition valid for the active sport.
  useEffect(() => {
    if (comps.length && !comps.some(c => c.sportKey === activeComp)) setActiveComp(comps[0].sportKey);
  }, [comps, activeComp]);

  // ── Load + poll events for the active competition ──
  const loadEvents = useCallback(async (sportKey: string) => {
    if (!sportKey) return;
    try { const r = await liveSportsApi.events(sportKey); setEvents(r.events); }
    catch { /* keep stale */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadEvents(activeComp);
    const t = setInterval(() => void loadEvents(activeComp), 25_000);
    return () => clearInterval(t);
  }, [activeComp, loadEvents]);

  // ── Load open bets ──
  const loadMyBets = useCallback(async () => {
    if (!isAuthenticated) { setMyBets([]); return; }
    try { const r = await liveSportsApi.myBets(); setMyBets(r.bets); } catch { /* ignore */ }
  }, [isAuthenticated]);
  useEffect(() => { void loadMyBets(); }, [loadMyBets]);

  // ── Bet slip ──
  function toggle(ev: LiveEvent, market: LiveMarket, name: string, price: number, point?: number) {
    setBookedCode(null); setQrUrl(null);
    const key = selKey(ev.providerId, market.key, name, point);
    setSlip(prev => {
      if (prev.some(s => s.key === key)) return prev.filter(s => s.key !== key);
      // one selection per event (accumulator rule)
      const withoutEvent = prev.filter(s => s.eventId !== ev.providerId);
      return [...withoutEvent, {
        key, eventId: ev.providerId, label: `${ev.homeTeam} vs ${ev.awayTeam}`,
        marketKey: market.key as LiveMarketKey, outcomeName: name, point, price,
      }];
    });
  }

  const combined = useMemo(() => slip.reduce((a, s) => a * s.price, 1), [slip]);
  const stakeNum = parseFloat(stake) || 0;
  const potential = stakeNum * combined;

  async function placeBet() {
    if (!isAuthenticated) { openAuthPrompt(); return; }
    if (slip.length === 0 || stakeNum <= 0) return;
    setPlacing(true);
    try {
      await liveSportsApi.placeBet(stakeNum, slip.map(s => ({
        eventId: s.eventId, marketKey: s.marketKey, outcomeName: s.outcomeName, point: s.point,
      })), loadedFromCode ?? undefined);
      toasts.success('Bet placed', `${slip.length}-selection slip · ${combined.toFixed(2)}×`);
      setSlip([]); setStake(''); setBookedCode(null); setQrUrl(null); setLoadedFromCode(null);
      setMobileSlipOpen(false);
      await Promise.all([wallet.refresh(), loadMyBets()]);
    } catch (e: any) {
      toasts.error('Could not place bet', e?.message ?? 'Try again.');
    } finally { setPlacing(false); }
  }

  // ── Reusable bet-slip panel (used in desktop sidebar + mobile drawer) ──
  const betSlipCard = (
    <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, borderBottom: `1px solid ${darkBorder}` }}>
        <ReceiptLongIcon sx={{ fontSize: 18, color: neonGold }} />
        <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>Bet Slip</Typography>
        <Box sx={{ flex: 1 }} />
        {slip.length > 0 && <Chip label={`${slip.length}`} size="small" sx={{ background: alpha(neonGreen, 0.2), color: neonGreen, fontWeight: 800 }} />}
      </Box>

      {/* Load a booking code */}
      <Box sx={{ display: 'flex', gap: 0.75, px: 2, py: 1.25, borderBottom: `1px solid ${darkBorder}` }}>
        <TextField size="small" placeholder="Enter booking code" value={loadInput}
          onChange={e => setLoadInput(e.target.value.toUpperCase())}
          sx={{ flex: 1, '& input': { fontSize: '0.8rem', textTransform: 'uppercase' } }} />
        <Button size="small" variant="outlined" disabled={!loadInput.trim()}
          onClick={() => { void loadCode(loadInput.trim()); setLoadInput(''); }}>Load</Button>
      </Box>

      {slip.length === 0 ? (
        <Typography sx={{ p: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
          Tap any odds to add a selection, or load a booking code above.
        </Typography>
      ) : (
        <Box>
          {slip.map(s => (
            <Box key={s.key} sx={{ px: 2, py: 1, borderBottom: `1px solid ${darkBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }} noWrap>
                  {s.outcomeName}{s.point != null ? ` ${s.point}` : ''}
                </Typography>
                <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }} noWrap>{s.label}</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: neonGold }}>{s.price.toFixed(2)}</Typography>
              <CloseIcon sx={{ fontSize: 16, cursor: 'pointer', color: 'text.disabled' }}
                onClick={() => { setBookedCode(null); setQrUrl(null); setSlip(prev => prev.filter(x => x.key !== s.key)); }} />
            </Box>
          ))}

          <Box sx={{ p: 2 }}>
            <TextField fullWidth size="small" placeholder={`Stake (${wallet.currency})`} value={stake}
              onChange={e => setStake(e.target.value.replace(/[^0-9.]/g, ''))}
              type="number" sx={{ mb: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {slip.length > 1 ? 'Accumulator odds' : 'Odds'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: neonGold }}>{combined.toFixed(2)}×</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Potential return</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: neonGreen }}>
                {potential > 0 ? formatMoney(potential, wallet.currency) : '—'}
              </Typography>
            </Box>
            <Button fullWidth variant="contained" disabled={placing || stakeNum <= 0}
              onClick={placeBet}
              sx={{ fontWeight: 900, background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`, color: '#000' }}>
              {placing ? <CircularProgress size={18} color="inherit" /> : isAuthenticated ? 'Place Bet' : 'Sign in to bet'}
            </Button>

            <Button fullWidth size="small" onClick={book}
              sx={{ mt: 1, fontWeight: 700, fontSize: '0.75rem', color: neonBlue, border: `1px solid ${alpha(neonBlue, 0.4)}` }}>
              Book slip → get a code
            </Button>

            {bookedCode && (
              <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, background: alpha(neonBlue, 0.06), border: `1px solid ${alpha(neonBlue, 0.3)}`, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', letterSpacing: '0.1em' }}>BOOKING CODE</Typography>
                <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: neonBlue, letterSpacing: '0.15em', fontFamily: 'monospace' }}>{bookedCode}</Typography>
                {qrUrl && <Box component="img" src={qrUrl} alt="QR" sx={{ width: 140, height: 140, borderRadius: 1, my: 1, background: '#fff', p: 0.5 }} />}
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
                  <Button size="small" fullWidth startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />} onClick={copyCode}
                    sx={{ fontSize: '0.7rem', border: `1px solid ${darkBorder}` }}>Copy</Button>
                  <Button size="small" fullWidth startIcon={<IosShareIcon sx={{ fontSize: 14 }} />} onClick={shareCode}
                    sx={{ fontSize: '0.7rem', border: `1px solid ${darkBorder}` }}>Share</Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );

  const openBetsCard = myBets.filter(b => b.status === 'pending').length > 0 ? (
    <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
      <Typography sx={{ px: 2, py: 1.25, fontWeight: 800, fontSize: '0.9rem', borderBottom: `1px solid ${darkBorder}` }}>
        Open Bets
      </Typography>
      {myBets.filter(b => b.status === 'pending').map(b => (
        <OpenBetRow key={b._id} bet={b} onChanged={() => { void wallet.refresh(); void loadMyBets(); }} />
      ))}
    </Box>
  ) : null;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, pb: { xs: 12, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <SportsSoccerIcon sx={{ color: neonGreen, fontSize: 30 }} />
        <Typography variant="h4" sx={{ fontWeight: 900 }}>Live Sports</Typography>
        <Chip icon={<BoltIcon sx={{ fontSize: 14 }} />} label="LIVE" size="small"
          sx={{ background: alpha('#ff4757', 0.15), color: '#ff4757', border: `1px solid ${alpha('#ff4757', 0.4)}`, fontWeight: 800 }} />
      </Box>
      <Typography sx={{ color: 'text.secondary', mb: 2, fontSize: '0.9rem' }}>
        Pick a sport, then a competition — real fixtures, live odds, in-play cash-out. Singles or accumulators.
      </Typography>

      {/* Sport tabs (top level) */}
      {groups.length > 0 && (
        <>
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em', mb: 0.25 }}>
            SPORT
          </Typography>
          <Tabs value={activeGroup} onChange={(_, v) => pickGroup(v)} variant="scrollable" scrollButtons="auto"
            sx={{ mb: 1, minHeight: 38, '& .MuiTab-root': { minHeight: 38, fontWeight: 800 } }}>
            {groups.map(g => <Tab key={g} value={g} label={g} />)}
          </Tabs>

          {/* Competition tabs (within the selected sport) */}
          <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: 'text.secondary', letterSpacing: '0.1em', mb: 0.25 }}>
            COMPETITION
          </Typography>
          <Tabs value={comps.some(c => c.sportKey === activeComp) ? activeComp : false}
            onChange={(_, v) => setActiveComp(v)} variant="scrollable" scrollButtons="auto"
            sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, fontWeight: 700, fontSize: '0.78rem' } }}>
            {comps.map(s => <Tab key={s.sportKey} value={s.sportKey} label={`${s.sportTitle} (${s.count})`} />)}
          </Tabs>
        </>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2, alignItems: 'start' }}>
        {/* Events */}
        <Box>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress size={28} sx={{ color: neonGreen }} /></Box>
          ) : events.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
              <Typography sx={{ color: 'text.secondary' }}>No events available right now. Check back soon.</Typography>
            </Box>
          ) : events.map(ev => (
            <EventCard key={ev.providerId} ev={ev} slip={slip} onPick={toggle} />
          ))}
        </Box>

        {/* Desktop bet slip + open bets sidebar (hidden on mobile) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, position: 'sticky', top: 12, flexDirection: 'column', gap: 2 }}>
          {betSlipCard}
          {openBetsCard}
        </Box>
      </Box>

      {/* Mobile: open bets below the events */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, mt: 2 }}>{openBetsCard}</Box>

      {/* Mobile floating bet-slip bar */}
      {slip.length > 0 && (
        <Box
          onClick={() => setMobileSlipOpen(true)}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 1200,
            alignItems: 'center', gap: 1.5, px: 2, py: 1.25, borderRadius: 3,
            background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`, color: '#000',
            boxShadow: `0 6px 24px ${alpha('#000', 0.5)}`, cursor: 'pointer',
          }}>
          <Badge badgeContent={slip.length} color="error">
            <ReceiptLongIcon sx={{ color: '#000' }} />
          </Badge>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.8 }}>
              {slip.length} selection{slip.length !== 1 ? 's' : ''} · {combined.toFixed(2)}×
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 900 }}>
              {potential > 0 ? `Returns ${formatMoney(potential, wallet.currency)}` : 'Open bet slip'}
            </Typography>
          </Box>
          <Typography sx={{ fontWeight: 900, fontSize: '0.85rem' }}>BET →</Typography>
        </Box>
      )}

      {/* Mobile bet-slip drawer */}
      <Drawer
        anchor="bottom" open={mobileSlipOpen} onClose={() => setMobileSlipOpen(false)}
        slotProps={{ paper: { sx: { background: 'transparent', maxHeight: '85vh', p: 1.5 } } }}>
        {betSlipCard}
      </Drawer>
    </Box>
  );
}

// ─── Event card ──────────────────────────────────────────────────────────────

function EventCard({ ev, slip, onPick }: {
  ev: LiveEvent;
  slip: SlipItem[];
  onPick: (ev: LiveEvent, m: LiveMarket, name: string, price: number, point?: number) => void;
}) {
  const isLive = ev.status === 'live';
  const [pickedLines, setPickedLines] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);

  const OddsBtn = ({ m, name, price, point, label }: { m: LiveMarket; name: string; price: number; point?: number; label: string }) => {
    const on = slip.some(s => s.key === selKey(ev.providerId, m.key, name, point));
    const disabled = m.suspended || ev.suspended;
    return (
      <Button
        size="small" disabled={disabled}
        onClick={() => onPick(ev, m, name, price, point)}
        sx={{
          flex: 1, minWidth: 0, flexDirection: 'column', py: 0.5, borderRadius: 1.5,
          border: `1px solid ${on ? neonGreen : darkBorder}`,
          background: on ? alpha(neonGreen, 0.15) : alpha('#fff', 0.02),
          color: on ? neonGreen : 'text.primary',
          '&:hover': { background: alpha(neonGreen, 0.1) },
        }}>
        <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary' }} noWrap>{label}</Typography>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>{disabled ? '🔒' : price.toFixed(2)}</Typography>
      </Button>
    );
  };

  const LineSelect = ({ mkey, lines, active }: { mkey: string; lines: number[]; active: number }) =>
    lines.length > 1 ? (
      <Select
        value={active}
        onChange={e => setPickedLines(p => ({ ...p, [mkey]: Number(e.target.value) }))}
        size="small" variant="standard" disableUnderline
        sx={{ fontSize: '0.7rem', fontWeight: 700, color: neonGold, '& .MuiSelect-select': { py: 0, pr: '18px !important' } }}>
        {lines.map(l => <MenuItem key={l} value={l} sx={{ fontSize: '0.78rem' }}>{l > 0 ? `+${l}` : l.toFixed(1)}</MenuItem>)}
      </Select>
    ) : null;

  function dcLabel(name: string): string {
    const lc = name.toLowerCase();
    const h = lc.includes(ev.homeTeam.toLowerCase()), a = lc.includes(ev.awayTeam.toLowerCase()), d = lc.includes('draw');
    if (h && d) return '1X'; if (h && a) return '12'; if (d && a) return 'X2';
    return name;
  }

  function renderMarket(meta: { key: LiveMarketKey; title: string }) {
    const m = ev.markets.find(x => x.key === meta.key);
    if (!m || m.outcomes.length === 0) return null;

    let header: ReactNode = <Typography sx={sectLabel}>{meta.title.toUpperCase()}</Typography>;
    let body: ReactNode = null;

    if (meta.key === 'h2h' || meta.key === 'h2h_3_way') {
      const ordered = [
        { o: m.outcomes.find(o => o.name === ev.homeTeam), label: '1' },
        { o: m.outcomes.find(o => o.name === 'Draw'),      label: 'X' },
        { o: m.outcomes.find(o => o.name === ev.awayTeam), label: '2' },
      ].filter((x): x is { o: NonNullable<typeof x.o>; label: string } => !!x.o);
      body = <Box sx={rowSx}>{ordered.map(x => <OddsBtn key={x.label} m={m} name={x.o.name} price={x.o.price} label={x.label} />)}</Box>;
    } else if (meta.key === 'totals') {
      const lines = Array.from(new Set(m.outcomes.map(o => o.point).filter((p): p is number => p != null))).sort((a, b) => a - b);
      if (lines.length === 0) return null;
      const active = pickedLines.totals != null && lines.includes(pickedLines.totals) ? pickedLines.totals : (lines.includes(2.5) ? 2.5 : lines[Math.floor(lines.length / 2)]);
      const over  = m.outcomes.find(o => o.name === 'Over'  && o.point === active);
      const under = m.outcomes.find(o => o.name === 'Under' && o.point === active);
      header = <Box sx={hdrRow}><Typography sx={sectLabel}>{meta.title.toUpperCase()}</Typography><LineSelect mkey="totals" lines={lines} active={active} /></Box>;
      body = <Box sx={rowSx}>
        {over  && <OddsBtn m={m} name="Over"  price={over.price}  point={active} label={`Over ${active.toFixed(1)}`} />}
        {under && <OddsBtn m={m} name="Under" price={under.price} point={active} label={`Under ${active.toFixed(1)}`} />}
      </Box>;
    } else if (meta.key === 'spreads') {
      const homeLines = Array.from(new Set(m.outcomes.filter(o => o.name === ev.homeTeam).map(o => o.point).filter((p): p is number => p != null))).sort((a, b) => a - b);
      if (homeLines.length === 0) return null;
      const active = pickedLines.spreads != null && homeLines.includes(pickedLines.spreads) ? pickedLines.spreads : homeLines[Math.floor(homeLines.length / 2)];
      const homeO = m.outcomes.find(o => o.name === ev.homeTeam && o.point === active);
      const awayO = m.outcomes.find(o => o.name === ev.awayTeam && o.point === -active) ?? m.outcomes.find(o => o.name === ev.awayTeam);
      header = <Box sx={hdrRow}><Typography sx={sectLabel}>{meta.title.toUpperCase()}</Typography><LineSelect mkey="spreads" lines={homeLines} active={active} /></Box>;
      body = <Box sx={rowSx}>
        {homeO && <OddsBtn m={m} name={homeO.name} price={homeO.price} point={homeO.point} label={`${ev.homeTeam} ${active > 0 ? '+' : ''}${active}`} />}
        {awayO && <OddsBtn m={m} name={awayO.name} price={awayO.price} point={awayO.point} label={`${ev.awayTeam} ${(awayO.point ?? 0) > 0 ? '+' : ''}${awayO.point}`} />}
      </Box>;
    } else {
      // Column markets: double_chance / btts / draw_no_bet
      const label = (o: { name: string }) =>
        meta.key === 'double_chance' ? dcLabel(o.name)
        : meta.key === 'draw_no_bet' ? (o.name === ev.homeTeam ? '1' : o.name === ev.awayTeam ? '2' : o.name)
        : o.name; // btts: Yes / No
      body = <Box sx={rowSx}>{m.outcomes.map(o => <OddsBtn key={o.name + (o.point ?? '')} m={m} name={o.name} price={o.price} point={o.point} label={label(o)} />)}</Box>;
    }

    return <Box key={meta.key} sx={{ mb: 1 }}>{header}{body}</Box>;
  }

  const present = MARKET_META.filter(meta => ev.markets.some(m => m.key === meta.key && m.outcomes.length));
  const primary = present.filter(p => p.primary);
  const extra   = present.filter(p => !p.primary);

  return (
    <Box sx={{ background: darkCard, border: `1px solid ${isLive ? alpha('#ff4757', 0.3) : darkBorder}`, borderRadius: 2, p: 1.5, mb: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Chip label={isLive ? 'LIVE' : kickoffIn(ev.commenceTime)} size="small"
          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
            background: isLive ? alpha('#ff4757', 0.15) : alpha(neonBlue, 0.12),
            color: isLive ? '#ff4757' : neonBlue }} />
        <Typography component="span" sx={{ fontSize: '0.65rem', color: 'text.disabled', display: 'inline-flex', alignItems: 'center' }}>
          <CompFlag sportKey={ev.sportKey} />
          {ev.sportTitle}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <AccessTimeIcon sx={{ fontSize: 13, color: isLive ? '#ff4757' : neonGold }} />
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: isLive ? '#ff4757' : neonGold }}>
            {isLive ? 'In play now' : fmtKickoff(ev.commenceTime)}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          <TeamLogo name={ev.homeTeam} />
          <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{ev.homeTeam}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, justifyContent: 'flex-end' }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: '0.9rem', textAlign: 'right' }}>{ev.awayTeam}</Typography>
          <TeamLogo name={ev.awayTeam} />
        </Box>
      </Box>

      {primary.map(renderMarket)}
      {expanded && extra.map(renderMarket)}

      {extra.length > 0 && (
        <Button size="small" onClick={() => setExpanded(e => !e)}
          sx={{ mt: 0.5, fontSize: '0.7rem', fontWeight: 700, color: neonBlue }}>
          {expanded ? 'Hide markets' : `+ ${extra.length} more markets`}
        </Button>
      )}
    </Box>
  );
}

const sectLabel = { fontSize: '0.6rem', fontWeight: 800, color: 'text.disabled', letterSpacing: '0.08em', mb: 0.5 } as const;
const hdrRow    = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 } as const;
const rowSx     = { display: 'flex', gap: 0.75 } as const;

// ─── Open bet row with cash-out ───────────────────────────────────────────────

function OpenBetRow({ bet, onChanged }: { bet: ApiBet; onChanged: () => void }) {
  const toasts = useToasts();
  const [value, setValue] = useState<number | null>(null);
  const [partialEnabled, setPartial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const loadQuote = useCallback(async () => {
    try {
      const r = await liveSportsApi.cashoutQuote(bet._id);
      setValue(r.quote.cashoutValue); setPartial(r.partialEnabled); setUnavailable(false);
    } catch { setUnavailable(true); }
  }, [bet._id]);

  useEffect(() => {
    void loadQuote();
    const t = setInterval(() => void loadQuote(), 15_000);
    return () => clearInterval(t);
  }, [loadQuote]);

  async function doCashout(fraction?: number) {
    setBusy(true);
    try {
      const r = await liveSportsApi.cashout(bet._id, fraction);
      toasts.success(r.partial ? 'Partial cash-out' : 'Cashed out', `+${formatMoney(r.paid, bet.currency)}`);
      onChanged();
    } catch (e: any) {
      toasts.error('Cash-out failed', e?.message ?? 'Odds may have moved — try again.');
      void loadQuote();
    } finally { setBusy(false); }
  }

  return (
    <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${darkBorder}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }} noWrap>{bet.gameName}</Typography>
          <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
            Stake {formatMoney(bet.stake, bet.currency)}{bet.details ? ` · ${bet.details}` : ''}
          </Typography>
        </Box>
      </Box>
      {unavailable ? (
        <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>Cash-out unavailable</Typography>
      ) : (
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          <Button size="small" fullWidth disabled={busy || value == null} onClick={() => doCashout()}
            sx={{ fontWeight: 800, fontSize: '0.72rem', border: `1px solid ${alpha(neonGold, 0.5)}`, color: neonGold,
              background: alpha(neonGold, 0.08), '&:hover': { background: alpha(neonGold, 0.16) } }}>
            {busy ? <CircularProgress size={14} color="inherit" />
              : `Cash Out ${value != null ? formatMoney(value, bet.currency) : ''}`}
          </Button>
          {partialEnabled && value != null && (
            <Button size="small" disabled={busy} onClick={() => doCashout(0.5)}
              sx={{ fontWeight: 800, fontSize: '0.72rem', border: `1px solid ${darkBorder}`, color: 'text.secondary', minWidth: 64 }}>
              50%
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}
