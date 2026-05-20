import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SportsbookHeader from '../shell/SportsbookHeader';
import MatchListView, { type ListMatch } from '../shell/MatchListView';
import WeekSelector from '../shell/WeekSelector';
import MatchPreview2D from '../shell/MatchPreview2D';
import LeagueTable from './LeagueTable';
import RecentResultsPanel from '../shell/RecentResultsPanel';
import { useLeagueSeason } from '../core/useLeagueSeason';
import { simulateSoccerMatch, resolveSoccerSelection, type SimulatedMatch } from './soccerSimulation';
import { buildSoccerMarkets } from './soccerMarkets';
import { getLeague, leaguesBySport } from '../core/leagueDatabase';
import { neonGreen, darkBorder, darkCard } from '../../theme';

interface SoccerSectionProps {
  leagueId: string;
  onSelectLeague: (id: string) => void;
}

export default function SoccerSection({ leagueId, onSelectLeague }: SoccerSectionProps) {
  void onSelectLeague;
  const leagues = leaguesBySport('soccer');
  const league = getLeague(leagueId) ?? leagues[0];
  const [tab, setTab] = useState<'fixtures' | 'standings' | 'results'>('fixtures');

  const season = useLeagueSeason<SimulatedMatch>({
    leagueId,
    sport: 'soccer',
    simulate: (home, away, seed) => simulateSoccerMatch(home, away, seed),
    buildMarkets: (home, away) => {
      const matchId = `${leagueId}-${home.id}-${away.id}`;
      return buildSoccerMarkets(matchId, home, away).markets;
    },
    resolveSelection: (sel, sim) => resolveSoccerSelection(sel, sim),
    scoreOf: sim => sim.finalScore,
  });

  const [selectedWeek, setSelectedWeek] = useState<number>(season.currentWeek);
  // Snap to the live week when it changes, unless the user has chosen an
  // upcoming week (in which case we leave them on their pick).
  useEffect(() => {
    setSelectedWeek(prev => {
      if (prev === season.currentWeek - 1) return season.currentWeek; // advance one
      if (prev < season.currentWeek) return season.currentWeek;
      return prev;
    });
  }, [season.currentWeek]);

  const phaseLabel = season.phase === 'betting' ? 'BETTING' : season.phase === 'live' ? 'LIVE' : 'FINISHED';
  const weekOptions = useMemo(() => season.weeks.map(w => ({
    week: w.week,
    matchCount: w.matches.length,
    startsAt: w.startsAt,
    state: (w.week === season.currentWeek ? 'live' : 'upcoming') as 'live' | 'upcoming',
  })), [season.weeks, season.currentWeek]);

  const activeWeek = season.weeks.find(w => w.week === selectedWeek) ?? season.weeks[0];
  const isLiveWeek = activeWeek?.week === season.currentWeek;

  const listMatches: ListMatch[] = useMemo(
    () => (activeWeek?.matches ?? []).map(m => ({
      id: m.id,
      home: m.home,
      away: m.away,
      markets: m.markets,
      week: m.week,
      kickoffAt: activeWeek?.startsAt ?? Date.now(),
      // Once the week's in progress (live/finished), don't accept new bets
      // on its markets — show as closed for clarity.
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
        nextEventLabel={season.phase === 'betting' ? 'NEXT KICK-OFF' : season.phase === 'live' ? 'WEEK ENDS IN' : 'NEXT WEEK'}
        nextEventSeconds={season.secondsToNextPhase}
        liveCount={season.phase === 'live' ? (activeWeek?.matches.length ?? 0) : 0}
        totalMatches={activeWeek?.matches.length ?? 0}
      />

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1, borderRadius: 1.5,
        background: alpha(neonGreen, 0.06), border: `1px solid ${alpha(neonGreen, 0.2)}`,
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: neonGreen }} />
        <Typography sx={{ fontSize: '0.72rem', color: neonGreen, fontWeight: 800 }}>
          Season · {league.name} · Week {season.currentWeek} / {season.totalWeeks}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {league.name} runs a full {season.totalWeeks}-week season · home & away
        </Typography>
      </Box>

      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36, borderBottom: `1px solid ${darkBorder}`,
            '& .MuiTab-root': { minHeight: 36, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' },
            '& .Mui-selected': { color: `${neonGreen} !important` },
          }}
        >
          <Tab label="Fixtures" value="fixtures" />
          <Tab label="Standings" value="standings" />
          <Tab label="Results"  value="results" />
        </Tabs>

        {tab === 'fixtures' && (
          <Box sx={{ p: 1 }}>
            <WeekSelector
              weeks={weekOptions}
              selectedWeek={selectedWeek}
              onSelect={setSelectedWeek}
              totalWeeks={season.totalWeeks}
              phaseLabel={isLiveWeek ? phaseLabel : 'UPCOMING'}
              secondsToNextWeek={season.secondsToNextWeek}
            />
            {isLiveWeek && activeWeek && activeWeek.matches[0] && (
              <MatchPreview2D
                sport="soccer"
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
              sport="soccer"
              matches={listMatches}
              leagueName={league.name}
              weekLabel={`Week ${selectedWeek} · ${isLiveWeek ? phaseLabel : 'pre-booking'}`}
              liveProgress={liveProgress}
            />
          </Box>
        )}
        {tab === 'standings' && (
          <Box sx={{ p: 1 }}>
            <LeagueTable leagueId={leagueId} highlightTeamIds={[]} />
          </Box>
        )}
        {tab === 'results' && (
          <Box sx={{ p: 1 }}>
            <RecentResultsPanel sport="soccer" fixedLeagueId={leagueId} limit={40} />
          </Box>
        )}
      </Box>
    </>
  );
}
