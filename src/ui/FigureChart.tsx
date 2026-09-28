import { useState } from 'react'
import { cssPaint, colorOf } from './palette'
import { markerPath } from '@/core/markers'
import { buildScene, type SceneElement, type SceneLine, type SceneMarker } from '@/core/figureScene'
import type { Figure, FigurePoint, FigureSeries } from '@/core/figures'

function Line({ line }: { line: SceneLine }) {
  return (
    <line
      x1={line.x1}
      y1={line.y1}
      x2={line.x2}
      y2={line.y2}
      stroke={cssPaint(line.stroke)}
      strokeWidth={line.width}
      {...(line.dash ? { strokeDasharray: line.dash } : {})}
    />
  )
}

function Element({ element }: { element: SceneElement }) {
  if (element.kind === 'line') return <Line line={element} />
  if (element.kind === 'marker') return null
  return (
    <text
      x={element.rotate ? 0 : element.x}
      y={element.rotate ? 0 : element.y}
      textAnchor={element.anchor}
      fontSize={element.size}
      fill={cssPaint(element.fill)}
      {...(element.rotate
        ? { transform: `translate(${element.x}, ${element.y}) rotate(${element.rotate})` }
        : {})}
    >
      {element.text}
    </text>
  )
}

interface Hovered {
  point: FigurePoint
  series: FigureSeries
  left: number
  top: number
}

export function FigureChart({ figure }: { figure: Figure }) {
  const [hovered, setHovered] = useState<Hovered | null>(null)
  const scene = buildScene(figure)

  const hover = (marker: SceneMarker) => {
    const series = figure.series[marker.seriesIndex]
    const point = series?.points[marker.pointIndex]
    if (!series || !point) return
    setHovered({
      point,
      series,
      left: (marker.x / scene.width) * 100,
      top: (marker.y / scene.height) * 100,
    })
  }

  return (
    <figure className="m-0 space-y-3">
      <figcaption className="text-sm font-medium">{figure.title}</figcaption>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800"
            style={{ background: 'var(--chart-surface)' }}
            role="img"
            aria-label={`${figure.title} — ${scene.markers.length} points`}
          >
            {scene.grid.map((line, index) => (
              <Line key={`g${index}`} line={line} />
            ))}
            {scene.axes.map((element, index) => (
              <Element key={`a${index}`} element={element} />
            ))}
            {scene.references.map((line, index) => (
              <Line key={`r${index}`} line={line} />
            ))}
            {scene.markers.map((marker, index) => (
              <path
                key={`m${index}`}
                d={markerPath(marker.shape, marker.radius)}
                transform={`translate(${marker.x.toFixed(1)}, ${marker.y.toFixed(1)})`}
                fill={cssPaint(marker.fill)}
                stroke="var(--chart-surface)"
                strokeWidth={1.5}
                onMouseEnter={() => hover(marker)}
                onMouseLeave={() => setHovered(null)}
              />
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
                  stroke={cssPaint({ token: 'line', role: line.role })}
                  strokeWidth={2}
                  {...(line.role === 'identity' ? { strokeDasharray: '3 2' } : {})}
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
