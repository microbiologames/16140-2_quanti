import { CASE_LABELS, type MeasurementCase } from './measurement'
import { DEFAULT_LOCALE, strings, type Locale } from './i18n'
import { mean, standardDeviation, studentTQuantile } from '@/stats'
import type { Category, Dataset, Sample } from './dataset'
import type { Diagnostic } from './types'

/** Niveau de confiance des limites, bilatéral. Fixé à 95 % dans l'application MATLAB. */
export const CONFIDENCE_LEVEL = 0.95

/** Le risque, écrit proprement : `1 - 0.95` vaut 0,050000000000000044 en flottant. */
const ALPHA = Number((1 - CONFIDENCE_LEVEL).toFixed(12))

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

/**
 * Cellule calculée : la formule pour Excel, et sa valeur déjà résolue.
 *
 * La valeur en cache rend le classeur juste dès l'ouverture, même dans un lecteur qui
 * ne recalcule pas ; la formule, elle, rend le résultat vérifiable et permet de rejouer
 * le calcul après modification des données.
 */
export interface FormulaCell {
  formula: string
  result: string | number
}

export type TableCell = string | number | null | FormulaCell

/** Valeur d'une cellule, formule résolue. */
export function cellValue(cell: TableCell): string | number | null {
  return cell !== null && typeof cell === 'object' ? cell.result : cell
}

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
  locale: Locale
  dataset: Dataset
  overall: GroupStatistics
  byCategory: CategoryStatistics[]
  /** Les six tableaux, puis la feuille de données qui porte les formules. */
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

const compareIds = (a: Sample, b: Sample) =>
  String(a.id).localeCompare(String(b.id), undefined, { numeric: true })

const byCategoryThenTypeThenId = (a: Sample, b: Sample) =>
  a.categoryIndex - b.categoryIndex || a.type.localeCompare(b.type) || compareIds(a, b)

function typesOf(samples: Sample[]): string[] {
  return [...new Set(samples.map((sample) => sample.type))].sort()
}

function countCase(samples: Sample[], value: MeasurementCase): number {
  return samples.filter((sample) => sample.case === value).length
}

/* ------------------------------------------------------------------ formules */

/**
 * Adresses de la feuille de données, sur laquelle s'appuient toutes les formules.
 *
 * Les fonctions employées — COUNTIFS, AVERAGEIFS, SUMPRODUCT, TINV — datent toutes
 * d'Excel 2007 au plus tard. Leurs équivalents modernes (T.INV.2T, STDEV.S) devraient
 * être préfixés `_xlfn.` dans le fichier, et ne s'ouvriraient pas partout.
 */
class DataSheetRefs {
  constructor(
    private readonly sheet: string,
    private readonly rowCount: number,
  ) {}

  /** Colonne entière, en-tête compris : les fonctions de comptage l'ignorent. */
  column(letter: string): string {
    return `'${this.sheet}'!$${letter}:$${letter}`
  }

  /** Plage bornée aux lignes de données, nécessaire au calcul terme à terme. */
  range(letter: string): string {
    return `'${this.sheet}'!$${letter}$2:$${letter}$${this.rowCount + 1}`
  }
}

const COLUMN_CATEGORY = 'B'
const COLUMN_TYPE = 'C'
const COLUMN_CASE = 'D'
const COLUMN_DIFFERENCE = 'H'

/** Lettre de colonne d'un tableau de sortie, à partir de son index. */
const letter = (index: number) => String.fromCharCode(65 + index)

/* -------------------------------------------------------------------- tables */

interface Context {
  locale: Locale
  text: ReturnType<typeof strings>
  refs: DataSheetRefs
}

/** Feuille de données : une ligne par échantillon, cible de toutes les formules. */
function buildDataTable(samples: Sample[], context: Context): ResultTable {
  const number = (value: number): number | null => (Number.isFinite(value) ? value : null)

  return {
    sheetName: context.text.dataSheet.name,
    title: context.text.dataSheet.name,
    columns: context.text.dataSheet.columns,
    rows: samples.map((sample): TableCell[] => [
      sample.id as TableCell,
      sample.categoryIndex,
      sample.type,
      sample.case,
      number(sample.reference.corrected),
      number(sample.alternative.corrected),
      number(sample.average),
      number(sample.difference),
    ]),
  }
}

/**
 * Tableaux 1 et 2 : effectifs par catégorie et par type, avec sous-totaux par catégorie
 * puis total général. Le tableau 2 détaille par cas — dans l'ordre 1, 4, 2, 3, celui de
 * l'application MATLAB.
 *
 * Les effectifs sont des COUNTIFS sur la feuille de données, les totaux des SUM sur les
 * lignes qu'ils résument : le classeur se relit et se recalcule.
 */
function buildCountTables(
  samples: Sample[],
  categories: Category[],
  context: Context,
): [ResultTable, ResultTable] {
  const { refs, text } = context
  const short: TableCell[][] = []
  const detailed: TableCell[][] = []
  const subtotalRows: number[] = []

  const criteria = (categoryIndex: number, type?: string) =>
    [
      `${refs.column(COLUMN_CATEGORY)},${categoryIndex}`,
      type === undefined ? null : `${refs.column(COLUMN_TYPE)},"${type}"`,
    ]
      .filter((part): part is string => part !== null)
      .join(',')

  const count = (group: Sample[], base: string, caseValue?: MeasurementCase): FormulaCell => {
    const filter = caseValue === undefined ? '' : `,${refs.column(COLUMN_CASE)},${caseValue}`
    const result =
      caseValue === undefined ? group.length : group.filter((s) => s.case === caseValue).length
    return { formula: `COUNTIFS(${base}${filter})`, result }
  }

  /** Ligne de sous-total : la somme des lignes de détail qu'elle ferme. */
  const sumRows = (column: number, from: number, to: number, result: number): FormulaCell => ({
    formula: `SUM(${letter(column)}${from}:${letter(column)}${to})`,
    result,
  })

  const sumCells = (column: number, rows: number[], result: number): FormulaCell => ({
    formula: rows.map((row) => `${letter(column)}${row}`).join('+'),
    result,
  })

  for (const category of categories) {
    const inCategory = samples.filter((sample) => sample.categoryIndex === category.index)
    if (inCategory.length === 0) continue

    const firstRow = short.length + 2 // ligne 1 : en-tête
    for (const type of typesOf(inCategory)) {
      const group = inCategory.filter((sample) => sample.type === type)
      const base = criteria(category.index, type)
      const head: TableCell[] = [category.name, category.typeNames[type] ?? type]

      short.push([...head, count(group, base), count(group, base, 1)])
      detailed.push([
        ...head,
        count(group, base),
        count(group, base, 1),
        count(group, base, 4),
        count(group, base, 2),
        count(group, base, 3),
      ])
    }
    const lastRow = short.length + 1
    const subtotal = short.length + 2
    subtotalRows.push(subtotal)

    const totals = [
      inCategory.length,
      countCase(inCategory, 1),
      countCase(inCategory, 4),
      countCase(inCategory, 2),
      countCase(inCategory, 3),
    ]
    short.push([
      null,
      text.rows.total,
      sumRows(2, firstRow, lastRow, totals[0]!),
      sumRows(3, firstRow, lastRow, totals[1]!),
    ])
    detailed.push([
      null,
      text.rows.total,
      ...totals.map((total, index) => sumRows(index + 2, firstRow, lastRow, total)),
    ])
  }

  const grand = [
    samples.length,
    countCase(samples, 1),
    countCase(samples, 4),
    countCase(samples, 2),
    countCase(samples, 3),
  ]
  short.push([
    null,
    text.rows.total,
    sumCells(2, subtotalRows, grand[0]!),
    sumCells(3, subtotalRows, grand[1]!),
  ])
  detailed.push([
    null,
    text.rows.total,
    ...grand.map((total, index) => sumCells(index + 2, subtotalRows, total)),
  ])

  return [
    {
      sheetName: 'Tableau 1',
      title: text.tableTitles.counts,
      columns: [text.columns.category, text.columns.type, text.columns.tested, text.columns.interpretable],
      rows: short,
    },
    {
      sheetName: 'Tableau 2',
      title: text.tableTitles.countsByCase,
      columns: [
        text.columns.category,
        text.columns.type,
        text.columns.tested,
        text.columns.interpretable,
        text.columns.noResult,
        text.columns.lowCount,
        text.columns.outOfRange,
      ],
      rows: detailed,
    },
  ]
}

/** Tableau 3 : les échantillons écartés des calculs, avec leurs valeurs d'origine. */
function buildExcludedTable(samples: Sample[], { text }: Context): ResultTable {
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
    title: text.tableTitles.excluded,
    columns: [
      text.columns.sampleNumber,
      text.columns.product,
      text.columns.referenceWithUnit,
      text.columns.alternativeWithUnit,
      text.columns.category,
      text.columns.type,
    ],
    rows,
  }
}

/**
 * Tableau 4 : effectif, biais, dispersion et limites, par catégorie puis en tout.
 *
 * Entièrement en formules : l'écart-type passe par SUMPRODUCT plutôt que par une
 * formule matricielle, qui demanderait une validation par Ctrl+Maj+Entrée sur les
 * versions d'Excel antérieures aux tableaux dynamiques.
 */
function buildStatisticsTable(
  overall: GroupStatistics,
  byCategory: CategoryStatistics[],
  context: Context,
): ResultTable {
  const { refs, text } = context
  const rows: TableCell[][] = []

  const line = (label: TableCell, statistics: GroupStatistics, categoryIndex?: number): TableCell[] => {
    const row = rows.length + 2
    const caseFilter = `${refs.column(COLUMN_CASE)},1`
    const scope =
      categoryIndex === undefined
        ? caseFilter
        : `${refs.column(COLUMN_CATEGORY)},${categoryIndex},${caseFilter}`

    const mask =
      categoryIndex === undefined
        ? `(${refs.range(COLUMN_CASE)}=1)`
        : `(${refs.range(COLUMN_CATEGORY)}=${categoryIndex})*(${refs.range(COLUMN_CASE)}=1)`

    const nCell = `B${row}`
    const meanCell = `C${row}`
    const sdCell = `D${row}`
    const halfWidth = `TINV(${ALPHA},${nCell}-1)*${sdCell}*SQRT(1+1/${nCell})`

    return [
      label,
      { formula: `COUNTIFS(${scope})`, result: statistics.n },
      {
        formula: `AVERAGEIFS(${refs.column(COLUMN_DIFFERENCE)},${scope})`,
        result: statistics.meanDifference,
      },
      {
        formula: `SQRT(SUMPRODUCT(${mask}*(${refs.range(COLUMN_DIFFERENCE)}-${meanCell})^2)/(${nCell}-1))`,
        result: statistics.standardDeviation,
      },
      { formula: `${meanCell}-${halfWidth}`, result: statistics.lowerLimit },
      { formula: `${meanCell}+${halfWidth}`, result: statistics.upperLimit },
    ]
  }

  for (const statistics of byCategory) {
    rows.push(line(statistics.categoryIndex, statistics, statistics.categoryIndex))
  }
  rows.push(line(text.rows.allCategories, overall))

  return {
    sheetName: 'Tableau 4',
    title: text.tableTitles.statistics,
    columns: [
      text.columns.category,
      text.columns.n,
      text.columns.meanDifference,
      text.columns.standardDeviation,
      text.columns.lowerLimit,
      text.columns.upperLimit,
    ],
    rows,
  }
}

/** Texte de la colonne « valeurs avant correction », restitué tel que MATLAB l'écrit. */
function beforeCorrection(sample: Sample): string {
  const { reference, alternative } = sample
  if (reference.case === 3 && alternative.case === 3) {
    return `${reference.censoredText} / ${alternative.censoredText}`
  }
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
function buildOutlierTables(
  samples: Sample[],
  overall: GroupStatistics,
  limitsRow: number,
  context: Context,
): [ResultTable, ResultTable] {
  const { refs, text } = context
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
    title: text.tableTitles.outliers,
    columns: [
      text.columns.dataClassification,
      text.columns.category,
      text.columns.type,
      text.columns.sampleNumber,
      text.columns.product,
      text.columns.reference,
      text.columns.alternative,
      text.columns.beforeCorrection,
      text.columns.mean,
      text.columns.difference,
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

  const lowerRef = `'Tableau 4'!$E$${limitsRow}`
  const upperRef = `'Tableau 4'!$F$${limitsRow}`
  const rows: TableCell[][] = []
  const totalRows: number[] = []

  const countOutside = (side: 'below' | 'above', result: number, caseValue?: MeasurementCase) => {
    const scope = caseValue === undefined ? '' : `${refs.column(COLUMN_CASE)},${caseValue},`
    const comparison =
      side === 'below'
        ? `"<"&${lowerRef}`
        : `">"&${upperRef}`
    return {
      formula: `COUNTIFS(${scope}${refs.column(COLUMN_DIFFERENCE)},${comparison})`,
      result,
    }
  }

  for (const value of [...new Set(outliers.map((sample) => sample.case))].sort()) {
    const group = outliers.filter((sample) => sample.case === value)
    const low = group.filter(below).length
    const high = group.filter(above).length
    const first = rows.length + 2

    rows.push(
      [text.cases[value - 1]!, text.rows.belowLower, countOutside('below', low, value)],
      [text.cases[value - 1]!, text.rows.aboveUpper, countOutside('above', high, value)],
      [
        text.cases[value - 1]!,
        text.rows.total,
        { formula: `SUM(C${first}:C${first + 1})`, result: low + high },
      ],
    )
    totalRows.push(first, first + 1)
  }

  const totalLow = outliers.filter(below).length
  const totalHigh = outliers.filter(above).length
  const lowRows = totalRows.filter((_, index) => index % 2 === 0)
  const highRows = totalRows.filter((_, index) => index % 2 === 1)
  const sumOf = (targets: number[], result: number): FormulaCell => ({
    formula: targets.length > 0 ? targets.map((row) => `C${row}`).join('+') : String(result),
    result,
  })

  const summaryFirst = rows.length + 2
  rows.push(
    [' ', text.rows.totalBelow, sumOf(lowRows, totalLow)],
    [' ', text.rows.totalAbove, sumOf(highRows, totalHigh)],
    [
      ' ',
      text.rows.grandTotal,
      { formula: `SUM(C${summaryFirst}:C${summaryFirst + 1})`, result: totalLow + totalHigh },
    ],
  )

  const summary: ResultTable = {
    sheetName: 'Tableau 6',
    title: text.tableTitles.outlierSummary,
    columns: ['', '', text.columns.sampleCount],
    rows,
  }

  return [detail, summary]
}

export interface AnalysisOptions {
  locale?: Locale
}

/** Enchaîne tous les calculs sur un jeu de données déjà lu et classé. */
export function analyse(dataset: Dataset, options: AnalysisOptions = {}): AnalysisResult {
  const locale = options.locale ?? DEFAULT_LOCALE
  const text = strings(locale)
  const diagnostics: Diagnostic[] = [...dataset.diagnostics]
  const { samples, categories } = dataset
  const usable = samples.filter(interpretable)

  const context: Context = {
    locale,
    text,
    refs: new DataSheetRefs(text.dataSheet.name, samples.length),
  }

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

  // La ligne « toutes catégories » du tableau 4, à laquelle le tableau 6 se réfère.
  const limitsRow = byCategory.length + 2

  const tables = [
    ...buildCountTables(samples, categories, context),
    buildExcludedTable(samples, context),
    buildStatisticsTable(overall, byCategory, context),
    ...buildOutlierTables(samples, overall, limitsRow, context),
    buildDataTable(samples, context),
  ].filter((table) => table.rows.length > 0)

  return { fileName: dataset.fileName, locale, dataset, overall, byCategory, tables, diagnostics }
}

export { CASE_LABELS }
