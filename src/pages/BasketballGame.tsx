import VirtualTeamSportsScreen from '../components/virtual/VirtualTeamSportsScreen';

const TEAM_POOL = [
  { name: 'Lakers',   color: '#fbbf24' },
  { name: 'Celtics',  color: '#22c55e' },
  { name: 'Warriors', color: '#3b82f6' },
  { name: 'Heat',     color: '#ef4444' },
  { name: 'Bulls',    color: '#dc2626' },
  { name: 'Nets',     color: '#a3a3a3' },
];

export default function BasketballGame() {
  return (
    <VirtualTeamSportsScreen
      sport="basketball"
      sportLabel="Basketball"
      hero={{
        title: 'Virtual Basketball · 3-minute sessions',
        tagline: 'High-scoring games every session. Bet on winner, totals or spread before tip-off.',
      }}
      teamPool={TEAM_POOL}
      hasDraw={false}
      generateFinalScore={() => ({
        home: 95 + Math.floor(Math.random() * 35),
        away: 95 + Math.floor(Math.random() * 35),
      })}
      liveScoreFromProgress={(final, p) => ({
        home: Math.floor(final.home * Math.min(1, p)),
        away: Math.floor(final.away * Math.min(1, p)),
      })}
      matchClockLabel={(phase, progress) => {
        if (phase === 'betting') return 'Tip-off soon';
        if (phase === 'result') return 'Q4 · 0:00';
        const quarter = Math.min(4, Math.floor(progress * 4) + 1);
        const inQ = (progress * 4) % 1;
        const m = Math.floor((1 - inQ) * 12);
        const s = Math.floor(((1 - inQ) * 12 * 60) % 60);
        return `Q${quarter} · ${m}:${s.toString().padStart(2, '0')}`;
      }}
      buildMarkets={(homeOdds, awayOdds) => [
        { key: 'home',    label: 'Home',        odds: homeOdds },
        { key: 'away',    label: 'Away',        odds: awayOdds },
        { key: 'O210',    label: 'Over 210',    odds: 1.9 + Math.random() * 0.3 },
        { key: 'U210',    label: 'Under 210',   odds: 1.9 + Math.random() * 0.3 },
      ]}
      evaluateBet={(key, score) => {
        if (key === 'home') return score.home > score.away;
        if (key === 'away') return score.away > score.home;
        if (key === 'O210') return score.home + score.away > 210;
        if (key === 'U210') return score.home + score.away < 210;
        return false;
      }}
      timing={{ betting: 60, live: 90, result: 30 }}
    />
  );
}
