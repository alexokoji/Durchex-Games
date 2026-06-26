import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card, Stack } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { KenoGame } from '../games/keno/KenoGame';

interface GameState {
  matches?: number;
  gameOver: boolean;
  won?: boolean;
  isDrawing: boolean;
}

export default function KenoGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();

  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState<GameState>({
    gameOver: false,
    isDrawing: false,
  });
  const [loading, setLoading] = useState(false);
  const [engine] = useState(() => new GameEngine());
  const [game] = useState(() => new KenoGame());
  const [drawnCount, setDrawnCount] = useState(0);

  useEffect(() => {
    engine.registerGame(game);
  }, [engine, game]);

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }

    setLoading(true);
    setGameState({ gameOver: false, isDrawing: true });
    setDrawnCount(0);

    // Animate drawing numbers
    const drawDuration = 2000;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / drawDuration, 1);
      setDrawnCount(Math.floor(progress * 20));

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
        gameId: 'keno',
        userId: user!.id,
        sessionId: `keno_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });

      setGameState({
        matches: (result.details?.matches as number) ?? 0,
        gameOver: true,
        won: result.won,
        isDrawing: false,
      });

      if (result.won) {
        const bet = await wallet.placeBet({
          gameId: 'keno',
          gameName: 'Keno',
          stake,
        });
        if (bet) {
          await wallet.settleBet(bet.id, {
            won: true,
            payout: result.payout,
            multiplier: result.multiplier,
          });
        }
        toasts.success('Won!', `${result.multiplier.toFixed(2)}x!`);
      } else {
        const bet = await wallet.placeBet({
          gameId: 'keno',
          gameName: 'Keno',
          stake,
        });
        if (bet) {
          await wallet.settleBet(bet.id, { won: false, payout: 0 });
        }
        toasts.error('Lost', 'Need 4+ matches');
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({ gameOver: false, isDrawing: false });
    setDrawnCount(0);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
          🎰 Keno
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Pick 10 numbers, match the draw
        </Typography>
      </Box>

      <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
        {/* Drawing Progress */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
            Numbers Drawn
          </Typography>
          <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: neonGold }}>
            {drawnCount}/20
          </Typography>
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
              disabled={loading || gameState.gameOver}
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
          {loading ? 'Drawing...' : 'Draw Numbers'}
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
              {gameState.matches}/10 matches
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
          Payouts (10 picks)
        </Typography>
        <Stack spacing={0.5} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          <Typography>4 matches: 1.5x</Typography>
          <Typography>5 matches: 2x</Typography>
          <Typography>6 matches: 3x</Typography>
          <Typography>7 matches: 5x</Typography>
          <Typography>8 matches: 10x</Typography>
          <Typography>9 matches: 50x</Typography>
          <Typography>10 matches: 500x 🏆</Typography>
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
  );
}
