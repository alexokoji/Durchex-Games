import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { TreasureHuntGame } from '../games/treasureHunt/TreasureHuntGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import { playSound } from '../constants/gameAssets';

interface GameState {
  safeClicks?: number;
  gameOver: boolean;
  won?: boolean;
  isPlaying: boolean;
  multiplier: number;
}

export default function TreasureHuntGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();

  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState<GameState>({
    gameOver: false,
    isPlaying: false,
    multiplier: 1,
  });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new TreasureHuntGame());

  useEffect(() => {
    // Game registration handled internally
  }, []);

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }

    setLoading(true);
    setGameState({ gameOver: false, isPlaying: true, multiplier: 1 });

    // Simulate auto-play with delays
    await new Promise(resolve => setTimeout(resolve, 2000));
    void runGame();
  };

  const runGame = async () => {
    try {
      const result = await game.play({
        gameId: 'treasurehunt',
        userId: user!.id,
        sessionId: `treasurehunt_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });

      setGameState({
        safeClicks: (result.details?.safeClicks as number) ?? 0,
        gameOver: true,
        won: result.won,
        isPlaying: false,
        multiplier: result.multiplier,
      });

      if (result.won) {
        playSound('win');
        const bet = await wallet.placeBet({
          gameId: 'treasurehunt',
          gameName: 'Treasure Hunt',
          stake,
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
            gameId: 'treasurehunt',
            gameName: 'Treasure Hunt',
            stake,
            payout: result.payout,
            multiplier: result.multiplier,
            won: true,
          }),
        }).catch(() => {});
        toasts.success('Won!', `${result.multiplier.toFixed(2)}x!`);
      } else {
        playSound('lose');
        const bet = await wallet.placeBet({
          gameId: 'treasurehunt',
          gameName: 'Treasure Hunt',
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
            gameId: 'treasurehunt',
            gameName: 'Treasure Hunt',
            stake,
            payout: 0,
            multiplier: 0,
            won: false,
          }),
        }).catch(() => {});
        toasts.error('Lost', 'Bomb found!');
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({ gameOver: false, isPlaying: false, multiplier: 1 });
  };

  return (
    <GamePageWrapper gameId="treasurehunt">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
          🎁 Treasure Hunt
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Find treasures, avoid bombs
        </Typography>
      </Box>

      <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
        {/* Multiplier Display */}
        <Box sx={{ mb: 3, textAlign: 'center', p: 2, background: '#1a1a2e', borderRadius: 1 }}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
            Current Multiplier
          </Typography>
          <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: neonGold }}>
            {gameState.multiplier.toFixed(2)}x
          </Typography>
        </Box>

        {/* 5x5 Grid Visualization */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 2 }}>
            {Array.from({ length: 25 }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  aspectRatio: '1',
                  background: gameState.isPlaying
                    ? i < gameState.safeClicks!
                      ? neonGreen + '30'
                      : '#fff3'
                    : '#fff3',
                  border: `1px solid ${darkBorder}`,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                {i < gameState.safeClicks! ? '✓' : '?'}
              </Box>
            ))}
          </Box>
          {gameState.isPlaying && (
            <Typography sx={{ fontSize: '0.85rem', color: neonGold, textAlign: 'center' }}>
              {gameState.safeClicks}/5 treasures...
            </Typography>
          )}
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
          {loading ? 'Hunting...' : 'Start Hunt'}
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
              {gameState.won ? '🎉 You Won!' : '💣 Bomb Found!'}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', textAlign: 'center', mt: 1 }}>
              {gameState.safeClicks} treasures found
            </Typography>
          </Box>
        )}

        {gameState.gameOver && (
          <Button fullWidth variant="outlined" onClick={reset} sx={{ borderColor: neonGold, color: neonGold }}>
            Hunt Again
          </Button>
        )}
      </Card>

      <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2 }}>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
          How to Play
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          • 25 squares: 12 treasures, 13 bombs<br />
          • Each treasure: +0.3x multiplier<br />
          • Hit bomb: lose everything<br />
          • Auto-plays 5 squares
        </Typography>
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
