import { useState } from 'react';
import { Box, Button, Typography, Card } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { LuckyCardsGame } from '../games/lucky/LuckyCardsGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import { playSound } from '../constants/gameAssets';

export default function LuckyCardsGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();
  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState({ gameOver: false, won: false });
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
      setGameState({ gameOver: true, won: result.won });
      const bet = await wallet.placeBet({ gameId: 'luckycards', gameName: 'Lucky Cards', stake });
      if (bet)
        await wallet.settleBet(bet.id, {
          won: result.won,
          payout: result.payout,
          multiplier: result.multiplier,
        });
      if (result.won) {
        playSound('win');
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
            won: true,
          }),
        }).catch(() => {});
        toasts.success('Won!', `${result.multiplier.toFixed(2)}x!`);
      } else {
        playSound('lose');
        fetch('/api/leaderboard/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            username: user.username,
            gameId: 'luckycards',
            gameName: 'Lucky Cards',
            stake,
            payout: 0,
            multiplier: 0,
            won: false,
          }),
        }).catch(() => {});
        toasts.error('Lost', 'No match');
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GamePageWrapper gameId="luckycards">
      <Box sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 3, textAlign: 'center' }}>
          🃏 Lucky Cards
        </Typography>
        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>Stake</Typography>
            <input
              type="number"
              value={stake}
              onChange={e => setStake(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={loading || gameState.gameOver}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 4,
                border: `1px solid ${darkBorder}`,
                background: '#1a1a2e',
                color: '#fff',
              }}
            />
          </Box>
          <Button
            fullWidth
            variant="contained"
            disabled={loading || gameState.gameOver}
            onClick={playGame}
            sx={{ background: neonGreen, color: '#000', fontWeight: 900, py: 1.5, mb: 2 }}
          >
            {loading ? 'Drawing...' : 'Draw Cards'}
          </Button>
          {gameState.gameOver && (
            <Box sx={{ p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center', mb: 2 }}>
              <Typography
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: gameState.won ? neonGreen : '#ff6b7a',
                }}
              >
                {gameState.won ? '✓ Lucky!' : '✗ No Match'}
              </Typography>
            </Box>
          )}
          {gameState.gameOver && (
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setGameState({ gameOver: false, won: false })}
              sx={{ borderColor: neonGold, color: neonGold }}
            >
              Play Again
            </Button>
          )}
        </Card>
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>Balance</Typography>
          <Typography sx={{ fontSize: '1.3rem', fontWeight: 900, color: neonGreen }}>
            {wallet.balance.toFixed(2)} {wallet.currency}
          </Typography>
        </Box>
      </Box>
    </GamePageWrapper>
  );
}
