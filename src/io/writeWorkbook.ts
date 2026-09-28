import type ExcelJS from 'exceljs'
import { buildFigures } from '@/core/figures'
import { figureToSvg } from './figureSvg'
import { svgToPng, type RenderedImage } from './svgToPng'
import { cellValue, type AnalysisResult, type ResultTable, type TableCell } from '@/core/analysis'
import type { PaletteId } from '@/ui/palette'

/**
 * Compose le classeur de résultats : un onglet par tableau, puis un onglet par figure.
 *
 * L'application MATLAB ouvrait les figures en premier ; les tableaux passent devant ici,
 * parce que ce sont eux qu'on consulte, et parce que l'ordre des feuilles ne porte aucun
 * résultat. Les noms de feuilles, eux, sont inchangés.
 */

const BRAND = 'FF00AAB6'
const HEADER_INK = 'FFFFFFFF'
const TOTAL_FILL = 'FFF1F5F9'

/** Décimales à l'affichage. La cellule conserve la valeur complète. */
const DECIMALS = 6

export interface WorkbookOptions {
  palette: PaletteId
  /** Facteur de rendu des figures. Plus haut : image plus nette, fichier plus lourd. */
  scale?: number
}

function widthFor(table: ResultTable, column: number): number {
  const lengths = [
    table.columns[column]?.length ?? 0,
    ...table.rows.map((row) => String(cellValue(row[column] ?? null) ?? '').length),
  ]
  return Math.min(Math.max(...lengths, 8) + 2, 52)
}

const isTotalRow = (row: TableCell[]) => {
  const label = cellValue(row[1] ?? null)
  return row[0] === null && typeof label === 'string' && /^total/i.test(label)
}

/**
 * Une cellule calculée part dans le classeur avec sa formule **et** sa valeur en cache :
 * le fichier est juste dès l'ouverture, y compris dans un lecteur qui ne recalcule pas,
 * et le calcul reste vérifiable et rejouable.
 */
function toExcelValue(cell: TableCell): ExcelJS.CellValue {
  if (cell !== null && typeof cell === 'object') {
    return { formula: cell.formula, result: cell.result } as ExcelJS.CellFormulaValue
  }
  return cell
}

function addTable(workbook: ExcelJS.Workbook, table: ResultTable): void {
  const sheet = workbook.addWorksheet(table.sheetName)

  const header = sheet.addRow(table.columns)
  header.font = { bold: true, color: { argb: HEADER_INK } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
  header.alignment = { vertical: 'middle', wrapText: true }
  header.height = 30

  for (const values of table.rows) {
    const row = sheet.addRow(values.map(toExcelValue))
    if (isTotalRow(values)) {
      row.font = { bold: true }
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } }
    }
    row.eachCell((cell, column) => {
      const resolved = cellValue(values[column - 1] ?? null)
      if (typeof resolved === 'number' && !Number.isInteger(resolved)) {
        cell.numFmt = `0.${'0'.repeat(DECIMALS)}`
      }
    })
  }

  table.columns.forEach((_, index) => {
    sheet.getColumn(index + 1).width = widthFor(table, index)
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

function addFigure(workbook: ExcelJS.Workbook, sheetName: string, image: RenderedImage): void {
  const sheet = workbook.addWorksheet(sheetName)
  const id = workbook.addImage({ buffer: image.data as ExcelJS.Buffer, extension: 'png' })
  sheet.addImage(id, {
    tl: { col: 0.2, row: 0.2 },
    ext: { width: image.width, height: image.height },
  })
}

/** Nom de fichier dérivé de celui de l'entrée, comme le faisait l'application MATLAB. */
export function outputFileName(inputFileName: string, at = new Date()): string {
  const base = inputFileName.replace(/\.[^.]+$/, '').replace(/^Input[_-]?/i, '')
  const stamp = at.toISOString().slice(0, 16).replace('T', '_').replace(':', 'h')
  return `Output_${base}_${stamp}.xlsx`
}

export async function buildWorkbook(
  result: AnalysisResult,
  options: WorkbookOptions,
): Promise<Blob> {
  // Chargé à la demande, comme à la lecture : ExcelJS pèse l'essentiel de l'application.
  const imported = await import('exceljs')
  const { Workbook } = (imported.default ?? imported) as typeof ExcelJS

  const workbook = new Workbook()
  workbook.creator = 'ISO 16140-2 — méthodes quantitatives'
  workbook.created = new Date()

  for (const table of result.tables) addTable(workbook, table)

  for (const figure of buildFigures(result)) {
    const svg = figureToSvg(figure, options.palette)
    const image = await svgToPng(svg, options.scale)
    addFigure(workbook, figure.sheetName, image)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}
