import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card, Stack } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { ColorPredictionGame } from '../games/colorPrediction/ColorPredictionGame';

type ColorChoice = 'red' | 'blue' | 'green' | 'yellow';

interface GameState {
  prediction?: ColorChoice;
  result?: ColorChoice;
  gameOver: boolean;
  won?: boolean;
  isSpinning: boolean;
}

const COLOR_MAP: Record<ColorChoice, { bg: string; label: string; odds: string }> = {
  red: { bg: '#ff6b7a', label: 'Red', odds: '2.1x' },
  blue: { bg: '#0088ff', label: 'Blue', odds: '2.1x' },
  green: { bg: '#00ff00', label: 'Green', odds: '33x' },
  yellow: { bg: '#ffff00', label: 'Yellow', odds: '50x' },
};

export default function ColorPredictionGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();

  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState<GameState>({
    gameOver: false,
    isSpinning: false,
  });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new ColorPredictionGame());
  const [spinColor, setSpinColor] = useState<ColorChoice>('red');

  useEffect(() => {
    engine.registerGame(game);
  }, [engine, game]);

  const playGame = async (prediction: ColorChoice) => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }

    setLoading(true);
    setGameState({ prediction, gameOver: false, isSpinning: true });

    // Spin animation
    const spinDuration = 1500;
    const colors: ColorChoice[] = ['red', 'blue', 'green', 'yellow'];
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / spinDuration, 1);
      const spins = progress * 20;
      const colorIdx = Math.floor(spins) % colors.length;
      setSpinColor(colors[colorIdx]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        void runGame(prediction);
      }
    };

    requestAnimationFrame(animate);
  };

  const runGame = async (prediction: ColorChoice) => {
    try {
      const result = await game.play({
        gameId: 'colorprediction',
        userId: user!.id,
        sessionId: `colorprediction_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });

      const resultColor = (result.details?.result as ColorChoice) || 'red';

      setGameState({
        prediction,
        result: resultColor,
        gameOver: true,
        won: result.won,
        isSpinning: false,
      });

      if (result.won) {
        const bet = await wallet.placeBet({
          gameId: 'colorprediction',
          gameName: 'Color Prediction',
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
          gameId: 'colorprediction',
          gameName: 'Color Prediction',
          stake,
        });
        if (bet) {
          await wallet.settleBet(bet.id, { won: false, payout: 0 });
        }
        toasts.error('Lost', `It was ${COLOR_MAP[resultColor].label}`);
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({ gameOver: false, isSpinning: false });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
          🎨 Color Prediction
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Pick a color and watch it spin
        </Typography>
      </Box>

      <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
        {/* Spinning Wheel */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Box
            sx={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: COLOR_MAP[spinColor].bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              fontSize: '3rem',
              fontWeight: 900,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              transition: gameState.isSpinning ? 'none' : 'background 0.3s ease',
            }}
          >
            {COLOR_MAP[spinColor].label[0]}
          </Box>
        </Box>

        {/* Color Buttons */}
        {!gameState.gameOver && !gameState.isSpinning && (
          <Stack spacing={2} sx={{ mb: 3 }}>
            {(Object.keys(COLOR_MAP) as ColorChoice[]).map(color => (
              <Button
                key={color}
                fullWidth
                variant="contained"
                disabled={loading}
                onClick={() => playGame(color)}
                sx={{
                  background: COLOR_MAP[color].bg,
                  color: color === 'yellow' ? '#000' : '#fff',
                  fontWeight: 900,
                  py: 2,
                  '&:hover': { opacity: 0.9 },
                }}
              >
                {COLOR_MAP[color].label} ({COLOR_MAP[color].odds})
              </Button>
            ))}
          </Stack>
        )}

        {gameState.isSpinning && (
          <Typography sx={{ textAlign: 'center', color: neonGold, fontWeight: 700, mb: 3 }}>
            Spinning...
          </Typography>
        )}

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
            {gameState.won && (
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center', mt: 1 }}>
                {COLOR_MAP[gameState.result!].label} × {COLOR_MAP[gameState.result!].odds}
              </Typography>
            )}
          </Box>
        )}

        {/* Play Again */}
        {gameState.gameOver && (
          <Button fullWidth variant="outlined" onClick={reset} sx={{ borderColor: neonGold, color: neonGold }}>
            Play Again
          </Button>
        )}

        {/* Bet Input */}
        {!gameState.gameOver && (
          <Box sx={{ mt: 3, p: 2, background: '#1a1a2e', borderRadius: 1 }}>
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
                  background: '#0a0a12',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
              <Typography sx={{ alignSelf: 'center', fontSize: '0.9rem', color: 'text.secondary' }}>
                {wallet.currency}
              </Typography>
            </Box>
          </Box>
        )}
      </Card>

      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
          Odds
        </Typography>
        <Stack spacing={0.5} sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          <Typography>🔴 Red: 47.5% → 2.1x</Typography>
          <Typography>🔵 Blue: 47.5% → 2.1x</Typography>
          <Typography>🟢 Green: 3% → 33x</Typography>
          <Typography>🟡 Yellow: 2% → 50x</Typography>
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
