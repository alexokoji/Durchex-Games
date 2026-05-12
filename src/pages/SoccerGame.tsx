import VirtualTeamSportsScreen from '../components/virtual/VirtualTeamSportsScreen';

const TEAM_POOL = [
  { name: 'City United',  color: '#3b82f6' },
  { name: 'Athletic FC',  color: '#ef4444' },
  { name: 'Royal Star',   color: '#a855f7' },
  { name: 'Phoenix FC',   color: '#f59e0b' },
  { name: 'Dragon United',color: '#22c55e' },
  { name: 'Silver Force', color: '#94a3b8' },
];

export default function SoccerGame() {
  return (
    <VirtualTeamSportsScreen
      sport="soccer"
      sportLabel="Soccer"
      hero={{
        title: 'Virtual Soccer · 3-minute sessions',
        tagline: 'New match every 3 minutes. Bet during the kick-off window, watch live, settle on full time.',
      }}
      teamPool={TEAM_POOL}
      hasDraw
      generateFinalScore={() => ({
        home: Math.floor(Math.random() * 4),
        away: Math.floor(Math.random() * 4),
      })}
      liveScoreFromProgress={(final, p) => ({
        home: Math.min(final.home, Math.floor(final.home * Math.min(1, p * 1.1))),
        away: Math.min(final.away, Math.floor(final.away * Math.min(1, p * 1.1))),
      })}
      matchClockLabel={(phase, progress) => {
        if (phase === 'betting') return 'Kick-off soon';
        if (phase === 'result') return '90:00';
        const mins = Math.min(90, Math.floor(progress * 90));
        return `${mins.toString().padStart(2, '0')}:${Math.floor((progress * 90 * 60) % 60).toString().padStart(2, '0')}`;
      }}
      buildMarkets={(homeOdds, awayOdds, drawOdds) => [
        { key: '1',     label: '1',       odds: homeOdds },
        { key: 'X',     label: 'Draw',    odds: drawOdds ?? 3.0 },
        { key: '2',     label: '2',       odds: awayOdds },
        { key: 'O2.5',  label: 'Over 2.5',odds: 1.85 + Math.random() * 0.4 },
      ]}
      evaluateBet={(key, score) => {
        if (key === '1') return score.home > score.away;
        if (key === 'X') return score.home === score.away;
        if (key === '2') return score.away > score.home;
        if (key === 'O2.5') return score.home + score.away > 2.5;
        return false;
      }}
      timing={{ betting: 60, live: 90, result: 30 }}
    />
  );
}
