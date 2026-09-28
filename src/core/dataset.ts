import { combineCases, normalizeKey, parseMeasurement, type Measurement, type MeasurementCase } from './measurement'
import type { CellValue, Diagnostic, RawSheet, RawWorkbook } from './types'

export interface Category {
  /** Numéro de la catégorie : le rang de sa ligne dans l'onglet `Classification`. */
  index: number
  name: string
  /** Nom affiché de chaque type, par code (`a`, `b`, `c`…). */
  typeNames: Record<string, string>
  /** Limites verticales du Bland-Altman, si le fichier en porte. */
  blandAltmanLimits?: [number, number]
}

export interface Sample {
  /** Ligne dans l'onglet `Data`, numérotée comme dans Excel. */
  row: number
  year: CellValue
  id: CellValue
  labelFr: string
  labelEn: string
  reference: Measurement
  alternative: Measurement
  categoryIndex: number
  type: string
  /** Cas global : le plus grave des deux mesures. */
  case: MeasurementCase
  /** Moyenne des deux valeurs corrigées — `NaN` si l'une manque. */
  average: number
  /** Valeur alternative moins valeur de référence. */
  difference: number
}

export interface Dataset {
  fileName: string
  samples: Sample[]
  categories: Category[]
  diagnostics: Diagnostic[]
}

const TYPE_CODES = 'abcdefgh'

const SHEET_ALIASES = {
  data: ['data', 'donnees', 'resultats'],
  classification: ['classification', 'categories'],
} as const

const COLUMN_ALIASES = {
  year: ['year', 'annee'],
  id: ['ech', 'echantillon', 'sample', 'samplen', 'nsample'],
  labelFr: ['french', 'francais', 'produitfr'],
  labelEn: ['english', 'anglais', 'product'],
  reference: ['rmlog', 'rm', 'referencemethod', 'reference', 'methodedereference'],
  alternative: ['amlog', 'am', 'alternativemethod', 'alternative', 'methodealternative'],
  category: ['cat', 'categorie', 'category'],
  type: ['typ', 'type'],
} as const

type ColumnKey = keyof typeof COLUMN_ALIASES
const REQUIRED: ColumnKey[] = ['reference', 'alternative', 'category', 'type']

function text(value: CellValue): string {
  if (value === null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function findSheet(sheets: RawSheet[], aliases: readonly string[]): RawSheet | undefined {
  return sheets.find((sheet) => aliases.includes(normalizeKey(sheet.name)))
}

/** Repère la ligne d'en-tête et la position de chaque colonne connue. */
function locateColumns(sheet: RawSheet): { headerRow: number; columns: Partial<Record<ColumnKey, number>> } {
  let best = { headerRow: -1, columns: {} as Partial<Record<ColumnKey, number>>, score: 0 }

  for (let row = 0; row < Math.min(sheet.rows.length, 15); row++) {
    const columns: Partial<Record<ColumnKey, number>> = {}
    const cells = sheet.rows[row] ?? []
    cells.forEach((cell, index) => {
      const key = normalizeKey(text(cell))
      if (key === '') return
      for (const [name, aliases] of Object.entries(COLUMN_ALIASES) as [ColumnKey, readonly string[]][]) {
        if (columns[name] === undefined && aliases.includes(key)) columns[name] = index
      }
    })
    const score = Object.keys(columns).length
    if (score > best.score) best = { headerRow: row, columns, score }
  }

  return { headerRow: best.headerRow, columns: best.columns }
}

/**
 * Détecte les deux colonnes de limites d'axe que l'application MATLAB ajoute au tableau
 * de son interface, et qui se retrouvent dans le fichier quand celui-ci est réenregistré
 * depuis l'application. Sans cela, elles seraient lues comme des noms de types.
 */
function splitLimitColumns(rows: CellValue[][]): { width: number; limits: (readonly [number, number] | undefined)[] } {
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0)
  if (width < 6) return { width, limits: [] }

  const pair = rows.map((row) => [row[width - 2] ?? null, row[width - 1] ?? null] as const)
  const looksLikeLimits = pair.every(([low, high]) =>
    [low, high].every((cell) => {
      const value = text(cell)
      return value === '' || normalizeKey(value) === 'auto' || Number.isFinite(Number(value.replace(',', '.')))
    }),
  )
  if (!looksLikeLimits) return { width, limits: [] }

  const limits = pair.map(([low, high]) => {
    const parsed = [low, high].map((cell) => Number(text(cell).replace(',', '.')))
    return parsed.every(Number.isFinite) ? ([parsed[0]!, parsed[1]!] as const) : undefined
  })
  return { width: width - 2, limits }
}

function readCategories(sheet: RawSheet | undefined, diagnostics: Diagnostic[]): Category[] {
  if (!sheet) {
    diagnostics.push({
      severity: 'warning',
      message: 'Onglet « Classification » introuvable.',
      autoFix: 'les catégories seront désignées par leur numéro',
    })
    return []
  }

  const rows = sheet.rows.filter((row) => row.some((cell) => text(cell) !== ''))
  const { width, limits } = splitLimitColumns(rows)

  if (limits.length > 0) {
    diagnostics.push({
      severity: 'info',
      message:
        'Deux colonnes de limites d’axe figurent dans l’onglet « Classification » — ' +
        'trace d’un enregistrement depuis l’application MATLAB.',
      location: { sheet: sheet.name },
      autoFix: 'écartées des noms de types, et reprises comme limites des Bland-Altman',
    })
  }

  return rows.map((row, index) => {
    const typeNames: Record<string, string> = {}
    for (let column = 1; column < width; column++) {
      const name = text(row[column] ?? null)
      const code = TYPE_CODES[column - 1]
      if (name !== '' && code !== undefined) typeNames[code] = name
    }
    const bounds = limits[index]
    return {
      index: index + 1,
      name: text(row[0] ?? null) || `Catégorie ${index + 1}`,
      typeNames,
      ...(bounds ? { blandAltmanLimits: [bounds[0], bounds[1]] as [number, number] } : {}),
    }
  })
}

/** Construit le jeu de données exploitable à partir d'un classeur lu, sans jamais s'interrompre. */
export function buildDataset(workbook: RawWorkbook): Dataset {
  const diagnostics: Diagnostic[] = [...workbook.diagnostics]
  const categories = readCategories(findSheet(workbook.sheets, SHEET_ALIASES.classification), diagnostics)

  const dataSheet =
    findSheet(workbook.sheets, SHEET_ALIASES.data) ??
    (workbook.sheets.length === 1 ? workbook.sheets[0] : undefined)

  if (!dataSheet) {
    diagnostics.push({
      severity: 'error',
      message:
        'Onglet « Data » introuvable. Onglets présents : ' +
        (workbook.sheets.map((sheet) => sheet.name).join(', ') || 'aucun') + '.',
    })
    return { fileName: workbook.fileName, samples: [], categories, diagnostics }
  }

  const { headerRow, columns } = locateColumns(dataSheet)
  const missing = REQUIRED.filter((key) => columns[key] === undefined)
  if (headerRow < 0 || missing.length > 0) {
    diagnostics.push({
      severity: 'error',
      message: `Colonnes introuvables dans « ${dataSheet.name} » : ${missing.join(', ') || 'en-tête non reconnu'}.`,
      location: { sheet: dataSheet.name },
    })
    return { fileName: workbook.fileName, samples: [], categories, diagnostics }
  }

  const at = (row: CellValue[], key: ColumnKey): CellValue => {
    const index = columns[key]
    return index === undefined ? null : (row[index] ?? null)
  }

  const samples: Sample[] = []
  const unknownTypes = new Set<string>()

  for (let index = headerRow + 1; index < dataSheet.rows.length; index++) {
    const row = dataSheet.rows[index] ?? []
    const rowNumber = index + 1
    if (row.every((cell) => text(cell) === '')) continue

    const location = { sheet: dataSheet.name, row: rowNumber }
    const categoryValue = Number(text(at(row, 'category')).replace(',', '.'))
    if (!Number.isInteger(categoryValue) || categoryValue < 1) {
      diagnostics.push({
        severity: 'error',
        message: `Catégorie « ${text(at(row, 'category'))} » invalide : un entier positif est attendu.`,
        location,
        autoFix: 'ligne écartée',
      })
      continue
    }

    const reference = parseMeasurement(at(row, 'reference'))
    const alternative = parseMeasurement(at(row, 'alternative'))
    for (const [side, parsed] of [['référence', reference], ['alternative', alternative]] as const) {
      for (const diagnostic of parsed.diagnostics) {
        diagnostics.push({ ...diagnostic, message: `Méthode ${side} : ${diagnostic.message}`, location })
      }
    }

    const type = text(at(row, 'type')).toLowerCase()
    if (type !== '' && !TYPE_CODES.includes(type)) unknownTypes.add(type)

    const caseGlobal = combineCases(reference.measurement.case, alternative.measurement.case)
    samples.push({
      row: rowNumber,
      year: at(row, 'year'),
      id: at(row, 'id'),
      labelFr: text(at(row, 'labelFr')),
      labelEn: text(at(row, 'labelEn')),
      reference: reference.measurement,
      alternative: alternative.measurement,
      categoryIndex: categoryValue,
      type,
      case: caseGlobal,
      average: (reference.measurement.corrected + alternative.measurement.corrected) / 2,
      difference: alternative.measurement.corrected - reference.measurement.corrected,
    })
  }

  if (unknownTypes.size > 0) {
    diagnostics.push({
      severity: 'warning',
      message: `Types hors a/b/c rencontrés : ${[...unknownTypes].join(', ')}.`,
      location: { sheet: dataSheet.name },
      autoFix: 'conservés comme types supplémentaires',
    })
  }

  // Une catégorie citée dans les données mais absente de la classification reste
  // exploitable : seul son nom manque.
  const known = new Set(categories.map((category) => category.index))
  const orphans = [...new Set(samples.map((sample) => sample.categoryIndex))]
    .filter((index) => !known.has(index))
    .sort((a, b) => a - b)

  for (const index of orphans) {
    categories.push({ index, name: `Catégorie ${index}`, typeNames: {} })
  }
  if (orphans.length > 0) {
    diagnostics.push({
      severity: 'warning',
      message: `Catégories absentes de l’onglet « Classification » : ${orphans.join(', ')}.`,
      autoFix: 'désignées par leur numéro',
    })
  }

  const used = new Set(samples.map((sample) => sample.categoryIndex))
  const unused = categories.filter((category) => !used.has(category.index))
  if (unused.length > 0) {
    diagnostics.push({
      severity: 'info',
      message: `Catégories déclarées sans aucun échantillon : ${unused.map((c) => c.name).join(', ')}.`,
    })
  }

  if (samples.length === 0) {
    diagnostics.push({ severity: 'error', message: 'Aucune ligne de données exploitable.' })
  }

  categories.sort((a, b) => a.index - b.index)
  return { fileName: workbook.fileName, samples, categories, diagnostics }
}
