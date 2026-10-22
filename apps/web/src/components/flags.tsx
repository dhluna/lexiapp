/**
 * Small flag images (decorative: the accent is always written next to them). Drawn as SVG
 * because emoji flags show up as letters ("US", "GB") on Windows. Their colors are the
 * flags' own, not theme tokens.
 */

export function FlagUS({ className }: { className?: string }) {
  const stripe = 30 / 13;
  return (
    <svg viewBox="0 0 57 30" className={className} aria-hidden>
      <rect width="57" height="30" fill="#ffffff" />
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 2 * stripe} width="57" height={stripe} fill="#b22234" />
      ))}
      <rect width="24" height={stripe * 7} fill="#3c3b6e" />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={3 + (i % 4) * 6} cy={3.2 + Math.floor(i / 4) * 5.5} r="1.1" fill="#ffffff" />
      ))}
    </svg>
  );
}

export function FlagUK({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden>
      <clipPath id="flag-uk-clip">
        <rect width="60" height="30" />
      </clipPath>
      <g clipPath="url(#flag-uk-clip)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="2" />
        <path d="M30,0 V30 M0,15 H60" stroke="#ffffff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  );
}
