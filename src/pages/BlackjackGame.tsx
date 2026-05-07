import { useState } from 'react';
import {
  Box, Typography, Grid, Chip, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import BettingControls from '../components/casino/BettingControls';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../theme';

type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card { rank: Rank; suit: Suit }

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  return deck.sort(() => Math.random() - 0.5);
}

function baccaratValue(rank: Rank): number {
  if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
  if (rank === 'A') return 1;
  return parseInt(rank);
}

function handTotal(hand: Card[]): number {
  return hand.reduce((sum, c) => sum + baccaratValue(c.rank), 0) % 10;
}

type BetChoice = 'player' | 'banker' | 'tie';
type GamePhase = 'betting' | 'dealing' | 'result';

interface RoundResult {
  bet: BetChoice;
  playerTotal: number;
  bankerTotal: number;
  winner: 'player' | 'banker' | 'tie';
  payout: number;
}

function BaccaratCard({ card, delay = 0 }: { card: Card; delay?: number }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <motion.div
      initial={{ opacity: 0, rotateY: -90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Box
        sx={{
          width: 52, height: 74, borderRadius: 1.5,
          background: '#fff',
          border: `1.5px solid ${alpha('#000', 0.15)}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'space-between',
          p: 0.5, boxShadow: '0 3px 10px rgba(0,0,0,0.4)',
        }}
      >
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: isRed ? '#cc2233' : '#111', alignSelf: 'flex-start', lineHeight: 1 }}>
          {card.rank}
        </Typography>
        <Typography sx={{ fontSize: '1.3rem', color: isRed ? '#cc2233' : '#111', lineHeight: 1 }}>{card.suit}</Typography>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: isRed ? '#cc2233' : '#111', alignSelf: 'flex-end', lineHeight: 1, transform: 'rotate(180deg)' }}>
          {card.rank}
        </Typography>
      </Box>
    </motion.div>
  );
}

export default function BaccaratGame() {
  const [betAmount, setBetAmount] = useState('0.01');
  const [betChoice, setBetChoice] = useState<BetChoice>('player');
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [bankerHand, setBankerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<GamePhase>('betting');
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [stats, setStats] = useState({ rounds: 0, won: 0, lost: 0, tied: 0 });

  function deal() {
    const deck = makeDeck();
    const p: Card[] = [deck.pop()!, deck.pop()!];
    const b: Card[] = [deck.pop()!, deck.pop()!];

    setPhase('dealing');
    setPlayerHand([]);
    setBankerHand([]);

    // Animate card dealing
    setTimeout(() => setPlayerHand([p[0]]), 200);
    setTimeout(() => setBankerHand([b[0]]), 500);
    setTimeout(() => setPlayerHand(p), 800);
    setTimeout(() => setBankerHand(b), 1100);

    setTimeout(() => {
      const pTotal = handTotal(p);
      const bTotal = handTotal(b);
      let winner: 'player' | 'banker' | 'tie';

      if (pTotal === bTotal) winner = 'tie';
      else if (pTotal > bTotal) winner = 'player';
      else winner = 'banker';

      const bet = parseFloat(betAmount) || 0.01;
      let payout = -bet;
      if (winner === betChoice) {
        if (betChoice === 'tie') payout = bet * 8;
        else if (betChoice === 'banker') payout = bet * 0.95;
        else payout = bet;
      } else if (winner === 'tie' && betChoice !== 'tie') {
        payout = 0; // tie is a push for player/banker bets
      }

      const result: RoundResult = { bet: betChoice, playerTotal: pTotal, bankerTotal: bTotal, winner, payout };
      setLastResult(result);
      setPhase('result');
      setHistory(prev => [result, ...prev.slice(0, 19)]);
      setStats(prev => ({
        rounds: prev.rounds + 1,
        won: prev.won + (winner === betChoice ? 1 : 0),
        lost: prev.lost + (winner !== betChoice && !(winner === 'tie' && betChoice !== 'tie') ? 1 : 0),
        tied: prev.tied + (winner === 'tie' ? 1 : 0),
      }));
    }, 1600);
  }

  const BET_OPTIONS: { label: string; type: BetChoice; payout: string; color: string }[] = [
    { label: 'Player', type: 'player', payout: '1:1', color: neonBlue },
    { label: 'Tie', type: 'tie', payout: '8:1', color: neonGreen },
    { label: 'Banker', type: 'banker', payout: '0.95:1', color: '#ff4757' },
  ];

  const winnerColor = lastResult
    ? lastResult.winner === 'player' ? neonBlue : lastResult.winner === 'banker' ? '#ff4757' : neonGreen
    : neonGold;

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, minHeight: 'calc(100vh - 64px)', p: 2, gap: 2 }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Stats */}
        <Grid container spacing={1.5}>
          {[
            { label: 'Rounds', value: stats.rounds, color: neonBlue },
            { label: 'Won', value: stats.won, color: neonGreen },
            { label: 'Lost', value: stats.lost, color: '#ff4757' },
            { label: 'Tied', value: stats.tied, color: neonGold },
          ].map((s) => (
            <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', background: darkCard, border: `1px solid ${darkBorder}` }}>
                <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: s.color }}>{s.value}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{s.label}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Game table */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a0808 0%, #2d0a0a 50%, #180808 100%)',
            border: `2px solid ${alpha('#cc2233', 0.25)}`,
            borderRadius: 3, p: 3, minHeight: 340,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <Box sx={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(${alpha('#cc2233', 0.04)} 1px, transparent 1px)`,
            backgroundSize: '20px 20px', pointerEvents: 'none',
          }} />

          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 3 }}>
            {/* Player */}
            <Box sx={{ flex: 1, maxWidth: 200 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: neonBlue, letterSpacing: '0.1em' }}>PLAYER</Typography>
                {playerHand.length > 0 && (
                  <Chip
                    label={handTotal(playerHand)}
                    size="small"
                    sx={{
                      height: 22, fontSize: '0.8rem', fontWeight: 900,
                      background: lastResult?.winner === 'player' ? alpha(neonBlue, 0.3) : alpha(neonBlue, 0.1),
                      color: neonBlue,
                      border: lastResult?.winner === 'player' ? `1px solid ${neonBlue}` : 'none',
                      boxShadow: lastResult?.winner === 'player' ? `0 0 10px ${alpha(neonBlue, 0.4)}` : 'none',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {playerHand.map((card, i) => (
                  <BaccaratCard key={i} card={card} delay={i * 0.15} />
                ))}
              </Box>
            </Box>

            {/* VS divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: alpha('#fff', 0.2) }}>VS</Typography>
            </Box>

            {/* Banker */}
            <Box sx={{ flex: 1, maxWidth: 200 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#ff4757', letterSpacing: '0.1em' }}>BANKER</Typography>
                {bankerHand.length > 0 && (
                  <Chip
                    label={handTotal(bankerHand)}
                    size="small"
                    sx={{
                      height: 22, fontSize: '0.8rem', fontWeight: 900,
                      background: lastResult?.winner === 'banker' ? alpha('#ff4757', 0.3) : alpha('#ff4757', 0.1),
                      color: '#ff4757',
                      border: lastResult?.winner === 'banker' ? `1px solid #ff4757` : 'none',
                      boxShadow: lastResult?.winner === 'banker' ? `0 0 10px ${alpha('#ff4757', 0.4)}` : 'none',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {bankerHand.map((card, i) => (
                  <BaccaratCard key={i} card={card} delay={i * 0.15 + 0.3} />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Result */}
          <AnimatePresence mode="wait">
            {phase === 'result' && lastResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: 'center' }}
              >
                <Typography sx={{
                  fontSize: '1.8rem', fontWeight: 900,
                  color: winnerColor,
                  textShadow: `0 0 20px ${alpha(winnerColor, 0.6)}`,
                }}>
                  {lastResult.winner.toUpperCase()} WINS!
                </Typography>
                <Typography sx={{
                  fontSize: '1.2rem', fontWeight: 800, mt: 0.5,
                  color: lastResult.payout > 0 ? neonGold : lastResult.payout === 0 ? neonBlue : '#ff4757',
                }}>
                  {lastResult.payout > 0 ? '+' : ''}{lastResult.payout.toFixed(5)} BTC
                </Typography>
              </motion.div>
            )}
            {phase === 'betting' && (
              <motion.div key="betting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Typography sx={{ textAlign: 'center', color: 'text.disabled', fontSize: '0.88rem' }}>
                  Place your bet to begin
                </Typography>
              </motion.div>
            )}
            {phase === 'dealing' && (
              <motion.div key="dealing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Typography sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.88rem' }}>
                  Dealing cards...
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {/* Bet selector */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {BET_OPTIONS.map((opt) => (
            <motion.div key={opt.type} style={{ flex: 1 }} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Box
                onClick={() => setBetChoice(opt.type)}
                sx={{
                  p: 2, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
                  background: betChoice === opt.type ? alpha(opt.color, 0.18) : alpha('#fff', 0.03),
                  border: `2px solid ${betChoice === opt.type ? opt.color : darkBorder}`,
                  boxShadow: betChoice === opt.type ? `0 0 15px ${alpha(opt.color, 0.3)}` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Typography sx={{ fontWeight: 900, color: betChoice === opt.type ? opt.color : 'text.secondary', mb: 0.3 }}>
                  {opt.label}
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>Pays {opt.payout}</Typography>
              </Box>
            </motion.div>
          ))}
        </Box>

        {/* History scoreboard */}
        <Box>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 700, mb: 1, letterSpacing: '0.08em' }}>
            ROAD
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {history.map((h, i) => {
              const col = h.winner === 'player' ? neonBlue : h.winner === 'banker' ? '#ff4757' : neonGreen;
              return (
                <Box
                  key={i}
                  sx={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: alpha(col, 0.2),
                    border: `2px solid ${col}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: col }}>
                    {h.winner[0].toUpperCase()}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Right panel */}
      <Box sx={{ width: { xs: '100%', lg: 280 }, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <BettingControls
          betAmount={betAmount}
          onBetChange={setBetAmount}
          onBet={() => { setPhase('betting'); deal(); }}
          isRunning={phase === 'dealing'}
          betLabel={`Bet ${betChoice.charAt(0).toUpperCase() + betChoice.slice(1)}`}
          stopLabel="Dealing..."
        />

        {/* Rules */}
        <Box sx={{ p: 1.5, background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.08em', mb: 1 }}>
            PAYOUTS
          </Typography>
          {[
            { label: 'Player Win', value: '1:1', color: neonBlue },
            { label: 'Banker Win', value: '0.95:1', color: '#ff4757' },
            { label: 'Tie', value: '8:1', color: neonGreen },
            { label: 'Natural 8/9', value: 'Auto win', color: neonGold },
          ].map((p) => (
            <Box key={p.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{p.label}</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: p.color }}>{p.value}</Typography>
            </Box>
          ))}
        </Box>

        <Button
          variant="outlined"
          fullWidth
          onClick={() => { setPlayerHand([]); setBankerHand([]); setPhase('betting'); setLastResult(null); }}
          sx={{ borderColor: alpha('#ff4757', 0.4), color: '#ff4757', fontWeight: 700 }}
        >
          Clear Table
        </Button>
      </Box>
    </Box>
  );
}
