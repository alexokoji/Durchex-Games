import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, Grid, Chip, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import BettingControls from '../casino/BettingControls';
import SessionStatusBar from './SessionStatusBar';
import MatchArena, { type ArenaSport } from './MatchArena';
import LiveMatchesList, { type LiveMatchRow, type MarketOption } from './LiveMatchesList';
import NextSessionsList, { type UpcomingSession } from './NextSessionsList';
import { useVirtualSession, type SessionPhase } from './useVirtualSession';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';

export interface TeamPair {
  home: string;
  away: string;
  homeColor: string;
  awayColor: string;
}

export interface MatchScore {
  home: number;
  away: number;
}

export interface VirtualTeamSportsScreenProps {
  sport: ArenaSport;
  sportLabel: string;
  hero: { title: string; tagline: string };
  teamPool: { name: string; color: string }[];
  buildMarkets: (homeOdds: number, awayOdds: number, drawOdds: number | null) => MarketOption[];
  evaluateBet: (marketKey: string, score: MatchScore) => boolean;
  generateFinalScore: () => MatchScore;
  liveScoreFromProgress: (final: MatchScore, progress: number) => MatchScore;
  matchClockLabel: (phase: SessionPhase, progress: number) => string | undefined;
  hasDraw: boolean;
  matchesPerSession?: number;
  upcomingSessionsCount?: number;
  timing?: { betting: number; live: number; result: number };
}

interface InternalMatch {
  id: string;
  pair: TeamPair;
  homeOdds: number;
  awayOdds: number;
  drawOdds: number | null;
  finalScore: MatchScore;
  markets: MarketOption[];
}

interface PendingBet {
  matchId: string;
  marketKey: string;
  marketLabel: string;
  odds: number;
  amount: number;
  homeTeam: string;
  awayTeam: string;
  sessionId: number;
}

interface SettledBet extends PendingBet {
  won: boolean;
  payout: number;
  homeScore: number;
  awayScore: number;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickPair(pool: { name: string; color: string }[]): TeamPair {
  const home = randomPick(pool);
  let away = randomPick(pool);
  while (away.name === home.name) away = randomPick(pool);
  return { home: home.name, away: away.name, homeColor: home.color, awayColor: away.color };
}

export default function VirtualTeamSportsScreen({
  sport, sportLabel, hero, teamPool,
  buildMarkets, evaluateBet, generateFinalScore,
  liveScoreFromProgress, matchClockLabel, hasDraw,
  matchesPerSession = 4, upcomingSessionsCount = 4,
  timing = { betting: 60, live: 90, result: 30 },
}: VirtualTeamSportsScreenProps) {
  const { isAuthenticated, requireAuth } = useAuth();
  const [betAmount, setBetAmount] = useState('0.01');

  const buildSessionMatches = useCallback((): InternalMatch[] => {
    return Array.from({ length: matchesPerSession }, (_, i) => {
      const pair = pickPair(teamPool);
      const homeOdds = 1.6 + Math.random() * 1.6;
      const awayOdds = 1.6 + Math.random() * 1.6;
      const drawOdds = hasDraw ? 3.0 + Math.random() * 1.2 : null;
      return {
        id: `m-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        pair,
        homeOdds,
        awayOdds,
        drawOdds,
        finalScore: generateFinalScore(),
        markets: buildMarkets(homeOdds, awayOdds, drawOdds),
      };
    });
  }, [teamPool, hasDraw, matchesPerSession, buildMarkets, generateFinalScore]);

  const [matches, setMatches] = useState<InternalMatch[]>(() => buildSessionMatches());
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => matches[0]?.id);
  const [pending, setPending] = useState<PendingBet[]>([]);
  const [history, setHistory] = useState<SettledBet[]>([]);
  const [reminders, setReminders] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState({ total: 0, won: 0, profit: 0 });

  const session = useVirtualSession({
    timing,
    onSessionStart: () => {
      setMatches(buildSessionMatches());
    },
    onPhaseChange: (phase, sessionId) => {
      if (phase === 'result') {
        settleSession(sessionId);
      }
    },
  });

  useEffect(() => {
    if (matches.length > 0 && !matches.find(m => m.id === selectedMatchId)) {
      setSelectedMatchId(matches[0].id);
    }
  }, [matches, selectedMatchId]);

  const upcomingSessions: UpcomingSession[] = useMemo(() => {
    const sessionDuration = timing.betting + timing.live + timing.result;
    const phaseRemain = session.phaseRemaining;
    const phaseOrder: SessionPhase[] = ['betting', 'live', 'result'];
    const idx = phaseOrder.indexOf(session.phase);
    let remainingThisSession = phaseRemain;
    for (let i = idx + 1; i < phaseOrder.length; i++) {
      const p = phaseOrder[i];
      remainingThisSession += timing[p];
    }
    return Array.from({ length: upcomingSessionsCount }, (_, i) => {
      const startsInSeconds = remainingThisSession + i * sessionDuration;
      return {
        id: session.sessionId + i + 1,
        startsInSeconds,
        matches: Array.from({ length: 3 }, () => {
          const p = pickPair(teamPool);
          return { home: p.home, away: p.away };
        }),
        highlight: i === 0,
      };
    });
  }, [session.sessionId, session.phase, session.phaseRemaining, timing, upcomingSessionsCount, teamPool]);

  const liveRows: LiveMatchRow[] = useMemo(() => {
    return matches.map(m => {
      const score = liveScoreFromProgress(m.finalScore, session.liveProgress);
      return {
        id: m.id,
        homeTeam: m.pair.home,
        awayTeam: m.pair.away,
        homeColor: m.pair.homeColor,
        awayColor: m.pair.awayColor,
        homeScore: session.phase === 'result' ? m.finalScore.home : score.home,
        awayScore: session.phase === 'result' ? m.finalScore.away : score.away,
        markets: m.markets,
      };
    });
  }, [matches, session.liveProgress, session.phase, liveScoreFromProgress]);

  const featuredMatch = liveRows.find(r => r.id === selectedMatchId) || liveRows[0];
  const featuredInternal = matches.find(m => m.id === featuredMatch?.id);

  const pickedKeys = useMemo(() => {
    return new Set(
      pending.filter(p => p.sessionId === session.sessionId).map(p => `${p.matchId}:${p.marketKey}`)
    );
  }, [pending, session.sessionId]);

  const placeBet = useCallback((matchId: string | number, market: MarketOption) => {
    if (!isAuthenticated) {
      requireAuth();
      return;
    }
    if (session.phase !== 'betting') return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const amt = Math.max(0.0001, parseFloat(betAmount) || 0.01);
    setPending(prev => {
      if (prev.some(b => b.sessionId === session.sessionId && b.matchId === matchId && b.marketKey === market.key)) {
        return prev;
      }
      return [
        ...prev,
        {
          matchId: String(matchId),
          marketKey: market.key,
          marketLabel: market.label,
          odds: market.odds,
          amount: amt,
          homeTeam: match.pair.home,
          awayTeam: match.pair.away,
          sessionId: session.sessionId,
        },
      ];
    });
  }, [isAuthenticated, requireAuth, session.phase, session.sessionId, matches, betAmount]);

  function settleSession(sessionId: number) {
    setPending(prev => {
      const toSettle = prev.filter(b => b.sessionId === sessionId);
      if (toSettle.length === 0) return prev;
      const settled: SettledBet[] = [];
      let totalProfit = 0;
      let totalWon = 0;
      for (const bet of toSettle) {
        const match = matches.find(m => m.id === bet.matchId);
        if (!match) continue;
        const won = evaluateBet(bet.marketKey, match.finalScore);
        const payout = won ? bet.amount * bet.odds - bet.amount : -bet.amount;
        if (won) totalWon += 1;
        totalProfit += payout;
        settled.push({
          ...bet,
          won,
          payout,
          homeScore: match.finalScore.home,
          awayScore: match.finalScore.away,
        });
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

  const winRate = stats.total > 0 ? `${Math.round((stats.won / stats.total) * 100)}%` : '-';
  const winRateColor = stats.won === 0 ? neonBlue : neonGold;
  const profitColor = stats.profit > 0 ? neonGreen : stats.profit < 0 ? '#ff6b7a' : 'text.primary';

  function toggleReminder(id: number) {
    setReminders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, pb: { xs: 10, md: 2 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Hero */}
      <Box
        sx={{
          p: { xs: 2, md: 2.5 },
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(neonGreen, 0.08)} 0%, ${alpha(neonBlue, 0.06)} 100%)`,
          border: `1px solid ${darkBorder}`,
        }}
      >
        <Typography sx={{ fontSize: '0.7rem', color: neonGreen, fontWeight: 800, letterSpacing: '0.12em', mb: 0.5 }}>
          VIRTUAL · {sportLabel.toUpperCase()}
        </Typography>
        <Typography sx={{ fontSize: { xs: '1.4rem', md: '1.7rem' }, fontWeight: 900, lineHeight: 1.15, mb: 0.5 }}>
          {hero.title}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', maxWidth: 540 }}>
          {hero.tagline}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2 }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <SessionStatusBar state={session} sportLabel={sportLabel} />

          {featuredMatch && featuredInternal && (
            <MatchArena
              sport={sport}
              match={{
                id: featuredMatch.id,
                homeTeam: featuredMatch.homeTeam,
                awayTeam: featuredMatch.awayTeam,
                homeScore: featuredMatch.homeScore,
                awayScore: featuredMatch.awayScore,
                homeColor: featuredMatch.homeColor,
                awayColor: featuredMatch.awayColor,
              }}
              phase={session.phase}
              liveProgress={session.liveProgress}
              matchClockLabel={matchClockLabel(session.phase, session.liveProgress)}
            />
          )}

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

          <LiveMatchesList
            matches={liveRows}
            selectedMatchId={selectedMatchId}
            onSelectMatch={(id) => setSelectedMatchId(String(id))}
            onPickMarket={placeBet}
            phase={session.phase}
            pickedKeys={pickedKeys}
          />

          <NextSessionsList
            sessions={upcomingSessions}
            reminders={reminders}
            onToggleReminder={toggleReminder}
            sportLabel={sportLabel}
          />

          {history.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: 'text.primary', letterSpacing: '0.05em', mb: 1 }}>
                RECENT RESULTS
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {history.slice(0, 6).map((h, i) => (
                  <motion.div key={`${h.matchId}-${h.marketKey}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        py: 0.75, px: 1, borderRadius: 1.5,
                        background: alpha(h.won ? neonGreen : '#ff4757', 0.06),
                        border: `1px solid ${alpha(h.won ? neonGreen : '#ff4757', 0.2)}`,
                      }}
                    >
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
                      <Typography sx={{ fontSize: '0.72rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.homeTeam} {h.homeScore}–{h.awayScore} {h.awayTeam} · {h.marketLabel}
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

        {/* Right panel: bet slip */}
        <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <BettingControls
            betAmount={betAmount}
            onBetChange={setBetAmount}
            onBet={() => {
              if (!isAuthenticated) requireAuth();
            }}
            isRunning={false}
            betLabel={isAuthenticated ? 'Place bets from list' : 'Sign in to bet'}
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
                Pick a market from a live match to add it here.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 240, overflowY: 'auto', pr: 0.5 }}>
                {pending.map((b) => (
                  <Box
                    key={`${b.matchId}-${b.marketKey}`}
                    sx={{
                      p: 0.9, borderRadius: 1.5,
                      background: alpha(neonGreen, 0.05),
                      border: `1px solid ${alpha(neonGreen, 0.2)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: neonGreen }}>
                        {b.marketLabel}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: neonGold }}>
                        @ {b.odds.toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.homeTeam} vs {b.awayTeam}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.4 }}>
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
            {!isAuthenticated && (
              <Button
                fullWidth size="small"
                onClick={requireAuth}
                sx={{
                  mt: 1,
                  background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                  color: '#000', fontWeight: 800, fontSize: '0.72rem',
                }}
              >
                Sign in to place bets
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
