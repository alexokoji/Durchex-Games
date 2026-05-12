import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import TeamEmblem from '../core/TeamEmblem';
import { teamsByLeague, teamStrength } from '../core/teamDatabase';
import { neonGreen, neonGold, darkBorder, darkCard } from '../../theme';

interface LeagueTableProps {
  leagueId: string;
  highlightTeamIds?: string[];
}

interface Row {
  rank: number;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

// Deterministic standings derived from team strength (so the table is consistent
// across the session, but rotates round-to-round via a seeded shuffle in form).
function buildStandings(leagueId: string): Row[] {
  const teams = teamsByLeague(leagueId);
  const ranked = [...teams].sort((a, b) => teamStrength(b) - teamStrength(a));

  return ranked.map((t, i) => {
    const strength = teamStrength(t);
    const played = 16;
    const winRate = Math.max(0.15, Math.min(0.75, (strength - 60) / 35));
    const drawRate = 0.22;
    const won  = Math.round(played * winRate);
    const drawn = Math.round(played * drawRate);
    const lost = Math.max(0, played - won - drawn);
    const gf = Math.round(won * 2.1 + drawn * 1.1);
    const ga = Math.round(lost * 1.9 + drawn * 1.1);
    const form: Row['form'] = Array.from({ length: 5 }, (_, k) => {
      const r = Math.sin((i + 1) * (k + 3.1)) * 0.5 + 0.5;
      return r > 0.55 ? 'W' : r > 0.3 ? 'D' : 'L';
    });
    return {
      rank: i + 1,
      teamId: t.id,
      played,
      won,
      drawn,
      lost,
      gf,
      ga,
      gd: gf - ga,
      points: won * 3 + drawn,
      form,
    };
  });
}

export default function LeagueTable({ leagueId, highlightTeamIds = [] }: LeagueTableProps) {
  const rows = useMemo(() => buildStandings(leagueId), [leagueId]);
  const teams = useMemo(() => teamsByLeague(leagueId), [leagueId]);
  const teamMap = useMemo(() => Object.fromEntries(teams.map(t => [t.id, t])), [teams]);
  const highlight = useMemo(() => new Set(highlightTeamIds), [highlightTeamIds]);

  return (
    <Box sx={{ background: darkCard, border: `1px solid ${darkBorder}`, borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${darkBorder}`, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.05em' }}>
          STANDINGS
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>After Round 16</Typography>
      </Box>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <Box component="thead" sx={{ background: alpha('#fff', 0.025) }}>
            <Box component="tr" sx={{ '& th': { fontSize: '0.6rem', fontWeight: 800, color: 'text.disabled', textAlign: 'center', py: 0.6, px: 0.5, textTransform: 'uppercase', letterSpacing: '0.06em' } }}>
              <Box component="th" sx={{ width: 28 }}>#</Box>
              <Box component="th" sx={{ textAlign: 'left !important', pl: '8px !important' }}>Team</Box>
              <Box component="th">P</Box>
              <Box component="th">W</Box>
              <Box component="th">D</Box>
              <Box component="th">L</Box>
              <Box component="th">GD</Box>
              <Box component="th">Pts</Box>
              <Box component="th">Form</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map(r => {
              const team = teamMap[r.teamId];
              const isHighlighted = highlight.has(r.teamId);
              const zoneColor = r.rank <= 4 ? neonGreen : r.rank <= 6 ? neonGold : r.rank >= rows.length - 2 ? '#ff4757' : 'transparent';
              return (
                <Box
                  component="tr"
                  key={r.teamId}
                  sx={{
                    borderTop: `1px solid ${darkBorder}`,
                    background: isHighlighted ? alpha(neonGreen, 0.05) : 'transparent',
                    '& td': { fontSize: '0.72rem', textAlign: 'center', py: 0.6, px: 0.5, fontVariantNumeric: 'tabular-nums' },
                  }}
                >
                  <Box component="td">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <Box sx={{ width: 3, height: 16, borderRadius: 0.5, background: zoneColor }} />
                      <span style={{ fontWeight: 800 }}>{r.rank}</span>
                    </Box>
                  </Box>
                  <Box component="td" sx={{ textAlign: 'left !important', pl: '8px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <TeamEmblem team={team} size={20} />
                      <Typography sx={{ fontSize: '0.74rem', fontWeight: isHighlighted ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {team.shortName}
                      </Typography>
                    </Box>
                  </Box>
                  <Box component="td">{r.played}</Box>
                  <Box component="td">{r.won}</Box>
                  <Box component="td">{r.drawn}</Box>
                  <Box component="td">{r.lost}</Box>
                  <Box component="td" sx={{ color: r.gd >= 0 ? neonGreen : '#ff6b7a' }}>{r.gd > 0 ? `+${r.gd}` : r.gd}</Box>
                  <Box component="td" sx={{ fontWeight: 900, color: '#fff' }}>{r.points}</Box>
                  <Box component="td">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                      {r.form.map((f, i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 14, height: 14, borderRadius: 0.5,
                            fontSize: '0.55rem', fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: f === 'W' ? alpha(neonGreen, 0.25) : f === 'D' ? alpha('#999', 0.18) : alpha('#ff4757', 0.22),
                            color: f === 'W' ? neonGreen : f === 'D' ? '#ccc' : '#ff6b7a',
                          }}
                        >
                          {f}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
