import { useState } from 'react';
import {
  Box, Typography, Chip, IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PeopleIcon from '@mui/icons-material/People';
import { useNavigate } from 'react-router-dom';
import { neonGreen, neonBlue, darkBorder, darkCard } from '../../theme';

export interface GameCardData {
  id: string;
  title: string;
  provider: string;
  rtp: string;
  players: number;
  badge?: string;
  badgeColor?: string;
  gradient: string;
  path?: string;
  icon: React.ReactNode;
}

interface GameCardProps {
  game: GameCardData;
}

export default function GameCard({ game }: GameCardProps) {
  const [fav, setFav] = useState(false);
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  function handlePlay() {
    if (game.path) navigate(game.path);
  }

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Box
        sx={{
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          cursor: 'pointer',
          background: darkCard,
          border: `1px solid ${darkBorder}`,
          transition: 'all 0.3s ease',
          ...(hovered && {
            border: `1px solid ${alpha(neonGreen, 0.5)}`,
            boxShadow: `0 0 20px ${alpha(neonGreen, 0.2)}, 0 8px 30px rgba(0,0,0,0.4)`,
          }),
        }}
      >
        {/* Game thumbnail */}
        <Box
          sx={{
            height: 130,
            background: game.gradient,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              fontSize: 56,
              opacity: 0.9,
              transition: 'transform 0.3s ease',
              transform: hovered ? 'scale(1.15) rotate(5deg)' : 'scale(1)',
            }}
          >
            {game.icon}
          </Box>

          {/* Overlay on hover */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Box
              onClick={handlePlay}
              sx={{
                width: 48, height: 48, borderRadius: '50%',
                background: `linear-gradient(135deg, ${neonGreen}, #00cc6a)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 20px ${alpha(neonGreen, 0.6)}`,
                cursor: 'pointer',
                '&:hover': { transform: 'scale(1.1)' },
                transition: 'transform 0.2s',
              }}
            >
              <PlayArrowIcon sx={{ color: '#000', fontSize: 28 }} />
            </Box>
          </motion.div>

          {/* Badge */}
          {game.badge && (
            <Chip
              label={game.badge}
              size="small"
              sx={{
                position: 'absolute', top: 8, left: 8,
                background: game.badgeColor || neonGreen,
                color: '#000', fontWeight: 800, fontSize: '0.62rem', height: 20,
              }}
            />
          )}

          {/* Favorite */}
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); setFav(p => !p); }}
            sx={{
              position: 'absolute', top: 6, right: 6,
              background: alpha('#000', 0.5),
              width: 26, height: 26,
              '&:hover': { background: alpha('#000', 0.7) },
            }}
          >
            {fav
              ? <FavoriteIcon sx={{ fontSize: 14, color: '#ff4757' }} />
              : <FavoriteBorderIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
            }
          </IconButton>
        </Box>

        {/* Info */}
        <Box sx={{ p: 1.2 }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', mb: 0.25 }} noWrap>
            {game.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }} noWrap>
              {game.provider}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PeopleIcon sx={{ fontSize: 10, color: neonBlue }} />
              <Typography sx={{ fontSize: '0.65rem', color: neonBlue, fontWeight: 600 }}>
                {game.players.toLocaleString()}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
              RTP: <span style={{ color: neonGreen, fontWeight: 700 }}>{game.rtp}</span>
            </Typography>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}
