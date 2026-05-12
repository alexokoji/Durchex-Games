import { neonGreen, neonBlue, neonGold } from '../../theme';

interface DiGLogoProps {
  size?: number;
}

/**
 * Hand-crafted DiG monogram — hexagonal crest with "DiG" wordmark
 * stamped into a neon green/blue gradient. Drop-in replacement for the
 * "N" tile that used to sit in the header.
 */
export default function DiGLogo({ size = 36 }: DiGLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-label="DuchexiGames">
      <defs>
        <linearGradient id="dig-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={neonGreen} />
          <stop offset="55%"  stopColor="#00cc6a" />
          <stop offset="100%" stopColor={neonBlue} />
        </linearGradient>
        <linearGradient id="dig-stroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
        </linearGradient>
        <filter id="dig-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Hex crest */}
      <polygon
        points="32,3 56,16 56,48 32,61 8,48 8,16"
        fill="url(#dig-bg)"
        stroke="url(#dig-stroke)"
        strokeWidth="1.5"
      />
      <polygon
        points="32,9 51,19 51,45 32,55 13,45 13,19"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.8"
      />
      {/* Wordmark */}
      <g filter="url(#dig-glow)" fontFamily="'Roboto', 'Helvetica', sans-serif" fontWeight="900">
        <text x="12" y="38" fontSize="20" fill="#000" letterSpacing="-1">D</text>
        <text x="26" y="38" fontSize="20" fill={neonGold} letterSpacing="-0.5" fontStyle="italic">i</text>
        <text x="34" y="38" fontSize="20" fill="#000" letterSpacing="-1">G</text>
      </g>
      {/* Bottom shine */}
      <path d="M14 48 L50 48" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <path d="M32 55 L42 53" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8" opacity="0.6" />
    </svg>
  );
}
