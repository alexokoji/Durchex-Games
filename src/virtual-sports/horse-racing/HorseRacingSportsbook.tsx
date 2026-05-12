import { useEffect, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SportsbookHeader from '../shell/SportsbookHeader';
import HorseRaceCard from './HorseRaceCard';
import HorseRaceFeatured from './HorseRaceFeatured';
import { useHorseRacingSchedule } from './useHorseRacingSchedule';
import { getLeague } from '../core/leagueDatabase';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';
import type { RaceType } from './horseDatabase';

interface Props {
  leagueId: string;
  onSelectLeague: (id: string) => void;
}

export default function HorseRacingSection({ leagueId, onSelectLeague }: Props) {
  const league = getLeague(leagueId) ?? getLeague('turf')!;
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | RaceType>('all');

  const schedule = useHorseRacingSchedule({ racesPerRound: 10 });

  useEffect(() => {
    if (!schedule.races.length) return;
    if (!schedule.races.find(r => r.id === featuredId)) {
      setFeaturedId(schedule.races[0].id);
    }
  }, [schedule.races, featuredId]);

  const featured = schedule.races.find(r => r.id === featuredId) ?? schedule.races[0] ?? null;
  const filtered = filter === 'all' ? schedule.races : schedule.races.filter(r => r.raceType === filter);
  const phaseLabel = schedule.phase === 'betting' ? 'GATES OPEN IN' : schedule.phase === 'live' ? 'RACES IN PROGRESS' : 'NEXT CARD';

  void onSelectLeague;

  return (
    <>
      <SportsbookHeader
        league={league}
        nextEventLabel={phaseLabel}
        nextEventSeconds={schedule.secondsToNextPhase}
        liveCount={schedule.liveCount}
        totalMatches={schedule.races.length}
      />

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1, borderRadius: 1.5,
        background: alpha(neonGold, 0.06), border: `1px solid ${alpha(neonGold, 0.2)}`,
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: neonGold }} />
        <Typography sx={{ fontSize: '0.72rem', color: neonGold, fontWeight: 800 }}>
          Card {schedule.round} · 10 races scheduled
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          Next card in {schedule.nextRoundIn}s
        </Typography>
      </Box>

      {featured ? <HorseRaceFeatured race={featured} /> : (
        <Box sx={{ p: 3, borderRadius: 2, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Loading races…</Typography>
        </Box>
      )}

      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          sx={{
            minHeight: 36, borderBottom: `1px solid ${darkBorder}`,
            '& .MuiTab-root': { minHeight: 36, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' },
            '& .Mui-selected': { color: `${neonGreen} !important` },
          }}
        >
          <Tab label={`All (${schedule.races.length})`} value="all" />
          <Tab label="Sprint" value="sprint" />
          <Tab label="Mile"   value="medium" />
          <Tab label="Distance" value="long" />
        </Tabs>
        <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.75 }}>
          {filtered.map(r => (
            <HorseRaceCard key={r.id} race={r} onFeature={setFeaturedId} featured={r.id === featured?.id} />
          ))}
        </Box>
      </Box>
    </>
  );
}
