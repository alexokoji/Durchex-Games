import { useEffect, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SportsbookHeader from '../shell/SportsbookHeader';
import BasketballMatchCard from './BasketballMatchCard';
import BasketballFeaturedMatch from './BasketballFeaturedMatch';
import { useBasketballSchedule } from './useBasketballSchedule';
import { getLeague, leaguesBySport } from '../core/leagueDatabase';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';

interface Props {
  leagueId: string;
  onSelectLeague: (id: string) => void;
}

export default function BasketballSection({ leagueId, onSelectLeague }: Props) {
  const leagues = leaguesBySport('basketball');
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'fixtures'>('fixtures');

  const league = getLeague(leagueId) ?? leagues[0];
  const schedule = useBasketballSchedule({ leagueId, matchesPerRound: 10 });

  useEffect(() => {
    if (!schedule.matches.length) return;
    if (!schedule.matches.find(m => m.id === featuredId)) {
      setFeaturedId(schedule.matches[0].id);
    }
  }, [schedule.matches, featuredId]);

  const featured = schedule.matches.find(m => m.id === featuredId) ?? schedule.matches[0] ?? null;
  const phaseLabel = schedule.phase === 'betting' ? 'NEXT TIP-OFF' : schedule.phase === 'live' ? 'ROUND ENDS IN' : 'NEXT ROUND';

  void onSelectLeague;

  return (
    <>
      <SportsbookHeader
        league={league}
        nextEventLabel={phaseLabel}
        nextEventSeconds={schedule.secondsToNextPhase}
        liveCount={schedule.liveCount}
        totalMatches={schedule.matches.length}
      />

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1, borderRadius: 1.5,
        background: alpha(neonGold, 0.06), border: `1px solid ${alpha(neonGold, 0.2)}`,
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: neonGold }} />
        <Typography sx={{ fontSize: '0.72rem', color: neonGold, fontWeight: 800 }}>
          Round {schedule.round} · {league.name}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {schedule.matches.length} games · next round in {schedule.nextRoundIn}s
        </Typography>
      </Box>

      {featured ? <BasketballFeaturedMatch match={featured} /> : (
        <Box sx={{ p: 3, borderRadius: 2, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Waiting for games…</Typography>
        </Box>
      )}

      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          minHeight: 36, borderBottom: `1px solid ${darkBorder}`,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' },
          '& .Mui-selected': { color: `${neonGreen} !important` },
        }}>
          <Tab label={`Games (${schedule.matches.length})`} value="fixtures" />
        </Tabs>
        <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.75 }}>
          {schedule.matches.map(m => (
            <BasketballMatchCard key={m.id} match={m} leagueId={leagueId} onFeature={setFeaturedId} featured={m.id === featured?.id} />
          ))}
        </Box>
      </Box>
    </>
  );
}
