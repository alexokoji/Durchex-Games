import { useState } from 'react';
import { Box, Button, Typography, Card, Stack, LinearProgress } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { BombSquadGame } from '../games/bombSquad/BombSquadGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import { playSound } from '../constants/gameAssets';
import { settleCasinoBet } from '../utils/casinoSettlement';

export default function BombSquadGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();
  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState({ gameOver: false, won: false, boxesClicked: 0 });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new BombSquadGame());

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }
    setLoading(true);
    try {
      const result = await game.play({
        gameId: 'bombsquad',
        userId: user.id,
        sessionId: `bs_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });
      setGameState({ gameOver: true, won: result.won, boxesClicked: Math.floor(Math.random() * 7) + 1 });
      await settleCasinoBet({
        gameId: 'bombsquad',
        gameName: 'Bomb Squad',
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
          gameId: 'bombsquad',
          gameName: 'Bomb Squad',
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
    setGameState({ gameOver: false, won: false, boxesClicked: 0 });
  };

  return (
    <GamePageWrapper gameId="bombsquad">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
            💣 Bomb Squad
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            Click boxes to find safe ones and multiply your winnings
          </Typography>
        </Box>

        {/* Main Card */}
        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
          {/* Difficulty Indicator */}
          <Box sx={{ mb: 4, p: 2, background: '#1a1a2e', borderRadius: 1 }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
              Risk Level
            </Typography>
            <LinearProgress
              variant="determinate"
              value={60}
              sx={{
                background: `${darkBorder}80`,
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  background: `linear-gradient(90deg, ${neonGreen}, ${neonGold})`,
                },
              }}
            />
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
              6 bombs in 12 boxes • High volatility
            </Typography>
          </Box>

          {/* Game Grid Visualization */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 2, textAlign: 'center' }}>
              Box Grid (3x4)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    aspectRatio: '1',
                    background: gameState.gameOver
                      ? i < gameState.boxesClicked
                        ? neonGreen + '40'
                        : darkBorder
                      : darkBorder,
                    border: `1px solid ${darkBorder}`,
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
                  {gameState.gameOver && i < gameState.boxesClicked ? '✓' : '📦'}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Multiplier Display */}
          <Box sx={{ mb: 3, p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
              Current Multiplier
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: gameState.won ? neonGreen : '#ff6b7a' }}>
              {gameState.gameOver ? (gameState.won ? `${(gameState.boxesClicked * 0.25 + 1).toFixed(2)}x` : '0x') : '—'}
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
            {loading ? 'Defusing...' : 'Start Defusal'}
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
                {gameState.won ? '✅ Bombs Defused!' : '💥 Explosion!'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {gameState.won
                  ? `Safe boxes: ${gameState.boxesClicked} • Win: ${(stake * (gameState.boxesClicked * 0.25 + 1)).toFixed(2)} ${wallet.currency}`
                  : `Loss: ${stake} ${wallet.currency}`}
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

        {/* How to Play */}
        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, mb: 1 }}>
            How to Play
          </Typography>
          <Stack spacing={1} sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            <Typography>• 12 boxes: 6 bombs, 6 safe</Typography>
            <Typography>• Each safe box = +0.25x multiplier</Typography>
            <Typography>• Hit a bomb = lose everything</Typography>
            <Typography>• Cash out anytime to lock in winnings</Typography>
          </Stack>
        </Card>

        {/* Balance Display */}
        <Box sx={{ textAlign: 'center' }}>
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
