import { useState } from 'react';
import { Box, Typography, Button, Chip, Collapse } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { neonGreen, neonGold, darkBorder, darkCard, darkSurface } from '../../theme';
import { useBetSlip } from '../core/BetSlipContext';
import { formatOdds } from '../core/oddsEngine';
import { RACE_TYPE_META } from './horseDatabase';
import type { ScheduledRace } from './useHorseRacingSchedule';
import type { Market, MarketOption, BetSelection } from '../core/types';

interface Props { race: ScheduledRace; onFeature?: (id: string) => void; featured?: boolean }

export default function HorseRaceCard({ race, onFeature, featured }: Props) {
  const [expanded, setExpanded] = useState(false);
  const winMarket   = race.markets.find(m => m.category === 'WIN')!;
  const placeMarket = race.markets.find(m => m.category === 'PLACE')!;
  const meta = RACE_TYPE_META[race.raceType];

  const phaseLabel = race.phase === 'betting' ? 'BETTING OPEN' : race.phase === 'live' ? 'LIVE' : 'RESULT';
  const phaseColor = race.phase === 'betting' ? neonGreen : race.phase === 'live' ? '#ff4757' : neonGold;

  const winner = race.phase === 'finished' ? race.simulation.finishOrder[0] : null;
  const winnerHorse = winner ? race.horses.find(h => h.id === winner) : null;

  return (
    <Box sx={{ background: darkCard, border: `1px solid ${featured ? alpha(neonGreen, 0.4) : darkBorder}`, borderRadius: 2, overflow: 'hidden', boxShadow: featured ? `0 0 20px ${alpha(neonGreen, 0.15)}` : 'none' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.75, borderBottom: `1px solid ${darkBorder}`, background: featured ? alpha(neonGreen, 0.04) : 'transparent' }}>
        <motion.div animate={race.phase === 'live' ? { opacity: [1, 0.6, 1] } : {}} transition={{ duration: 1.2, repeat: Infinity }}>
          <Chip label={phaseLabel} size="small" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800, background: alpha(phaseColor, 0.16), color: phaseColor, border: `1px solid ${alpha(phaseColor, 0.35)}` }} />
        </motion.div>
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Race {race.raceNumber} · {meta.label} · {meta.distance}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {onFeature && !featured && (
          <Button size="small" onClick={() => onFeature(race.id)} sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary', '&:hover': { color: neonGreen } }}>
            Watch
          </Button>
        )}
      </Box>

      {winnerHorse && (
        <Box sx={{ px: 1.5, py: 0.75, background: alpha(neonGold, 0.06), borderBottom: `1px solid ${darkBorder}` }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: neonGold }}>
            🏆 #{winnerHorse.number} {winnerHorse.name} — {winnerHorse.jockey}
          </Typography>
        </Box>
      )}

      {/* Horses table with Win odds + Place odds */}
      <Box sx={{ px: 1, py: 0.75 }}>
        {race.horses.map((h, i) => {
          const winOpt   = winMarket.options.find(o => o.id === h.id)!;
          const placeOpt = placeMarket.options.find(o => o.id === h.id)!;
          const isWinner = race.phase === 'finished' && race.simulation.finishOrder[0] === h.id;
          const place3   = race.phase === 'finished' && race.simulation.finishOrder.slice(0, 3).includes(h.id);
          return (
            <Box
              key={h.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr auto auto',
                alignItems: 'center',
                gap: 0.75,
                px: 0.75,
                py: 0.4,
                borderRadius: 1,
                background: isWinner ? alpha(neonGold, 0.12) : (i % 2 === 0 ? 'transparent' : alpha('#fff', 0.02)),
                borderLeft: place3 ? `3px solid ${neonGold}` : '3px solid transparent',
              }}
            >
              <Box sx={{
                width: 22, height: 22, borderRadius: 0.5,
                background: h.silkPrimary,
                border: `1.5px solid ${h.silkSecondary}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: h.silkSecondary, fontSize: '0.65rem', fontWeight: 900,
              }}>
                {h.number}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.name}
                </Typography>
                <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>
                  {h.jockey} · spd {h.speed} stm {h.stamina}
                </Typography>
              </Box>
              <CompactOddsButton race={race} market={winMarket} option={winOpt} label="WIN" disabled={race.phase !== 'betting'} />
              <CompactOddsButton race={race} market={placeMarket} option={placeOpt} label="PL" disabled={race.phase !== 'betting'} />
            </Box>
          );
        })}
      </Box>

      <Box sx={{ borderTop: `1px solid ${darkBorder}` }}>
        <Box onClick={() => setExpanded(e => !e)} sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, py: 0.5, cursor: 'pointer',
          color: 'text.secondary', '&:hover': { color: neonGreen, background: alpha(neonGreen, 0.05) },
        }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>
            {expanded ? 'Hide exotic bets' : 'Forecast & Quinella'}
          </Typography>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
        </Box>
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1, background: darkSurface }}>
            {race.markets.filter(m => m.category !== 'WIN' && m.category !== 'PLACE').map(m => (
              <ExoticMarket key={m.id} race={race} market={m} disabled={race.phase !== 'betting'} />
            ))}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}

function CompactOddsButton({ race, market, option, label, disabled }: {
  race: ScheduledRace; market: Market; option: MarketOption; label: string; disabled?: boolean;
}) {
  const slip = useBetSlip();
  const selected = slip.isSelected(race.id, market.id, option.id);
  function pick() {
    if (disabled) return;
    const sel: BetSelection = {
      id: `${race.id}:${market.id}:${option.id}`,
      matchId: race.id, marketId: market.id,
      marketCategory: market.category, marketLabel: market.label,
      optionId: option.id, optionLabel: option.label, odds: option.odds,
      sport: 'horseracing', leagueId: 'turf',
      homeTeam: `Race ${race.raceNumber}`, awayTeam: option.label,
      startsAt: Date.now(), addedAt: Date.now(),
    };
    slip.addSelection(sel);
  }
  return (
    <Button
      onClick={pick}
      disabled={disabled}
      sx={{
        minWidth: 0, px: 0.6, py: 0.3, borderRadius: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textTransform: 'none',
        background: selected ? alpha(neonGreen, 0.18) : alpha('#fff', 0.04),
        border: `1px solid ${selected ? alpha(neonGreen, 0.55) : darkBorder}`,
        '&:hover': { background: selected ? alpha(neonGreen, 0.22) : alpha(neonGreen, 0.08) },
        '&.Mui-disabled': { opacity: 0.55 },
      }}
    >
      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.74rem', fontWeight: 900, color: selected ? neonGreen : neonGold, fontVariantNumeric: 'tabular-nums' }}>
        {formatOdds(option.odds, slip.oddsFormat)}
      </Typography>
    </Button>
  );
}

function ExoticMarket({ race, market, disabled }: { race: ScheduledRace; market: Market; disabled?: boolean }) {
  const slip = useBetSlip();
  return (
    <Box>
      <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', mb: 0.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {market.label}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
        {market.options.map(opt => {
          const selected = slip.isSelected(race.id, market.id, opt.id);
          function pick() {
            if (disabled) return;
            slip.addSelection({
              id: `${race.id}:${market.id}:${opt.id}`,
              matchId: race.id, marketId: market.id,
              marketCategory: market.category, marketLabel: market.label,
              optionId: opt.id, optionLabel: opt.label, odds: opt.odds,
              sport: 'horseracing', leagueId: 'turf',
              homeTeam: `Race ${race.raceNumber}`, awayTeam: opt.label,
              startsAt: Date.now(), addedAt: Date.now(),
            });
          }
          return (
            <Button
              key={opt.id}
              onClick={pick}
              disabled={disabled}
              sx={{
                minWidth: 0, px: 0.6, py: 0.4, borderRadius: 1,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'none',
                background: selected ? alpha(neonGreen, 0.18) : alpha('#fff', 0.04),
                border: `1px solid ${selected ? alpha(neonGreen, 0.55) : darkBorder}`,
                '&:hover': { background: selected ? alpha(neonGreen, 0.22) : alpha(neonGreen, 0.08) },
              }}
            >
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.primary' }}>{opt.label}</Typography>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 900, color: selected ? neonGreen : neonGold, fontVariantNumeric: 'tabular-nums' }}>
                {formatOdds(opt.odds, slip.oddsFormat)}
              </Typography>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
