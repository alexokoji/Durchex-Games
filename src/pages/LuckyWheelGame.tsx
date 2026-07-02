import { useState } from 'react';
import { Box, Button, Typography, Card, Stack } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { LuckyWheelGame } from '../games/luckyWheel/LuckyWheelGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import { playSound } from '../constants/gameAssets';
import { settleCasinoBet } from '../utils/casinoSettlement';

export default function LuckyWheelGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();
  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState({ gameOver: false, won: false, wheelSpin: 0 });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new LuckyWheelGame());

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }
    setLoading(true);
    try {
      const result = await game.play({
        gameId: 'luckywheel',
        userId: user.id,
        sessionId: `lw_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });
      setGameState({ gameOver: true, won: result.won, wheelSpin: Math.random() * 360 });
      await settleCasinoBet({
        gameId: 'luckywheel',
        gameName: 'Lucky Wheel Plus',
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
          gameId: 'luckywheel',
          gameName: 'Lucky Wheel Plus',
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
    setGameState({ gameOver: false, won: false, wheelSpin: 0 });
  };

  return (
    <GamePageWrapper gameId="luckywheel">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
            🎡 Lucky Wheel Plus
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            Spin the wheel to match symbols and win
          </Typography>
        </Box>

        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
          <Box sx={{ mb: 4, p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
              Win Multiplier
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: neonGold }}>
              2.75x
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
              Match 2+ symbols
            </Typography>
          </Box>

          <Box sx={{ mb: 4, p: 3, background: '#1a1a2e', borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 3, color: 'text.secondary' }}>
              Wheel
            </Typography>
            <Box
              sx={{
                width: 150,
                height: 150,
                mx: 'auto',
                background: `conic-gradient(${neonGold} 0deg 60deg, ${neonGreen} 60deg 120deg, #ff6b7a 120deg 180deg, ${neonGold} 180deg 240deg, ${neonGreen} 240deg 300deg, #ff6b7a 300deg)`,
                borderRadius: '50%',
                border: `3px solid ${darkBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                transform: gameState.gameOver ? `rotate(${gameState.wheelSpin}deg)` : 'rotate(0deg)',
                transition: gameState.gameOver ? 'transform 1.5s cubic-bezier(0.17, 0.67, 0.12, 0.98)' : 'none',
              }}
            >
              ◆
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
            {loading ? 'Spinning...' : 'Spin Wheel'}
          </Button>

          {gameState.gameOver && (
            <Box sx={{ p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: gameState.won ? neonGreen : '#ff6b7a', mb: 1 }}>
                {gameState.won ? '✓ Match Found!' : '✗ No Match'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {gameState.won ? `Win: ${(stake * 2.75).toFixed(2)} ${wallet.currency}` : `Loss: ${stake} ${wallet.currency}`}
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
              Spin Again
            </Button>
          )}
        </Card>

        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>How to Play</Typography>
          <Stack spacing={1} sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            <Typography>• Click to spin the wheel</Typography>
            <Typography>• Stop on matching symbols</Typography>
            <Typography>• Win 2.75x when 2+ match</Typography>
            <Typography>• Wheel has 6 segments</Typography>
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
