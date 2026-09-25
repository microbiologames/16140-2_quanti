/** Types métier partagés par la lecture, le calcul et le rendu. */

export type Severity = 'error' | 'warning' | 'info'

/**
 * Un constat fait pendant la lecture, la validation ou le calcul.
 * L'application accumule des diagnostics au lieu de s'interrompre : un fichier
 * imparfait doit produire un résultat partiel, pas une page blanche.
 */
export interface Diagnostic {
  severity: Severity
  /** Message destiné à l'utilisateur, en français. */
  message: string
  /** Localisation dans le fichier source, si connue. */
  location?: { sheet?: string; row?: number; column?: string }
  /** Correction appliquée automatiquement, le cas échéant. */
  autoFix?: string
}

/** Valeur de cellule telle que lue, avant toute interprétation. */
export type CellValue = string | number | boolean | Date | null

/** Une feuille lue telle quelle : une grille de valeurs brutes. */
export interface RawSheet {
  name: string
  /** Lignes de cellules, indexées à partir de 0. Les lignes vides sont conservées. */
  rows: CellValue[][]
  rowCount: number
  columnCount: number
}

/** Un fichier d'entrée lu, avant reconnaissance de sa structure. */
export interface RawWorkbook {
  fileName: string
  sheets: RawSheet[]
  diagnostics: Diagnostic[]
}

/** Où en est un fichier dans la file de traitement. */
export type JobStatus = 'queued' | 'reading' | 'ready' | 'failed'

export interface Job {
  id: string
  fileName: string
  sizeBytes: number
  status: JobStatus
  workbook?: RawWorkbook
  /** Message d'échec quand `status` vaut `failed`. */
  error?: string
}
