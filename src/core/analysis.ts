import { CASE_LABELS, type MeasurementCase } from './measurement'
import { mean, standardDeviation, studentTQuantile } from '@/stats'
import type { Category, Dataset, Sample } from './dataset'
import type { Diagnostic } from './types'

/** Niveau de confiance des limites, bilatéral. Fixé à 95 % dans l'application MATLAB. */
export const CONFIDENCE_LEVEL = 0.95

export interface GroupStatistics {
  n: number
  meanDifference: number
  standardDeviation: number
  /** Limite basse de l'intervalle de prédiction d'une différence individuelle. */
  lowerLimit: number
  upperLimit: number
}

export interface CategoryStatistics extends GroupStatistics {
  categoryIndex: number
}

export type TableCell = string | number | null

export interface ResultTable {
  /** Nom de la feuille dans le classeur de sortie, identique à celui de l'application MATLAB. */
  sheetName: string
  /** Intitulé lisible, pour l'affichage à l'écran. */
  title: string
  columns: string[]
  rows: TableCell[][]
}

export interface AnalysisResult {
  fileName: string
  dataset: Dataset
  overall: GroupStatistics
  byCategory: CategoryStatistics[]
  tables: ResultTable[]
  diagnostics: Diagnostic[]
}

/**
 * Statistiques d'un groupe de différences.
 *
 * Les limites encadrent une différence **individuelle** — intervalle de prédiction,
 * demi-largeur `t · SD · √(1 + 1/n)`. Voir docs/MATLAB_PARITY.md § « La formule des limites ».
 */
export function computeStatistics(differences: readonly number[]): GroupStatistics {
  const values = differences.filter(Number.isFinite)
  const n = values.length
  if (n < 2) {
    return {
      n,
      meanDifference: n === 1 ? values[0]! : Number.NaN,
      standardDeviation: Number.NaN,
      lowerLimit: Number.NaN,
      upperLimit: Number.NaN,
    }
  }

  const meanDifference = mean(values)
  const sd = standardDeviation(values)
  const t = studentTQuantile(1 - (1 - CONFIDENCE_LEVEL) / 2, n - 1)
  const halfWidth = t * sd * Math.sqrt(1 + 1 / n)

  return {
    n,
    meanDifference,
    standardDeviation: sd,
    lowerLimit: meanDifference - halfWidth,
    upperLimit: meanDifference + halfWidth,
  }
}

const interpretable = (sample: Sample) => sample.case === 1
const byCategoryThenTypeThenId = (a: Sample, b: Sample) =>
  a.categoryIndex - b.categoryIndex ||
  a.type.localeCompare(b.type) ||
  String(a.id).localeCompare(String(b.id), undefined, { numeric: true })

function typesOf(samples: Sample[]): string[] {
  return [...new Set(samples.map((sample) => sample.type))].sort()
}

function countCase(samples: Sample[], value: MeasurementCase): number {
  return samples.filter((sample) => sample.case === value).length
}

/**
 * Tableaux 1 et 2 : effectifs par catégorie et par type, avec sous-totaux par catégorie
 * puis total général. Le tableau 2 détaille par cas — dans l'ordre 1, 4, 2, 3, celui de
 * l'application MATLAB.
 */
function buildCountTables(samples: Sample[], categories: Category[]): [ResultTable, ResultTable] {
  const short: TableCell[][] = []
  const detailed: TableCell[][] = []

  const counts = (group: Sample[]): TableCell[] => [
    group.length,
    countCase(group, 1),
    countCase(group, 4),
    countCase(group, 2),
    countCase(group, 3),
  ]

  for (const category of categories) {
    const inCategory = samples.filter((sample) => sample.categoryIndex === category.index)
    if (inCategory.length === 0) continue

    for (const type of typesOf(inCategory)) {
      const group = inCategory.filter((sample) => sample.type === type)
      const head: TableCell[] = [category.name, category.typeNames[type] ?? type]
      const [tested, interp, ...rest] = counts(group)
      short.push([...head, tested!, interp!])
      detailed.push([...head, tested!, interp!, ...rest])
    }

    const [tested, interp, ...rest] = counts(inCategory)
    short.push([null, 'Total', tested!, interp!])
    detailed.push([null, 'Total', tested!, interp!, ...rest])
  }

  const [tested, interp, ...rest] = counts(samples)
  short.push([null, 'Total', tested!, interp!])
  detailed.push([null, 'Total', tested!, interp!, ...rest])

  return [
    {
      sheetName: 'Tableau 1',
      title: 'Effectifs testés et interprétables',
      columns: [
        'Category',
        'Type',
        'Number of tested samples',
        'Number of samples with interpretable results by both methods',
      ],
      rows: short,
    },
    {
      sheetName: 'Tableau 2',
      title: 'Effectifs détaillés par cas',
      columns: [
        'Category',
        'Type',
        'Number of tested samples',
        'Number of samples with interpretable results by both methods',
        'Number of samples with no results (ND)',
        'Number of samples with less than 4 colonies/plate',
        'Number of samples below or above the quantification limit',
      ],
      rows: detailed,
    },
  ]
}

/** Tableau 3 : les échantillons écartés des calculs, avec leurs valeurs d'origine. */
function buildExcludedTable(samples: Sample[]): ResultTable {
  const rows = samples
    .filter((sample) => !interpretable(sample))
    .sort(byCategoryThenTypeThenId)
    .map((sample): TableCell[] => [
      sample.id as TableCell,
      sample.labelEn,
      sample.reference.display as TableCell,
      sample.alternative.display as TableCell,
      sample.categoryIndex,
      sample.type,
    ])

  return {
    sheetName: 'Tableau 3',
    title: 'Échantillons non utilisés dans les calculs',
    columns: [
      'Sample n°',
      'Product',
      'Reference method (log CFU/g)',
      'Alternative method (log CFU/g)',
      'Category',
      'Type',
    ],
    rows,
  }
}

function buildStatisticsTable(overall: GroupStatistics, byCategory: CategoryStatistics[]): ResultTable {
  const line = (label: TableCell, s: GroupStatistics): TableCell[] => [
    label,
    s.n,
    s.meanDifference,
    s.standardDeviation,
    s.lowerLimit,
    s.upperLimit,
  ]

  return {
    sheetName: 'Tableau 4',
    title: 'Biais et limites de concordance',
    columns: [
      'Category',
      'n',
      'Average difference',
      'Standard deviation of differences',
      '95% lower limit',
      '95% upper limit',
    ],
    rows: [
      ...byCategory.map((statistics) => line(statistics.categoryIndex, statistics)),
      line('All categories', overall),
    ],
  }
}

/** Texte de la colonne « valeurs avant correction », restitué tel que MATLAB l'écrit. */
function beforeCorrection(sample: Sample): string {
  const { reference, alternative } = sample
  const both = reference.case === 3 && alternative.case === 3
  if (both) return `${reference.censoredText} / ${alternative.censoredText}`
  if (reference.case === 3) return reference.censoredText ?? '/'
  if (alternative.case === 3) return alternative.censoredText ?? '/'
  return '/'
}

/**
 * Tableaux 5 et 6 : échantillons dont la différence sort des limites calculées **toutes
 * catégories confondues**, puis leur dénombrement par cas.
 *
 * Les cas 2 et 3 y figurent bien qu'ils n'aient pas contribué au calcul des limites :
 * c'est le comportement de l'application MATLAB, et c'est voulu — ce sont justement les
 * échantillons dont on veut savoir où ils tombent.
 */
function buildOutlierTables(samples: Sample[], overall: GroupStatistics): [ResultTable, ResultTable] {
  const below = (sample: Sample) => sample.difference < overall.lowerLimit
  const above = (sample: Sample) => sample.difference > overall.upperLimit

  // Tri sur trois clés seulement — cas, catégorie, type — et stable : à clés égales,
  // l'ordre du fichier est conservé. C'est exactement ce que fait `sortrows` côté
  // MATLAB, et les ex æquo sont fréquents dans ce tableau.
  const outliers = samples
    .filter((sample) => below(sample) || above(sample))
    .sort((a, b) => a.case - b.case || a.categoryIndex - b.categoryIndex || a.type.localeCompare(b.type))

  const detail: ResultTable = {
    sheetName: 'Tableau 5',
    title: 'Échantillons hors limites',
    columns: [
      'Classification of the data',
      'Category',
      'Type',
      'N° Sample',
      'Product',
      'Reference method',
      'Alternative method',
      'Values before correction (Reference or/and alternative method)',
      'Mean',
      'Difference',
    ],
    rows: outliers.map((sample): TableCell[] => [
      sample.case,
      sample.categoryIndex,
      sample.type,
      sample.id as TableCell,
      sample.labelEn,
      sample.reference.corrected,
      sample.alternative.corrected,
      beforeCorrection(sample),
      sample.average,
      sample.difference,
    ]),
  }

  const rows: TableCell[][] = []
  for (const value of [...new Set(outliers.map((sample) => sample.case))].sort()) {
    const group = outliers.filter((sample) => sample.case === value)
    const low = group.filter(below).length
    const high = group.filter(above).length
    rows.push([CASE_LABELS[value], '<LCL', low], [CASE_LABELS[value], '>UCL', high], [
      CASE_LABELS[value],
      'Total',
      low + high,
    ])
  }
  const totalLow = outliers.filter(below).length
  const totalHigh = outliers.filter(above).length
  rows.push([' ', 'Total <LCL', totalLow], [' ', 'Total >UCL', totalHigh], [
    ' ',
    'TOTAL',
    totalLow + totalHigh,
  ])

  const summary: ResultTable = {
    sheetName: 'Tableau 6',
    title: 'Répartition des échantillons hors limites',
    columns: ['', '', 'Number of samples'],
    rows,
  }

  return [detail, summary]
}

/** Enchaîne tous les calculs sur un jeu de données déjà lu et classé. */
export function analyse(dataset: Dataset): AnalysisResult {
  const diagnostics: Diagnostic[] = [...dataset.diagnostics]
  const { samples, categories } = dataset
  const usable = samples.filter(interpretable)

  const overall = computeStatistics(usable.map((sample) => sample.difference))
  const byCategory: CategoryStatistics[] = categories
    .filter((category) => samples.some((sample) => sample.categoryIndex === category.index))
    .map((category) => ({
      categoryIndex: category.index,
      ...computeStatistics(
        usable.filter((sample) => sample.categoryIndex === category.index).map((s) => s.difference),
      ),
    }))

  for (const statistics of byCategory) {
    const name = categories.find((c) => c.index === statistics.categoryIndex)?.name ?? statistics.categoryIndex
    if (statistics.n === 0) {
      diagnostics.push({
        severity: 'warning',
        message: `Catégorie « ${name} » : aucun échantillon interprétable, pas de statistiques.`,
      })
    } else if (statistics.n < 3) {
      diagnostics.push({
        severity: 'warning',
        message: `Catégorie « ${name} » : ${statistics.n} échantillon(s) interprétable(s) seulement — limites peu robustes.`,
      })
    }
  }

  const tables = [
    ...buildCountTables(samples, categories),
    buildExcludedTable(samples),
    buildStatisticsTable(overall, byCategory),
    ...buildOutlierTables(samples, overall),
  ].filter((table) => table.rows.length > 0)

  return { fileName: dataset.fileName, dataset, overall, byCategory, tables, diagnostics }
}
