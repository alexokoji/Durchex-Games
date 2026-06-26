import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card, Stack } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { LimboGame } from '../games/limbo/LimboGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import { playSound } from '../constants/gameAssets';

interface GameState {
  targetMultiplier?: number;
  resultMultiplier?: number;
  gameOver: boolean;
  won?: boolean;
  isSpinning: boolean;
}

export default function LimboGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();

  const [stake, setStake] = useState(100);
  const [targetMult, setTargetMult] = useState(2);
  const [gameState, setGameState] = useState<GameState>({
    gameOver: false,
    isSpinning: false,
  });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new LimboGame());
  const [displayMult, setDisplayMult] = useState(1.0);

  useEffect(() => {
    // Game registration handled internally
  }, []);

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }

    setLoading(true);
    setGameState({ gameOver: false, isSpinning: true });
    setDisplayMult(1.0);

    // Animate multiplier spinning up
    const spinDuration = 2000;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / spinDuration, 1);
      setDisplayMult(1 + progress * (targetMult * 3 - 1));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        void runGame();
      }
    };

    requestAnimationFrame(animate);
  };

  const runGame = async () => {
    try {
      const result = await game.play({
        gameId: 'limbo',
        userId: user!.id,
        sessionId: `limbo_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });

      setGameState({
        targetMultiplier: (result.details?.targetMultiplier as number) ?? 0,
        resultMultiplier: (result.details?.resultMultiplier as number) ?? 0,
        gameOver: true,
        won: result.won,
        isSpinning: false,
      });

      if (result.won) {
        const bet = await wallet.placeBet({
          gameId: 'limbo',
          gameName: 'Limbo',
          stake,
          details: `Target: ${targetMult.toFixed(2)}x`,
        });
        if (bet) {
          await wallet.settleBet(bet.id, {
            won: true,
            payout: result.payout,
            multiplier: result.multiplier,
          });
        }
        playSound('win');
        toasts.success('Won!', `${result.multiplier.toFixed(2)}x!`);
      } else {
        playSound('lose');
        const bet = await wallet.placeBet({
          gameId: 'limbo',
          gameName: 'Limbo',
          stake,
        });
        if (bet) {
          await wallet.settleBet(bet.id, { won: false, payout: 0 });
        }
        toasts.error('Lost', `${(result.details?.resultMultiplier as number)?.toFixed(2)}x was too low`);
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({ gameOver: false, isSpinning: false });
    setDisplayMult(1.0);
  };

  return (
    <GamePageWrapper gameId="limbo">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
          🎢 Limbo
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Set your target and see if you can reach it
        </Typography>
      </Box>

      <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
        {/* Multiplier Display */}
        <Box sx={{ mb: 3, textAlign: 'center', p: 2, background: '#1a1a2e', borderRadius: 1 }}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
            Current Multiplier
          </Typography>
          <Typography sx={{ fontSize: '3rem', fontWeight: 900, color: neonGold }}>
            {displayMult.toFixed(2)}x
          </Typography>
        </Box>

        {/* Target Selector */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 2 }}>
            Target Multiplier: {targetMult.toFixed(2)}x
          </Typography>
          <input
            type="range"
            min="1.01"
            max="100"
            step="0.1"
            value={targetMult}
            onChange={e => setTargetMult(parseFloat(e.target.value))}
            disabled={loading || gameState.gameOver}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: darkBorder,
              outline: 'none',
            }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary' }}>
            <Typography>1.01x (99% win)</Typography>
            <Typography>50x (rare)</Typography>
            <Typography>100x (1% chance)</Typography>
          </Stack>
        </Box>

        {/* Bet Input */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>
            Stake
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <input
              type="number"
              value={stake}
              onChange={e => setStake(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 4,
                border: `1px solid ${darkBorder}`,
                background: '#1a1a2e',
                color: '#fff',
                fontSize: '0.9rem',
              }}
            />
            <Typography sx={{ alignSelf: 'center', fontSize: '0.9rem', color: 'text.secondary' }}>
              {wallet.currency}
            </Typography>
          </Box>
        </Box>

        {/* Play Button */}
        <Button
          fullWidth
          variant="contained"
          disabled={loading || gameState.gameOver}
          onClick={playGame}
          sx={{
            background: neonGreen,
            color: '#000',
            fontWeight: 900,
            py: 1.5,
            mb: 2,
          }}
        >
          {loading ? 'Spinning...' : 'Play'}
        </Button>

        {/* Result */}
        {gameState.gameOver && (
          <Box sx={{ mb: 2, p: 2, background: '#1a1a2e', borderRadius: 1 }}>
            <Typography
              sx={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: gameState.won ? neonGreen : '#ff6b7a',
                textAlign: 'center',
              }}
            >
              {gameState.won ? '🎉 You Won!' : '❌ You Lost'}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center', mt: 1 }}>
              Target: {gameState.targetMultiplier?.toFixed(2)}x · Result: {gameState.resultMultiplier?.toFixed(2)}x
            </Typography>
          </Box>
        )}

        {gameState.gameOver && (
          <Button fullWidth variant="outlined" onClick={reset} sx={{ borderColor: neonGold, color: neonGold }}>
            Play Again
          </Button>
        )}
      </Card>

      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
          How to Play
        </Typography>
        <Stack spacing={1} sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          <Typography>1. Set your target multiplier (higher = riskier)</Typography>
          <Typography>2. Watch the multiplier spin</Typography>
          <Typography>3. Win if it lands at or above your target</Typography>
          <Typography>4. Payout = Stake × Target Multiplier</Typography>
        </Stack>
      </Box>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
          Balance
        </Typography>
        <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: neonGreen }}>
          {wallet.balance.toFixed(2)} {wallet.currency}
        </Typography>
      </Box>
    </Box>
    </GamePageWrapper>
  );
}
