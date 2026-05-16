import { useMemo } from 'react';
import type { Team } from './types';

interface TeamEmblemProps {
  team: Team;
  size?: number;
  showRing?: boolean;
}

// Shared shield path (48x48 viewbox).
const shieldD = 'M24 2 L42 7 L42 24 C42 36 34 42 24 46 C14 42 6 36 6 24 L6 7 Z';

export default function TeamEmblem({ team, size = 36, showRing = false }: TeamEmblemProps) {
  const id = useMemo(() => `e-${team.id}-${Math.random().toString(36).slice(2, 6)}`, [team.id]);

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-label={team.name}>
      <defs>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={team.primary} />
          <stop offset="100%" stopColor={shade(team.primary, -25)} />
        </linearGradient>
      </defs>
      {showRing && <circle cx="24" cy="24" r="23.5" fill="none" stroke={team.accent || team.secondary} strokeWidth="0.5" opacity="0.4" />}
      {renderEmblem(team, id)}
    </svg>
  );
}

function renderEmblem(t: Team, id: string) {
  const grad = `url(#${id}-grad)`;
  switch (t.emblemKey) {
    // ─── Premier League ─────────────────────────────────────────────────────
    case 'ars': // Arsenal – red shield, gold cannon-style triangle
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M14 30 L34 30 L24 14 Z" fill={t.secondary} />
          <circle cx="24" cy="26" r="2.4" fill={t.accent} />
          <rect x="15" y="32" width="18" height="2" fill={t.accent} />
        </>
      );
    case 'che': // Chelsea – blue shield with stylised lion arch
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <circle cx="24" cy="22" r="9" fill="none" stroke={t.accent} strokeWidth="1.6" />
          <path d="M18 22 Q24 12 30 22" stroke={t.secondary} strokeWidth="2" fill="none" strokeLinecap="round" />
          <text x="24" y="36" textAnchor="middle" fontSize="6.5" fontWeight="900" fill={t.secondary} fontFamily="Arial">CFC</text>
        </>
      );
    case 'mun': // Man United – red shield, gold devil triangle
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M16 16 L24 8 L32 16 L28 22 L24 18 L20 22 Z" fill={t.secondary} />
          <path d="M18 28 L24 38 L30 28 Z" fill={t.secondary} />
          <circle cx="24" cy="26" r="2" fill={t.accent} />
        </>
      );
    case 'liv': // Liverpool – red shield with stylised Liver bird
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M18 30 Q18 22 24 18 Q30 22 30 30 Z" fill={t.secondary} />
          <path d="M24 18 L26 14 L29 16 Z" fill={t.accent} />
          <circle cx="22" cy="24" r="0.9" fill={t.primary} />
        </>
      );
    case 'mci': // Man City – light blue shield with stars
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <rect x="10" y="22" width="28" height="2" fill={t.secondary} opacity="0.7" />
          <text x="24" y="20" textAnchor="middle" fontSize="9" fontWeight="900" fill={t.secondary} fontFamily="Arial">MC</text>
          <path d="M19 30 l1.5 4.5 4.7 0 -3.8 2.8 1.5 4.5 -3.9 -2.8 -3.9 2.8 1.5 -4.5 -3.8 -2.8 4.7 0 z" fill={t.accent} transform="translate(0 -3)" />
        </>
      );
    case 'tot': // Tottenham – navy with cockerel silhouette
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <circle cx="24" cy="24" r="11" fill={t.secondary} />
          <path d="M22 14 Q24 10 26 14 L27 18 L30 20 L26 22 L26 30 L22 30 L22 22 L18 20 L21 18 Z" fill={t.primary} />
        </>
      );
    case 'new': // Newcastle – black/white vertical stripes
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.primary} strokeWidth="1.2" />
          <path d="M14 8 L14 44 M20 8 L20 44 M26 8 L26 44 M32 8 L32 44" stroke={t.primary} strokeWidth="3" />
          <circle cx="24" cy="24" r="6" fill={t.accent} />
        </>
      );
    case 'whu': // West Ham – claret with crossed hammers
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M14 14 L34 34 M34 14 L14 34" stroke={t.secondary} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="11" y="11" width="6" height="3" fill={t.accent} rx="0.5" />
          <rect x="31" y="11" width="6" height="3" fill={t.accent} rx="0.5" />
        </>
      );

    // ─── La Liga ───────────────────────────────────────────────────────────
    case 'rma': // Real Madrid – white shield, gold crown
      return (
        <>
          <path d={shieldD} fill="#FFFFFF" stroke={t.accent} strokeWidth="1.4" />
          <path d="M14 18 L18 14 L24 18 L30 14 L34 18 L33 24 L15 24 Z" fill={t.primary} />
          <rect x="15" y="24" width="18" height="2" fill={t.accent} />
          <text x="24" y="36" textAnchor="middle" fontSize="7" fontWeight="900" fill={t.accent} fontFamily="Arial">RMA</text>
        </>
      );
    case 'bar': // Barcelona – quartered red/blue shield with yellow stripe
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke="#000" strokeWidth="0.8" />
          <path d="M24 2 L42 7 L42 24 L24 24 Z" fill={t.primary} />
          <path d="M24 24 L42 24 C42 36 34 42 24 46 Z" fill={t.secondary} />
          <rect x="6" y="20" width="36" height="4" fill={t.accent} />
          <rect x="6" y="28" width="36" height="2" fill={t.accent} opacity="0.4" />
        </>
      );
    case 'atm': // Atlético – red/white stripes, blue panel
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.accent} strokeWidth="1.2" />
          <path d="M11 8 L11 44 M17 8 L17 44 M23 8 L23 44 M29 8 L29 44 M35 8 L35 44" stroke={t.primary} strokeWidth="3" />
          <rect x="14" y="6" width="20" height="8" fill={t.accent} />
          <text x="24" y="13" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.secondary} fontFamily="Arial">ATM</text>
        </>
      );
    case 'sev': // Sevilla – red/white halves with S
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.accent} strokeWidth="1.2" />
          <path d="M24 2 L24 46 L24 46 C14 42 6 36 6 24 L6 7 Z" fill={t.primary} />
          <text x="24" y="32" textAnchor="middle" fontSize="20" fontWeight="900" fill={t.secondary} fontFamily="Georgia">S</text>
        </>
      );
    case 'val': // Valencia – orange with bat silhouette
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M14 22 Q18 16 24 20 Q30 16 34 22 L30 26 L28 22 L24 26 L20 22 L18 26 Z" fill="#000" />
          <text x="24" y="38" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.secondary} fontFamily="Arial">VCF</text>
        </>
      );
    case 'rso': // Real Sociedad – blue with diamond
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M24 12 L34 24 L24 36 L14 24 Z" fill={t.secondary} />
          <path d="M24 16 L30 24 L24 32 L18 24 Z" fill={t.accent} />
          <circle cx="24" cy="24" r="2" fill={t.primary} />
        </>
      );

    // ─── Bundesliga ────────────────────────────────────────────────────────
    case 'bay': // Bayern – red circle with white panels (Bavarian)
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={t.primary} stroke={t.secondary} strokeWidth="2" />
          <path d="M14 18 L34 18 L34 30 L14 30 Z" fill={t.secondary} />
          <path d="M14 18 L17 24 L14 30 Z M34 18 L31 24 L34 30 Z" fill={t.accent} />
          <text x="24" y="27" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.primary} fontFamily="Arial">FCB</text>
        </>
      );
    case 'bvb': // Dortmund – yellow circle with black BVB
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={t.primary} stroke={t.secondary} strokeWidth="2" />
          <circle cx="24" cy="24" r="16" fill="none" stroke={t.secondary} strokeWidth="2" />
          <text x="24" y="28" textAnchor="middle" fontSize="10" fontWeight="900" fill={t.secondary} fontFamily="Arial">09</text>
        </>
      );
    case 'rbl': // RB Leipzig – red with bull stylization
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M14 24 Q14 16 24 16 Q34 16 34 24" fill="none" stroke={t.secondary} strokeWidth="2.5" />
          <circle cx="18" cy="14" r="2" fill={t.secondary} />
          <circle cx="30" cy="14" r="2" fill={t.secondary} />
          <text x="24" y="34" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.secondary} fontFamily="Arial">RBL</text>
        </>
      );
    case 'lev': // Bayer Leverkusen – red cross
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.primary} strokeWidth="1.2" />
          <rect x="20" y="10" width="8" height="28" fill={t.primary} />
          <rect x="10" y="20" width="28" height="8" fill={t.primary} />
          <text x="24" y="27" textAnchor="middle" fontSize="6.5" fontWeight="900" fill={t.accent} fontFamily="Arial">B04</text>
        </>
      );
    case 'sge': // Eintracht Frankfurt – black eagle
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M18 14 L24 20 L30 14 L30 24 L36 28 L24 36 L12 28 L18 24 Z" fill={t.accent} />
          <circle cx="24" cy="24" r="2.5" fill={t.primary} />
        </>
      );

    // ─── Serie A ───────────────────────────────────────────────────────────
    case 'juv': // Juventus – black/white vertical stripes
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.accent} strokeWidth="1.2" />
          <path d="M14 8 L14 44 M20 8 L20 44 M26 8 L26 44 M32 8 L32 44" stroke={t.primary} strokeWidth="3.2" />
          <ellipse cx="24" cy="24" rx="9" ry="6" fill={t.accent} />
          <text x="24" y="27" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.primary} fontFamily="Arial">JUV</text>
        </>
      );
    case 'mil': // AC Milan – red/black stripes
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke="#fff" strokeWidth="1.2" />
          <path d="M14 8 L14 44 M20 8 L20 44 M26 8 L26 44 M32 8 L32 44" stroke={t.primary} strokeWidth="3.2" />
          <circle cx="24" cy="24" r="7.5" fill={t.accent} stroke={t.primary} strokeWidth="1" />
          <text x="24" y="27" textAnchor="middle" fontSize="6.5" fontWeight="900" fill={t.primary} fontFamily="Arial">ACM</text>
        </>
      );
    case 'int': // Inter – blue/black concentric circle
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={t.primary} stroke={t.accent} strokeWidth="2" />
          <circle cx="24" cy="24" r="14" fill="none" stroke={t.accent} strokeWidth="3" />
          <circle cx="24" cy="24" r="8" fill="none" stroke={t.accent} strokeWidth="3" />
          <text x="24" y="27" textAnchor="middle" fontSize="6.5" fontWeight="900" fill={t.accent} fontFamily="Arial">IM</text>
        </>
      );
    case 'rom': // Roma – dark red with wolf head suggestion
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M14 20 L20 14 L24 20 L28 14 L34 20 L32 30 L16 30 Z" fill={t.secondary} />
          <circle cx="20" cy="22" r="1.5" fill={t.primary} />
          <circle cx="28" cy="22" r="1.5" fill={t.primary} />
          <path d="M22 26 L26 26 L24 28 Z" fill={t.primary} />
        </>
      );
    case 'nap': // Napoli – sky blue with N
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={grad} stroke={t.accent} strokeWidth="2" />
          <text x="24" y="32" textAnchor="middle" fontSize="22" fontWeight="900" fill={t.secondary} fontFamily="Georgia">N</text>
        </>
      );
    case 'laz': // Lazio – light blue with eagle
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M14 22 L20 18 L24 22 L28 18 L34 22 L30 30 L18 30 Z" fill={t.accent} />
          <circle cx="24" cy="26" r="2" fill={t.secondary} />
        </>
      );

    // ─── Ligue 1 ───────────────────────────────────────────────────────────
    case 'psg': // PSG – dark blue with Eiffel tower stylized
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M22 12 L26 12 L26 18 L28 18 L28 22 L26 22 L26 30 L29 38 L19 38 L22 30 L22 22 L20 22 L20 18 L22 18 Z" fill={t.accent} />
          <rect x="14" y="20" width="20" height="2" fill={t.secondary} opacity="0.6" />
        </>
      );
    case 'mar': // Marseille – light blue/white "OM"
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.accent} strokeWidth="1.2" />
          <rect x="6" y="20" width="36" height="8" fill={t.primary} />
          <text x="24" y="27" textAnchor="middle" fontSize="7" fontWeight="900" fill={t.secondary} fontFamily="Arial">OM</text>
        </>
      );
    case 'lyo': // Lyon – dark blue/red with lion
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M14 20 Q18 14 24 16 Q30 14 34 20 L30 28 L18 28 Z" fill={t.secondary} />
          <circle cx="20" cy="22" r="1.2" fill={t.primary} />
          <circle cx="28" cy="22" r="1.2" fill={t.primary} />
          <path d="M22 25 Q24 28 26 25" stroke={t.accent} strokeWidth="1.4" fill="none" />
        </>
      );
    case 'mon': // Monaco – red/white diamond
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.accent} strokeWidth="1.2" />
          <path d="M24 2 L42 24 L24 46 Z" fill={t.primary} />
          <text x="24" y="27" textAnchor="middle" fontSize="6.5" fontWeight="900" fill={t.secondary} fontFamily="Arial">ASM</text>
        </>
      );
    case 'lil': // Lille – red shield with stripes
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <rect x="10" y="14" width="28" height="2.5" fill={t.secondary} />
          <rect x="10" y="20" width="28" height="2.5" fill={t.secondary} />
          <rect x="10" y="26" width="28" height="2.5" fill={t.secondary} />
          <text x="24" y="38" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.secondary} fontFamily="Arial">LOSC</text>
        </>
      );

    // ─── NBA basketball ────────────────────────────────────────────────────
    case 'lal': // Lakers – purple disc, gold border, LA monogram
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={grad} stroke={t.secondary} strokeWidth="2" />
          <circle cx="24" cy="24" r="16" fill="none" stroke={t.accent} strokeWidth="0.8" opacity="0.5" />
          <text x="24" y="29" textAnchor="middle" fontSize="14" fontWeight="900" fill={t.secondary} fontFamily="Arial">LA</text>
        </>
      );
    case 'bos': // Celtics – green shamrock-ish leaves
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <circle cx="18" cy="20" r="6" fill={t.secondary} />
          <circle cx="30" cy="20" r="6" fill={t.secondary} />
          <circle cx="24" cy="14" r="6" fill={t.secondary} />
          <rect x="22" y="22" width="4" height="14" fill={t.accent} />
          <text x="24" y="42" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.secondary} fontFamily="Arial">BOS</text>
        </>
      );
    case 'gsw': // Warriors – blue with gold bridge / "W"
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={grad} stroke={t.secondary} strokeWidth="2" />
          <path d="M10 28 L18 14 L24 26 L30 14 L38 28" stroke={t.secondary} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
          <path d="M8 32 Q24 38 40 32" stroke={t.secondary} strokeWidth="1.5" fill="none" opacity="0.6" />
        </>
      );
    case 'chi': // Bulls – simplified red bull head silhouette on cream
      return (
        <>
          <path d={shieldD} fill={t.accent} stroke={t.primary} strokeWidth="1.2" />
          <path d="M14 20 L18 16 L22 20 L26 20 L30 16 L34 20 L30 28 Q24 32 18 28 Z" fill={t.primary} />
          <circle cx="20" cy="22" r="1.5" fill={t.accent} />
          <circle cx="28" cy="22" r="1.5" fill={t.accent} />
          <path d="M22 28 Q24 30 26 28" stroke={t.accent} strokeWidth="1.4" fill="none" />
        </>
      );
    case 'mia': // Heat – flame on dark red shield
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M24 12 Q18 20 22 28 Q20 22 24 18 Q26 24 24 28 Q28 22 32 26 Q34 20 28 16 Z" fill={t.accent} />
          <circle cx="24" cy="36" r="3" fill="none" stroke={t.accent} strokeWidth="1.6" />
        </>
      );
    case 'den': // Nuggets – pickaxe stylization on navy
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M14 14 L34 28" stroke={t.secondary} strokeWidth="3" strokeLinecap="round" />
          <path d="M10 12 L18 12 L18 18 Z" fill={t.secondary} />
          <path d="M34 24 L38 26 L34 30 Z" fill={t.secondary} />
          <text x="24" y="40" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.secondary} fontFamily="Arial">DEN</text>
        </>
      );
    case 'phi': // 76ers – blue with red stars and stripes
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <text x="24" y="26" textAnchor="middle" fontSize="9" fontWeight="900" fill={t.accent} fontFamily="Arial">76</text>
          <path d="M14 30 L34 30 M14 33 L34 33 M14 36 L34 36" stroke={t.secondary} strokeWidth="1.2" />
          <path d="M18 14 l1 2.5 2.5 0 -2 1.5 0.8 2.5 -2.3 -1.5 -2.3 1.5 0.8 -2.5 -2 -1.5 2.5 0 z" fill={t.secondary} />
          <path d="M30 14 l1 2.5 2.5 0 -2 1.5 0.8 2.5 -2.3 -1.5 -2.3 1.5 0.8 -2.5 -2 -1.5 2.5 0 z" fill={t.secondary} />
        </>
      );
    case 'mil_bb': // Bucks – green M with antler hint
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={grad} stroke={t.secondary} strokeWidth="2" />
          <path d="M14 32 L14 16 L18 22 L24 14 L30 22 L34 16 L34 32" stroke={t.secondary} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
          <path d="M20 14 L22 8 L24 14 M24 14 L26 8 L28 14" stroke={t.accent} strokeWidth="1.5" fill="none" />
        </>
      );

    // ─── NHL hockey ────────────────────────────────────────────────────────
    case 'tor': // Maple Leafs – blue maple leaf
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M24 10 L26 18 L32 16 L28 22 L34 24 L28 26 L30 32 L24 30 L18 32 L20 26 L14 24 L20 22 L16 16 L22 18 Z" fill={t.secondary} />
          <text x="24" y="42" textAnchor="middle" fontSize="6" fontWeight="900" fill={t.secondary} fontFamily="Arial">TOR</text>
        </>
      );
    case 'pit': // Penguins – black diamond with gold accent + simplified penguin
      return (
        <>
          <path d={shieldD} fill={t.primary} stroke={t.secondary} strokeWidth="1.4" />
          <path d="M24 8 L40 24 L24 40 L8 24 Z" fill="none" stroke={t.secondary} strokeWidth="1.4" />
          <ellipse cx="24" cy="22" rx="4" ry="6" fill={t.secondary} />
          <ellipse cx="24" cy="32" rx="6" ry="4" fill={t.secondary} />
          <circle cx="22" cy="20" r="0.8" fill={t.primary} />
          <circle cx="26" cy="20" r="0.8" fill={t.primary} />
        </>
      );
    case 'nyr': // Rangers – red NY monogram on blue diagonal
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M10 8 L40 36 L36 40 L6 12 Z" fill={t.accent} opacity="0.85" />
          <text x="24" y="30" textAnchor="middle" fontSize="13" fontWeight="900" fill={t.secondary} fontFamily="Georgia" transform="rotate(0 24 30)">NY</text>
        </>
      );
    case 'col': // Avalanche – burgundy A peak with steel-blue base
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M10 36 L24 14 L38 36 Z" fill={t.secondary} />
          <path d="M16 32 L24 22 L32 32 L28 36 L20 36 Z" fill={t.primary} />
          <path d="M14 38 L34 38" stroke={t.accent} strokeWidth="1" opacity="0.6" />
        </>
      );
    case 'tbl': // Lightning – bolt on blue
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.accent} strokeWidth="1.2" />
          <path d="M26 10 L18 26 L22 26 L18 38 L30 22 L26 22 L30 10 Z" fill={t.accent} />
          <text x="24" y="44" textAnchor="middle" fontSize="5" fontWeight="900" fill={t.secondary} fontFamily="Arial" opacity="0.6">TAMPA</text>
        </>
      );
    case 'bru': // Bruins – spoked-B style: gold wheel with B
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={t.primary} stroke={t.secondary} strokeWidth="2" />
          <circle cx="24" cy="24" r="14" fill={t.secondary} />
          <circle cx="24" cy="24" r="14" fill="none" stroke={t.primary} strokeWidth="1" />
          {[0, 45, 90, 135].map(a => (
            <line key={a} x1="24" y1="24" x2={24 + 14 * Math.cos((a * Math.PI) / 180)} y2={24 + 14 * Math.sin((a * Math.PI) / 180)} stroke={t.primary} strokeWidth="2" />
          ))}
          <text x="24" y="30" textAnchor="middle" fontSize="13" fontWeight="900" fill={t.primary} fontFamily="Georgia">B</text>
        </>
      );

    // Procedural fallback — deterministic per team id, so the same club
    // always renders the same crest. Picks one of six layout templates
    // based on a hash of the id, plus an accent shape (stars / chevron /
    // diagonal / dot ring) for visual variety.
    default: {
      const seed = hashSeed(t.id);
      const variant = seed % 6;
      return procedural(t, grad, variant, seed);
    }
  }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function procedural(t: Team, grad: string, variant: number, seed: number) {
  const flair = (seed >> 4) % 4;
  switch (variant) {
    case 0: // shield + monogram
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <rect x="8" y="20" width="32" height="3" fill={t.secondary} opacity="0.85" />
          <text x="24" y="32" textAnchor="middle" fontSize="13" fontWeight="900" fill={t.secondary} fontFamily="Arial">{t.abbr}</text>
          {flair === 0 && <circle cx="24" cy="13" r="2.5" fill={t.accent || t.secondary} />}
        </>
      );
    case 1: // diagonal split
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.primary} strokeWidth="1.2" />
          <path d="M24 2 L42 7 L42 24 L24 46 Z" fill={t.primary} />
          <text x="24" y="30" textAnchor="middle" fontSize="11" fontWeight="900" fill={t.secondary} fontFamily="Arial">{t.abbr}</text>
        </>
      );
    case 2: // vertical stripes
      return (
        <>
          <path d={shieldD} fill={t.secondary} stroke={t.accent || t.primary} strokeWidth="1.2" />
          <path d="M14 8 L14 44 M20 8 L20 44 M26 8 L26 44 M32 8 L32 44" stroke={t.primary} strokeWidth="3" />
          <rect x="14" y="6" width="20" height="9" fill={t.accent || t.primary} />
          <text x="24" y="13" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={t.secondary} fontFamily="Arial">{t.abbr}</text>
        </>
      );
    case 3: // ring + initial
      return (
        <>
          <circle cx="24" cy="24" r="22" fill={grad} stroke={t.secondary} strokeWidth="2" />
          <circle cx="24" cy="24" r="15" fill="none" stroke={t.accent || t.secondary} strokeWidth="1.5" />
          <text x="24" y="30" textAnchor="middle" fontSize="14" fontWeight="900" fill={t.secondary} fontFamily="Georgia">{t.abbr[0]}</text>
        </>
      );
    case 4: // chevron
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M8 18 L24 30 L40 18" stroke={t.secondary} strokeWidth="3" fill="none" />
          <text x="24" y="40" textAnchor="middle" fontSize="6.5" fontWeight="900" fill={t.secondary} fontFamily="Arial">{t.abbr}</text>
        </>
      );
    case 5:
    default: // diamond core
      return (
        <>
          <path d={shieldD} fill={grad} stroke={t.secondary} strokeWidth="1.2" />
          <path d="M24 12 L34 24 L24 36 L14 24 Z" fill={t.secondary} opacity="0.85" />
          <text x="24" y="27" textAnchor="middle" fontSize="9" fontWeight="900" fill={t.primary} fontFamily="Arial">{t.abbr[0]}</text>
        </>
      );
  }
}

function shade(hex: string, percent: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (n & 0xff) + percent));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
