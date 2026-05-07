import { useId } from "react";

const VB_W = 600;
const VB_H = 220;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function LineChart({ data, unit = "" }) {
  const idRaw = useId();
  const id = idRaw.replace(/[:]/g, "-");

  if (!data || data.length === 0) {
    return <div className="line-chart-empty muted">No data yet</div>;
  }

  const innerW = VB_W - PAD_L - PAD_R;
  const innerH = VB_H - PAD_T - PAD_B;
  const values = data.map((d) => d.v);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || Math.max(Math.abs(minV), 1);
  const padR = range * 0.15;
  const yMin = minV - padR;
  const yMax = maxV + padR;
  const yRange = yMax - yMin || 1;

  const xFor = (i) =>
    PAD_L + (i / Math.max(data.length - 1, 1)) * innerW;
  const yFor = (v) => PAD_T + (1 - (v - yMin) / yRange) * innerH;

  const points = data.map((d, i) => `${xFor(i)},${yFor(d.v)}`);
  const linePath =
    "M" +
    data
      .map((d, i) => `${xFor(i)},${yFor(d.v)}`)
      .join(" L");
  const areaPath = `${linePath} L${xFor(data.length - 1)},${PAD_T + innerH} L${xFor(0)},${PAD_T + innerH} Z`;

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const grid = gridSteps.map((p) => ({
    y: PAD_T + p * innerH,
    label: (yMax - p * yRange).toFixed(1),
  }));

  const last = data[data.length - 1];
  const lastX = xFor(data.length - 1);
  const lastY = yFor(last.v);

  return (
    <div className="line-chart-wrap">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="line-chart"
        role="img"
      >
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#a855f7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`stroke-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>

        {grid.map((g, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              y1={g.y}
              x2={VB_W - PAD_R}
              y2={g.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={PAD_L - 8}
              y={g.y + 4}
              textAnchor="end"
              className="lc-axis"
            >
              {g.label}
              {unit}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#fill-${id})`} />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#stroke-${id})`}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {points.length <= 60 &&
          points.map((p, i) => {
            const [px, py] = p.split(",");
            return (
              <circle
                key={i}
                cx={px}
                cy={py}
                r="2.5"
                fill="#0f172a"
                stroke="#67e8f9"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

        <circle
          cx={lastX}
          cy={lastY}
          r="5"
          fill="#22d3ee"
          stroke="#0f172a"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        <text x={PAD_L} y={VB_H - 8} className="lc-axis">
          {formatTime(data[0].t) || "start"}
        </text>
        <text
          x={VB_W - PAD_R}
          y={VB_H - 8}
          textAnchor="end"
          className="lc-axis"
        >
          {formatTime(last.t) || "now"}
        </text>
      </svg>
    </div>
  );
}
