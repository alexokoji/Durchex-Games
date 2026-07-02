import { useState } from 'react';
import { Box, Button, Typography, Card, Stack } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { LuckyDoorGame } from '../games/luckyDoor/LuckyDoorGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import AvailableBalance from '../components/games/AvailableBalance';
import { playSound } from '../constants/gameAssets';
import { settleCasinoBet } from '../utils/casinoSettlement';

export default function LuckyDoorGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();
  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState({ gameOver: false, won: false, selectedDoor: null as number | null });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new LuckyDoorGame());

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }
    setLoading(true);
    try {
      const result = await game.play({
        gameId: 'luckydoor',
        userId: user.id,
        sessionId: `ld_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });
      setGameState({ gameOver: true, won: result.won, selectedDoor: Math.floor(Math.random() * 3) + 1 });
      await settleCasinoBet({
        gameId: 'luckydoor',
        gameName: 'Lucky Door',
        betResult: result,
        stake,
        wallet,
        toasts,
        onPlaySound: playSound as (type: string) => void,
      });
      // Post to leaderboard
      fetch('/api/leaderboard/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          username: user.username,
          gameId: 'luckydoor',
          gameName: 'Lucky Door',
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
    setGameState({ gameOver: false, won: false, selectedDoor: null });
  };

  return (
    <GamePageWrapper gameId="luckydoor">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
            🚪 Lucky Door
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            Pick the right door to win 3x your stake
          </Typography>
        </Box>

        {/* Main Card */}
        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
          {/* Win Rate Display */}
          <Box sx={{ mb: 4, p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
              Multiplier
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: neonGold }}>
              3.00x
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
              33% Chance
            </Typography>
          </Box>

          {/* Door Visualization */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 2, textAlign: 'center' }}>
              Which Door?
            </Typography>
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
              {[1, 2, 3].map((doorNum) => (
                <Box
                  key={doorNum}
                  sx={{
                    width: 80,
                    height: 120,
                    background: gameState.won && gameState.selectedDoor === doorNum ? neonGreen : darkBorder,
                    border: `2px solid ${gameState.selectedDoor === doorNum ? neonGold : darkBorder}`,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.5rem',
                    cursor: 'pointer',
                    opacity: gameState.gameOver ? 1 : 0.7,
                    transition: 'all 0.3s ease',
                    '&:hover': !gameState.gameOver ? {
                      opacity: 1,
                      borderColor: neonGold,
                      transform: 'scale(1.05)',
                    } : {},
                  }}
                >
                  {gameState.gameOver && gameState.selectedDoor === doorNum ? (
                    gameState.won ? '🎁' : '💨'
                  ) : (
                    '🚪'
                  )}
                </Box>
              ))}
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
              '&:hover': { opacity: 0.9 },
            }}
          >
            {loading ? 'Opening Door...' : 'Pick Door'}
          </Button>

          {/* Result Display */}
          {gameState.gameOver && (
            <Box sx={{ p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center', mb: 2 }}>
              <Typography
                sx={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: gameState.won ? neonGreen : '#ff6b7a',
                  mb: 1,
                }}
              >
                {gameState.won ? '🎉 Correct Door!' : '❌ Wrong Door'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {gameState.won ? `Win: ${(stake * 3).toFixed(2)} ${wallet.currency}` : `Loss: ${stake} ${wallet.currency}`}
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
              Play Again
            </Button>
          )}
        </Card>

        {/* How to Play */}
        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
            How to Play
          </Typography>
          <Stack spacing={1} sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            <Typography>• Choose your stake amount</Typography>
            <Typography>• Pick one of three doors</Typography>
            <Typography>• Win 3x your stake if correct</Typography>
            <Typography>• One door has a prize, two are empty</Typography>
          </Stack>
        </Card>

        <AvailableBalance balance={wallet.balance} bonusBalance={wallet.bonusBalance} currency={wallet.currency} />
      </Box>
    </GamePageWrapper>
  );
}
