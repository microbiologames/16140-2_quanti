import type ExcelJS from 'exceljs'
import Papa from 'papaparse'
import type { CellValue, Diagnostic, RawSheet, RawWorkbook } from '@/core/types'

/**
 * Lecture volontairement permissive : on ramène le fichier à une grille de valeurs
 * brutes sans rien interpréter. Toute la reconnaissance de structure a lieu plus
 * loin dans le pipeline, là où les diagnostics peuvent être précis.
 */
export async function readWorkbook(file: File): Promise<RawWorkbook> {
  const diagnostics: Diagnostic[] = []
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'csv' || extension === 'txt' || extension === 'tsv') {
    return { fileName: file.name, sheets: [await readDelimited(file, diagnostics)], diagnostics }
  }

  if (extension === 'xls') {
    diagnostics.push({
      severity: 'error',
      message:
        'Format Excel 97-2003 (.xls) non pris en charge. Réenregistrer le fichier au format .xlsx.',
    })
    return { fileName: file.name, sheets: [], diagnostics }
  }

  return { fileName: file.name, sheets: await readXlsx(file, diagnostics), diagnostics }
}

async function readXlsx(file: File, diagnostics: Diagnostic[]): Promise<RawSheet[]> {
  // Chargé à la demande : ExcelJS pèse l'essentiel du poids de l'application et
  // n'est utile qu'une fois un fichier déposé.
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  const sheets: RawSheet[] = []
  workbook.eachSheet((worksheet) => {
    const rows: CellValue[][] = []
    let columnCount = 0
    let mergedRanges = 0

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const values: CellValue[] = []
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Dans une plage fusionnée, ExcelJS renvoie la valeur du maître pour
        // chacune des cellules couvertes. Ne garder que le maître, sans quoi un
        // titre fusionné sur trois colonnes ressemble à trois en-têtes distincts.
        if (cell.isMerged) {
          if (cell.master !== cell) {
            values[colNumber - 1] = null
            return
          }
          mergedRanges += 1
        }
        values[colNumber - 1] = normalizeCell(cell.value)
      })
      columnCount = Math.max(columnCount, values.length)
      rows[rowNumber - 1] = values
    })

    if (mergedRanges > 0) {
      diagnostics.push({
        severity: 'info',
        message: `${mergedRanges} plage(s) de cellules fusionnées.`,
        location: { sheet: worksheet.name },
        autoFix: 'valeur conservée dans la cellule de gauche, les autres laissées vides',
      })
    }

    // `eachRow` saute les lignes entièrement absentes : on rebouche les trous
    // pour que les numéros de ligne affichés correspondent à ceux d'Excel.
    for (let i = 0; i < rows.length; i++) rows[i] ??= []

    sheets.push({ name: worksheet.name, rows, rowCount: rows.length, columnCount })
  })

  if (sheets.length === 0) {
    diagnostics.push({ severity: 'error', message: 'Le classeur ne contient aucune feuille.' })
  }
  return sheets
}

/** Réduit les valeurs riches d'ExcelJS (formules, texte enrichi, liens) à une valeur simple. */
function normalizeCell(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') {
    if (value instanceof Date) return value
    if ('result' in value) return normalizeCell(value.result as ExcelJS.CellValue) // formule
    if ('richText' in value) return value.richText.map((part) => part.text).join('')
    if ('text' in value) return value.text // lien hypertexte
    if ('error' in value) return null // #DIV/0!, #N/A…
    return null
  }
  return value
}

async function readDelimited(file: File, diagnostics: Diagnostic[]): Promise<RawSheet> {
  const text = await file.text()
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false })

  for (const error of parsed.errors) {
    diagnostics.push({
      severity: 'warning',
      message: `Ligne mal formée ignorée : ${error.message}`,
      ...(error.row === undefined ? {} : { location: { row: error.row + 1 } }),
    })
  }

  const rows: CellValue[][] = parsed.data.map((row) => row.map((cell) => (cell === '' ? null : cell)))

  // Les lignes vides intérieures sont conservées — la numérotation doit rester
  // celle du fichier — mais pas celles que laisse un saut de ligne final.
  while (rows.length > 0 && rows[rows.length - 1]!.every((cell) => cell === null)) rows.pop()

  return {
    name: file.name.replace(/\.[^.]+$/, ''),
    rows,
    rowCount: rows.length,
    columnCount: rows.reduce((width, row) => Math.max(width, row.length), 0),
  }
}
