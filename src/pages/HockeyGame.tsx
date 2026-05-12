import VirtualTeamSportsScreen from '../components/virtual/VirtualTeamSportsScreen';

const TEAM_POOL = [
  { name: 'Maple Leafs', color: '#3b82f6' },
  { name: 'Penguins',    color: '#f59e0b' },
  { name: 'Avalanche',   color: '#7c3aed' },
  { name: 'Rangers',     color: '#ef4444' },
  { name: 'Lightning',   color: '#0ea5e9' },
  { name: 'Bruins',      color: '#f97316' },
];

export default function HockeyGame() {
  return (
    <VirtualTeamSportsScreen
      sport="hockey"
      sportLabel="Ice Hockey"
      hero={{
        title: 'Virtual Ice Hockey · 3-minute sessions',
        tagline: 'Fast-paced periods with money line and totals markets. Place bets between face-offs.',
      }}
      teamPool={TEAM_POOL}
      hasDraw
      generateFinalScore={() => ({
        home: Math.floor(Math.random() * 6),
        away: Math.floor(Math.random() * 6),
      })}
      liveScoreFromProgress={(final, p) => ({
        home: Math.min(final.home, Math.floor(final.home * Math.min(1, p * 1.05))),
        away: Math.min(final.away, Math.floor(final.away * Math.min(1, p * 1.05))),
      })}
      matchClockLabel={(phase, progress) => {
        if (phase === 'betting') return 'Face-off soon';
        if (phase === 'result') return 'P3 · 0:00';
        const period = Math.min(3, Math.floor(progress * 3) + 1);
        const inP = (progress * 3) % 1;
        const m = Math.floor((1 - inP) * 20);
        const s = Math.floor(((1 - inP) * 20 * 60) % 60);
        return `P${period} · ${m}:${s.toString().padStart(2, '0')}`;
      }}
      buildMarkets={(homeOdds, awayOdds, drawOdds) => [
        { key: 'home', label: 'Home', odds: homeOdds },
        { key: 'draw', label: 'Tie',  odds: drawOdds ?? 3.6 },
        { key: 'away', label: 'Away', odds: awayOdds },
        { key: 'O5.5',label: 'Over 5.5', odds: 1.95 + Math.random() * 0.3 },
      ]}
      evaluateBet={(key, score) => {
        if (key === 'home') return score.home > score.away;
        if (key === 'away') return score.away > score.home;
        if (key === 'draw') return score.home === score.away;
        if (key === 'O5.5') return score.home + score.away > 5.5;
        return false;
      }}
      timing={{ betting: 60, live: 90, result: 30 }}
    />
  );
}
