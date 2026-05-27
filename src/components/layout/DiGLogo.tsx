interface DiGLogoProps {
  size?: number;
}

/**
 * App logo — sourced from public/assets/logo.png. Anything using <DiGLogo />
 * picks up the same artwork so the SVG monogram and the favicon stay in sync.
 */
export default function DiGLogo({ size = 36 }: DiGLogoProps) {
  return (
    <img
      src="/assets/logo.png"
      width={size}
      height={size}
      alt="DURCHEXiGAMES"
      style={{
        display: 'block',
        objectFit: 'contain',
        // Subtle neon halo to keep the header silhouette consistent with the
        // old SVG crest without overpowering the PNG's own color profile.
        filter: 'drop-shadow(0 0 6px rgba(0, 220, 130, 0.25))',
      }}
    />
  );
}
