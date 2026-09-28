import { niceTicks } from './markers'
import type { Figure, LineRole, MarkerShape } from './figures'

/**
 * Géométrie d'une figure, indépendante de son rendu.
 *
 * L'affichage à l'écran et l'export du classeur consomment cette même scène : l'un
 * en JSX avec des variables CSS, l'autre en SVG autonome avec des couleurs résolues.
 * Sans elle, deux tracés à garder synchronisés — et donc à voir diverger.
 */

/** Rôle d'une couleur. Chaque moteur de rendu le traduit dans son propre vocabulaire. */
export type Paint =
  | { token: 'series'; index: number }
  | { token: 'case2' }
  | { token: 'case3' }
  | { token: 'line'; role: LineRole }
  | { token: 'ink' }
  | { token: 'grid' }
  | { token: 'axis' }
  | { token: 'surface' }

export interface SceneLine {
  kind: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: Paint
  width: number
  dash?: string
}

export interface SceneText {
  kind: 'text'
  x: number
  y: number
  text: string
  anchor: 'start' | 'middle' | 'end'
  size: number
  fill: Paint
  /** Rotation en degrés autour du point d'ancrage. */
  rotate?: number
}

export interface SceneMarker {
  kind: 'marker'
  x: number
  y: number
  shape: MarkerShape
  radius: number
  fill: Paint
  /** Indices dans `figure.series` et dans ses points — pour retrouver l'origine au survol. */
  seriesIndex: number
  pointIndex: number
}

export type SceneElement = SceneLine | SceneText | SceneMarker

export interface Scene {
  width: number
  height: number
  grid: SceneLine[]
  axes: SceneElement[]
  references: SceneLine[]
  markers: SceneMarker[]
}

export interface SceneLayout {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  markerRadius: number
  fontSize: number
}

export const SCREEN_LAYOUT: SceneLayout = {
  width: 660,
  height: 440,
  margin: { top: 14, right: 18, bottom: 54, left: 68 },
  markerRadius: 5,
  fontSize: 12,
}

const DASH: Partial<Record<LineRole, string>> = { identity: '6 4' }

/** Étendue verticale : celle imposée par le fichier, sinon les données plus une marge. */
export function verticalDomain(figure: Figure): [number, number] {
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

export function buildScene(figure: Figure, layout: SceneLayout = SCREEN_LAYOUT): Scene {
  const { width, height, margin, markerRadius, fontSize } = layout
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom
  const bottom = margin.top + plotHeight

  const [xMin, xMax] = figure.xDomain
  const [yMin, yMax] = verticalDomain(figure)
  const toX = (value: number) => margin.left + ((value - xMin) / (xMax - xMin)) * plotWidth
  const toY = (value: number) => bottom - ((value - yMin) / (yMax - yMin)) * plotHeight

  const xTicks = niceTicks(xMin, xMax)
  const yTicks = niceTicks(yMin, yMax)

  const grid: SceneLine[] = [
    ...xTicks.map((tick): SceneLine => ({
      kind: 'line', x1: toX(tick), x2: toX(tick), y1: margin.top, y2: bottom,
      stroke: { token: 'grid' }, width: 1,
    })),
    ...yTicks.map((tick): SceneLine => ({
      kind: 'line', x1: margin.left, x2: margin.left + plotWidth, y1: toY(tick), y2: toY(tick),
      stroke: { token: 'grid' }, width: 1,
    })),
  ]

  const axes: SceneElement[] = [
    {
      kind: 'line', x1: margin.left, x2: margin.left + plotWidth, y1: bottom, y2: bottom,
      stroke: { token: 'axis' }, width: 1.5,
    },
    {
      kind: 'line', x1: margin.left, x2: margin.left, y1: margin.top, y2: bottom,
      stroke: { token: 'axis' }, width: 1.5,
    },
    ...xTicks.map((tick): SceneText => ({
      kind: 'text', x: toX(tick), y: bottom + fontSize + 6, text: String(tick),
      anchor: 'middle', size: fontSize, fill: { token: 'ink' },
    })),
    ...yTicks.map((tick): SceneText => ({
      kind: 'text', x: margin.left - 10, y: toY(tick) + fontSize / 3, text: String(tick),
      anchor: 'end', size: fontSize, fill: { token: 'ink' },
    })),
    {
      kind: 'text', x: margin.left + plotWidth / 2, y: height - 12, text: figure.xLabel,
      anchor: 'middle', size: fontSize, fill: { token: 'ink' },
    },
    {
      kind: 'text', x: 16, y: margin.top + plotHeight / 2, text: figure.yLabel,
      anchor: 'middle', size: fontSize, fill: { token: 'ink' }, rotate: -90,
    },
  ]

  const references: SceneLine[] = figure.lines.flatMap((line): SceneLine[] => {
    const paint: Paint = { token: 'line', role: line.role }
    const dash = DASH[line.role]

    if (line.diagonal) {
      const start = Math.max(xMin, yMin)
      const end = Math.min(xMax, yMax)
      if (end <= start) return []
      return [{
        kind: 'line', x1: toX(start), y1: toY(start), x2: toX(end), y2: toY(end),
        stroke: paint, width: 2, ...(dash ? { dash } : {}),
      }]
    }

    // Une limite hors de l'échelle verticale n'est pas tracée : elle ferait un trait
    // collé au bord, qu'on lirait comme une valeur atteinte.
    const value = line.value
    if (value === undefined || value < yMin || value > yMax) return []
    return [{
      kind: 'line', x1: margin.left, x2: margin.left + plotWidth, y1: toY(value), y2: toY(value),
      stroke: paint, width: 2, ...(dash ? { dash } : {}),
    }]
  })

  const markers: SceneMarker[] = figure.series.flatMap((series, seriesIndex) =>
    series.points
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point, pointIndex): SceneMarker => ({
        kind: 'marker',
        x: toX(point.x),
        y: toY(point.y),
        shape: series.shape,
        radius: markerRadius,
        fill:
          series.color.kind === 'slot'
            ? { token: 'series', index: series.color.index }
            : series.color.kind === 'case2'
              ? { token: 'case2' }
              : { token: 'case3' },
        seriesIndex,
        pointIndex,
      })),
  )

  return { width, height, grid, axes, references, markers }
}
