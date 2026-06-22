import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SportsbookHeader from '../shell/SportsbookHeader';
import MatchListView, { type ListMatch } from '../shell/MatchListView';
import WeekSelector from '../shell/WeekSelector';
import MatchPreview2D from '../shell/MatchPreview2D';
import RecentResultsPanel from '../shell/RecentResultsPanel';
import { useLeagueSeason } from '../core/useLeagueSeason';
import { simulateHockeyMatch, resolveHockeySelection, type SimulatedHockey } from './hockeySimulation';
import { buildHockeyMarkets } from './hockeyMarkets';
import { getLeague, leaguesBySport } from '../core/leagueDatabase';
import { neonGreen, neonBlue, darkBorder, darkCard } from '../../theme';

interface Props {
  leagueId: string;
  onSelectLeague: (id: string) => void;
}

export default function HockeySection({ leagueId, onSelectLeague }: Props) {
  void onSelectLeague;
  const leagues = leaguesBySport('hockey');
  const league = getLeague(leagueId) ?? leagues[0];
  const [tab, setTab] = useState<'fixtures' | 'results'>('fixtures');

  const season = useLeagueSeason<SimulatedHockey>({
    leagueId,
    sport: 'hockey',
    simulate: (home, away, seed) => simulateHockeyMatch(home, away, seed),
    buildMarkets: (home, away) => {
      const matchId = `${leagueId}-${home.id}-${away.id}`;
      return buildHockeyMarkets(matchId, home, away).markets;
    },
    resolveSelection: (sel, sim) => resolveHockeySelection(sel, sim),
    scoreOf: sim => sim.finalScore,
  });

  const [selectedSlot, setSelectedSlot] = useState<number>(season.currentSlot);
  useEffect(() => {
    setSelectedSlot(prev => (prev < season.currentSlot ? season.currentSlot : prev));
  }, [season.currentSlot]);

  const phaseLabel = season.phase === 'betting' ? 'BETTING' : season.phase === 'live' ? 'LIVE' : 'FINISHED';
  const weekOptions = useMemo(() => season.weeks.map(w => ({
    slot: w.slot,
    week: w.week,
    matchCount: w.matches.length,
    startsAt: w.startsAt,
    state: (w.slot === season.currentSlot ? 'live' : 'upcoming') as 'live' | 'upcoming',
  })), [season.weeks, season.currentSlot]);

  const activeWeek = season.weeks.find(w => w.slot === selectedSlot) ?? season.weeks[0];
  const isLiveWeek = activeWeek?.slot === season.currentSlot;

  const listMatches: ListMatch[] = useMemo(
    () => (activeWeek?.matches ?? []).map(m => ({
      id: m.id,
      home: m.home,
      away: m.away,
      markets: m.markets,
      week: m.week,
      kickoffAt: activeWeek?.startsAt ?? Date.now(),
      closed: isLiveWeek && season.phase !== 'betting',
      status: !isLiveWeek
        ? 'pre' as const
        : season.phase === 'betting' ? 'pre' as const
        : season.phase === 'live'    ? 'live' as const
        : 'final' as const,
      finalScore: m.simulation.finalScore,
      events: m.simulation.events,
    })),
    [activeWeek, isLiveWeek, season.phase],
  );

  const liveProgress = season.phase === 'betting' ? 0
    : season.phase === 'live'    ? 1 - (season.secondsToNextPhase / 180)
    : 1;

  return (
    <>
      <SportsbookHeader
        league={league}
        nextEventLabel={season.phase === 'betting' ? 'PUCK DROPS IN' : season.phase === 'live' ? 'WEEK ENDS IN' : 'NEXT WEEK'}
        nextEventSeconds={season.secondsToNextPhase}
        liveCount={season.phase === 'live' ? (activeWeek?.matches.length ?? 0) : 0}
        totalMatches={activeWeek?.matches.length ?? 0}
      />

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1, borderRadius: 1.5,
        background: alpha(neonBlue, 0.06), border: `1px solid ${alpha(neonBlue, 0.2)}`,
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: neonBlue }} />
        <Typography sx={{ fontSize: '0.72rem', color: neonBlue, fontWeight: 800 }}>
          Season · {league.name} · Week {season.currentWeek} / {season.totalWeeks}
        </Typography>
      </Box>

      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          minHeight: 36, borderBottom: `1px solid ${darkBorder}`,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' },
          '& .Mui-selected': { color: `${neonGreen} !important` },
        }}>
          <Tab label="Fixtures" value="fixtures" />
          <Tab label="Results"  value="results" />
        </Tabs>
        {tab === 'fixtures' && (
          <Box sx={{ p: 1 }}>
            <WeekSelector
              weeks={weekOptions}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
              totalWeeks={season.totalWeeks}
              phaseLabel={isLiveWeek ? phaseLabel : 'UPCOMING'}
              secondsToNextWeek={season.secondsToNextWeek}
            />
            {isLiveWeek && activeWeek && activeWeek.matches[0] && (
              <MatchPreview2D
                sport="hockey"
                home={activeWeek.matches[0].home}
                away={activeWeek.matches[0].away}
                events={activeWeek.matches[0].simulation.events}
                finalScore={activeWeek.matches[0].simulation.finalScore}
                progress={season.phase === 'betting' ? 0 : season.phase === 'live'
                  ? 1 - (season.secondsToNextPhase / 180)
                  : 1}
                phaseLabel={phaseLabel}
              />
            )}
            <MatchListView
              sport="hockey"
              matches={listMatches}
              leagueName={league.name}
              weekLabel={`Week ${activeWeek?.week ?? ''} · ${isLiveWeek ? phaseLabel : 'pre-booking'}`}
              marketTabs={['1X2', 'DOUBLE_CHANCE', 'OVER_UNDER']}
              liveProgress={liveProgress}
            />
          </Box>
        )}
        {tab === 'results' && (
          <Box sx={{ p: 1 }}>
            <RecentResultsPanel sport="hockey" fixedLeagueId={leagueId} limit={40} />
          </Box>
        )}
      </Box>
    </>
  );
}
