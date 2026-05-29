import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel, Button, Chip, Alert,
  IconButton, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import IceSkatingIcon from '@mui/icons-material/IceSkating';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import { neonGreen, neonGold, neonBlue, darkBorder, darkCard } from '../../theme';
import { useToasts } from '../../contexts/ToastContext';
import { LEAGUES, getLeague } from '../../virtual-sports/core/leagueDatabase';
import { teamsByLeague } from '../../virtual-sports/core/teamDatabase';
import { buildSeasonSchedule, buildLeaguePhaseSchedule } from '../../virtual-sports/core/seasonScheduler';
import { simulateSoccerMatch } from '../../virtual-sports/soccer/soccerSimulation';
import { simulateBasketballMatch } from '../../virtual-sports/basketball/basketballSimulation';
import { simulateHockeyMatch } from '../../virtual-sports/hockey/hockeySimulation';
import type { Team } from '../../virtual-sports/core/types';

const WEEK_SECONDS      = 600;
const MIN_LEAD_MS       = 5 * 60 * 1000;
/** Look-ahead window. Keep short — each week requires simulating every fixture. */
const LOOK_AHEAD_S      = 2 * 60 * 60;   // 2 hours  →  12 virtual weeks
/** Maximum prediction rows returned per league call. */
const MAX_ROWS_SINGLE   = 20;
const MAX_ROWS_ALL      = 5;  // per-league cap in "all leagues" view

type SportFilter = 'all' | 'soccer' | 'basketball' | 'hockey';

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function seasonSeedFor(leagueId: string): number {
  const d = new Date();
  const dayKey = `${d.getUTCFullYear()}${d.getUTCMonth()}${d.getUTCDate()}`;
  let h = 5381;
  for (const c of (leagueId + dayKey)) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return h >>> 0;
}

interface OverUnderCall { line: number; call: 'Over' | 'Under' }

interface PredictionRow {
  matchId: string;
  week: number;
  startsAt: number;
  home: Team;
  away: Team;
  scoreHome: number;
  scoreAway: number;
  outcome1X2: '1' | 'X' | '2';
  doubleChance: '1X' | '12' | 'X2';
  btts: 'Yes' | 'No';
  overUnders: OverUnderCall[];
  code: string;
  leagueId: string;
  leagueName: string;
  leagueFlag: string;
  sport: 'soccer' | 'basketball' | 'hockey';
}

function overUnderLines(sport: 'soccer' | 'basketball' | 'hockey'): number[] {
  if (sport === 'soccer')     return [1.5, 2.5];
  if (sport === 'basketball') return [195.5, 215.5];
  return [4.5, 5.5];
}

function buildPrediction(
  sport: 'soccer' | 'basketball' | 'hockey',
  league: { id: string; name: string; flag: string; tier: 'top' | 'cup' | 'continental' },
  home: Team,
  away: Team,
  week: number,
  startsAt: number,
  seasonSeed: number,
): PredictionRow {
  const seed = seasonSeed ^ (week * 7919) ^ hashStr(home.id + away.id);
  const sim = sport === 'soccer'
    ? simulateSoccerMatch(home, away, seed)
    : sport === 'basketball'
      ? simulateBasketballMatch(home, away, seed)
      : simulateHockeyMatch(home, away, seed);
  const h = sim.finalScore.home;
  const a = sim.finalScore.away;
  const outcome: '1' | 'X' | '2' = h > a ? '1' : h === a ? 'X' : '2';
  const dc: '1X' | '12' | 'X2' = outcome === '1' ? '1X' : outcome === '2' ? 'X2' : '1X';
  const total = h + a;
  const overUnders: OverUnderCall[] = overUnderLines(sport).map(line => ({
    line, call: total > line ? 'Over' : 'Under',
  }));
  const code = `${league.id.toUpperCase()}/W${week}/${home.abbr}-${away.abbr}/${outcome}-${h}:${a}`;
  return {
    matchId: `${league.id}-w${week}-${home.id}-${away.id}`,
    week, startsAt, home, away,
    scoreHome: h, scoreAway: a,
    outcome1X2: outcome,
    doubleChance: dc,
    btts: (h > 0 && a > 0) ? 'Yes' : 'No',
    overUnders, code,
    leagueId: league.id,
    leagueName: league.name,
    leagueFlag: league.flag,
    sport,
  };
}

function predictionsForLeague(leagueId: string, maxRows = MAX_ROWS_SINGLE): PredictionRow[] {
  const league = getLeague(leagueId);
  if (!league || league.sport === 'horseracing') return [];
  const teams = teamsByLeague(leagueId);
  if (teams.length < 2) return [];
  const seed = seasonSeedFor(leagueId);
  const fixtures = league.tier === 'continental'
    ? buildLeaguePhaseSchedule(teams.map(t => t.id), seed, 8)
    : buildSeasonSchedule(teams.map(t => t.id), seed);

  // Pre-index fixtures by week — avoids an O(fixtures) scan on every iteration.
  const byWeek = new Map<number, typeof fixtures>();
  for (const f of fixtures) {
    const arr = byWeek.get(f.week);
    if (arr) arr.push(f);
    else byWeek.set(f.week, [f]);
  }

  const anchor = new Date();
  anchor.setUTCHours(0, 0, 0, 0);
  const anchorMs = anchor.getTime();
  const now = Date.now();
  const totalWeeks = fixtures.reduce((m, f) => Math.max(m, f.week), 0);
  if (totalWeeks === 0) return [];

  // Limit look-ahead to 2 hours (12 virtual weeks) — keeps simulation count
  // manageable. The old 24-hour window required ~33 000 simulation calls which
  // blocked the main thread for several seconds.
  const maxLookWeeks = Math.ceil(LOOK_AHEAD_S / WEEK_SECONDS);
  const teamsById = new Map(teams.map(t => [t.id, t]));
  const out: PredictionRow[] = [];

  outer:
  for (let i = 0; i < maxLookWeeks; i++) {
    const startsAt = anchorMs + i * WEEK_SECONDS * 1000;
    if (startsAt - now < MIN_LEAD_MS) continue;
    const week = (i % totalWeeks) + 1;
    for (const f of byWeek.get(week) ?? []) {
      if (out.length >= maxRows) break outer;
      const home = teamsById.get(f.homeId);
      const away = teamsById.get(f.awayId);
      if (!home || !away) continue;
      out.push(buildPrediction(
        league.sport as 'soccer' | 'basketball' | 'hockey',
        league, home, away, week, startsAt, seed,
      ));
    }
  }
  return out.sort((a, b) => a.startsAt - b.startsAt);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminVirtualSportsPanel() {
  const toasts = useToasts();
  const [leagueId, setLeagueId]   = useState<string>('__all__');
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // "All leagues" mode: compute predictions for every non-horseracing league.
  // Use a tight per-league cap (MAX_ROWS_ALL) to keep total simulation count low.
  const allPredictions = useMemo<PredictionRow[]>(() => {
    void tick; // refresh dependency
    if (leagueId !== '__all__') return [];
    const rows: PredictionRow[] = [];
    for (const l of LEAGUES) {
      if (l.sport === 'horseracing') continue;
      if (sportFilter !== 'all' && l.sport !== sportFilter) continue;
      rows.push(...predictionsForLeague(l.id, MAX_ROWS_ALL));
    }
    return rows.sort((a, b) => a.startsAt - b.startsAt);
  }, [leagueId, sportFilter, tick]);

  // Single-league mode.
  const singlePredictions = useMemo<PredictionRow[]>(() => {
    void tick;
    if (leagueId === '__all__') return [];
    return predictionsForLeague(leagueId);
  }, [leagueId, tick]);

  const predictions = leagueId === '__all__' ? allPredictions : singlePredictions;

  function copy(text: string, label: string) {
    void navigator.clipboard.writeText(text).then(
      () => toasts.success('Copied', label),
      () => toasts.error('Copy failed', 'Clipboard access blocked.'),
    );
  }

  function copyAll() {
    if (predictions.length === 0) return;
    const lines = predictions.map(p => {
      const ouStr = p.overUnders.map(ou => `O/U ${ou.line}=${ou.call}`).join('  ');
      return `${p.code}  ·  ${p.home.shortName} vs ${p.away.shortName}  ·  ` +
        `1X2=${p.outcome1X2}  DC=${p.doubleChance}  BTTS=${p.btts}  ` +
        `${ouStr}  ·  Score ${p.scoreHome}-${p.scoreAway}`;
    });
    copy(lines.join('\n'), `${predictions.length} codes copied`);
  }

  // Group by league for the "all" view.
  const grouped = useMemo(() => {
    if (leagueId !== '__all__') return null;
    const map = new Map<string, PredictionRow[]>();
    for (const p of predictions) {
      if (!map.has(p.leagueId)) map.set(p.leagueId, []);
      map.get(p.leagueId)!.push(p);
    }
    return map;
  }, [predictions, leagueId]);

  return (
    <Box>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, mb: 0.5 }}>
        Virtual Sports Predictions
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
        On-demand prediction codes for upcoming kickoffs across all leagues.
        Only matches at least <b>5 minutes away</b> are shown.
      </Typography>

      <Alert
        icon={<LockIcon fontSize="small" />}
        severity="info"
        sx={{
          mb: 2,
          background: alpha(neonBlue, 0.08),
          border: `1px solid ${alpha(neonBlue, 0.25)}`,
          '& .MuiAlert-icon': { color: neonBlue },
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 0.25 }}>Nothing here is stored</Typography>
        <Typography sx={{ fontSize: '0.78rem' }}>
          Codes are generated on-demand from the season seed (UTC date + league).
          Closing this tab discards them. Re-opening regenerates the same set
          while the day hasn't rolled over.
        </Typography>
      </Alert>

      {/* Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>League</InputLabel>
          <Select value={leagueId} label="League" onChange={e => setLeagueId(e.target.value)}>
            <MenuItem value="__all__">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AllInclusiveIcon sx={{ fontSize: 16 }} />
                <span>All leagues</span>
              </Box>
            </MenuItem>
            {LEAGUES.filter(l => l.sport !== 'horseracing').map(l => (
              <MenuItem key={l.id} value={l.id}>
                {l.flag} {l.name}
                <span style={{ opacity: 0.45, marginLeft: 6, fontSize: '0.78rem' }}>({l.sport})</span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sport filter — only shown in all-leagues mode */}
        {leagueId === '__all__' && (
          <ToggleButtonGroup
            value={sportFilter}
            exclusive
            size="small"
            onChange={(_, v) => { if (v) setSportFilter(v as SportFilter); }}
          >
            <ToggleButton value="all"        sx={toggleSx}><AllInclusiveIcon sx={{ fontSize: 16, mr: 0.5 }} />All</ToggleButton>
            <ToggleButton value="soccer"     sx={toggleSx}><SportsSoccerIcon sx={{ fontSize: 16, mr: 0.5 }} />Soccer</ToggleButton>
            <ToggleButton value="basketball" sx={toggleSx}><SportsBasketballIcon sx={{ fontSize: 16, mr: 0.5 }} />Basketball</ToggleButton>
            <ToggleButton value="hockey"     sx={toggleSx}><IceSkatingIcon sx={{ fontSize: 16, mr: 0.5 }} />Hockey</ToggleButton>
          </ToggleButtonGroup>
        )}

        <Button startIcon={<RefreshIcon />} onClick={() => setTick(t => t + 1)} size="small">
          Recompute
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          disabled={predictions.length === 0}
          onClick={copyAll}
          size="small"
        >
          Copy all ({predictions.length})
        </Button>
      </Box>

      {predictions.length === 0 ? (
        <Box sx={{
          p: 4, borderRadius: 2, textAlign: 'center',
          background: darkCard, border: `1px dashed ${darkBorder}`,
        }}>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, mb: 0.5 }}>
            No upcoming kickoffs
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            All matches kick off within the 5-minute buffer, or none are scheduled in the
            next 24 hours. Try another league or check back later.
          </Typography>
        </Box>
      ) : leagueId === '__all__' && grouped ? (
        // ── All-leagues grouped view ──────────────────────────────────────
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...grouped.entries()].map(([lgId, rows]) => {
            const lg = getLeague(lgId);
            return (
              <Box key={lgId} sx={{
                borderRadius: 2, overflow: 'hidden',
                border: `1px solid ${darkBorder}`, background: darkCard,
              }}>
                {/* League header */}
                <Box sx={{
                  px: 2, py: 1,
                  background: alpha(neonGold, 0.06),
                  borderBottom: `1px solid ${darkBorder}`,
                  display: 'flex', alignItems: 'center', gap: 1,
                }}>
                  <Typography sx={{ fontSize: '0.8rem' }}>{lg?.flag}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{lg?.name}</Typography>
                  <Chip
                    size="small"
                    label={lg?.sport}
                    sx={chipSx(lg?.sport === 'soccer' ? neonGreen : lg?.sport === 'basketball' ? neonGold : neonBlue)}
                  />
                  <Box sx={{ flex: 1 }} />
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon sx={{ fontSize: 14 }} />}
                    sx={{ fontSize: '0.7rem', minWidth: 0, px: 1, py: 0.25 }}
                    onClick={() => {
                      const lines = rows.map(p =>
                        `${p.code}  ·  1X2=${p.outcome1X2}  DC=${p.doubleChance}  BTTS=${p.btts}  Score ${p.scoreHome}-${p.scoreAway}`
                      );
                      copy(lines.join('\n'), `${rows.length} ${lg?.shortName} codes`);
                    }}
                  >
                    Copy {rows.length}
                  </Button>
                </Box>
                {rows.map((p, i) => (
                  <PredictionRowView
                    key={p.matchId}
                    p={p}
                    last={i === rows.length - 1}
                    onCopy={copy}
                  />
                ))}
              </Box>
            );
          })}
        </Box>
      ) : (
        // ── Single-league flat view ───────────────────────────────────────
        <Box sx={{ borderRadius: 2, overflow: 'hidden', border: `1px solid ${darkBorder}`, background: darkCard }}>
          {predictions.map((p, i) => (
            <PredictionRowView
              key={p.matchId}
              p={p}
              last={i === predictions.length - 1}
              onCopy={copy}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ─── Shared row component ─────────────────────────────────────────────────────

function PredictionRowView({
  p, last, onCopy,
}: { p: PredictionRow; last: boolean; onCopy: (t: string, l: string) => void }) {
  const leadMins = Math.floor((p.startsAt - Date.now()) / 60_000);
  const leadLabel = leadMins >= 60
    ? `${Math.floor(leadMins / 60)}h ${leadMins % 60}m`
    : `${leadMins}m`;

  return (
    <Box sx={{
      px: 2, py: 1.5,
      borderBottom: last ? 'none' : `1px solid ${darkBorder}`,
      display: 'flex', flexDirection: { xs: 'column', md: 'row' },
      alignItems: { md: 'center' }, gap: 1.5,
    }}>
      <Box sx={{ minWidth: 180 }}>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontWeight: 700, letterSpacing: '0.05em' }}>
          W{p.week} · in {leadLabel}
        </Typography>
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 800 }}>
          {p.home.shortName} vs {p.away.shortName}
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
          Score: <b>{p.scoreHome}–{p.scoreAway}</b>
        </Typography>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        <Chip size="small" label={`1X2: ${p.outcome1X2}`}  sx={chipSx(neonGreen)} />
        <Chip size="small" label={`DC: ${p.doubleChance}`}  sx={chipSx(neonGold)} />
        <Chip size="small" label={`BTTS: ${p.btts}`}        sx={chipSx(neonBlue)} />
        {p.overUnders.map(ou => (
          <Chip
            key={ou.line}
            size="small"
            label={`O/U ${ou.line}: ${ou.call}`}
            sx={chipSx(ou.call === 'Over' ? neonGreen : '#ff6b7a')}
          />
        ))}
      </Box>

      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1, py: 0.5, borderRadius: 1,
        background: alpha(neonGreen, 0.08),
        border: `1px solid ${alpha(neonGreen, 0.3)}`,
        minWidth: { md: 240 },
      }}>
        <Typography sx={{
          fontFamily: 'monospace', fontSize: '0.72rem',
          fontWeight: 800, color: neonGreen, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {p.code}
        </Typography>
        <IconButton size="small" onClick={() => onCopy(p.code, p.code)} sx={{ color: neonGreen }}>
          <ContentCopyIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
}

function chipSx(tone: string) {
  return {
    background: alpha(tone, 0.12), color: tone,
    border: `1px solid ${alpha(tone, 0.3)}`,
    fontWeight: 800, fontSize: '0.7rem', height: 22,
  };
}

const toggleSx = {
  fontSize: '0.75rem',
  py: 0.25,
  display: 'flex',
  alignItems: 'center',
};
