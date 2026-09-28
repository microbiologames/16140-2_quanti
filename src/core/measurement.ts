import type { CellValue, Diagnostic } from './types'

/**
 * Classement d'un résultat en l'un des quatre cas de l'ISO 16140-2, et calcul de la
 * valeur utilisée ensuite. Voir docs/MATLAB_PARITY.md § « Classement des résultats en cas ».
 */
export type MeasurementCase = 1 | 2 | 3 | 4

export interface Measurement {
  /** La valeur telle qu'elle a été lue, pour pouvoir la réafficher. */
  raw: CellValue
  /**
   * La valeur écrite sous sa forme normalisée : espaces retirés, virgule décimale
   * convertie en point. C'est elle que reprennent les tableaux de sortie, comme le
   * fait l'application MATLAB, qui convertit la chaîne sur place avant de la relire.
   */
  display: CellValue
  case: MeasurementCase
  /** Valeur utilisée dans les calculs et les tracés. `NaN` en cas 4. */
  corrected: number
  /** Cas 3 uniquement : la valeur avant l'ajustement de ±1 log. */
  censored?: number
  /**
   * Cas 3 uniquement : cette même valeur telle qu'elle était écrite, signe retiré.
   * Conservée parce que le classeur de sortie la restitue à l'identique, décimales
   * comprises (`1.00` et non `1`).
   */
  censoredText?: string
}

const NON_BREAKING_SPACES = /[   ]/g
const NO_RESULT = /^n\.?\s*d\.?$/i

/** Ramène un libellé à une forme comparable : sans accents, sans ponctuation, en minuscules. */
export function normalizeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Nettoie une cellule texte : espaces insécables, espaces de bord, virgule décimale. */
function clean(text: string): string {
  return text.replace(NON_BREAKING_SPACES, ' ').trim().replace(',', '.')
}

/**
 * Convertit en nombre ce qui reste après retrait des marqueurs.
 * Renvoie `null` plutôt que `NaN` pour distinguer « pas un nombre » de « pas de résultat ».
 */
function toNumber(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export interface ParsedMeasurement {
  measurement: Measurement
  diagnostics: Diagnostic[]
}

/**
 * Classe une valeur brute.
 *
 * Plus tolérant que l'application MATLAB sur la forme — espaces autour des marqueurs,
 * `≤`/`≥`, casse de `ND`, marqueur placé avant ou après le nombre — mais identique sur
 * le fond : mêmes cas, mêmes valeurs corrigées, même priorité du `*` sur `<` et `>`.
 */
export function parseMeasurement(raw: CellValue): ParsedMeasurement {
  const diagnostics: Diagnostic[] = []
  const fail = (message: string): ParsedMeasurement => {
    diagnostics.push({ severity: 'error', message })
    return { measurement: { raw, display: raw, case: 4, corrected: Number.NaN }, diagnostics }
  }

  if (typeof raw === 'number') {
    return { measurement: { raw, display: raw, case: 1, corrected: raw }, diagnostics }
  }

  if (raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    diagnostics.push({
      severity: 'warning',
      message: 'Cellule vide.',
      autoFix: 'traitée comme une absence de résultat (cas 4)',
    })
    return { measurement: { raw, display: raw, case: 4, corrected: Number.NaN }, diagnostics }
  }

  if (typeof raw !== 'string') {
    return fail(`Valeur de type inattendu : ${String(raw)}.`)
  }

  const text = clean(raw)

  if (NO_RESULT.test(text)) {
    return { measurement: { raw, display: text, case: 4, corrected: Number.NaN }, diagnostics }
  }

  const hasStar = text.includes('*')
  const limitMatch = /^([<>≤≥])\s*/.exec(text)

  // Priorité du `*`, comme dans l'application MATLAB.
  if (hasStar) {
    if (limitMatch) {
      diagnostics.push({
        severity: 'warning',
        message: `« ${raw} » porte à la fois « ${limitMatch[1]} » et « * ».`,
        autoFix: 'classée en cas 2 (< 4 colonies/boîte), comme le fait l’application MATLAB',
      })
    }
    const value = toNumber(text.replace(/\*/g, '').replace(/^[<>≤≥]\s*/, ''))
    if (value === null) return fail(`« ${raw} » : « * » présent mais aucun nombre lisible.`)
    return { measurement: { raw, display: text, case: 2, corrected: value }, diagnostics }
  }

  if (limitMatch) {
    const sign = limitMatch[1]!
    const value = toNumber(text.slice(limitMatch[0].length))
    if (value === null) return fail(`« ${raw} » : « ${sign} » présent mais aucun nombre lisible.`)
    const above = sign === '>' || sign === '≥'
    return {
      measurement: {
        raw,
        display: text,
        case: 3,
        corrected: above ? value + 1 : value - 1,
        censored: value,
        censoredText: text.slice(limitMatch[0].length).trim(),
      },
      diagnostics,
    }
  }

  const value = toNumber(text)
  if (value === null) return fail(`« ${raw} » n’est pas une valeur reconnue.`)

  if (raw !== text) {
    diagnostics.push({
      severity: 'info',
      message: `« ${raw} » saisi en texte.`,
      autoFix: `interprété comme le nombre ${value}`,
    })
  }
  return { measurement: { raw, display: value, case: 1, corrected: value }, diagnostics }
}

/**
 * Cas global d'un échantillon : le plus grave des deux, dans l'ordre 4 > 3 > 2 > 1.
 * Un échantillon n'est interprétable que si les deux méthodes le sont.
 */
export function combineCases(a: MeasurementCase, b: MeasurementCase): MeasurementCase {
  for (const severity of [4, 3, 2] as const) {
    if (a === severity || b === severity) return severity
  }
  return 1
}

/** Libellés des quatre cas, tels qu'ils apparaissent dans le classeur de sortie. */
export const CASE_LABELS: Record<MeasurementCase, string> = {
  1: 'Interpretable results by both methods',
  2: '<4 CFU/plate',
  3: '< or > quantification limits',
  4: 'No result',
}
