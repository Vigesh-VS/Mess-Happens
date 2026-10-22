import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { chartGeometry, type WeightPoint } from '../lib/weightChart';
import { formatDateId } from '../lib/messDate';
import { formatNumber } from '../lib/nutrition';

const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };

const shortDate = (d: string) => formatDateId(d, { day: 'numeric', month: 'short' });

/**
 * Single-series weight line: ink line (2px) with 8px markers, hairline grid, y-axis in kg.
 * Hover or touch shows a crosshair and the nearest weigh-in. The entry list below the
 * chart on the Weight page is its table view.
 */
export function WeightChart({ points }: { points: WeightPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = chartGeometry(points);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const px = (x: number) => PAD.left + x * plotW;
  const py = (y: number) => PAD.top + y * plotH;

  if (!geo) return null;
  const pts = geo.points.map((p) => ({ ...p, cx: px(p.x), cy: py(p.y) }));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');
  const hovered = active !== null ? pts[active] : null;

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(p.cx - x) < Math.abs(pts[best]!.cx - x)) best = i;
    });
    setActive(best);
  }

  return (
    <div ref={wrap} className="relative w-full">
      {width > 0 ? (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Weight over time, ${pts.length} weigh-ins from ${shortDate(pts[0]!.date)} to ${shortDate(pts.at(-1)!.date)}`}
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setActive(null)}
          className="touch-pan-y select-none"
        >
          {/* Recessive grid + y labels */}
          {geo.ticks.map((t) => {
            const y = py((geo.max - t) / (geo.max - geo.min));
            return (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {t}
                </text>
              </g>
            );
          })}
          {/* First and last date on the x axis */}
          <text x={pts[0]!.cx} y={HEIGHT - 8} textAnchor={pts.length === 1 ? 'middle' : 'start'} className="fill-muted text-[11px]">
            {shortDate(pts[0]!.date)}
          </text>
          {pts.length > 1 ? (
            <text x={pts.at(-1)!.cx} y={HEIGHT - 8} textAnchor="end" className="fill-muted text-[11px]">
              {shortDate(pts.at(-1)!.date)}
            </text>
          ) : null}

          {hovered ? <line x1={hovered.cx} x2={hovered.cx} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--color-muted)" strokeWidth={1} strokeDasharray="3 3" /> : null}
          <path d={path} fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={p.date} cx={p.cx} cy={p.cy} r={i === active ? 5 : 4} fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth={2} />
          ))}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}

      {hovered ? (
        <div
          role="status"
          className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap border border-line bg-paper px-2 py-1 text-xs"
          style={{ left: Math.min(Math.max(hovered.cx, 48), width - 48) }}
        >
          <span className="font-semibold tabular-nums">{formatNumber(hovered.kg, 1)} kg</span>
          <span className="text-muted"> · {shortDate(hovered.date)}</span>
        </div>
      ) : null}
    </div>
  );
}
