import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Grid, Chip, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import BettingControls from '../components/casino/BettingControls';
import SessionStatusBar from '../components/virtual/SessionStatusBar';
import RaceArena, { type RaceRunner } from '../components/virtual/RaceArena';
import NextSessionsList, { type UpcomingSession } from '../components/virtual/NextSessionsList';
import { useVirtualSession, type SessionPhase } from '../components/virtual/useVirtualSession';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';

const HORSE_POOL = [
  { name: 'Thunder',   emoji: '🐎', color: '#3b82f6' },
  { name: 'Lightning', emoji: '🐴', color: '#f59e0b' },
  { name: 'Storm',     emoji: '🏇', color: '#a855f7' },
  { name: 'Wind',      emoji: '🐎', color: '#22c55e' },
  { name: 'Fire',      emoji: '🐴', color: '#ef4444' },
  { name: 'Shadow',    emoji: '🏇', color: '#94a3b8' },
];

const TIMING = { betting: 30, live: 45, result: 15 };

interface PendingBet {
  sessionId: number;
  runnerId: number;
  runnerName: string;
  odds: number;
  amount: number;
}

interface SettledBet extends PendingBet {
  won: boolean;
  payout: number;
  winnerName: string;
}

interface RaceData {
  runners: { id: number; name: string; emoji: string; color: string; odds: number; speed: number }[];
  winnerId: number;
  finalOrder: number[];
}

function generateRaceData(): RaceData {
  const shuffled = [...HORSE_POOL].sort(() => Math.random() - 0.5);
  const runners = shuffled.map((h, i) => ({
    id: i,
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    odds: 1.6 + Math.random() * 5.5,
    speed: 0.8 + Math.random() * 0.5,
  }));
  const finalOrder = [...runners].sort((a, b) => b.speed - a.speed).map(r => r.id);
  return { runners, winnerId: finalOrder[0], finalOrder };
}

export default function HorseRaceGame() {
  const { isAuthenticated, requireAuth } = useAuth();
  const [betAmount, setBetAmount] = useState('0.01');
  const [race, setRace] = useState<RaceData>(() => generateRaceData());
  const [pending, setPending] = useState<PendingBet[]>([]);
  const [history, setHistory] = useState<SettledBet[]>([]);
  const [reminders, setReminders] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState({ total: 0, won: 0, profit: 0 });

  const session = useVirtualSession({
    timing: TIMING,
    onSessionStart: () => setRace(generateRaceData()),
    onPhaseChange: (phase, sessionId) => {
      if (phase === 'result') settleSession(sessionId);
    },
  });

  const runners: RaceRunner[] = useMemo(() => {
    const isLive = session.phase === 'live';
    const isResult = session.phase === 'result';
    return race.runners.map((r) => {
      let progress = 0;
      let finished = false;
      let position: number | undefined;
      if (isLive) {
        const noise = ((Math.sin(r.id * 13.7 + session.totalElapsed * 1.5) + 1) / 2) * 6;
        const linear = session.liveProgress * r.speed * 100 + noise;
        progress = Math.min(99.5, Math.max(0, linear));
      } else if (isResult) {
        progress = 100;
        finished = true;
        position = race.finalOrder.indexOf(r.id) + 1;
      } else {
        progress = 0;
      }
      return {
        id: r.id,
        name: r.name,
        emoji: r.emoji,
        color: r.color,
        progress,
        finished,
        position,
      };
    });
  }, [race, session.phase, session.liveProgress, session.totalElapsed]);

  const winner = useMemo(() => {
    if (session.phase !== 'result') return null;
    const r = runners.find(x => x.id === race.winnerId);
    return r ?? null;
  }, [runners, race.winnerId, session.phase]);

  const upcomingSessions: UpcomingSession[] = useMemo(() => {
    const sessionDuration = TIMING.betting + TIMING.live + TIMING.result;
    const phaseOrder: SessionPhase[] = ['betting', 'live', 'result'];
    const idx = phaseOrder.indexOf(session.phase);
    let remaining = session.phaseRemaining;
    for (let i = idx + 1; i < phaseOrder.length; i++) {
      remaining += TIMING[phaseOrder[i]];
    }
    return Array.from({ length: 4 }, (_, i) => ({
      id: session.sessionId + i + 1,
      startsInSeconds: remaining + i * sessionDuration,
      matches: HORSE_POOL.slice(0, 3).map(h => ({ home: h.name, away: '🏁' })),
      highlight: i === 0,
    }));
  }, [session.sessionId, session.phase, session.phaseRemaining]);

  const placeBet = useCallback((runnerId: number) => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    if (session.phase !== 'betting') return;
    const r = race.runners.find(x => x.id === runnerId);
    if (!r) return;
    const amt = Math.max(0.0001, parseFloat(betAmount) || 0.01);
    setPending(prev => {
      if (prev.some(b => b.sessionId === session.sessionId && b.runnerId === runnerId)) return prev;
      return [...prev, { sessionId: session.sessionId, runnerId, runnerName: r.name, odds: r.odds, amount: amt }];
    });
  }, [isAuthenticated, requireAuth, session.phase, session.sessionId, race.runners, betAmount]);

  useEffect(() => {
    if (!isAuthenticated && pending.length > 0) {
      setPending([]);
    }
  }, [isAuthenticated, pending.length]);

  function settleSession(sessionId: number) {
    setPending(prev => {
      const toSettle = prev.filter(b => b.sessionId === sessionId);
      if (toSettle.length === 0) return prev;
      const winnerRunner = race.runners.find(r => r.id === race.winnerId);
      const winnerName = winnerRunner?.name ?? '—';
      const settled: SettledBet[] = [];
      let totalProfit = 0;
      let totalWon = 0;
      for (const bet of toSettle) {
        const won = bet.runnerId === race.winnerId;
        const payout = won ? bet.amount * bet.odds - bet.amount : -bet.amount;
        if (won) totalWon += 1;
        totalProfit += payout;
        settled.push({ ...bet, won, payout, winnerName });
      }
      setHistory(prevH => [...settled.reverse(), ...prevH].slice(0, 20));
      setStats(prevS => ({
        total: prevS.total + settled.length,
        won: prevS.won + totalWon,
        profit: prevS.profit + totalProfit,
      }));
      return prev.filter(b => b.sessionId !== sessionId);
    });
  }

  function toggleReminder(id: number) {
    setReminders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const profitColor = stats.profit > 0 ? neonGreen : stats.profit < 0 ? '#ff6b7a' : 'text.primary';
  const winRate = stats.total > 0 ? `${Math.round((stats.won / stats.total) * 100)}%` : '-';
  const winRateColor = stats.won === 0 ? neonBlue : neonGold;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, pb: { xs: 10, md: 2 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha('#f97316', 0.08)} 0%, ${alpha(neonGold, 0.06)} 100%)`,
          border: `1px solid ${darkBorder}`,
        }}
      >
        <Typography sx={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 800, letterSpacing: '0.12em', mb: 0.5 }}>
          VIRTUAL · HORSE RACING
        </Typography>
        <Typography sx={{ fontSize: { xs: '1.4rem', md: '1.7rem' }, fontWeight: 900, lineHeight: 1.15, mb: 0.5 }}>
          Virtual Horse Racing · 90-second meetings
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 540 }}>
          A new race starts every 90 seconds. Place win bets at the gate, watch the live action, settle on photo finish.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2 }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <SessionStatusBar state={session} sportLabel="Horse Racing" />

          <RaceArena
            runners={runners}
            phase={session.phase}
            winner={winner}
            sessionId={session.sessionId}
          />

          <Grid container spacing={1.25}>
            {[
              { label: 'Bets Placed', value: stats.total, color: neonBlue },
              { label: 'Won', value: stats.won, color: neonGreen },
              { label: 'Win Rate', value: winRate, color: winRateColor },
              { label: 'Net Profit', value: `${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(4)}`, color: profitColor },
            ].map((s) => (
              <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.25, borderRadius: 2, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}` }}>
                  <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: s.color }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {s.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                LIVE SESSION · RUNNERS
              </Typography>
              <Chip
                label={session.phase === 'betting' ? `${race.runners.length} runners` : 'Betting closed'}
                size="small"
                sx={{
                  height: 20, fontSize: '0.62rem', fontWeight: 700,
                  background: session.phase === 'betting' ? alpha(neonGreen, 0.15) : alpha('#ff4757', 0.15),
                  color: session.phase === 'betting' ? neonGreen : '#ff4757',
                }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1 }}>
              {race.runners.map(r => {
                const picked = pending.some(b => b.sessionId === session.sessionId && b.runnerId === r.id);
                const disabled = session.phase !== 'betting';
                return (
                  <Button
                    key={r.id}
                    disabled={disabled}
                    onClick={() => placeBet(r.id)}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      background: picked ? alpha(neonGreen, 0.12) : darkCard,
                      border: `1px solid ${picked ? alpha(neonGreen, 0.5) : darkBorder}`,
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: alpha(neonGreen, 0.5),
                        background: picked ? alpha(neonGreen, 0.16) : alpha(neonGreen, 0.06),
                      },
                      '&.Mui-disabled': {
                        background: alpha('#fff', 0.02),
                        color: 'text.disabled',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                      <Box sx={{ fontSize: '1rem' }}>{r.emoji}</Box>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: r.color }}>
                        {r.name}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>WIN</Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 900, color: picked ? neonGreen : neonGold }}>
                        {r.odds.toFixed(2)}
                      </Typography>
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </Box>

          <NextSessionsList
            sessions={upcomingSessions}
            reminders={reminders}
            onToggleReminder={toggleReminder}
            sportLabel="Horse Racing"
          />

          {history.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em', mb: 1 }}>
                RECENT RESULTS
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {history.slice(0, 6).map((h, i) => (
                  <motion.div key={`${h.sessionId}-${h.runnerId}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      py: 0.75, px: 1, borderRadius: 1.5,
                      background: alpha(h.won ? neonGreen : '#ff4757', 0.06),
                      border: `1px solid ${alpha(h.won ? neonGreen : '#ff4757', 0.2)}`,
                    }}>
                      <Chip
                        label={h.won ? 'WON' : 'LOST'}
                        size="small"
                        sx={{
                          height: 18, fontSize: '0.6rem', fontWeight: 800,
                          background: h.won ? alpha(neonGreen, 0.2) : alpha('#ff4757', 0.2),
                          color: h.won ? neonGreen : '#ff4757',
                          minWidth: 50,
                        }}
                      />
                      <Typography sx={{ fontSize: '0.72rem', flex: 1 }}>
                        Bet: {h.runnerName} · Winner: 🏆 {h.winnerName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: h.won ? neonGreen : '#ff6b7a', fontVariantNumeric: 'tabular-nums' }}>
                        {h.won ? '+' : ''}{h.payout.toFixed(4)}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <BettingControls
            betAmount={betAmount}
            onBetChange={setBetAmount}
            onBet={() => { if (!isAuthenticated) requireAuth(); }}
            isRunning={false}
            betLabel={isAuthenticated ? 'Tap a horse to bet' : 'Sign in to bet'}
          />

          <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em' }}>
                BET SLIP
              </Typography>
              <Chip
                label={`${pending.length} pending`}
                size="small"
                sx={{
                  height: 18, fontSize: '0.6rem', fontWeight: 700,
                  background: alpha(neonGreen, 0.15),
                  color: neonGreen,
                }}
              />
            </Box>
            {pending.length === 0 ? (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', textAlign: 'center', py: 2 }}>
                Pick a horse from the runners list to add it here.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 240, overflowY: 'auto', pr: 0.5 }}>
                {pending.map((b) => (
                  <Box key={b.runnerId} sx={{
                    p: 0.9, borderRadius: 1.5,
                    background: alpha(neonGreen, 0.05),
                    border: `1px solid ${alpha(neonGreen, 0.2)}`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: neonGreen }}>
                        WIN · {b.runnerName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: neonGold }}>
                        @ {b.odds.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                        Stake {b.amount.toFixed(4)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: neonGreen }}>
                        Win {(b.amount * b.odds).toFixed(4)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
