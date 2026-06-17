import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Chip, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BlockIcon from '@mui/icons-material/Block';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { useToasts } from '../../contexts/ToastContext';
import { adminApi, type BettingExposureDto, type SelectionExposureDto } from '../../api/admin';

const MARKET_LABEL: Record<string, string> = {
  h2h: '1X2', h2h_3_way: '1X2 (3-way)', totals: 'Over/Under', spreads: 'Handicap',
  double_chance: 'Double Chance', btts: 'BTTS', draw_no_bet: 'Draw No Bet',
};
const usd = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const optLabel = (mk: string, name: string, point?: number) =>
  `${MARKET_LABEL[mk] ?? mk}: ${name}${point != null ? ` ${point > 0 ? '+' : ''}${point}` : ''}`;
const clockTime = (iso: string) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

const STATUS_COLOR: Record<string, string> = {
  pending: '#8b9bb0', won: neonGreen, cashout: neonGold, lost: '#ff6b7a', push: '#8b9bb0', void: '#8b9bb0', refunded: '#8b9bb0',
};

export default function AdminBettingExposurePanel() {
  const toasts = useToasts();
  const [data, setData] = useState<BettingExposureDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyEvent, setBusyEvent] = useState<string | null>(null);

  async function load() {
    try { setData(await adminApi.bettingExposure()); } catch { /* keep stale */ }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  async function toggleSuspend(eventId: string, suspend: boolean) {
    setBusyEvent(eventId);
    try {
      await adminApi.suspendLiveEvent(eventId, suspend);
      toasts.success(suspend ? 'Match suspended' : 'Match resumed',
        suspend ? 'No new bets can be placed on it.' : 'Betting re-opened.');
      await load();
    } catch (e: any) {
      toasts.error('Could not update', e?.message ?? 'Try again.');
    } finally { setBusyEvent(null); }
  }

  const byEvent = useMemo(() => {
    const m = new Map<string, { eventId: string; label: string; rows: SelectionExposureDto[]; liabilityUsd: number; stakeUsd: number }>();
    for (const s of data?.selections ?? []) {
      const g = m.get(s.eventId) ?? { eventId: s.eventId, label: s.eventLabel, rows: [], liabilityUsd: 0, stakeUsd: 0 };
      g.rows.push(s); g.liabilityUsd += s.liabilityUsd; g.stakeUsd += s.stakeUsd;
      m.set(s.eventId, g);
    }
    return Array.from(m.values()).sort((a, b) => b.liabilityUsd - a.liabilityUsd);
  }, [data]);

  if (loading && !data) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: neonGreen }} /></Box>;

  const totals = data?.totals;
  const games = data?.games ?? [];
  const recent = data?.recentBets ?? [];
  const events = data?.events ?? {};

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>Live Activity & Exposure</Typography>
        <Chip size="small" label="LIVE · 10s" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, background: `${neonGreen}1a`, color: neonGreen }} />
        <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} onClick={load} sx={{ color: 'text.secondary' }}>Refresh</Button>
      </Box>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
        Every game on the site — casino, virtual and live sports — as users play and bet. Track turnover, house P/L
        and open liability per game, watch the live bet feed, and <b>suspend a live match</b> when liability runs hot.
      </Typography>

      {/* Site-wide KPIs */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
        {[
          { label: 'Open liability (all games)', value: usd(totals?.openLiabilityUsd ?? 0), color: neonGold },
          { label: 'Turnover · last 60m', value: usd(totals?.turnover60mUsd ?? 0), color: '#fff' },
          { label: 'House net · last 60m', value: usd(totals?.net60mUsd ?? 0), color: (totals?.net60mUsd ?? 0) >= 0 ? neonGreen : '#ff6b7a' },
        ].map(t => (
          <Box key={t.label} sx={{ flex: '1 1 180px', background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 1.5 }}>
            <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', letterSpacing: '0.06em' }}>{t.label.toUpperCase()}</Typography>
            <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: t.color }}>{t.value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Per-game activity */}
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, mb: 1 }}>By game · last 60 min</Typography>
      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, mb: 2.5, overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <Box component="thead">
            <Box component="tr" sx={{ color: 'text.disabled', '& th': { fontSize: '0.66rem', fontWeight: 800, textAlign: 'right', px: 1, py: 0.75, letterSpacing: '0.04em' } }}>
              <Box component="th" sx={{ textAlign: 'left !important' }}>GAME</Box>
              <Box component="th">PLAYERS</Box>
              <Box component="th">BETS</Box>
              <Box component="th">TURNOVER</Box>
              <Box component="th">NET P/L</Box>
              <Box component="th">OPEN LIABILITY</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {games.length === 0 ? (
              <Box component="tr"><Box component="td" colSpan={6} sx={{ p: 2, textAlign: 'center', color: 'text.secondary', fontSize: '0.8rem' }}>No betting activity yet.</Box></Box>
            ) : games.map(g => (
              <Box component="tr" key={g.gameId} sx={{ borderTop: `1px solid ${darkBorder}`, '& td': { fontSize: '0.76rem', textAlign: 'right', px: 1, py: 0.85 } }}>
                <Box component="td" sx={{ textAlign: 'left !important', fontWeight: 700, whiteSpace: 'nowrap' }}>{g.gameName}</Box>
                <Box component="td">{g.players}</Box>
                <Box component="td">{g.bets}</Box>
                <Box component="td">{usd(g.turnoverUsd)}</Box>
                <Box component="td" sx={{ fontWeight: 800, color: g.netUsd >= 0 ? `${neonGreen} !important` : '#ff6b7a !important' }}>{usd(g.netUsd)}</Box>
                <Box component="td" sx={{ fontWeight: 800, color: g.openLiabilityUsd > 0 ? `${neonGold} !important` : 'inherit' }}>{usd(g.openLiabilityUsd)}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Live bet feed (all games) */}
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, mb: 1 }}>Live bet feed</Typography>
      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, mb: 2.5, overflow: 'hidden' }}>
        {recent.length === 0 ? (
          <Typography sx={{ p: 2, fontSize: '0.8rem', color: 'text.secondary' }}>No bets yet.</Typography>
        ) : (
          <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
            {recent.map(b => {
              const summary = b.selections.length
                ? b.selections.map(s => `${s.label} — ${optLabel(s.marketKey, s.outcomeName, s.point)}`).join('  ·  ')
                : (b.details || b.gameName);
              return (
                <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.85, borderBottom: `1px solid ${darkBorder}` }}>
                  <Typography sx={{ fontSize: '0.64rem', color: 'text.disabled', width: 58, flexShrink: 0 }}>{clockTime(b.placedAt)}</Typography>
                  <Chip size="small" label={b.gameName} sx={{ height: 18, fontSize: '0.58rem', fontWeight: 700, background: '#ffffff10', color: 'text.secondary', maxWidth: 110, flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.74rem', fontWeight: 700 }} noWrap>{b.username || b.userEmail || 'user'}</Typography>
                    <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary' }} noWrap>{summary}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{usd(b.stakeUsd)}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: STATUS_COLOR[b.status] ?? 'text.secondary' }}>
                      {b.status}{b.multiplier ? ` · ${b.multiplier.toFixed(2)}×` : ''}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Live-sports per-option exposure + controls */}
      <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, mb: 1 }}>Live sports — exposure by option</Typography>
      {byEvent.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ color: 'text.secondary' }}>No open live-sports bets right now.</Typography>
        </Box>
      ) : byEvent.map(ev => {
        const maxLiab = Math.max(...ev.rows.map(r => r.liabilityUsd));
        const ctrl = events[ev.eventId];
        const suspended = !!ctrl?.suspended;
        return (
          <Box key={ev.eventId} sx={{ background: darkCard, border: `1px solid ${suspended ? '#ff4757' : darkBorder}`, borderRadius: 2, mb: 1.5, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderBottom: `1px solid ${darkBorder}` }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', flex: 1 }} noWrap>{ev.label}</Typography>
              {suspended && <Chip size="small" label="SUSPENDED" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, background: '#ff475722', color: '#ff4757' }} />}
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>liability {usd(ev.liabilityUsd)}</Typography>
              <Button
                size="small"
                disabled={busyEvent === ev.eventId}
                onClick={() => toggleSuspend(ev.eventId, !suspended)}
                startIcon={suspended ? <PlayArrowIcon sx={{ fontSize: 15 }} /> : <BlockIcon sx={{ fontSize: 15 }} />}
                sx={{ fontSize: '0.68rem', fontWeight: 700, color: suspended ? neonGreen : '#ff6b7a' }}>
                {busyEvent === ev.eventId ? '…' : suspended ? 'Resume' : 'Suspend'}
              </Button>
            </Box>
            {ev.rows.sort((a, b) => b.liabilityUsd - a.liabilityUsd).map((r, i) => {
              const hot = r.liabilityUsd === maxLiab;
              const frac = ev.liabilityUsd > 0 ? (r.liabilityUsd / ev.liabilityUsd) * 100 : 0;
              return (
                <Box key={i} sx={{ px: 1.5, py: 0.9, borderBottom: i < ev.rows.length - 1 ? `1px solid ${darkBorder}` : 'none',
                  background: hot ? `${neonGold}10` : 'transparent' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip size="small" label={MARKET_LABEL[r.marketKey] ?? r.marketKey}
                      sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, background: `${neonGreen}1a`, color: neonGreen }} />
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, flex: 1 }} noWrap>
                      {r.outcomeName}{r.point != null ? ` ${r.point > 0 ? '+' : ''}${r.point}` : ''}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', width: 70, textAlign: 'right' }}>
                      {r.bettors} {r.bettors === 1 ? 'person' : 'people'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', width: 70, textAlign: 'right' }}>{usd(r.stakeUsd)}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: hot ? neonGold : '#fff', width: 80, textAlign: 'right' }}>{usd(r.liabilityUsd)}</Typography>
                  </Box>
                  <Box sx={{ mt: 0.5, height: 4, borderRadius: 2, background: '#ffffff10', overflow: 'hidden' }}>
                    <Box sx={{ width: `${frac}%`, height: '100%', background: hot ? neonGold : neonGreen }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
