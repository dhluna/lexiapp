import { QR_MODULES } from "@lexi/core/data/share";
import { QR_COLORS, QR_MODULE, qrShapes } from "@lexi/core/domain/qr";
import Svg, { Circle, G, Rect } from "react-native-svg";

const shapes = qrShapes(QR_MODULES);

/** Lexi's QR code (opens lexiapp.app), same design as the web. Fixed colors: it must scan in dark mode too. */
export function LexiQr({ size = 200 }: { size?: number }) {
  const { size: n, modules, eyes, logo } = shapes;
  const c = QR_COLORS;
  const inner = logo.size - 1;
  const k = inner / 64;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} accessibilityLabel="Código QR que abre lexiapp.app" accessibilityRole="image">
      <Rect width={n} height={n} fill={c.background} />
      {modules.map((m) => (
        <Rect
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
        <G key={`${e.x}-${e.y}`}>
          <Rect x={e.x + 0.5} y={e.y + 0.5} width={6} height={6} rx={1.7} fill="none" stroke={c.accent} strokeWidth={1} />
          <Rect x={e.x + 2} y={e.y + 2} width={3} height={3} rx={0.9} fill={c.accent} />
        </G>
      ))}
      <Rect x={logo.x} y={logo.y} width={logo.size} height={logo.size} rx={logo.size * 0.24} fill={c.background} />
      <G x={logo.x + 0.5} y={logo.y + 0.5}>
        <Rect width={inner} height={inner} rx={15 * k} fill={c.accent} />
        <Rect x={19 * k} y={11 * k} width={11 * k} height={40 * k} rx={5.5 * k} fill="#ffffff" />
        <Circle cx={42.5 * k} cy={45 * k} r={6.5 * k} fill={c.dot} />
      </G>
    </Svg>
  );
}
