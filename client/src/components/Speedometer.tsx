import { useMemo } from "react";

type SpeedometerZone = {
  from: number;
  to: number;
  color: string;
};

type SpeedometerProps = {
  value: number;
  min?: number;
  max?: number;

  size?: number;
  strokeWidth?: number;

  label?: string;
  unit?: string;

  ticks?: number;
  showTickLabels?: boolean;

  trackColor?: string;
  progressColor?: string;
  needleColor?: string;
  textColor?: string;

  zones?: SpeedometerZone[];

  animated?: boolean;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
) {
  const angleRad = (angleDeg * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy - radius * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);

  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
  ].join(" ");
}

function valueToAngle(value: number, min: number, max: number) {
  const percent = (value - min) / (max - min);

  // Bal oldal: 180 fok
  // Jobb oldal: 0 fok
  return 180 - percent * 180;
}

export default function Speedometer({
  value,
  min = 0,
  max = 100,

  size = 280,
  strokeWidth = 18,

  label = "Speed",
  unit = "km/h",

  ticks = 6,
  showTickLabels = true,

  trackColor = "#2e2e2e",
  progressColor = "#228be6",
  needleColor = "#fa5252",
  textColor = "currentColor",

  zones,

  animated = true,
  className,
}: SpeedometerProps) {
  const safeValue = clamp(value, min, max);

  const width = size;
  const height = size ; //* 0.62;

  const cx = size / 2;
  const cy = size * 1 - 100;
  const radius = size * 0.38;

  const angle = valueToAngle(safeValue, min, max);

  const needleLength = radius - strokeWidth * 0.6;
  const needleEnd = polarToCartesian(cx, cy, needleLength, angle);

  const trackPath = describeArc(cx, cy, radius, 180, 0);
  const progressPath = describeArc(cx, cy, radius, 180, angle);

  const tickItems = useMemo(() => {
    return Array.from({ length: ticks }, (_, index) => {
      const percent = ticks === 1 ? 0 : index / (ticks - 1);
      const tickValue = min + (max - min) * percent;
      const tickAngle = valueToAngle(tickValue, min, max);

      const outer = polarToCartesian(cx, cy, radius + 8, tickAngle);
      const inner = polarToCartesian(cx, cy, radius - strokeWidth - 4, tickAngle);
      const labelPos = polarToCartesian(cx, cy, radius - strokeWidth - 26, tickAngle);

      return {
        value: Math.round(tickValue),
        outer,
        inner,
        labelPos,
      };
    });
  }, [ticks, min, max, cx, cy, radius, strokeWidth]);

  const zoneItems = useMemo(() => {
    if (!zones?.length) return [];

    return zones.map((zone) => {
      const from = clamp(zone.from, min, max);
      const to = clamp(zone.to, min, max);

      const fromAngle = valueToAngle(from, min, max);
      const toAngle = valueToAngle(to, min, max);

      return {
        color: zone.color,
        path: describeArc(cx, cy, radius, fromAngle, toAngle),
      };
    });
  }, [zones, min, max, cx, cy, radius]);

  return (
    <div
      className={className}
      style={{
        width,
        maxWidth: "100%",
        height: "200px",
        color: textColor,
        userSelect: "none",
      }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}: ${safeValue} ${unit}`}
      >
        {/* háttér ív */}
        <path
          d={trackPath}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* színes zónák, ha vannak */}
        {zoneItems.map((zone, index) => (
          <path
            key={index}
            d={zone.path}
            fill="none"
            stroke={zone.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}

        {/* progress ív, ha nincsenek zónák */}
        {!zones?.length && (
          <path
            d={progressPath}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              transition: animated ? "d 250ms ease" : undefined,
            }}
          />
        )}

        {/* tick vonalak */}
        {tickItems.map((tick, index) => (
          <g key={index}>
            <line
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
              stroke={textColor}
              strokeWidth={2}
              opacity={0.65}
            />

            {showTickLabels && (
              <text
                x={tick.labelPos.x}
                y={tick.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.045}
                fill={textColor}
                opacity={0.75}
              >
                {tick.value}
              </text>
            )}
          </g>
        ))}

        {/* tű */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={needleColor}
          strokeWidth={size * 0.018}
          strokeLinecap="round"
          style={{
            transition: animated ? "all 250ms ease" : undefined,
          }}
        />

        {/* középpont */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.04}
          fill={needleColor}
        />

        <circle
          cx={cx}
          cy={cy}
          r={size * 0.018}
          fill="white"
          opacity={0.9}
        />

        {/* érték */}
        <text
          x={cx}
          y={cy - size * 0.16}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.12}
          fontWeight={700}
          fill={textColor}
        >
          {Math.round(safeValue)}
        </text>

        {/* unit */}
        <text
          x={cx}
          y={cy - size * 0.075}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.045}
          fill={textColor}
          opacity={0.75}
        >
          {unit}
        </text>

        {/* label */}
        <text
          x={cx}
          y={cy + size * 0.08}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.05}
          fill={textColor}
          opacity={0.8}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}