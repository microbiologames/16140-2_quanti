import { useState } from 'react'
import { colorOf } from './palette'
import { markerPath, niceTicks } from './markers'
import type { Figure, FigurePoint, FigureSeries, LineRole } from '@/core/figures'

const WIDTH = 660
const HEIGHT = 440
const MARGIN = { top: 14, right: 18, bottom: 54, left: 68 }
const PLOT = {
  width: WIDTH - MARGIN.left - MARGIN.right,
  height: HEIGHT - MARGIN.top - MARGIN.bottom,
}
const MARKER_RADIUS = 5

const LINE_COLOR: Record<LineRole, string> = {
  identity: 'var(--chart-line-identity)',
  bias: 'var(--chart-line-bias)',
  limit: 'var(--chart-line-limit)',
}
const LINE_DASH: Record<LineRole, string | undefined> = {
  identity: '6 4',
  bias: undefined,
  limit: undefined,
}

/** Étendue verticale : celle imposée par le fichier, sinon les données plus une marge. */
function verticalDomain(figure: Figure): [number, number] {
  if (figure.yDomain) return figure.yDomain

  const values = [
    ...figure.series.flatMap((series) => series.points.map((point) => point.y)),
    ...figure.lines.map((line) => line.value).filter((value): value is number => value !== undefined),
  ].filter(Number.isFinite)

  if (values.length === 0) return [-1, 1]
  const low = Math.min(...values)
  const high = Math.max(...values)
  const padding = (high - low || 1) * 0.08
  return [low - padding, high + padding]
}

interface Hovered {
  point: FigurePoint
  series: FigureSeries
  left: number
  top: number
}

export function FigureChart({ figure }: { figure: Figure }) {
  const [hovered, setHovered] = useState<Hovered | null>(null)

  const [xMin, xMax] = figure.xDomain
  const [yMin, yMax] = verticalDomain(figure)
  const toX = (value: number) => MARGIN.left + ((value - xMin) / (xMax - xMin)) * PLOT.width
  const toY = (value: number) => MARGIN.top + PLOT.height - ((value - yMin) / (yMax - yMin)) * PLOT.height

  const xTicks = niceTicks(xMin, xMax)
  const yTicks = niceTicks(yMin, yMax)
  const visible = figure.lines.filter((line) => line.diagonal || (line.value ?? NaN) >= yMin)

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="text-sm font-medium">{figure.title}</figcaption>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800"
            style={{ background: 'var(--chart-surface)' }}
            role="img"
            aria-label={`${figure.title} — ${figure.series.reduce((total, s) => total + s.points.length, 0)} points`}
          >
            <g stroke="var(--chart-grid)" strokeWidth={1}>
              {xTicks.map((tick) => (
                <line key={`x${tick}`} x1={toX(tick)} x2={toX(tick)} y1={MARGIN.top} y2={MARGIN.top + PLOT.height} />
              ))}
              {yTicks.map((tick) => (
                <line key={`y${tick}`} x1={MARGIN.left} x2={MARGIN.left + PLOT.width} y1={toY(tick)} y2={toY(tick)} />
              ))}
            </g>

            <g fill="var(--chart-ink)" fontSize={12}>
              {xTicks.map((tick) => (
                <text key={`xl${tick}`} x={toX(tick)} y={MARGIN.top + PLOT.height + 18} textAnchor="middle">
                  {tick}
                </text>
              ))}
              {yTicks.map((tick) => (
                <text key={`yl${tick}`} x={MARGIN.left - 10} y={toY(tick) + 4} textAnchor="end">
                  {tick}
                </text>
              ))}
            </g>

            <g stroke="var(--chart-axis)" strokeWidth={1.5}>
              <line x1={MARGIN.left} x2={MARGIN.left + PLOT.width} y1={MARGIN.top + PLOT.height} y2={MARGIN.top + PLOT.height} />
              <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + PLOT.height} />
            </g>

            <text x={MARGIN.left + PLOT.width / 2} y={HEIGHT - 12} textAnchor="middle" fontSize={12} fill="var(--chart-ink)">
              {figure.xLabel}
            </text>
            <text
              transform={`translate(16, ${MARGIN.top + PLOT.height / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={12}
              fill="var(--chart-ink)"
            >
              {figure.yLabel}
            </text>

            <g strokeWidth={2} fill="none">
              {visible.map((line, index) => {
                if (line.diagonal) {
                  const end = Math.min(xMax, yMax)
                  const start = Math.max(xMin, yMin)
                  return (
                    <line
                      key={`d${index}`}
                      x1={toX(start)}
                      y1={toY(start)}
                      x2={toX(end)}
                      y2={toY(end)}
                      stroke={LINE_COLOR[line.role]}
                      strokeDasharray={LINE_DASH[line.role]}
                    />
                  )
                }
                const y = toY(line.value!)
                return (
                  <line
                    key={`h${index}`}
                    x1={MARGIN.left}
                    x2={MARGIN.left + PLOT.width}
                    y1={y}
                    y2={y}
                    stroke={LINE_COLOR[line.role]}
                    strokeDasharray={LINE_DASH[line.role]}
                  />
                )
              })}
            </g>

            {figure.series.map((series) => (
              <g key={series.key} fill={colorOf(series.color)} stroke="var(--chart-surface)" strokeWidth={1.5}>
                {series.points.map((point, index) => (
                  <path
                    key={index}
                    d={markerPath(series.shape, MARKER_RADIUS)}
                    transform={`translate(${toX(point.x).toFixed(1)}, ${toY(point.y).toFixed(1)})`}
                    onMouseEnter={() =>
                      setHovered({
                        point,
                        series,
                        left: (toX(point.x) / WIDTH) * 100,
                        top: (toY(point.y) / HEIGHT) * 100,
                      })
                    }
                    onMouseLeave={() => setHovered(null)}
                  />
                ))}
              </g>
            ))}
          </svg>

          {hovered && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900"
              style={{ left: `${hovered.left}%`, top: `calc(${hovered.top}% - 10px)` }}
            >
              <p className="font-medium">{hovered.point.label}</p>
              {hovered.point.detail && <p className="text-slate-500">{hovered.point.detail}</p>}
              <p className="numeric !text-left">
                {hovered.point.x.toFixed(3)} ; {hovered.point.y.toFixed(3)}
              </p>
              <p className="text-slate-500">{hovered.series.label}</p>
            </div>
          )}
        </div>

        <ul className="shrink-0 space-y-1 text-xs lg:w-52">
          {figure.series.map((series) => (
            <li key={series.key} className="flex items-center gap-2">
              <svg width={14} height={14} viewBox="-7 -7 14 14" aria-hidden className="shrink-0">
                <path d={markerPath(series.shape, 5)} fill={colorOf(series.color)} />
              </svg>
              <span className="truncate" title={series.label}>
                {series.label}
              </span>
              <span className="ml-auto text-slate-400">{series.points.length}</span>
            </li>
          ))}
          {figure.lines.map((line, index) => (
            <li key={`line-${index}`} className="flex items-center gap-2">
              <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden className="shrink-0">
                <line
                  x1={0}
                  y1={line.diagonal ? 13 : 7}
                  x2={14}
                  y2={line.diagonal ? 1 : 7}
                  stroke={LINE_COLOR[line.role]}
                  strokeWidth={2}
                  strokeDasharray={LINE_DASH[line.role]}
                />
              </svg>
              <span className="truncate">{line.label}</span>
              {line.value !== undefined && (
                <span className="numeric ml-auto text-slate-400">{line.value.toFixed(2)}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </figure>
  )
}
