import { useEffect, useState } from 'react';
import { Box, Button, Typography, Card, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useToasts } from '../contexts/ToastContext';
import { neonGreen, neonGold, darkCard, darkBorder } from '../theme';
import { GameEngine } from '../games/shared/GameEngine';
import { DiceDuelGame } from '../games/diceDuel/DiceDuelGame';
import GamePageWrapper from '../components/games/GamePageWrapper';
import AvailableBalance from '../components/games/AvailableBalance';
import { playSound } from '../constants/gameAssets';

type DiceMode = '1' | '2' | '3';

interface GameState {
  mode?: DiceMode;
  playerRoll?: number;
  houseRoll?: number;
  gameOver: boolean;
  won?: boolean;
  isRolling: boolean;
}

const ODDS: Record<DiceMode, string> = { '1': '1.98x', '2': '2.38x', '3': '3x' };
const WIN_RATE: Record<DiceMode, string> = { '1': '50%', '2': '42%', '3': '33%' };

export default function DiceDuelGamePage() {
  const wallet = useWallet();
  const { user } = useAuth();
  const toasts = useToasts();

  const [stake, setStake] = useState(100);
  const [diceMode, setDiceMode] = useState<DiceMode>('1');
  const [gameState, setGameState] = useState<GameState>({
    gameOver: false,
    isRolling: false,
  });
  const [loading, setLoading] = useState(false);
  const [_engine] = useState(() => new GameEngine());
  const [game] = useState(() => new DiceDuelGame());
  const [displayPlayer, setDisplayPlayer] = useState(0);
  const [displayHouse, setDisplayHouse] = useState(0);

  useEffect(() => {
    // Game registration handled internally
  }, []);

  const playGame = async () => {
    if (!user || stake > wallet.balance) {
      toasts.error('Insufficient balance', 'Check your wallet');
      return;
    }

    setLoading(true);
    setGameState({ mode: diceMode, gameOver: false, isRolling: true });
    setDisplayPlayer(0);
    setDisplayHouse(0);

    // Dice roll animation
    const rollDuration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / rollDuration, 1);

      const numDice = parseInt(diceMode);
      const playerDots = Math.floor(Math.random() * (numDice * 6)) + numDice;
      const houseDots = Math.floor(Math.random() * (numDice * 6)) + numDice;

      setDisplayPlayer(playerDots);
      setDisplayHouse(houseDots);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        void runGame();
      }
    };

    requestAnimationFrame(animate);
  };

  const runGame = async () => {
    try {
      const result = await game.play({
        gameId: 'diceduel',
        userId: user!.id,
        sessionId: `diceduel_${Date.now()}`,
        stake,
        currency: wallet.currency,
        autoPlayCount: 0,
        mode: 'single',
      });

      setGameState({
        mode: diceMode,
        playerRoll: (result.details?.playerRoll as number) ?? 0,
        houseRoll: (result.details?.houseRoll as number) ?? 0,
        gameOver: true,
        won: result.won,
        isRolling: false,
      });

      if (result.won) {
        const bet = await wallet.placeBet({
          gameId: 'diceduel',
          gameName: 'Dice Duel',
          stake,
          details: `${diceMode} die mode`,
        });
        if (bet) {
          await wallet.settleBet(bet.id, {
            won: true,
            payout: result.payout,
            multiplier: result.multiplier,
          });
        }
        playSound('win');
        toasts.success('Won!', `${result.multiplier.toFixed(2)}x!`);
      } else {
        playSound('lose');
        const bet = await wallet.placeBet({
          gameId: 'diceduel',
          gameName: 'Dice Duel',
          stake,
        });
        if (bet) {
          await wallet.settleBet(bet.id, { won: false, payout: 0 });
        }
        toasts.error('Lost', 'House rolled higher');
      }
    } catch (e: any) {
      toasts.error('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setGameState({ gameOver: false, isRolling: false });
    setDisplayPlayer(0);
    setDisplayHouse(0);
  };

  return (
    <GamePageWrapper gameId="diceduel">
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '2rem', fontWeight: 900, mb: 1 }}>
          🎲 Dice Duel
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 2 }}>
          Roll higher than the house
        </Typography>
      </Box>

      <Card sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, p: 3, mb: 2 }}>
        {/* Dice Display */}
        <Stack direction="row" spacing={3} sx={{ mb: 3, justifyContent: 'center' }}>
          {/* Player */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
              You
            </Typography>
            <Box
              sx={{
                width: 80,
                height: 80,
                background: neonGreen + '20',
                border: `2px solid ${neonGreen}`,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 900,
              }}
            >
              {displayPlayer || '?'}
            </Box>
          </Box>

          <Typography sx={{ alignSelf: 'center', fontSize: '1.5rem', color: 'text.secondary' }}>
            vs
          </Typography>

          {/* House */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary', mb: 1 }}>
              House
            </Typography>
            <Box
              sx={{
                width: 80,
                height: 80,
                background: '#ff6b7a20',
                border: '2px solid #ff6b7a',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 900,
              }}
            >
              {displayHouse || '?'}
            </Box>
          </Box>
        </Stack>

        {/* Mode Selector */}
        {!gameState.gameOver && !gameState.isRolling && (
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 1.5 }}>
              Dice Mode
            </Typography>
            <ToggleButtonGroup
              value={diceMode}
              exclusive
              onChange={(_, newMode) => newMode && setDiceMode(newMode)}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  borderColor: darkBorder,
                  color: 'text.secondary',
                  '&.Mui-selected': { background: neonGold + '30', borderColor: neonGold, color: neonGold },
                },
              }}
            >
              <ToggleButton value="1">1 Die ({ODDS['1']}) {WIN_RATE['1']}</ToggleButton>
              <ToggleButton value="2">2 Dice ({ODDS['2']}) {WIN_RATE['2']}</ToggleButton>
              <ToggleButton value="3">3 Dice ({ODDS['3']}) {WIN_RATE['3']}</ToggleButton>
            </ToggleButtonGroup>
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
          {loading ? 'Rolling...' : 'Roll Dice'}
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
              {gameState.won ? '🎉 You Won!' : '❌ You Lost'}
            </Typography>
          </Box>
        )}

        {gameState.gameOver && (
          <Button fullWidth variant="outlined" onClick={reset} sx={{ borderColor: neonGold, color: neonGold }}>
            Roll Again
          </Button>
        )}
      </Card>

      <Box sx={{ mt: 3 }}>
        <AvailableBalance balance={wallet.balance} bonusBalance={wallet.bonusBalance} currency={wallet.currency} />
      </Box>
    </Box>
    </GamePageWrapper>
  );
}
