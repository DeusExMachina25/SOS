"use client";

/** Compact bar chart for per-month counts. Labels and values live inside the SVG so they track their bars. */
export default function MonthlyBarChart({
  data,
  caption,
}: {
  data: { label: string; value: number }[];
  caption: string;
}) {
  const width = 360;
  const plotHeight = 120;
  const labelBand = 18;
  const top = 16;
  const height = top + plotHeight + labelBand;
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = width / data.length;
  const barW = Math.min(36, slot * 0.5);
  const current = data.length - 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full overflow-visible"
      role="img"
      aria-label={caption}
    >
      {[0, 0.5, 1].map((r) => (
        <line
          key={r}
          x1={0}
          x2={width}
          y1={top + plotHeight * r}
          y2={top + plotHeight * r}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="2,4"
        />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * plotHeight;
        const cx = slot * i + slot / 2;
        const isNow = i === current;
        return (
          <g key={d.label + i}>
            <rect
              x={cx - barW / 2}
              y={top + plotHeight - h}
              width={barW}
              height={Math.max(h, d.value > 0 ? 2 : 0)}
              fill={isNow ? "var(--color-primary)" : "var(--border-strong)"}
            />
            {d.value > 0 && (
              <text
                x={cx}
                y={top + plotHeight - h - 5}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-muted)"
                className="font-mono-sos"
              >
                {d.value}
              </text>
            )}
            <text
              x={cx}
              y={top + plotHeight + 13}
              textAnchor="middle"
              fontSize="8"
              letterSpacing="0.8"
              fill={isNow ? "var(--text-primary)" : "var(--text-faint)"}
              className="font-mono-sos"
            >
              {d.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
