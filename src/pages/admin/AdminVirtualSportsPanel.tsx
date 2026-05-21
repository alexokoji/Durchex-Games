import { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel, Button, Chip, Alert, IconButton,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import { neonGreen, neonGold, neonBlue, darkBorder, darkCard } from '../../theme';
import { useToasts } from '../../contexts/ToastContext';
import { LEAGUES, getLeague } from '../../virtual-sports/core/leagueDatabase';
import { teamsByLeague } from '../../virtual-sports/core/teamDatabase';
import { buildSeasonSchedule, buildLeaguePhaseSchedule } from '../../virtual-sports/core/seasonScheduler';
import { simulateSoccerMatch } from '../../virtual-sports/soccer/soccerSimulation';
import { simulateBasketballMatch } from '../../virtual-sports/basketball/basketballSimulation';
import { simulateHockeyMatch } from '../../virtual-sports/hockey/hockeySimulation';
import type { Team } from '../../virtual-sports/core/types';

const WEEK_SECONDS = 600;          // matches useLeagueSeason
const MIN_LEAD_MS = 5 * 60 * 1000;  // 5 minutes ahead for admin prediction prep

/** Hash mirroring useLeagueSeason exactly so codes line up with what users
 *  will actually see in the sportsbook. */
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

interface OverUnderCall {
  line: number;
  call: 'Over' | 'Under';
}

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
  overUnders: OverUnderCall[];   // sport-appropriate lines
  /** Compact ephemeral code, computed once per render. Not persisted. */
  code: string;
}

function overUnderLines(sport: 'soccer' | 'basketball' | 'hockey'): number[] {
  if (sport === 'soccer')     return [1.5, 2.5];
  if (sport === 'basketball') return [195.5, 215.5];
  return [4.5, 5.5];  // hockey
}

function buildPrediction(
  sport: 'soccer' | 'basketball' | 'hockey',
  league: { id: string; tier: 'top' | 'cup' | 'continental' },
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
    line,
    call: total > line ? 'Over' : 'Under',
  }));
  // Build a compact code an admin can paste into chat without leaking detail
  // (the code reads like a slip line, not a payload that exposes the sim).
  const code = `${league.id.toUpperCase()}/W${week}/${home.abbr}-${away.abbr}/${outcome}-${h}:${a}`;
  return {
    matchId: `${league.id}-w${week}-${home.id}-${away.id}`,
    week, startsAt, home, away,
    scoreHome: h, scoreAway: a,
    outcome1X2: outcome,
    doubleChance: dc,
    btts: (h > 0 && a > 0) ? 'Yes' : 'No',
    overUnders,
    code,
  };
}

export default function AdminVirtualSportsPanel() {
  const toasts = useToasts();
  const [leagueId, setLeagueId] = useState<string>('epl');
  const [tick, setTick] = useState(0);
  const league = getLeague(leagueId);

  // Refresh predictions every minute so the "earliest kickoff" filter advances
  // as time passes. Codes never leave this browser session.
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const predictions = useMemo<PredictionRow[]>(() => {
    if (!league) return [];
    if (league.sport === 'horseracing') return [];
    const teams = teamsByLeague(leagueId);
    if (teams.length < 2) return [];
    const seed = seasonSeedFor(leagueId);

    const fixtures = league.tier === 'continental'
      ? buildLeaguePhaseSchedule(teams.map(t => t.id), seed, 8)
      : buildSeasonSchedule(teams.map(t => t.id), seed);

    // Locate today's UTC midnight anchor (same as useLeagueSeason).
    const anchor = new Date();
    anchor.setUTCHours(0, 0, 0, 0);
    const anchorMs = anchor.getTime();
    const now = Date.now();

    const totalWeeks = fixtures.reduce((m, f) => Math.max(m, f.week), 0);
    if (totalWeeks === 0) return [];

    // We project up to 24h of upcoming weeks for the admin to choose from,
    // but only surface ones that kick off ≥ MIN_LEAD_MS from now (1 hour).
    const maxLookSeconds = 24 * 60 * 60;
    const maxLookWeeks = Math.min(totalWeeks, Math.ceil(maxLookSeconds / WEEK_SECONDS));

    const teamsById = new Map(teams.map(t => [t.id, t]));
    const out: PredictionRow[] = [];
    for (let i = 0; i < maxLookWeeks; i++) {
      const startsAt = anchorMs + i * WEEK_SECONDS * 1000;
      if (startsAt - now < MIN_LEAD_MS) continue;
      const week = ((i) % totalWeeks) + 1;
      const matchesThisWeek = fixtures.filter(f => f.week === week);
      for (const f of matchesThisWeek) {
        const home = teamsById.get(f.homeId);
        const away = teamsById.get(f.awayId);
        if (!home || !away) continue;
        out.push(buildPrediction(league.sport as 'soccer' | 'basketball' | 'hockey', league, home, away, week, startsAt, seed));
      }
    }
    return out.sort((a, b) => a.startsAt - b.startsAt);
  }, [leagueId, league, tick]);

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

  return (
    <Box>
      <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, mb: 0.5 }}>
        Accurate predictions
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
        On-demand prediction codes for upcoming kickoffs. Only matches that kick
        off at least <b>5 minutes from now</b> are shown.
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
          while the day hasn't rolled over. No code is written to a database,
          log, or session store.
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>League</InputLabel>
          <Select
            value={leagueId}
            label="League"
            onChange={e => setLeagueId(e.target.value)}
          >
            {LEAGUES.filter(l => l.sport !== 'horseracing').map(l => (
              <MenuItem key={l.id} value={l.id}>
                {l.flag} {l.name} <span style={{ opacity: 0.5, marginLeft: 6 }}>({l.sport})</span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button startIcon={<RefreshIcon />} onClick={() => setTick(t => t + 1)}>
          Recompute
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          disabled={predictions.length === 0}
          onClick={copyAll}
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
            No upcoming kickoffs match the filter
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            No matches are scheduled to kick off within the next 24 hours, or all upcoming matches fall within the 5-minute buffer. Try another league or check back later.
          </Typography>
        </Box>
      ) : (
        <Box sx={{
          borderRadius: 2, overflow: 'hidden',
          border: `1px solid ${darkBorder}`, background: darkCard,
        }}>
          {predictions.map((p, i) => {
            const leadMins = Math.floor((p.startsAt - Date.now()) / 60_000);
            const leadLabel = leadMins >= 60
              ? `${Math.floor(leadMins / 60)}h ${leadMins % 60}m`
              : `${leadMins}m`;
            return (
              <Box key={p.matchId} sx={{
                px: 2, py: 1.5,
                borderBottom: i < predictions.length - 1 ? `1px solid ${darkBorder}` : 'none',
                display: 'flex', flexDirection: { xs: 'column', md: 'row' },
                alignItems: { md: 'center' }, gap: 1.5,
              }}>
                <Box sx={{ minWidth: 180 }}>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', fontWeight: 700, letterSpacing: '0.05em' }}>
                    W{p.week} · kicks in {leadLabel}
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 800 }}>
                    {p.home.shortName} vs {p.away.shortName}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    Predicted score: <b>{p.scoreHome}–{p.scoreAway}</b>
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  <Chip size="small" label={`1X2: ${p.outcome1X2}`}   sx={chipSx(neonGreen)} />
                  <Chip size="small" label={`DC: ${p.doubleChance}`}   sx={chipSx(neonGold)} />
                  <Chip size="small" label={`BTTS: ${p.btts}`}         sx={chipSx(neonBlue)} />
                  {p.overUnders.map(ou => (
                    <Chip
                      key={ou.line}
                      size="small"
                      label={`O/U ${ou.line}: ${ou.call}`}
                      sx={chipSx(ou.line >= 100 ? neonGold : neonGreen)}
                    />
                  ))}
                </Box>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  px: 1, py: 0.5, borderRadius: 1,
                  background: alpha(neonGreen, 0.08),
                  border: `1px solid ${alpha(neonGreen, 0.3)}`,
                  minWidth: 240,
                }}>
                  <Typography sx={{
                    fontFamily: 'monospace', fontSize: '0.72rem',
                    fontWeight: 800, color: neonGreen, flex: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.code}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => copy(p.code, p.code)}
                    sx={{ color: neonGreen }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function chipSx(tone: string) {
  return {
    background: alpha(tone, 0.12),
    color: tone,
    border: `1px solid ${alpha(tone, 0.3)}`,
    fontWeight: 800,
    fontSize: '0.7rem',
    height: 22,
  };
}
