import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Tabs, Tab, TextField, CircularProgress,
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
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useToasts } from '../contexts/ToastContext';
import { formatMoney } from '../utils/currency';
import {
  liveSportsApi, type LiveEvent, type LiveSportSummary, type LiveMarket,
} from '../api/liveSports';
import { bookingCodesApi } from '../api/bookingCodes';
import type { ApiBet } from '../api/bets';

interface SlipItem {
  key: string;
  eventId: string;
  label: string;
  marketKey: 'h2h' | 'totals';
  outcomeName: string;
  point?: number;
  price: number;
}

function selKey(eventId: string, marketKey: string, name: string, point?: number) {
  return `${eventId}:${marketKey}:${name}:${point ?? ''}`;
}

function kickoff(iso: string): string {
  const d = new Date(iso);
  const diff = (d.getTime() - Date.now()) / 60000;
  if (diff <= 0) return 'LIVE';
  if (diff < 60) return `${Math.round(diff)}m`;
  if (diff < 1440) return `${Math.round(diff / 60)}h`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function LiveSportsPage() {
  const { isAuthenticated, openAuthPrompt } = useAuth();
  const wallet = useWallet();
  const toasts = useToasts();

  const [sports, setSports]   = useState<LiveSportSummary[]>([]);
  const [active, setActive]   = useState<string>('');
  const [events, setEvents]   = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [slip, setSlip]       = useState<SlipItem[]>([]);
  const [stake, setStake]     = useState('');
  const [placing, setPlacing] = useState(false);
  const [myBets, setMyBets]   = useState<ApiBet[]>([]);

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
      setActive(prev => prev || r.sports[0]?.sportKey || '');
    }).catch(() => {});
  }, []);

  // ── Load + poll events for the active sport ──
  const loadEvents = useCallback(async (sportKey: string) => {
    if (!sportKey) return;
    try { const r = await liveSportsApi.events(sportKey); setEvents(r.events); }
    catch { /* keep stale */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadEvents(active);
    const t = setInterval(() => void loadEvents(active), 25_000);
    return () => clearInterval(t);
  }, [active, loadEvents]);

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
        marketKey: market.key as 'h2h' | 'totals', outcomeName: name, point, price,
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
      await Promise.all([wallet.refresh(), loadMyBets()]);
    } catch (e: any) {
      toasts.error('Could not place bet', e?.message ?? 'Try again.');
    } finally { setPlacing(false); }
  }

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
        Real fixtures, live odds, in-play cash-out. Bet singles or build an accumulator.
      </Typography>

      {events.some(e => e.provider === 'sandbox') && (
        <Box sx={{
          mb: 2, px: 1.5, py: 1, borderRadius: 1.5,
          background: alpha(neonGold, 0.1), border: `1px solid ${alpha(neonGold, 0.4)}`,
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <BoltIcon sx={{ fontSize: 16, color: neonGold }} />
          <Typography sx={{ fontSize: '0.78rem', color: neonGold, fontWeight: 700 }}>
            Demo odds — connect a live feed (set ODDS_API_KEY) to show real events.
          </Typography>
        </Box>
      )}

      {/* Sport tabs */}
      {sports.length > 0 && (
        <Tabs value={active} onChange={(_, v) => setActive(v)} variant="scrollable" scrollButtons="auto"
          sx={{ mb: 2, '& .MuiTab-root': { minHeight: 40, fontWeight: 700 } }}>
          {sports.map(s => <Tab key={s.sportKey} value={s.sportKey} label={`${s.sportTitle} (${s.count})`} />)}
        </Tabs>
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

        {/* Bet slip + open bets */}
        <Box sx={{ position: { md: 'sticky' }, top: { md: 12 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
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

                  {/* Booking code */}
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

          {/* Open bets */}
          {myBets.filter(b => b.status === 'pending').length > 0 && (
            <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
              <Typography sx={{ px: 2, py: 1.25, fontWeight: 800, fontSize: '0.9rem', borderBottom: `1px solid ${darkBorder}` }}>
                Open Bets
              </Typography>
              {myBets.filter(b => b.status === 'pending').map(b => (
                <OpenBetRow key={b._id} bet={b} onChanged={() => { void wallet.refresh(); void loadMyBets(); }} />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Event card ──────────────────────────────────────────────────────────────

function EventCard({ ev, slip, onPick }: {
  ev: LiveEvent;
  slip: SlipItem[];
  onPick: (ev: LiveEvent, m: LiveMarket, name: string, price: number, point?: number) => void;
}) {
  const h2h    = ev.markets.find(m => m.key === 'h2h');
  const totals = ev.markets.find(m => m.key === 'totals');
  const isLive = ev.status === 'live';

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
        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }} noWrap>{label}</Typography>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>{disabled ? '🔒' : price.toFixed(2)}</Typography>
      </Button>
    );
  };

  return (
    <Box sx={{ background: darkCard, border: `1px solid ${isLive ? alpha('#ff4757', 0.3) : darkBorder}`, borderRadius: 2, p: 1.5, mb: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Chip label={isLive ? 'LIVE' : kickoff(ev.commenceTime)} size="small"
          sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800,
            background: isLive ? alpha('#ff4757', 0.15) : alpha(neonBlue, 0.12),
            color: isLive ? '#ff4757' : neonBlue }} />
        <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>{ev.sportTitle}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{ev.homeTeam}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{ev.awayTeam}</Typography>
      </Box>

      {h2h && (
        <Box sx={{ display: 'flex', gap: 0.75, mb: totals ? 0.75 : 0 }}>
          {h2h.outcomes.map(o => (
            <OddsBtn key={o.name} m={h2h} name={o.name} price={o.price}
              label={o.name === ev.homeTeam ? '1' : o.name === ev.awayTeam ? '2' : 'X'} />
          ))}
        </Box>
      )}
      {totals && (
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {totals.outcomes.map(o => (
            <OddsBtn key={`${o.name}${o.point}`} m={totals} name={o.name} price={o.price} point={o.point}
              label={`${o.name} ${o.point}`} />
          ))}
        </Box>
      )}
    </Box>
  );
}

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
