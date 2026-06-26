import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card, Stack, Chip } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { CoinFlipGame } from '../games/coinFlip/CoinFlipGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import { playSound } from '../constants/gameAssets';

type CoinFace = 'heads' | 'tails';

interface GameState {
  prediction?: CoinFace;
  result?: CoinFace;
  gameOver: boolean;
  won?: boolean;
  isFlipping: boolean;
}

export default function CoinFlipGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();

  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState<GameState>({
    gameOver: false,
    isFlipping: false,
  });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new CoinFlipGame());
  const [coinRotation, setCoinRotation] = useState(0);

  useEffect(() => {
    // Game registration handled internally
  }, []);

  const playGame = async (prediction: CoinFace) => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }

    setLoading(true);
    setGameState({ prediction, gameOver: false, isFlipping: true });

    // Coin flip animation
    const flipDuration = 2000;
    const spinCount = 8 + Math.floor(Math.random() * 4);
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / flipDuration, 1);
      setCoinRotation(progress * spinCount * Math.PI * 2);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        void runGame(prediction);
      }
    };

    requestAnimationFrame(animate);
  };

  const runGame = async (prediction: CoinFace) => {
    try {
      const result = await game.play({
        gameId: 'coinflip',
        userId: user!.id,
        sessionId: `coinflip_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });

      const resultFace: CoinFace = Math.random() > 0.5 ? 'heads' : 'tails';
      const won = prediction === resultFace;

      setGameState({
        prediction,
        result: resultFace,
        gameOver: true,
        won,
        isFlipping: false,
      });

      if (won) {
        playSound('coin');
        const bet = await wallet.placeBet({
          gameId: 'coinflip',
          gameName: 'Coin Flip',
          stake,
          details: `Predicted ${prediction}`,
        });
        if (bet) {
          await wallet.settleBet(bet.id, {
            won: true,
            payout: result.payout,
            multiplier: result.multiplier,
          });
        }
        fetch('/api/leaderboard/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            username: user?.username,
            gameId: 'coinflip',
            gameName: 'Coin Flip',
            stake,
            payout: result.payout,
            multiplier: result.multiplier,
            won: true,
          }),
        }).catch(() => {});
        toasts.success('Won!', `2x Payout!`);
      } else {
        playSound('lose');
        const bet = await wallet.placeBet({
          gameId: 'coinflip',
          gameName: 'Coin Flip',
          stake,
        });
        if (bet) {
          await wallet.settleBet(bet.id, { won: false, payout: 0 });
        }
        fetch('/api/leaderboard/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            username: user?.username,
            gameId: 'coinflip',
            gameName: 'Coin Flip',
            stake,
            payout: 0,
            multiplier: 0,
            won: false,
          }),
        }).catch(() => {});
        toasts.error('Lost', 'Try again');
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({ gameOver: false, isFlipping: false });
    setCoinRotation(0);
  };

  return (
    <GamePageWrapper gameId="coinflip">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
          🪙 Coin Flip
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Predict Heads or Tails
        </Typography>
      </Box>

      {/* 3D Coin Animation */}
      <Card
        sx={{
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          borderRadius: 2,
          p: 3,
          mb: 2,
          textAlign: 'center',
        }}
      >
        {/* Coin (CSS 3D) */}
        <Box
          sx={{
            width: 150,
            height: 150,
            mx: 'auto',
            mb: 3,
            perspective: '1000px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              background:
                gameState.result === 'heads'
                  ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                  : 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              fontWeight: 900,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              transform: `rotateY(${coinRotation}rad)`,
              transformStyle: 'preserve-3d',
              transition: gameState.isFlipping ? 'none' : 'transform 0.3s ease',
            }}
          >
            {gameState.result === 'heads' ? 'H' : 'T'}
          </Box>
        </Box>

        {/* Prediction Display */}
        {gameState.prediction && (
          <Chip
            label={`You predicted: ${gameState.prediction.toUpperCase()}`}
            sx={{
              mb: 2,
              height: 32,
              fontSize: '0.9rem',
              background: neonGold + '22',
              color: neonGold,
            }}
          />
        )}

        {/* Bet Input */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>
            Bet Amount
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <input
              type="number"
              value={stake}
              onChange={e => setStake(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={loading || gameState.isFlipping}
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
            <Typography
              sx={{
                alignSelf: 'center',
                fontSize: '0.9rem',
                color: 'text.secondary',
              }}
            >
              {wallet.currency}
            </Typography>
          </Box>
        </Box>

        {/* Prediction Buttons */}
        {!gameState.gameOver && !gameState.isFlipping && (
          <Stack direction="row" spacing={2}>
            <Button
              fullWidth
              variant="contained"
              disabled={loading}
              onClick={() => playGame('heads')}
              sx={{
                background: '#FFD700',
                color: '#000',
                fontWeight: 900,
                py: 1.5,
              }}
            >
              Heads
            </Button>
            <Button
              fullWidth
              variant="contained"
              disabled={loading}
              onClick={() => playGame('tails')}
              sx={{
                background: '#C0C0C0',
                color: '#000',
                fontWeight: 900,
                py: 1.5,
              }}
            >
              Tails
            </Button>
          </Stack>
        )}

        {gameState.isFlipping && (
          <Typography sx={{ color: neonGold, fontWeight: 700 }}>
            Flipping...
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
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', textAlign: 'center' }}>
              It was {gameState.result?.toUpperCase()}
            </Typography>
          </Box>
        )}

        {/* Play Again Button */}
        {gameState.gameOver && (
          <Button
            fullWidth
            variant="outlined"
            onClick={reset}
            sx={{
              borderColor: neonGold,
              color: neonGold,
              fontWeight: 700,
            }}
          >
            Play Again
          </Button>
        )}
      </Card>

      {/* How to Play */}
      <Box
        sx={{
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          borderRadius: 2,
          p: 2,
        }}
      >
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
          How to Play
        </Typography>
        <Stack spacing={1} sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          <Typography>1. Choose your bet amount</Typography>
          <Typography>2. Predict Heads or Tails</Typography>
          <Typography>3. Watch the coin flip</Typography>
          <Typography>4. Win 2x your bet if correct</Typography>
        </Stack>
      </Box>

      {/* Balance */}
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
