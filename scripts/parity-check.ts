/**
 * Compare les résultats de l'application aux classeurs produits par l'application
 * MATLAB, cellule par cellule.
 *
 * Les données de validation ne pouvant pas figurer dans ce dépôt public, ce contrôle
 * ne tourne pas en intégration continue : il se lance à la main contre le dépôt privé
 * de références.
 *
 *   npm run parity -- /chemin/vers/temp_ISO16140-2-validation-private-references
 *
 * Seules les sorties produites par les versions v5 et v5.1 font référence. Celles de
 * mars 2025 utilisent la formule de l'amendement, abandonnée depuis, et sont ignorées ;
 * voir docs/MATLAB_PARITY.md.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import ExcelJS from 'exceljs'
import { analyse, type ResultTable } from '@/core/analysis'
import { buildDataset } from '@/core/dataset'
import { readWorkbook } from '@/io/readWorkbook'

/** Écart relatif toléré entre deux nombres. Au-delà, ce n'est plus de l'arrondi. */
const TOLERANCE = 1e-9

const root = process.argv[2]
if (!root) {
  console.error('Usage : npm run parity -- <chemin du dépôt de références>')
  process.exit(2)
}

const inputDir = join(root, '02_fichiers-entree')
const outputDir = join(root, '03_sorties-excel')

const asFile = (path: string) => new File([readFileSync(path)], basename(path))

const normalize = (name: string) =>
  basename(name, '.xlsx')
    .toLowerCase()
    .replace(/^(input_|output_)/, '')
    .replace(/_?\d{1,2}-[a-z]{3}-\d{4}_\d{2}-\d{2}-\d{2}$/, '')
    .replace(/[^a-z0-9]/g, '')

/** Les sorties de mars 2025 proviennent de la branche d'essai de l'amendement. */
const usesAbandonedFormula = (name: string) => /-Mar-2025_/.test(name)

/**
 * Un écart numérique met la parité en cause. Un écart de libellé, non : les intitulés
 * de colonnes portent des coquilles corrigées dans le portage, et un nom de catégorie
 * peut avoir été modifié à la main dans l'interface au moment de l'exécution — auquel
 * cas le fichier d'entrée ne permet pas de le reproduire.
 */
type MismatchKind = 'numérique' | 'libellé'

interface Mismatch {
  kind: MismatchKind
  sheet: string
  cell: string
  expected: unknown
  actual: unknown
}

function compareTable(table: ResultTable, reference: (string | number | null)[][]): Mismatch[] {
  const mismatches: Mismatch[] = []
  const actual = [table.columns, ...table.rows]
  const height = Math.max(actual.length, reference.length)

  for (let row = 0; row < height; row++) {
    const actualRow = actual[row] ?? []
    const referenceRow = reference[row] ?? []
    const width = Math.max(actualRow.length, referenceRow.length)

    for (let column = 0; column < width; column++) {
      const got = actualRow[column] ?? null
      const want = referenceRow[column] ?? null
      const cell = `${String.fromCharCode(65 + column)}${row + 1}`

      if (typeof got === 'number' && typeof want === 'number') {
        const scale = Math.max(1, Math.abs(want))
        if (Math.abs(got - want) / scale > TOLERANCE) {
          mismatches.push({ kind: 'numérique', sheet: table.sheetName, cell, expected: want, actual: got })
        }
        continue
      }
      if (String(got ?? '').trim() !== String(want ?? '').trim()) {
        mismatches.push({ kind: 'libellé', sheet: table.sheetName, cell, expected: want, actual: got })
      }
    }
  }
  return mismatches
}

async function readReference(path: string): Promise<Map<string, (string | number | null)[][]>> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const tables = new Map<string, (string | number | null)[][]>()

  workbook.eachSheet((sheet) => {
    if (!/^Tableau \d$/.test(sheet.name)) return
    const rows: (string | number | null)[][] = []
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const values: (string | number | null)[] = []
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        const value = cell.value
        values[column - 1] =
          value === null || value === undefined
            ? null
            : typeof value === 'object' && 'result' in value
              ? (value.result as string | number)
              : (value as string | number)
      })
      rows.push(values)
    })
    // xlswrite laisse une ligne vide en fin de feuille.
    while (rows.length > 0 && rows[rows.length - 1]!.every((cell) => cell === null)) rows.pop()
    tables.set(sheet.name, rows)
  })
  return tables
}

const inputs = new Map(readdirSync(inputDir).filter((f) => f.endsWith('.xlsx')).map((f) => [normalize(f), f]))
let checked = 0
let failed = 0
const skipped: string[] = []

for (const outputName of readdirSync(outputDir).filter((f) => f.endsWith('.xlsx')).sort()) {
  if (usesAbandonedFormula(outputName)) {
    skipped.push(`${outputName} — formule de l'amendement`)
    continue
  }
  const key = normalize(outputName)
  const inputName = inputs.get(key) ?? [...inputs].find(([k]) => key.startsWith(k) || k.startsWith(key))?.[1]
  if (!inputName) {
    skipped.push(`${outputName} — aucune entrée appariée`)
    continue
  }

  const reference = await readReference(join(outputDir, outputName))
  if (!reference.has('Tableau 4')) {
    skipped.push(`${outputName} — classeur incomplet`)
    continue
  }

  const result = analyse(buildDataset(await readWorkbook(asFile(join(inputDir, inputName)))))
  const mismatches = [...reference]
    .flatMap(([sheetName, rows]) => {
      const table = result.tables.find((candidate) => candidate.sheetName === sheetName)
      if (!table) {
        return [{ kind: 'numérique' as const, sheet: sheetName, cell: '—', expected: 'feuille présente', actual: 'absente' }]
      }
      return compareTable(table, rows)
    })

  const numeric = mismatches.filter((mismatch) => mismatch.kind === 'numérique')
  const labels = mismatches.filter((mismatch) => mismatch.kind === 'libellé')

  checked += 1
  if (numeric.length === 0) {
    const note = labels.length === 0 ? '' : ` (${labels.length} écart(s) de libellé)`
    console.log(`✅ ${outputName}${note}`)
  } else {
    failed += 1
    console.log(`❌ ${outputName} — ${numeric.length} écart(s) numérique(s)`)
  }

  for (const { sheet, cell, expected, actual } of [...numeric, ...labels].slice(0, 6)) {
    console.log(`     ${sheet}!${cell}  attendu ${JSON.stringify(expected)}  obtenu ${JSON.stringify(actual)}`)
  }
  if (mismatches.length > 6) console.log(`     … ${mismatches.length - 6} autre(s)`)
}

console.log(`\n${checked - failed}/${checked} classeur(s) conforme(s) sur les valeurs numériques`)
for (const reason of skipped) console.log(`   ignoré : ${reason}`)
process.exit(failed === 0 ? 0 : 1)
