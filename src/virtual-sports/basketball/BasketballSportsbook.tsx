import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SportsbookHeader from '../shell/SportsbookHeader';
import MatchListView, { type ListMatch } from '../shell/MatchListView';
import WeekSelector from '../shell/WeekSelector';
import RecentResultsPanel from '../shell/RecentResultsPanel';
import { useLeagueSeason } from '../core/useLeagueSeason';
import { simulateBasketballMatch, resolveBasketballSelection, type SimulatedBasketball } from './basketballSimulation';
import { buildBasketballMarkets } from './basketballMarkets';
import { getLeague, leaguesBySport } from '../core/leagueDatabase';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';

interface Props {
  leagueId: string;
  onSelectLeague: (id: string) => void;
}

export default function BasketballSection({ leagueId, onSelectLeague }: Props) {
  void onSelectLeague;
  const leagues = leaguesBySport('basketball');
  const league = getLeague(leagueId) ?? leagues[0];
  const [tab, setTab] = useState<'fixtures' | 'results'>('fixtures');

  const season = useLeagueSeason<SimulatedBasketball>({
    leagueId,
    sport: 'basketball',
    simulate: (home, away, seed) => simulateBasketballMatch(home, away, seed),
    buildMarkets: (home, away) => {
      const matchId = `${leagueId}-${home.id}-${away.id}`;
      return buildBasketballMarkets(matchId, home, away).markets;
    },
    resolveSelection: (sel, sim) => resolveBasketballSelection(sel, sim),
    scoreOf: sim => sim.finalScore,
  });

  const [selectedWeek, setSelectedWeek] = useState<number>(season.currentWeek);
  useEffect(() => {
    setSelectedWeek(prev => (prev < season.currentWeek ? season.currentWeek : prev));
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
      closed: isLiveWeek && season.phase !== 'betting',
    })),
    [activeWeek, isLiveWeek, season.phase],
  );

  return (
    <>
      <SportsbookHeader
        league={league}
        nextEventLabel={season.phase === 'betting' ? 'NEXT TIP-OFF' : season.phase === 'live' ? 'WEEK ENDS IN' : 'NEXT WEEK'}
        nextEventSeconds={season.secondsToNextPhase}
        liveCount={season.phase === 'live' ? (activeWeek?.matches.length ?? 0) : 0}
        totalMatches={activeWeek?.matches.length ?? 0}
      />

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1, borderRadius: 1.5,
        background: alpha(neonGold, 0.06), border: `1px solid ${alpha(neonGold, 0.2)}`,
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: neonGold }} />
        <Typography sx={{ fontSize: '0.72rem', color: neonGold, fontWeight: 800 }}>
          Season · {league.name} · Week {season.currentWeek} / {season.totalWeeks}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          Home & away schedule · {season.totalWeeks} weeks
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
              selectedWeek={selectedWeek}
              onSelect={setSelectedWeek}
              totalWeeks={season.totalWeeks}
              phaseLabel={isLiveWeek ? phaseLabel : 'UPCOMING'}
              secondsToNextWeek={season.secondsToNextWeek}
            />
            <MatchListView
              sport="basketball"
              matches={listMatches}
              leagueName={league.name}
              weekLabel={`Week ${selectedWeek} · ${isLiveWeek ? phaseLabel : 'pre-booking'}`}
              marketTabs={['WINNER', 'TOTAL_POINTS', 'SPREAD']}
            />
          </Box>
        )}
        {tab === 'results' && (
          <Box sx={{ p: 1 }}>
            <RecentResultsPanel sport="basketball" fixedLeagueId={leagueId} limit={40} />
          </Box>
        )}
      </Box>
    </>
  );
}
