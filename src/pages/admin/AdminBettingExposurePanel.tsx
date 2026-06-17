import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Chip, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import { adminApi, type BettingExposureDto, type SelectionExposureDto } from '../../api/admin';

const MARKET_LABEL: Record<string, string> = {
  h2h: '1X2', h2h_3_way: '1X2 (3-way)', totals: 'Over/Under', spreads: 'Handicap',
  double_chance: 'Double Chance', btts: 'BTTS', draw_no_bet: 'Draw No Bet',
};
const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function AdminBettingExposurePanel() {
  const [data, setData] = useState<BettingExposureDto | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setData(await adminApi.bettingExposure()); } catch { /* ignore */ }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  // Group selections by event, biggest-liability event first.
  const byEvent = useMemo(() => {
    const m = new Map<string, { label: string; rows: SelectionExposureDto[]; liabilityUsd: number; stakeUsd: number }>();
    for (const s of data?.selections ?? []) {
      const g = m.get(s.eventId) ?? { label: s.eventLabel, rows: [], liabilityUsd: 0, stakeUsd: 0 };
      g.rows.push(s); g.liabilityUsd += s.liabilityUsd; g.stakeUsd += s.stakeUsd;
      m.set(s.eventId, g);
    }
    return Array.from(m.values()).sort((a, b) => b.liabilityUsd - a.liabilityUsd);
  }, [data]);

  if (loading && !data) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: neonGreen }} /></Box>;

  const totals = data?.totals;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>Betting Exposure</Typography>
        <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} onClick={load} sx={{ color: 'text.secondary' }}>Refresh</Button>
      </Box>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
        Live-sports open bets — what people are backing, how much, and how many people per option.
        Liability = what the house pays out if that pick wins. The biggest-liability option per match is highlighted.
      </Typography>

      {/* KPI tiles */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
        {[
          { label: 'Total at stake', value: usd(totals?.stakeUsd ?? 0), color: neonGreen },
          { label: 'Total liability', value: usd(totals?.liabilityUsd ?? 0), color: neonGold },
          { label: 'Options with action', value: String(totals?.optionCount ?? 0), color: '#fff' },
        ].map(t => (
          <Box key={t.label} sx={{ flex: '1 1 180px', background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 1.5 }}>
            <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', letterSpacing: '0.06em' }}>{t.label.toUpperCase()}</Typography>
            <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: t.color }}>{t.value}</Typography>
          </Box>
        ))}
      </Box>

      {byEvent.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ color: 'text.secondary' }}>No open live-sports bets right now.</Typography>
        </Box>
      ) : byEvent.map(ev => {
        const maxLiab = Math.max(...ev.rows.map(r => r.liabilityUsd));
        return (
          <Box key={ev.label} sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, mb: 1.5, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderBottom: `1px solid ${darkBorder}` }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', flex: 1 }} noWrap>{ev.label}</Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>liability {usd(ev.liabilityUsd)}</Typography>
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
