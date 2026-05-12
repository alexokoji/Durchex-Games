import { Box, Typography, Button, Chip, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import type { SessionPhase } from './useVirtualSession';

export interface MarketOption {
  key: string;
  label: string;
  odds: number;
}

export interface LiveMatchRow {
  id: string | number;
  homeTeam: string;
  awayTeam: string;
  homeColor?: string;
  awayColor?: string;
  homeScore: number;
  awayScore: number;
  markets: MarketOption[];
}

interface LiveMatchesListProps {
  matches: LiveMatchRow[];
  selectedMatchId?: string | number | null;
  onSelectMatch?: (id: string | number) => void;
  onPickMarket: (matchId: string | number, market: MarketOption) => void;
  phase: SessionPhase;
  pickedKeys: Set<string>;
}

export default function LiveMatchesList({
  matches, selectedMatchId, onSelectMatch,
  onPickMarket, phase, pickedKeys,
}: LiveMatchesListProps) {
  const disabled = phase !== 'betting';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: 'text.primary', letterSpacing: '0.05em' }}>
          LIVE SESSION · MATCHES
        </Typography>
        <Chip
          label={disabled ? 'Betting closed' : `${matches.length} matches`}
          size="small"
          sx={{
            height: 20, fontSize: '0.62rem', fontWeight: 700,
            background: disabled ? alpha('#ff4757', 0.15) : alpha(neonGreen, 0.15),
            color: disabled ? '#ff4757' : neonGreen,
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {matches.map((m, i) => {
          const isSelected = selectedMatchId === m.id;
          const homeColor = m.homeColor || neonBlue;
          const awayColor = m.awayColor || '#ff6b7a';
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Box
                onClick={() => onSelectMatch?.(m.id)}
                sx={{
                  background: isSelected ? alpha(neonGreen, 0.06) : darkCard,
                  border: `1px solid ${isSelected ? alpha(neonGreen, 0.4) : darkBorder}`,
                  borderRadius: 2,
                  p: 1.25,
                  cursor: onSelectMatch ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  '&:hover': onSelectMatch ? { borderColor: alpha(neonGreen, 0.4) } : {},
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1, minWidth: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: homeColor }} />
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: homeColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.homeTeam}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mx: 0.25 }}>vs</Typography>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: awayColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.awayTeam}
                    </Typography>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: awayColor }} />
                  </Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 900, color: neonGold, fontVariantNumeric: 'tabular-nums', ml: 1 }}>
                    {m.homeScore} : {m.awayScore}
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${m.markets.length}, 1fr)`, gap: 0.75 }}>
                  {m.markets.map((mk) => {
                    const pickedKey = `${m.id}:${mk.key}`;
                    const isPicked = pickedKeys.has(pickedKey);
                    return (
                      <Tooltip key={mk.key} title={disabled ? 'Betting closed for this session' : `Pick ${mk.label}`} arrow>
                        <span>
                          <Button
                            fullWidth
                            size="small"
                            disabled={disabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              onPickMarket(m.id, mk);
                            }}
                            sx={{
                              flexDirection: 'column',
                              py: 0.5,
                              borderRadius: 1.5,
                              background: isPicked ? alpha(neonGreen, 0.18) : alpha('#fff', 0.03),
                              border: `1px solid ${isPicked ? alpha(neonGreen, 0.5) : darkBorder}`,
                              color: isPicked ? neonGreen : 'text.primary',
                              '&:hover': {
                                background: isPicked ? alpha(neonGreen, 0.22) : alpha(neonGreen, 0.08),
                                borderColor: alpha(neonGreen, 0.5),
                              },
                              '&.Mui-disabled': {
                                background: alpha('#fff', 0.02),
                                color: 'text.disabled',
                                borderColor: darkBorder,
                              },
                            }}
                          >
                            <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary', fontWeight: 600, lineHeight: 1.1 }}>
                              {mk.label}
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 900, lineHeight: 1.1 }}>
                              {mk.odds.toFixed(2)}
                            </Typography>
                          </Button>
                        </span>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </Box>
  );
}
