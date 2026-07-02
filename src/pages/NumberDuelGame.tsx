import { useState } from 'react';
import { Box, Button, Typography, Card, Stack } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { NumberDuelGame } from '../games/numberDuel/NumberDuelGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import AvailableBalance from '../components/games/AvailableBalance';
import { playSound } from '../constants/gameAssets';
import { settleCasinoBet } from '../utils/casinoSettlement';

export default function NumberDuelGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();
  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState({ gameOver: false, won: false, playerNum: 0, houseNum: 0 });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new NumberDuelGame());

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }
    setLoading(true);
    try {
      const result = await game.play({
        gameId: 'numberduel',
        userId: user.id,
        sessionId: `nd_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });
      const playerNum = Math.floor(Math.random() * 100) + 1;
      const houseNum = Math.floor(Math.random() * 100) + 1;
      setGameState({ gameOver: true, won: result.won, playerNum, houseNum });
      await settleCasinoBet({
        gameId: 'numberduel',
        gameName: 'Number Duel',
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
          gameId: 'numberduel',
          gameName: 'Number Duel',
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
    setGameState({ gameOver: false, won: false, playerNum: 0, houseNum: 0 });
  };

  return (
    <GamePageWrapper gameId="numberduel">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
            🎯 Number Duel
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 2 }}>
            Pick a higher number than the house to win 1.98x
          </Typography>
        </Box>

        {/* Main Card */}
        <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
          {/* Odds Display */}
          <Box sx={{ mb: 4, p: 2, background: '#1a1a2e', borderRadius: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
              Win Multiplier
            </Typography>
            <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: neonGold }}>
              1.98x
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
              ~50% Probability
            </Typography>
          </Box>

          {/* Number Display (Game Result) */}
          {gameState.gameOver && (
            <Box sx={{ mb: 4 }}>
              <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: neonGreen, mb: 1 }}>
                    YOUR NUMBER
                  </Typography>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      background: gameState.won ? neonGreen + '20' : '#ff6b7a20',
                      border: `2px solid ${gameState.won ? neonGreen : '#ff6b7a'}`,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      fontWeight: 900,
                      color: gameState.won ? neonGreen : '#ff6b7a',
                    }}
                  >
                    {gameState.playerNum}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, color: neonGold }}>
                    vs
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#888', mb: 1 }}>
                    HOUSE NUMBER
                  </Typography>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      background: '#88888820',
                      border: `2px solid #888`,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      fontWeight: 900,
                      color: '#888',
                    }}
                  >
                    {gameState.houseNum}
                  </Box>
                </Box>
              </Stack>
            </Box>
          )}

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
            {loading ? 'Rolling...' : 'Duel'}
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
                {gameState.won ? '✓ Higher!' : '✗ Lower'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {gameState.won ? `Win: ${(stake * 1.98).toFixed(2)} ${wallet.currency}` : `Loss: ${stake} ${wallet.currency}`}
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
            <Typography>• 1-100: Pick your number</Typography>
            <Typography>• House gets random number</Typography>
            <Typography>• Your number higher = win 1.98x</Typography>
            <Typography>• Evenly matched odds (≈50%)</Typography>
          </Stack>
        </Card>

        <AvailableBalance balance={wallet.balance} bonusBalance={wallet.bonusBalance} currency={wallet.currency} />
      </Box>
    </GamePageWrapper>
  );
}
