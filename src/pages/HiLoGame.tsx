import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card, Stack, Chip } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { HiLoGame } from '../games/hiLo/HiLoGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import AvailableBalance from '../components/games/AvailableBalance';
import { playSound } from '../constants/gameAssets';

interface GameState {
  currentCard?: { value: number; suit: string; label: string };
  prediction?: 'higher' | 'lower';
  correctCount: number;
  multiplier: number;
  gameOver: boolean;
  won?: boolean;
}

export default function HiLoGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();

  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState<GameState>({
    correctCount: 0,
    multiplier: 1,
    gameOver: false,
  });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new HiLoGame(_engine));

  useEffect(() => {
    _engine.registerGame(game);
  }, [_engine, game]);

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }

    setLoading(true);
    try {
      const result = await game.play({
        gameId: 'hilo',
        userId: user.id,
        sessionId: `hilo_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });

      setGameState({
        correctCount: (result.details?.streak as number) ?? 0,
        multiplier: result.multiplier,
        gameOver: true,
        won: result.won,
      });

      if (result.won) {
        playSound('win');
        const bet = await wallet.placeBet({
          gameId: 'hilo',
          gameName: 'Hi-Lo',
          stake,
          details: `${result.details?.streak ?? 0} correct predictions`,
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
            userId: user.id,
            username: user.username,
            gameId: 'hilo',
            gameName: 'Hi-Lo',
            stake,
            payout: result.payout,
            multiplier: result.multiplier,
            won: true,
          }),
        }).catch(() => {});
        toasts.success('Won!', `${result.multiplier.toFixed(2)}x`);
      } else {
        playSound('lose');
        const bet = await wallet.placeBet({
          gameId: 'hilo',
          gameName: 'Hi-Lo',
          stake,
        });
        if (bet) {
          await wallet.settleBet(bet.id, { won: false, payout: 0 });
        }
        fetch('/api/leaderboard/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            username: user.username,
            gameId: 'hilo',
            gameName: 'Hi-Lo',
            stake,
            payout: 0,
            multiplier: 0,
            won: false,
          }),
        }).catch(() => {});
        toasts.error('Lost', 'Better luck next time');
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({
      correctCount: 0,
      multiplier: 1,
      gameOver: false,
    });
  };

  return (
    <GamePageWrapper gameId="hilo">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
          🎴 Hi-Lo
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Predict if the next card is higher or lower
        </Typography>
      </Box>

      {/* Game Card */}
      <Card
        sx={{
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          borderRadius: 2,
          p: 3,
          mb: 2,
        }}
      >
        {/* Current Card Display */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
            Current Card
          </Typography>
          <Box
            sx={{
              width: 100,
              height: 140,
              background: '#fff',
              border: '2px solid #333',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              fontSize: '3rem',
              fontWeight: 900,
              color: '#000',
            }}
          >
            {gameState.currentCard
              ? `${gameState.currentCard.label}${gameState.currentCard.suit}`
              : '🂠'}
          </Box>
        </Box>

        {/* Streak Counter */}
        {gameState.correctCount > 0 && (
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Chip
              label={`${gameState.correctCount} Correct · ${gameState.multiplier.toFixed(2)}x`}
              sx={{
                height: 32,
                fontSize: '0.9rem',
                fontWeight: 700,
                background: `${neonGold}22`,
                color: neonGold,
              }}
            />
          </Box>
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
            '&:hover': { background: neonGreen, opacity: 0.9 },
          }}
        >
          {loading ? 'Playing...' : 'Play'}
        </Button>

        {/* Game Over Result */}
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
              <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', textAlign: 'center' }}>
                {gameState.correctCount} correct · {gameState.multiplier.toFixed(2)}x
              </Typography>
            )}
          </Box>
        )}

        {/* Reset Button */}
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
          <Typography>2. Predict if the next card is Higher or Lower</Typography>
          <Typography>3. Win and increase your multiplier (cash out anytime)</Typography>
          <Typography>4. Streak: 1→1.8x, 2→3.2x, 3→5.5x, 5→15x, 10→150x</Typography>
        </Stack>
      </Box>

        <Box sx={{ mt: 3 }}>
          <AvailableBalance balance={wallet.balance} bonusBalance={wallet.bonusBalance} currency={wallet.currency} />
        </Box>
      </Box>
    </GamePageWrapper>
  );
}
