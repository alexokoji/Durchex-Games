/**
 * Hi-Lo Game - Updated with Leaderboards + Responsive Design + Sounds
 *
 * Features:
 * - Responsive design (mobile/tablet/desktop)
 * - Leaderboard sidebar (desktop) / bottom (mobile)
 * - Sound effects on win/lose
 * - CC0 cover image
 * - Auto-settling to wallet
 *
 * Usage: Replace current HiLoGame.tsx with this file
 */

import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card, useMediaQuery, useTheme } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { HiLoGame } from '../games/hiLo/HiLoGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [stake, setStake] = useState(100);
  const [gameState, setGameState] = useState<GameState>({
    correctCount: 0,
    multiplier: 1,
    gameOver: false,
  });
  const [loading, setLoading] = useState(false);
  const [engine] = useState(() => new GameEngine());
  const [game] = useState(() => new HiLoGame(engine));

  useEffect(() => {
    engine.registerGame(game);
  }, [engine, game]);

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

        // Record to leaderboard
        await fetch('/api/leaderboard/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: 'hilo',
            gameName: 'Hi-Lo',
            stake,
            payout: result.payout,
            multiplier: result.multiplier,
            won: true,
          }),
        }).catch(() => {}); // Silently fail if API not ready

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

        // Record to leaderboard
        await fetch('/api/leaderboard/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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

  const gameContent = (
    <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: isMobile ? 2 : 3 }}>
      <Box sx={{ mb: 3, textAlign: 'center', p: 2, background: '#1a1a2e', borderRadius: 1 }}>
        <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
          Correct Predictions
        </Typography>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: neonGold }}>
          {gameState.correctCount} / 5
        </Typography>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: neonGreen, mt: 1 }}>
          {gameState.multiplier.toFixed(2)}x
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1 }}>Stake</Typography>
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
        {loading ? 'Playing...' : 'Play'}
      </Button>

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
        </Box>
      )}

      {gameState.gameOver && (
        <Button fullWidth variant="outlined" onClick={reset} sx={{ borderColor: neonGold, color: neonGold }}>
          Play Again
        </Button>
      )}
    </Card>
  );

  return (
    <GamePageWrapper gameId="hilo">
      {gameContent}
    </GamePageWrapper>
  );
}
