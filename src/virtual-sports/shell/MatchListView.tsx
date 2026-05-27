import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Chip, Tabs, Tab } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { BetSelection, Market, MarketCategory, MarketOption, MatchEvent, SportKey, Team } from '../core/types';
import { neonGreen, neonBlue, neonGold, darkBorder, darkCard } from '../../theme';
import { useBetSlip } from '../core/BetSlipContext';

export interface ListMatch {
  id: string;
  home: Team;
  away: Team;
  markets: Market[];
  week: number;
  kickoffAt: number;
  /** Once true (week in progress / settled), odds are no longer placeable. */
  closed?: boolean;
  /** Status across the schedule. `pre` = future/betting, `live` = playing now,
   *  `final` = match has ended. Drives whether to show a score and how. */
  status?: 'pre' | 'live' | 'final';
  /** Final score of the simulated match — set whenever the simulation is
   *  available (so we can also show it for live matches by clipping to
   *  current progress). */
  finalScore?: { home: number; away: number };
  /** Sorted match events used to derive the live in-progress score so the
   *  list view stays in lockstep with the preview pane. */
  events?: MatchEvent[];
}

interface Props {
  sport: SportKey;
  matches: ListMatch[];
  leagueName: string;
  /** Optional header chip (e.g. "Week 12 · Live") shown above the list. */
  weekLabel?: string;
  /** Override the visible market tabs. Defaults to 1X2 + DC + OU2.5 (soccer).
   *  For basketball/hockey we drop Double Chance and the line shifts. */
  marketTabs?: MarketTab[];
  /** 0–1 progress through the live phase. Used together with each match's
   *  events to show a current scoreboard for in-play matches. */
  liveProgress?: number;
}

export type MarketTab = '1X2' | 'DOUBLE_CHANCE' | 'OVER_UNDER' | 'WINNER' | 'TOTAL_POINTS' | 'SPREAD';

interface TabConfig {
  id: MarketTab;
  label: string;
  category: MarketCategory;
  marketIdHint?: string;
  columns: { id: string; label: string }[];
}

const TAB_CONFIG: Record<MarketTab, TabConfig> = {
  '1X2':           { id: '1X2',           label: '1X2',              category: '1X2',           marketIdHint: '1x2',     columns: [{ id: '1', label: '1' }, { id: 'X', label: 'X' }, { id: '2', label: '2' }] },
  'DOUBLE_CHANCE': { id: 'DOUBLE_CHANCE', label: 'Double Chance',    category: 'DOUBLE_CHANCE', marketIdHint: 'dc',      columns: [{ id: '1X', label: '1X' }, { id: '12', label: '12' }, { id: 'X2', label: 'X2' }] },
  // Over/Under columns use id 'over' / 'under' — the actual market is chosen
  // dynamically by the selected line (see `ouLine` state in the component).
  'OVER_UNDER':    { id: 'OVER_UNDER',    label: 'Over/Under',       category: 'OVER_UNDER',                              columns: [{ id: 'over', label: 'Over' }, { id: 'under', label: 'Under' }] },
  'WINNER':        { id: 'WINNER',        label: 'Winner',           category: 'WINNER',        marketIdHint: 'winner',  columns: [{ id: 'home', label: '1' }, { id: 'away', label: '2' }] },
  // For basketball total markets the engine generates several lines (e.g.
  // 215.5, 220.5, 225.5). The picker surfaces them at runtime.
  'TOTAL_POINTS':  { id: 'TOTAL_POINTS',  label: 'Total Points',     category: 'TOTAL_POINTS',                            columns: [{ id: 'over', label: 'Over' }, { id: 'under', label: 'Under' }] },
  'SPREAD':        { id: 'SPREAD',        label: 'Spread',           category: 'SPREAD',                                  columns: [{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }] },
};

/** Default lines surfaced in the picker for goal-totals (soccer / hockey). */
const GOAL_LINES = [0.5, 1.5, 2.5, 3.5, 4.5];

const DEFAULT_TABS: MarketTab[] = ['1X2', 'DOUBLE_CHANCE', 'OVER_UNDER'];

function findMarket(markets: Market[], category: MarketCategory, idHint?: string): Market | undefined {
  if (idHint) {
    const exact = markets.find(m => m.id.endsWith(idHint) || m.id === idHint || m.id.includes(`:${idHint}`));
    if (exact) return exact;
  }
  return markets.find(m => m.category === category);
}

function findOption(market: Market | undefined, optionId: string): MarketOption | undefined {
  if (!market) return undefined;
  return market.options.find(o => o.id === optionId);
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const day = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${time}`;
}

/** Total game-clock span used to interpolate a live score from sorted events. */
function spanForSport(sport: SportKey): number {
  return sport === 'soccer' ? 90 : sport === 'basketball' ? 48 : 60;
}

/** Derive a current scoreboard for a match. For finished matches this is the
 *  final score; for live matches we clip the event log to the current minute
 *  (the same approach MatchPreview2D uses) so the list always agrees with the
 *  preview pane. For matches that haven't kicked off we return null. */
function deriveScore(m: ListMatch, sport: SportKey, liveProgress: number): { home: number; away: number } | null {
  if (m.status === 'final' || (m.status !== 'live' && m.closed && m.finalScore)) {
    return m.finalScore ?? null;
  }
  if (m.status !== 'live') return null;
  if (!m.finalScore) return null;
  // Without events we just scale the final by progress (rough fallback).
  if (!m.events || m.events.length === 0) {
    const p = Math.max(0, Math.min(1, liveProgress));
    return { home: Math.floor(m.finalScore.home * p), away: Math.floor(m.finalScore.away * p) };
  }
  const fullSpan = spanForSport(sport);
  const minute = Math.floor(Math.min(fullSpan, Math.max(0, liveProgress) * fullSpan));
  let home = 0, away = 0;
  for (const e of m.events) {
    if (e.minute > minute) break;
    if (e.type !== 'goal' && e.type !== 'penalty') continue;
    if (e.team === 'home') home++;
    else if (e.team === 'away') away++;
  }
  // Clip to final so a flaky event log can't exceed the simulated total.
  return {
    home: Math.min(home, m.finalScore.home),
    away: Math.min(away, m.finalScore.away),
  };
}

export default function MatchListView({ sport, matches, leagueName, weekLabel, marketTabs = DEFAULT_TABS, liveProgress = 0 }: Props) {
  const slip = useBetSlip();
  const visibleTabs = useMemo(() => marketTabs.map(t => TAB_CONFIG[t]), [marketTabs]);
  const [tab, setTab] = useState<MarketTab>(marketTabs[0]);
  const config = useMemo(() => TAB_CONFIG[tab] ?? visibleTabs[0], [tab, visibleTabs]);

  // Line state — goal totals for OVER_UNDER and points totals for TOTAL_POINTS.
  // Goal lines are fixed; point lines vary per match so we surface whatever
  // the engine generated for the first match in the week.
  const [ouLine, setOuLine] = useState<number>(2.5);
  const [totalLine, setTotalLine] = useState<number | null>(null);

  // For TOTAL_POINTS, discover the available lines from the first match.
  const totalLines = useMemo(() => {
    if (tab !== 'TOTAL_POINTS' || matches.length === 0) return [];
    const lines = new Set<number>();
    for (const m of matches[0].markets) {
      if (m.category !== 'TOTAL_POINTS') continue;
      const match = m.id.match(/total-(-?\d+(\.\d+)?)/);
      if (match) lines.add(parseFloat(match[1]));
    }
    return Array.from(lines).sort((a, b) => a - b);
  }, [tab, matches]);

  // Snap totalLine to the closest available value when the tab activates.
  useEffect(() => {
    if (tab !== 'TOTAL_POINTS' || totalLines.length === 0) return;
    if (totalLine == null || !totalLines.includes(totalLine)) {
      const mid = totalLines[Math.floor(totalLines.length / 2)];
      setTotalLine(mid);
    }
  }, [tab, totalLines, totalLine]);

  function pick(match: ListMatch, market: Market | undefined, option: MarketOption | undefined) {
    if (!market || !option || match.closed) return;
    const sel: BetSelection = {
      id: `${match.id}:${market.id}:${option.id}`,
      matchId: match.id,
      marketId: market.id,
      marketCategory: market.category,
      marketLabel: market.label,
      optionId: option.id,
      optionLabel: option.label,
      odds: option.odds,
      sport,
      leagueId: match.home.leagueId,
      homeTeam: match.home.shortName,
      awayTeam: match.away.shortName,
      startsAt: match.kickoffAt,
      addedAt: Date.now(),
    };
    slip.addSelection(sel);
  }

  return (
    <Box>
      {weekLabel && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
          <Chip
            size="small"
            label={weekLabel}
            sx={{ background: alpha(neonGreen, 0.15), color: neonGreen, fontWeight: 800 }}
          />
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            {matches.length} matches
          </Typography>
        </Box>
      )}

      {/* Market tabs */}
      <Tabs
        value={tab}
        onChange={(_, v: MarketTab) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36, mb: 1,
          borderBottom: `1px solid ${darkBorder}`,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.75rem', fontWeight: 800, textTransform: 'none' },
          '& .Mui-selected': { color: `${neonGreen} !important` },
          '& .MuiTabs-indicator': { backgroundColor: neonGreen },
        }}
      >
        {visibleTabs.map(t => <Tab key={t.id} value={t.id} label={t.label} />)}
      </Tabs>

      {/* Line picker — only shown for over/under markets */}
      {(tab === 'OVER_UNDER' || tab === 'TOTAL_POINTS') && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 700, mr: 0.5 }}>
            Line:
          </Typography>
          {(tab === 'OVER_UNDER' ? GOAL_LINES : totalLines).map(line => {
            const active = tab === 'OVER_UNDER' ? ouLine === line : totalLine === line;
            return (
              <Box
                key={line}
                onClick={() => tab === 'OVER_UNDER' ? setOuLine(line) : setTotalLine(line)}
                sx={{
                  cursor: 'pointer',
                  px: 1.25, py: 0.5, borderRadius: 1,
                  fontSize: '0.75rem', fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  background: active ? alpha(neonGreen, 0.18) : alpha('#fff', 0.04),
                  color: active ? neonGreen : 'text.secondary',
                  border: `1px solid ${active ? alpha(neonGreen, 0.5) : darkBorder}`,
                  transition: 'background 0.15s, border-color 0.15s',
                  '&:hover': { background: alpha(neonGreen, 0.1), borderColor: alpha(neonGreen, 0.35) },
                }}>
                {line}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Column header */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: `1fr repeat(${config.columns.length}, 64px)`,
        gap: 0.75, px: 1.25, mb: 0.5,
        fontSize: '0.72rem', color: 'text.disabled', fontWeight: 700,
      }}>
        <Box />
        {config.columns.map(c => (
          <Typography key={c.id} sx={{ fontSize: '0.72rem', textAlign: 'center', color: 'text.disabled' }}>
            {c.label}
          </Typography>
        ))}
      </Box>

      {/* League group header */}
      <Box sx={{
        px: 1.25, py: 0.75, borderRadius: 1,
        background: alpha(neonGold, 0.06),
        border: `1px solid ${alpha(neonGold, 0.15)}`,
        mb: 0.5,
      }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: neonGold, letterSpacing: '0.06em' }}>
          {leagueName}
        </Typography>
      </Box>

      {/* Match rows */}
      <Box sx={{
        display: 'flex', flexDirection: 'column',
        borderRadius: 1, overflow: 'hidden',
        border: `1px solid ${darkBorder}`,
        background: darkCard,
      }}>
        {matches.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              No matches scheduled for this week.
            </Typography>
          </Box>
        ) : matches.map((m, i) => {
          // Resolve the right market depending on tab + line picker.
          let hint = config.marketIdHint;
          if (tab === 'OVER_UNDER')        hint = `ou-${ouLine}`;
          else if (tab === 'TOTAL_POINTS' && totalLine != null) hint = `total-${totalLine}`;
          const market = findMarket(m.markets, config.category, hint);
          return (
            <Box key={m.id} sx={{
              display: 'grid',
              gridTemplateColumns: `1fr repeat(${config.columns.length}, 64px)`,
              gap: 0.75, alignItems: 'center',
              px: 1.25, py: 1,
              borderBottom: i < matches.length - 1 ? `1px solid ${darkBorder}` : 'none',
              background: m.closed ? alpha('#fff', 0.015) : 'transparent',
              opacity: m.closed ? 0.65 : 1,
            }}>
              {(() => {
                const score = deriveScore(m, sport, liveProgress);
                const isLive = m.status === 'live';
                const isFinal = m.status === 'final' || (!isLive && m.closed && !!m.finalScore);
                return (
                  <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {score ? (
                      <Box sx={{
                        flexShrink: 0,
                        px: 0.75, py: 0.25,
                        borderRadius: 0.75,
                        background: isLive ? alpha('#ff4757', 0.12) : alpha(neonGold, 0.12),
                        border: `1px solid ${isLive ? alpha('#ff4757', 0.4) : alpha(neonGold, 0.3)}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        minWidth: 32,
                      }}>
                        <Typography sx={{
                          fontSize: '0.85rem', fontWeight: 900, lineHeight: 1.05,
                          fontVariantNumeric: 'tabular-nums',
                          color: isLive ? '#ff4757' : neonGold,
                        }}>
                          {score.home}
                        </Typography>
                        <Typography sx={{
                          fontSize: '0.85rem', fontWeight: 900, lineHeight: 1.05,
                          fontVariantNumeric: 'tabular-nums',
                          color: isLive ? '#ff4757' : neonGold,
                        }}>
                          {score.away}
                        </Typography>
                      </Box>
                    ) : null}
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: '0.65rem', color: isLive ? '#ff4757' : 'text.disabled', mb: 0.25, fontWeight: isLive ? 800 : 400 }}>
                        {isLive ? `LIVE · ${Math.floor(Math.min(1, Math.max(0, liveProgress)) * spanForSport(sport))}'` : isFinal ? 'FINAL' : fmtTime(m.kickoffAt)} · W{m.week}
                      </Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.home.shortName}
                      </Typography>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.away.shortName}
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}
              {config.columns.map(col => {
                const option = findOption(market, col.id);
                const sel = market && option ? slip.isSelected(m.id, market.id, option.id) : false;
                return (
                  <Box
                    key={col.id}
                    onClick={() => pick(m, market, option)}
                    sx={{
                      cursor: option && !m.closed ? 'pointer' : 'default',
                      px: 0.5, py: 0.75, borderRadius: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: sel
                        ? alpha(neonGreen, 0.2)
                        : option ? alpha(neonBlue, 0.06) : 'transparent',
                      border: `1px solid ${sel ? alpha(neonGreen, 0.5) : alpha(neonBlue, 0.18)}`,
                      transition: 'background 0.15s, border-color 0.15s',
                      '&:hover': option && !m.closed ? {
                        background: alpha(neonGreen, 0.12),
                        borderColor: alpha(neonGreen, 0.4),
                      } : undefined,
                    }}>
                    <Typography sx={{
                      fontSize: '0.85rem', fontWeight: 800,
                      color: sel ? neonGreen : option ? '#fff' : 'text.disabled',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {option ? option.odds.toFixed(2) : '—'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
