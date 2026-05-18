import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import SportsbookHeader from '../shell/SportsbookHeader';
import SoccerMatchCard from './SoccerMatchCard';
import SoccerFeaturedMatch from './SoccerFeaturedMatch';
import LeagueTable from './LeagueTable';
import RecentResultsPanel from '../shell/RecentResultsPanel';
import { useSoccerSchedule } from './useSoccerSchedule';
import { getLeague, leaguesBySport } from '../core/leagueDatabase';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';

interface SoccerSectionProps {
  leagueId: string;
  onSelectLeague: (id: string) => void;
}

export default function SoccerSection({ leagueId, onSelectLeague }: SoccerSectionProps) {
  const soccerLeagues = leaguesBySport('soccer');
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'fixtures' | 'standings' | 'results'>('fixtures');
  /** 0 = live session, 1 = next, 2 = after-next. Pre-booking lets users place
   *  bets on any of the three. */
  const [sessionTab, setSessionTab] = useState<number>(0);

  const league = getLeague(leagueId) ?? soccerLeagues[0];
  const schedule = useSoccerSchedule({ leagueId, matchesPerRound: 10 });

  // Build the unified session list — index 0 is always the live round.
  const sessions = useMemo(() => [
    {
      sessionId: schedule.round,
      state: 'live' as const,
      matches: schedule.matches,
      secondsUntilLive: 0,
    },
    ...schedule.upcomingSessions,
  ], [schedule.round, schedule.matches, schedule.upcomingSessions]);

  const activeSession = sessions[Math.min(sessionTab, sessions.length - 1)] ?? sessions[0];
  const activeMatches = activeSession?.matches ?? [];

  useEffect(() => {
    if (!activeMatches.length) return;
    if (!activeMatches.find(m => m.id === featuredId)) {
      setFeaturedId(activeMatches[0].id);
    }
  }, [activeMatches, featuredId]);

  const featured = activeMatches.find(m => m.id === featuredId) ?? activeMatches[0] ?? null;
  const featuredTeamIds = useMemo(() => featured ? [featured.home.id, featured.away.id] : [], [featured]);

  const phaseLabel = schedule.phase === 'betting'
    ? 'NEXT KICK-OFF'
    : schedule.phase === 'live'
      ? 'ROUND ENDS IN'
      : 'NEXT ROUND';

  // Suppress unused-var warning for onSelectLeague (it's used by the parent layout).
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
        background: alpha(neonGold, 0.06),
        border: `1px solid ${alpha(neonGold, 0.2)}`,
      }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: neonGold }} />
        <Typography sx={{ fontSize: '0.72rem', color: neonGold, fontWeight: 800 }}>
          Round {schedule.round} · {league.name}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {schedule.matches.length} fixtures · next round in {schedule.nextRoundIn}s
        </Typography>
      </Box>

      {/* Session selector — Live + pre-bookable future sessions. */}
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
        {sessions.map((s, i) => {
          const active = i === sessionTab;
          const isLive = s.state === 'live';
          const tone = isLive ? '#ff4757' : neonGold;
          return (
            <Box
              key={s.sessionId}
              onClick={() => setSessionTab(i)}
              sx={{
                px: 1.5, py: 0.75, borderRadius: 1.5, cursor: 'pointer',
                background: active ? alpha(tone, 0.16) : alpha('#fff', 0.04),
                border: `1px solid ${active ? alpha(tone, 0.6) : darkBorder}`,
                minWidth: 140, flexShrink: 0,
              }}
            >
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: tone, letterSpacing: '0.1em' }}>
                {isLive ? '● LIVE' : i === 1 ? 'NEXT' : 'AFTER NEXT'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, lineHeight: 1.1 }}>
                Session {s.sessionId}
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
                {isLive
                  ? `${schedule.matches.length} fixtures live`
                  : `Kick-off in ${s.secondsUntilLive}s`}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Animated match window — full width on top */}
      {featured ? (
        <SoccerFeaturedMatch match={featured} />
      ) : (
        <Box sx={{ p: 3, borderRadius: 2, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>Waiting for fixtures…</Typography>
        </Box>
      )}

      {/* Fixtures — full width below the animation */}
      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36,
            borderBottom: `1px solid ${darkBorder}`,
            '& .MuiTab-root': { minHeight: 36, fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' },
            '& .Mui-selected': { color: `${neonGreen} !important` },
          }}
        >
          <Tab label={`Fixtures (${schedule.matches.length})`} value="fixtures" />
          <Tab label="Standings" value="standings" />
          <Tab label="Results"   value="results" />
        </Tabs>
        {tab === 'fixtures' && (
          <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.75 }}>
            {activeMatches.map(m => (
              <SoccerMatchCard
                key={m.id}
                match={m}
                leagueId={leagueId}
                onFeature={setFeaturedId}
                featured={m.id === featured?.id}
              />
            ))}
          </Box>
        )}
        {tab === 'standings' && (
          <Box sx={{ p: 1 }}>
            <LeagueTable leagueId={leagueId} highlightTeamIds={featuredTeamIds} />
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
