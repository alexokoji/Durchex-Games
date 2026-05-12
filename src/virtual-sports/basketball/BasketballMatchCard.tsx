import { useState } from 'react';
import { Box, Typography, Button, Chip, Collapse } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TeamEmblem from '../core/TeamEmblem';
import { neonGreen, neonGold, darkBorder, darkCard, darkSurface } from '../../theme';
import { useBetSlip } from '../core/BetSlipContext';
import { formatOdds } from '../core/oddsEngine';
import type { BasketballScheduledMatch } from './useBasketballSchedule';
import type { Market, MarketOption, BetSelection } from '../core/types';

interface Props {
  match: BasketballScheduledMatch;
  leagueId: string;
  onFeature?: (id: string) => void;
  featured?: boolean;
}

export default function BasketballMatchCard({ match, leagueId, onFeature, featured }: Props) {
  const [expanded, setExpanded] = useState(false);
  const winner = match.markets.find(m => m.category === 'WINNER')!;
  // pick the spread market closest to 0 as the inline secondary
  const spread = match.markets
    .filter(m => m.category === 'SPREAD')
    .sort((a, b) => Math.abs(extractLine(a.id) ?? 0) - Math.abs(extractLine(b.id) ?? 0))[0];
  // pick the total line closest to center
  const total = match.markets
    .filter(m => m.category === 'TOTAL_POINTS')
    .sort((a, b) => Math.abs(extractLine(a.id) ?? 0) - Math.abs(extractLine(b.id) ?? 0))[0];

  const phaseLabel = match.phase === 'betting'
    ? 'TIP-OFF SOON'
    : match.phase === 'live'
      ? `LIVE · Q${Math.min(4, Math.floor(match.gameMinute / 12) + 1)} ${formatGameClock(match.gameMinute)}`
      : 'FINAL';
  const phaseColor = match.phase === 'betting' ? neonGreen : match.phase === 'live' ? '#ff4757' : neonGold;
  const score = match.phase === 'betting' ? null : runningScore(match);

  return (
    <Box
      sx={{
        background: darkCard,
        border: `1px solid ${featured ? alpha(neonGreen, 0.4) : darkBorder}`,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: featured ? `0 0 20px ${alpha(neonGreen, 0.15)}` : 'none',
      }}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: 1.25, py: 0.75, borderBottom: `1px solid ${darkBorder}`,
        background: featured ? alpha(neonGreen, 0.04) : 'transparent',
      }}>
        <motion.div animate={match.phase === 'live' ? { opacity: [1, 0.6, 1] } : {}} transition={{ duration: 1.2, repeat: Infinity }}>
          <Chip
            label={phaseLabel}
            size="small"
            sx={{ height: 18, fontSize: '0.58rem', fontWeight: 800,
              background: alpha(phaseColor, 0.16), color: phaseColor, border: `1px solid ${alpha(phaseColor, 0.35)}` }}
          />
        </motion.div>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Round {match.round} · {leagueId.toUpperCase()}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {onFeature && !featured && (
          <Button size="small" onClick={() => onFeature(match.id)}
            sx={{ fontSize: '0.62rem', fontWeight: 700, color: 'text.secondary', '&:hover': { color: neonGreen } }}>
            Watch
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, py: 1.25 }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <TeamEmblem team={match.home} size={28} />
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {match.home.shortName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
          {score ? (
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: match.phase === 'live' ? '#fff' : neonGold }}>
              {score.home} – {score.away}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary' }}>vs</Typography>
          )}
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
            {match.away.shortName}
          </Typography>
          <TeamEmblem team={match.away} size={28} />
        </Box>
      </Box>

      <Box sx={{ px: 1.25, pb: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
        {winner.options.map(opt => (
          <OddsButton key={opt.id} match={match} market={winner} option={opt} disabled={match.phase !== 'betting'} />
        ))}
      </Box>

      {(spread || total) && (
        <Box sx={{ px: 1.25, pb: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
          {spread && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
              {spread.options.map(opt => (
                <OddsButton key={opt.id} match={match} market={spread} option={opt} compact disabled={match.phase !== 'betting'} />
              ))}
            </Box>
          )}
          {total && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
              {total.options.map(opt => (
                <OddsButton key={opt.id} match={match} market={total} option={opt} compact disabled={match.phase !== 'betting'} />
              ))}
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ borderTop: `1px solid ${darkBorder}` }}>
        <Box onClick={() => setExpanded(e => !e)}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, py: 0.5, cursor: 'pointer',
            color: 'text.secondary', '&:hover': { color: neonGreen, background: alpha(neonGreen, 0.05) } }}>
          <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>
            {expanded ? 'Less markets' : `+${match.markets.length - 3} markets`}
          </Typography>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
        </Box>
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1, background: darkSurface }}>
            {match.markets
              .filter(m => m !== winner && m !== spread && m !== total)
              .map(m => <MarketRow key={m.id} match={match} market={m} disabled={match.phase !== 'betting'} />)}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}

function OddsButton({ match, market, option, compact, disabled }: {
  match: BasketballScheduledMatch; market: Market; option: MarketOption; compact?: boolean; disabled?: boolean;
}) {
  const slip = useBetSlip();
  const selected = slip.isSelected(match.id, market.id, option.id);

  function pick() {
    if (disabled) return;
    const sel: BetSelection = {
      id: `${match.id}:${market.id}:${option.id}`,
      matchId: match.id,
      marketId: market.id,
      marketCategory: market.category,
      marketLabel: market.label,
      optionId: option.id,
      optionLabel: option.label,
      odds: option.odds,
      sport: 'basketball',
      leagueId: match.home.leagueId,
      homeTeam: match.home.shortName,
      awayTeam: match.away.shortName,
      startsAt: Date.now(),
      addedAt: Date.now(),
    };
    slip.addSelection(sel);
  }

  return (
    <Button
      onClick={pick}
      disabled={disabled}
      sx={{
        py: compact ? 0.4 : 0.6, px: 0.5, minWidth: 0, borderRadius: 1.25,
        flexDirection: 'column', alignItems: 'center', textTransform: 'none',
        background: selected ? alpha(neonGreen, 0.18) : alpha('#fff', 0.04),
        border: `1px solid ${selected ? alpha(neonGreen, 0.55) : darkBorder}`,
        color: 'text.primary',
        '&:hover': { background: selected ? alpha(neonGreen, 0.22) : alpha(neonGreen, 0.08), borderColor: alpha(neonGreen, 0.4) },
        '&.Mui-disabled': { background: alpha('#fff', 0.02), color: 'text.disabled', opacity: 0.55 },
      }}
    >
      <Typography sx={{ fontSize: compact ? '0.58rem' : '0.62rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.1 }}>
        {option.shortLabel ?? option.label}
      </Typography>
      <Typography sx={{ fontSize: compact ? '0.78rem' : '0.9rem', fontWeight: 900, color: selected ? neonGreen : neonGold, fontVariantNumeric: 'tabular-nums' }}>
        {formatOdds(option.odds, slip.oddsFormat)}
      </Typography>
    </Button>
  );
}

function MarketRow({ match, market, disabled }: { match: BasketballScheduledMatch; market: Market; disabled?: boolean }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', mb: 0.4, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {market.label}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: market.options.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 0.5 }}>
        {market.options.map(opt => <OddsButton key={opt.id} match={match} market={market} option={opt} compact disabled={disabled} />)}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function extractLine(s: string): number | null {
  const m = s.match(/(-?\d+(?:\.\d+)?)(?!.*\d)/);
  return m ? parseFloat(m[1]) : null;
}

function formatGameClock(gameMinute: number): string {
  const inQuarter = gameMinute % 12;
  const remaining = 12 - inQuarter;
  const m = Math.floor(remaining);
  const s = Math.floor((remaining - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function runningScore(match: BasketballScheduledMatch): { home: number; away: number } {
  if (match.phase === 'finished') return match.simulation.finalScore;
  let home = 0, away = 0;
  for (const e of match.visibleEvents) {
    if (e.type !== 'goal') continue;
    const ptsMatch = e.description.match(/(\d)-pointer|jump shot|free throw/);
    let pts = 2;
    if (ptsMatch && ptsMatch[1] === '3') pts = 3;
    else if (e.description.includes('free throw')) pts = 1;
    if (e.team === 'home') home += pts;
    else if (e.team === 'away') away += pts;
  }
  return { home, away };
}
