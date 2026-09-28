import type { AnalysisResult, GroupStatistics } from './analysis'
import type { Category, Sample } from './dataset'

/**
 * Modèle de figure : des données et des rôles, aucune couleur ni aucun pixel.
 *
 * Les couleurs, les libellés et l'ordre d'affichage vivent dans la couche de
 * présentation, ce qui permet de les modifier sans relancer le moindre calcul.
 */

/** Marqueurs repris de l'application MATLAB : d, s, ^, v, <, >, p, h, o. */
export type MarkerShape =
  | 'diamond' | 'square' | 'triangle' | 'triangleDown'
  | 'triangleLeft' | 'triangleRight' | 'pentagon' | 'hexagon' | 'circle'

const CATEGORY_SHAPES: MarkerShape[] = [
  'diamond', 'square', 'triangle', 'triangleDown',
  'triangleLeft', 'triangleRight', 'pentagon', 'hexagon',
]

/**
 * À quoi sert la couleur d'une série. `case2` et `case3` sont des rôles fixes ;
 * les autres séries prennent un rang, que la palette traduit en teinte.
 */
export type ColorRole = { kind: 'slot'; index: number } | { kind: 'case2' } | { kind: 'case3' }

export interface FigurePoint {
  x: number
  y: number
  /** Ce qu'affiche l'infobulle : identifiant et produit. */
  label: string
  detail: string
}

export interface FigureSeries {
  key: string
  label: string
  shape: MarkerShape
  color: ColorRole
  points: FigurePoint[]
}

export type LineRole = 'identity' | 'bias' | 'limit'

export interface ReferenceLine {
  role: LineRole
  label: string
  /** Ordonnée de la ligne ; absente pour la diagonale y = x. */
  value?: number
  diagonal?: boolean
}

export interface Figure {
  /** Nom de la feuille dans le classeur de sortie, comme dans l'application MATLAB. */
  sheetName: string
  title: string
  xLabel: string
  yLabel: string
  xDomain: [number, number]
  /** Absent : l'échelle s'ajuste aux données. */
  yDomain?: [number, number]
  series: FigureSeries[]
  lines: ReferenceLine[]
}

const AXIS_SCATTER_X = 'Reference method (log CFU/g)'
const AXIS_SCATTER_Y = 'Alternative method (log CFU/g)'
const AXIS_BA_X = 'Mean (log CFU/g)'
const AXIS_BA_Y = 'Difference alternative − reference (log CFU/g)'

/** `round` de MATLAB : la moitié s'éloigne de zéro, là où `Math.round` va vers +∞. */
function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}

/**
 * Étendue commune à tous les nuages : de 0 au maximum des valeurs corrigées, arrondi
 * puis augmenté de 1 log. Calculée une fois sur l'ensemble, pas par catégorie, pour
 * que les figures restent comparables entre elles.
 */
export function scatterDomain(samples: Sample[]): [number, number] {
  const values = samples
    .flatMap((sample) => [sample.reference.corrected, sample.alternative.corrected])
    .filter(Number.isFinite)
  if (values.length === 0) return [0, 1]
  return [0, roundHalfAwayFromZero(Math.max(...values)) + 1]
}

const describe = (sample: Sample) => ({
  label: `n° ${String(sample.id)}`,
  detail: sample.labelEn || sample.labelFr,
})

const point = (sample: Sample, x: number, y: number): FigurePoint => ({ x, y, ...describe(sample) })

/** Séries des échantillons écartés : un seul marqueur chacune, quel que soit le type. */
function excludedSeries(
  samples: Sample[],
  toPoint: (sample: Sample) => FigurePoint,
): FigureSeries[] {
  const build = (
    caseValue: 2 | 3,
    key: string,
    label: string,
    shape: MarkerShape,
    color: ColorRole,
  ): FigureSeries[] => {
    const points = samples.filter((sample) => sample.case === caseValue).map(toPoint)
    return points.length === 0 ? [] : [{ key, label, shape, color, points }]
  }

  return [
    ...build(2, 'case-2', '<4 colonies/plate', 'circle', { kind: 'case2' }),
    ...build(3, 'case-3', 'corrected values', 'square', { kind: 'case3' }),
  ]
}

/** Séries des échantillons interprétables, découpées par type au sein d'une catégorie. */
function seriesByType(
  samples: Sample[],
  category: Category,
  toPoint: (sample: Sample) => FigurePoint,
): FigureSeries[] {
  const types = [...new Set(samples.map((sample) => sample.type))].sort()
  return types
    .map((type, rank) => ({
      key: `type-${type}`,
      label: category.typeNames[type] ?? `Type ${type}`,
      shape: CATEGORY_SHAPES[rank] ?? 'circle',
      color: { kind: 'slot', index: rank } as ColorRole,
      points: samples.filter((s) => s.case === 1 && s.type === type).map(toPoint),
    }))
    .filter((series) => series.points.length > 0)
}

/**
 * Séries découpées par catégorie.
 *
 * Le rang de forme et de couleur suit la position dans la liste des catégories
 * **présentes**, jamais le numéro de catégorie : une catégorie absente ne laisse pas
 * de trou, et les légendes ne se décalent pas — le défaut n° 8 relevé côté MATLAB.
 */
function seriesByCategory(
  samples: Sample[],
  categories: Category[],
  toPoint: (sample: Sample) => FigurePoint,
): FigureSeries[] {
  return categories
    .map((category, rank) => ({
      key: `cat-${category.index}`,
      label: category.name,
      shape: CATEGORY_SHAPES[rank] ?? 'circle',
      color: { kind: 'slot', index: rank } as ColorRole,
      points: samples.filter((s) => s.case === 1 && s.categoryIndex === category.index).map(toPoint),
    }))
    .filter((series) => series.points.length > 0)
}

function blandAltmanLines(statistics: GroupStatistics): ReferenceLine[] {
  const lines: ReferenceLine[] = [{ role: 'identity', label: 'y = 0', value: 0 }]
  if (!Number.isFinite(statistics.meanDifference)) return lines
  lines.push({ role: 'bias', label: 'Bias', value: statistics.meanDifference })
  if (Number.isFinite(statistics.lowerLimit)) {
    lines.push(
      { role: 'limit', label: '95 % lower limit', value: statistics.lowerLimit },
      { role: 'limit', label: '95 % upper limit', value: statistics.upperLimit },
    )
  }
  return lines
}

/** Construit les quatre familles de figures, dans l'ordre des feuilles de sortie. */
export function buildFigures(result: AnalysisResult): Figure[] {
  const { dataset, overall, byCategory } = result
  const { samples } = dataset
  const domain = scatterDomain(samples)

  const present = dataset.categories.filter((category) =>
    samples.some((sample) => sample.categoryIndex === category.index),
  )

  const scatterPoint = (sample: Sample) =>
    point(sample, sample.reference.corrected, sample.alternative.corrected)
  const agreementPoint = (sample: Sample) => point(sample, sample.average, sample.difference)

  const figures: Figure[] = []

  for (const category of present) {
    const inCategory = samples.filter((sample) => sample.categoryIndex === category.index)
    figures.push({
      sheetName: `Plot_cat_${category.index}`,
      title: category.name,
      xLabel: AXIS_SCATTER_X,
      yLabel: AXIS_SCATTER_Y,
      xDomain: domain,
      yDomain: domain,
      series: [
        ...seriesByType(inCategory, category, scatterPoint),
        ...excludedSeries(inCategory, scatterPoint),
      ],
      lines: [{ role: 'identity', label: 'y = x', diagonal: true }],
    })
  }

  figures.push({
    sheetName: 'Plot_allcat',
    title: 'Toutes catégories',
    xLabel: AXIS_SCATTER_X,
    yLabel: AXIS_SCATTER_Y,
    xDomain: domain,
    yDomain: domain,
    series: [
      ...seriesByCategory(samples, present, scatterPoint),
      ...excludedSeries(samples, scatterPoint),
    ],
    lines: [{ role: 'identity', label: 'y = x', diagonal: true }],
  })

  figures.push({
    sheetName: 'Bland Altman',
    title: 'Bland-Altman — toutes catégories',
    xLabel: AXIS_BA_X,
    yLabel: AXIS_BA_Y,
    xDomain: domain,
    series: [
      ...seriesByCategory(samples, present, agreementPoint),
      ...excludedSeries(samples, agreementPoint),
    ],
    lines: blandAltmanLines(overall),
  })

  for (const category of present) {
    const inCategory = samples.filter((sample) => sample.categoryIndex === category.index)
    const statistics = byCategory.find((entry) => entry.categoryIndex === category.index)
    figures.push({
      sheetName: `Plot_BA_cat_${category.index}`,
      title: `Bland-Altman — ${category.name}`,
      xLabel: AXIS_BA_X,
      yLabel: AXIS_BA_Y,
      xDomain: domain,
      ...(category.blandAltmanLimits ? { yDomain: category.blandAltmanLimits } : {}),
      series: [
        ...seriesByType(inCategory, category, agreementPoint),
        ...excludedSeries(inCategory, agreementPoint),
      ],
      lines: statistics ? blandAltmanLines(statistics) : [],
    })
  }

  return figures
}
