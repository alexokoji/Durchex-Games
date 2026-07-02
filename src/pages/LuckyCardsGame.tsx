import { useState } from 'react';
import { Box, Button, Typography, Card, Stack } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { LuckyCardsGame } from '../games/lucky/LuckyCardsGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import { playSound } from '../constants/gameAssets';
import { settleCasinoBet } from '../utils/casinoSettlement';

export default function LuckyCardsGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();
  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState({ gameOver: false, won: false, matchedPairs: 0 });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new LuckyCardsGame());

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }
    setLoading(true);
    try {
      const result = await game.play({
        gameId: 'luckycards',
        userId: user.id,
        sessionId: `lc_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });
      setGameState({ gameOver: true, won: result.won, matchedPairs: Math.floor(Math.random() * 5) + 1 });
      await settleCasinoBet({
        gameId: 'luckycards',
        gameName: 'Lucky Cards',
        betResult: result,
        stake,
        wallet,
        toasts,
        onPlaySound: playSound as (type: string) => void,
      });
      fetch('/api/leaderboard/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          gameId: 'luckycards',
          gameName: 'Lucky Cards',
          stake,
          payout: result.payout,
          multiplier: result.multiplier,
          won: result.won,
        }),
      }).catch(() => {});
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({ gameOver: false, won: false, matchedPairs: 0 });
  };

  return (
    <GamePageWrapper gameId="luckycards">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
            🃏 Lucky Cards
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            Match cards to find winning pairs
          </Typography>
        </Box>

        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
          <Box sx={{ mb: 4, p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
              Base Multiplier
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: neonGold }}>
              2.50x
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
              Match 3+ pairs to win
            </Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 2, textAlign: 'center' }}>
              Card Grid (4x3)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    aspectRatio: '1',
                    background: gameState.gameOver && gameState.won && i < gameState.matchedPairs ? neonGreen + '40' : darkBorder,
                    border: `2px solid ${darkBorder}`,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': !gameState.gameOver ? {
                      borderColor: neonGold,
                      transform: 'scale(1.08)',
                    } : {},
                  }}
                >
                  {gameState.gameOver && gameState.won && i < gameState.matchedPairs ? '✓' : '🂠'}
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>Stake</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <input
                type="number"
                value={stake}
                onChange={(e) => setStake(Math.max(1, parseInt(e.target.value) || 1))}
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
              '&:hover': { opacity: 0.9 },
            }}
          >
            {loading ? 'Flipping...' : 'Draw Cards'}
          </Button>

          {gameState.gameOver && (
            <Box sx={{ p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: gameState.won ? neonGreen : '#ff6b7a', mb: 1 }}>
                {gameState.won ? '✓ Lucky Match!' : '✗ No Match'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {gameState.won ? `Pairs matched: ${gameState.matchedPairs} • Win: ${(stake * 2.5).toFixed(2)} ${wallet.currency}` : `Loss: ${stake} ${wallet.currency}`}
              </Typography>
            </Box>
          )}

          {gameState.gameOver && (
            <Button
              fullWidth
              variant="outlined"
              onClick={reset}
              sx={{ borderColor: neonGold, color: neonGold, fontWeight: 700 }}
            >
              Try Again
            </Button>
          )}
        </Card>

        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>How to Play</Typography>
          <Stack spacing={1} sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            <Typography>• Draw 6 cards from a shuffled deck</Typography>
            <Typography>• Match 3+ pairs to win 2.50x</Typography>
            <Typography>• Each pair increases your payout</Typography>
            <Typography>• Random selection = high volatility</Typography>
          </Stack>
        </Card>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>Balance</Typography>
          <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: neonGreen }}>
            {wallet.balance.toFixed(2)} {wallet.currency}
          </Typography>
        </Box>
      </Box>
    </GamePageWrapper>
  );
}
