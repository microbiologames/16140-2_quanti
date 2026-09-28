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
 * L'appariement se fait par le **contenu** et non par le nom de fichier : l'effectif,
 * la moyenne et l'écart-type des différences ne dépendent pas de la formule des
 * limites, ce qui en fait une empreinte stable. Les limites, elles, révèlent laquelle
 * des deux formules a servi — et donc si la sortie fait référence (voir
 * docs/MATLAB_PARITY.md § « La formule des limites »).
 */
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import ExcelJS from 'exceljs'
import { analyse, cellValue, type AnalysisResult, type ResultTable } from '@/core/analysis'
import { buildDataset } from '@/core/dataset'
import { readWorkbook } from '@/io/readWorkbook'
import { studentTQuantile } from '@/stats'

/** Écart relatif toléré entre deux nombres. Au-delà, ce n'est plus de l'arrondi. */
const TOLERANCE = 1e-9
/** Tolérance de l'appariement : plus lâche, les sorties n'ayant que 6 décimales. */
const MATCH_TOLERANCE = 1e-5
/**
 * En deçà, un écart ne vient pas du calcul mais de la précision de la source : le
 * fichier d'entrée a été réenregistré depuis, avec moins de décimales. Fréquent sur
 * les sorties les plus anciennes, dont l'entrée a vécu.
 */
const SOURCE_PRECISION_TOLERANCE = 1e-6

const root = process.argv[2]
if (!root) {
  console.error('Usage : npm run parity -- <chemin du dépôt de références>')
  process.exit(2)
}

const inputDir = join(root, '02_fichiers-entree')
const outputDir = join(root, '03_sorties-excel')

const asFile = (path: string) => new File([readFileSync(path)], basename(path))
const close = (a: number, b: number, tolerance = MATCH_TOLERANCE) =>
  Math.abs(a - b) / Math.max(1, Math.abs(b)) < tolerance

type Cell = string | number | null
type Sheets = Map<string, Cell[][]>

async function readSheets(path: string): Promise<Sheets> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)
  const sheets: Sheets = new Map()

  workbook.eachSheet((sheet) => {
    if (!/^Tableau \d$/.test(sheet.name)) return
    const rows: Cell[][] = []
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const values: Cell[] = []
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
    sheets.set(sheet.name, rows)
  })
  return sheets
}

/* ------------------------------------------------------------- appariement */

interface Signature {
  n: number
  mean: number
  sd: number
}

const signatureOf = (result: AnalysisResult): Signature => ({
  n: result.overall.n,
  mean: result.overall.meanDifference,
  sd: result.overall.standardDeviation,
})

/** Dernière ligne du Tableau 4 : le total toutes catégories. */
function referenceSignature(sheets: Sheets): (Signature & { lower: number }) | null {
  const rows = sheets.get('Tableau 4')
  const last = rows?.[rows.length - 1]
  if (!last || typeof last[1] !== 'number' || typeof last[2] !== 'number') return null
  return {
    n: last[1],
    mean: last[2],
    sd: typeof last[3] === 'number' ? last[3] : Number.NaN,
    lower: typeof last[4] === 'number' ? last[4] : Number.NaN,
  }
}

/** Laquelle des deux formules produit la limite basse observée. */
function formulaUsed(reference: Signature & { lower: number }): 'retenue' | 'amendement' | 'inconnue' {
  const { n, mean, sd, lower } = reference
  if (!Number.isFinite(lower) || n < 2) return 'inconnue'
  const t = studentTQuantile(0.975, n - 1)
  if (close(lower, mean - t * sd * Math.sqrt(1 + 1 / n))) return 'retenue'
  if (close(lower, mean - (t * sd) / Math.sqrt(n))) return 'amendement'
  return 'inconnue'
}

/* --------------------------------------------------------------- comparaison */

type MismatchKind = 'numérique' | 'précision' | 'libellé'

interface Mismatch {
  kind: MismatchKind
  sheet: string
  cell: string
  expected: unknown
  actual: unknown
}

function compareTable(table: ResultTable, reference: Cell[][]): Mismatch[] {
  const mismatches: Mismatch[] = []
  const actual: Cell[][] = [table.columns, ...table.rows.map((row) => row.map(cellValue))]
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
        if (!close(got, want, TOLERANCE)) {
          const kind = close(got, want, SOURCE_PRECISION_TOLERANCE) ? 'précision' : 'numérique'
          mismatches.push({ kind, sheet: table.sheetName, cell, expected: want, actual: got })
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

/* -------------------------------------------------------------------- main */

console.log('Lecture des fichiers d’entrée…')
const inputs: { name: string; result: AnalysisResult; signature: Signature }[] = []

for (const name of readdirSync(inputDir).filter((file) => file.endsWith('.xlsx')).sort()) {
  try {
    const result = analyse(buildDataset(await readWorkbook(asFile(join(inputDir, name)))))
    if (result.overall.n >= 2) inputs.push({ name, result, signature: signatureOf(result) })
    else console.log(`   ⚠ ${name} — aucun résultat exploitable`)
  } catch (cause) {
    console.log(`   ⚠ ${name} — lecture impossible : ${cause instanceof Error ? cause.message : cause}`)
  }
}
console.log(`${inputs.length} fichier(s) d’entrée exploitable(s)\n`)

const tally = { conformes: 0, precision: 0, ecarts: 0, amendement: 0, orphelins: 0, incomplets: 0, ambigus: 0 }
const details: string[] = []

for (const outputName of readdirSync(outputDir).filter((file) => file.endsWith('.xlsx')).sort()) {
  const sheets = await readSheets(join(outputDir, outputName))
  const reference = referenceSignature(sheets)

  if (!reference) {
    tally.incomplets += 1
    continue
  }

  const candidates = inputs.filter(
    (input) =>
      input.signature.n === reference.n &&
      close(input.signature.mean, reference.mean) &&
      close(input.signature.sd, reference.sd),
  )

  if (candidates.length === 0) {
    tally.orphelins += 1
    details.push(`   ? ${outputName} — aucune entrée ne correspond (n=${reference.n})`)
    continue
  }
  if (candidates.length > 1) {
    tally.ambigus += 1
    details.push(`   ? ${outputName} — ${candidates.length} entrées candidates`)
    continue
  }

  const match = candidates[0]!
  const formula = formulaUsed(reference)
  if (formula !== 'retenue') {
    tally.amendement += 1
    continue
  }

  const mismatches = [...sheets].flatMap(([sheetName, rows]) => {
    const table = match.result.tables.find((candidate) => candidate.sheetName === sheetName)
    if (!table) {
      return [{ kind: 'numérique' as const, sheet: sheetName, cell: '—', expected: 'présente', actual: 'absente' }]
    }
    return compareTable(table, rows)
  })

  const numeric = mismatches.filter((mismatch) => mismatch.kind === 'numérique')
  const drift = mismatches.filter((mismatch) => mismatch.kind === 'précision')

  if (numeric.length === 0 && drift.length > 0) {
    tally.precision += 1
    details.push(
      `   ≈ ${outputName}  ←  ${match.name} — conforme, à ${drift.length} valeur(s) près` +
        ' dont seule la précision diffère : l’entrée a été réenregistrée depuis',
    )
  } else if (numeric.length === 0) {
    tally.conformes += 1
  } else {
    tally.ecarts += 1
    details.push(`   ✗ ${outputName}  ←  ${match.name}`)
    for (const { sheet, cell, expected, actual } of numeric.slice(0, 5)) {
      details.push(`        ${sheet}!${cell}  attendu ${JSON.stringify(expected)}  obtenu ${JSON.stringify(actual)}`)
    }
    if (numeric.length > 5) details.push(`        … ${numeric.length - 5} autre(s)`)
  }
}

const checked = tally.conformes + tally.precision + tally.ecarts
console.log(`${tally.conformes + tally.precision}/${checked} classeur(s) comparable(s) conforme(s) sur les valeurs calculées`)
console.log(`   dont ${tally.precision} où l’entrée a gagné en précision depuis l’exécution MATLAB`)
console.log(`   ${tally.amendement} produit(s) avec la formule de l’amendement, écarté(s)`)
console.log(`   ${tally.incomplets} classeur(s) incomplet(s), sans Tableau 4`)
if (tally.orphelins > 0) console.log(`   ${tally.orphelins} sans entrée correspondante`)
if (tally.ambigus > 0) console.log(`   ${tally.ambigus} appariement(s) ambigu(s)`)
if (details.length > 0) console.log(`\n${details.join('\n')}`)

process.exit(tally.ecarts === 0 ? 0 : 1)
