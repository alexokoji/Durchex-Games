import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SportsbookLayout from './shell/SportsbookLayout';
import SoccerSection from './soccer/SoccerSportsbook';
import BasketballSection from './basketball/BasketballSportsbook';
import HockeySection from './hockey/HockeySportsbook';
import HorseRacingSection from './horse-racing/HorseRacingSportsbook';
import type { SportKey } from './core/types';

const DEFAULT_LEAGUE: Record<SportKey, string> = {
  soccer:      'epl',
  basketball:  'nba',
  hockey:      'nhl',
  horseracing: 'turf',
};

const SPORTS: ReadonlyArray<SportKey> = ['soccer', 'basketball', 'hockey', 'horseracing'];

function isValidSport(s: string | undefined): s is SportKey {
  return !!s && (SPORTS as readonly string[]).includes(s);
}

interface VirtualSportsbookProps {
  initialSport?: SportKey;
}

export default function VirtualSportsbook({ initialSport }: VirtualSportsbookProps) {
  const { sport: sportParam } = useParams<{ sport?: string }>();
  const navigate = useNavigate();

  const urlSport = isValidSport(sportParam) ? sportParam : null;
  const [sport, setSportState] = useState<SportKey>(urlSport ?? initialSport ?? 'soccer');
  const [leagueIds, setLeagueIds] = useState<Record<SportKey, string>>(DEFAULT_LEAGUE);

  // Keep state in sync with URL changes (back/forward navigation).
  useEffect(() => {
    if (urlSport && urlSport !== sport) {
      setSportState(urlSport);
    }
  }, [urlSport, sport]);

  const setSport = useCallback((next: SportKey) => {
    setSportState(next);
    // Mirror to URL so deep linking and back-button work, but keep history clean.
    navigate(`/virtual/${next}`, { replace: true });
  }, [navigate]);

  const setLeagueForActive = useCallback((leagueId: string) => {
    setLeagueIds(prev => ({ ...prev, [sport]: leagueId }));
  }, [sport]);

  const activeLeagueId = leagueIds[sport];

  return (
    <SportsbookLayout
      sport={sport}
      activeLeagueId={activeLeagueId}
      onSelectLeague={setLeagueForActive}
      onSelectSport={setSport}
    >
      {sport === 'soccer' && (
        <SoccerSection leagueId={activeLeagueId} onSelectLeague={setLeagueForActive} />
      )}
      {sport === 'basketball' && (
        <BasketballSection leagueId={activeLeagueId} onSelectLeague={setLeagueForActive} />
      )}
      {sport === 'hockey' && (
        <HockeySection leagueId={activeLeagueId} onSelectLeague={setLeagueForActive} />
      )}
      {sport === 'horseracing' && (
        <HorseRacingSection leagueId={activeLeagueId} onSelectLeague={setLeagueForActive} />
      )}
    </SportsbookLayout>
  );
}
