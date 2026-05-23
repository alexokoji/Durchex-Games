import { useState } from 'react';
import {
  Box, Typography, IconButton, InputBase,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsHockeyIcon from '@mui/icons-material/SportsHockey';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { neonGreen, darkBorder, darkCard } from '../../theme';
import { LEAGUES, COUNTRIES } from '../core/leagueDatabase';
import type { SportKey } from '../core/types';

interface LeftSportsPanelProps {
  activeSport: SportKey;
  activeLeagueId: string;
  onSelectLeague: (id: string) => void;
  /** If provided, sport tab clicks call this instead of navigating routes. */
  onSelectSport?: (sport: SportKey) => void;
}

const SPORT_TABS: { key: SportKey; icon: React.ReactNode; label: string; path: string }[] = [
  { key: 'soccer',      icon: <SportsSoccerIcon sx={{ fontSize: 18 }} />,     label: 'Soccer',     path: '/virtual/soccer' },
  { key: 'basketball',  icon: <SportsBasketballIcon sx={{ fontSize: 18 }} />, label: 'Basketball', path: '/virtual/basketball' },
  { key: 'hockey',      icon: <SportsHockeyIcon sx={{ fontSize: 18 }} />,     label: 'Hockey',     path: '/virtual/hockey' },
  { key: 'horseracing', icon: <DirectionsRunIcon sx={{ fontSize: 18 }} />,    label: 'Horse Race', path: '/virtual/horseracing' },
];

export default function LeftSportsPanel({ activeSport, activeLeagueId, onSelectLeague, onSelectSport }: LeftSportsPanelProps) {
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState<Set<string>>(new Set(['epl', 'laliga']));
  const [filter, setFilter] = useState('');

  const sportLeagues = LEAGUES.filter(l => l.sport === activeSport);
  const filteredLeagues = sportLeagues.filter(l =>
    l.name.toLowerCase().includes(filter.toLowerCase()) || l.country.toLowerCase().includes(filter.toLowerCase()),
  );

  function toggleFav(id: string) {
    setFavourites(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const favLeagues = LEAGUES.filter(l => favourites.has(l.id) && l.sport === activeSport);

  return (
    <Box
      sx={{
        width: { xs: '100%', md: 240 },
        flexShrink: 0,
        background: darkCard,
        border: `1px solid ${darkBorder}`,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignSelf: 'flex-start',
        '@media (min-width: 900px)': {
          position: 'sticky',
          top: '12px',
          maxHeight: 'calc(100vh - 76px)',
        },
      }}
    >
      {/* Sport tabs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${darkBorder}` }}>
        {SPORT_TABS.map(s => {
          const active = s.key === activeSport;
          return (
            <Box
              key={s.key}
              onClick={() => onSelectSport ? onSelectSport(s.key) : navigate(s.path)}
              sx={{
                py: 1.25,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25,
                cursor: 'pointer',
                background: active ? alpha(neonGreen, 0.12) : 'transparent',
                borderBottom: active ? `2px solid ${neonGreen}` : '2px solid transparent',
                transition: 'all 0.2s',
                '&:hover': { background: alpha(neonGreen, 0.06) },
              }}
            >
              <Box sx={{ color: active ? neonGreen : 'text.secondary' }}>{s.icon}</Box>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: active ? neonGreen : 'text.secondary', letterSpacing: '0.06em' }}>
                {s.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Search */}
      <Box sx={{ p: 1, borderBottom: `1px solid ${darkBorder}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, background: alpha('#fff', 0.03), borderRadius: 1.5, border: `1px solid ${darkBorder}` }}>
          <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          <InputBase
            placeholder="Search leagues…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            sx={{ flex: 1, fontSize: '0.78rem' }}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, maxHeight: { xs: 360, md: 'none' } }}>
        {/* Favourites */}
        {favLeagues.length > 0 && (
          <Box sx={{ px: 1.25, py: 1 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
              ⭐ Favourites
            </Typography>
            {favLeagues.map(l => (
              <LeagueRow key={l.id} league={l} active={activeLeagueId === l.id} fav onToggleFav={toggleFav} onClick={onSelectLeague} />
            ))}
          </Box>
        )}

        {/* By country */}
        <Box sx={{ px: 1.25, py: 0.5 }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
            Countries
          </Typography>
          {COUNTRIES.map(c => {
            const leagues = c.leagueIds
              .map(id => LEAGUES.find(l => l.id === id))
              .filter((l): l is NonNullable<typeof l> => !!l && l.sport === activeSport)
              .filter(l => filteredLeagues.includes(l));
            if (leagues.length === 0) return null;
            return (
              <Box key={c.code} sx={{ mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 0.5, py: 0.5 }}>
                  <Box sx={{ fontSize: '1rem', lineHeight: 1 }}>{c.flag}</Box>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>
                    {c.name}
                  </Typography>
                </Box>
                {leagues.map(l => (
                  <LeagueRow key={l.id} league={l} active={activeLeagueId === l.id} fav={favourites.has(l.id)} onToggleFav={toggleFav} onClick={onSelectLeague} />
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

interface LeagueRowProps {
  league: typeof LEAGUES[number];
  active: boolean;
  fav: boolean;
  onClick: (id: string) => void;
  onToggleFav: (id: string) => void;
}

function LeagueRow({ league, active, fav, onClick, onToggleFav }: LeagueRowProps) {
  return (
    <Box
      onClick={() => onClick(league.id)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1, py: 0.6, ml: 1.5, borderRadius: 1, cursor: 'pointer',
        background: active ? alpha(neonGreen, 0.12) : 'transparent',
        borderLeft: active ? `2px solid ${neonGreen}` : '2px solid transparent',
        '&:hover': { background: alpha(neonGreen, 0.06) },
      }}
    >
      <Typography sx={{ flex: 1, fontSize: '0.72rem', fontWeight: active ? 800 : 600, color: active ? neonGreen : 'text.primary' }}>
        {league.shortName}
      </Typography>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onToggleFav(league.id); }}
        sx={{ p: 0.25 }}
      >
        {fav
          ? <StarIcon sx={{ fontSize: 14, color: '#ffd700' }} />
          : <StarBorderIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
      </IconButton>
    </Box>
  );
}
