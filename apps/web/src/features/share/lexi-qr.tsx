import { QR_MODULES } from "@lexi/core/data/share";
import { QR_COLORS, QR_MODULE, qrShapes } from "@lexi/core/domain/qr";

const shapes = qrShapes(QR_MODULES);

/**
 * Lexi's QR code (opens lexiapp.app). Its colors are fixed, not theme tokens: a QR code
 * needs dark modules on white to scan, also in dark mode.
 */
export function LexiQr({ className }: { className?: string }) {
  const { size, modules, eyes, logo } = shapes;
  const c = QR_COLORS;
  const inner = logo.size - 1;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Código QR que abre lexiapp.app" className={className}>
      <rect width={size} height={size} fill={c.background} />
      {modules.map((m) => (
        <rect
          key={`${m.x}-${m.y}`}
          x={m.x + QR_MODULE.offset}
          y={m.y + QR_MODULE.offset}
          width={QR_MODULE.size}
          height={QR_MODULE.size}
          rx={QR_MODULE.radius}
          fill={c.ink}
        />
      ))}
      {eyes.map((e) => (
        <g key={`${e.x}-${e.y}`}>
          <rect x={e.x + 0.5} y={e.y + 0.5} width={6} height={6} rx={1.7} fill="none" stroke={c.accent} strokeWidth={1} />
          <rect x={e.x + 2} y={e.y + 2} width={3} height={3} rx={0.9} fill={c.accent} />
        </g>
      ))}
      <rect x={logo.x} y={logo.y} width={logo.size} height={logo.size} rx={logo.size * 0.24} fill={c.background} />
      <svg x={logo.x + 0.5} y={logo.y + 0.5} width={inner} height={inner} viewBox="0 0 64 64">
        <rect width={64} height={64} rx={15} fill={c.accent} />
        <rect x={19} y={11} width={11} height={40} rx={5.5} fill="#ffffff" />
        <circle cx={42.5} cy={45} r={6.5} fill={c.dot} />
      </svg>
    </svg>
  );
}
