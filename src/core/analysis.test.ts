import { describe, expect, it } from 'vitest'
import { analyse, cellValue, computeStatistics, type ResultTable, type TableCell } from './analysis'
import { buildDataset } from './dataset'
import type { CellValue, RawWorkbook } from './types'

const HEADER = ['Year', 'Ech', 'French', 'English', 'RM(log)', 'AM(log)', 'Cat', 'Typ']

/** Construit un classeur dont les différences alternative − référence sont imposées. */
function workbookFrom(rows: { id: number; rm: CellValue; am: CellValue; cat: number; typ: string }[]): RawWorkbook {
  const data: CellValue[][] = [
    HEADER,
    ...rows.map((r) => [2020, r.id, `Produit ${r.id}`, `Product ${r.id}`, r.rm, r.am, r.cat, r.typ]),
  ]
  const classification: CellValue[][] = [
    ['Produits laitiers', 'Lait', 'Fromage', 'Poudre'],
    ['Viandes', 'Crue', 'Cuite', 'Séchée'],
  ]
  const sheet = (name: string, rows_: CellValue[][]) => ({
    name,
    rows: rows_,
    rowCount: rows_.length,
    columnCount: rows_.reduce((w, r) => Math.max(w, r.length), 0),
  })
  return {
    fileName: 'essai.xlsx',
    diagnostics: [],
    sheets: [sheet('Data', data), sheet('Classification', classification)],
  }
}

const table = (tables: ResultTable[], sheetName: string) =>
  tables.find((candidate) => candidate.sheetName === sheetName)!

/** Les cellules calculées portent une formule ; les tests comparent leur valeur. */
const values = (row: TableCell[]) => row.map(cellValue)

describe('computeStatistics', () => {
  /** Référence : SciPy, demi-largeur t(0,975 ; n−1) · SD · √(1 + 1/n). */
  it('calcule moyenne, écart-type et limites de prédiction', () => {
    const statistics = computeStatistics([0.5, -0.2, 0.3, -0.4, 0.1])

    expect(statistics.n).toBe(5)
    expect(statistics.meanDifference).toBeCloseTo(0.059999999999999984, 14)
    expect(statistics.standardDeviation).toBeCloseTo(0.3646916505762094, 14)
    expect(statistics.lowerLimit).toBeCloseTo(-1.0491889508011765, 12)
    expect(statistics.upperLimit).toBeCloseTo(1.1691889508011766, 12)
  })

  it('reste symétrique autour de la moyenne', () => {
    const { meanDifference, lowerLimit, upperLimit } = computeStatistics([1, 2, 3, 4])
    expect(upperLimit - meanDifference).toBeCloseTo(meanDifference - lowerLimit, 14)
  })

  it('ignore les valeurs non finies plutôt que de renvoyer NaN', () => {
    expect(computeStatistics([1, 2, Number.NaN, 3]).n).toBe(3)
  })

  it('renvoie NaN sans lever quand l’effectif est insuffisant', () => {
    expect(computeStatistics([]).n).toBe(0)
    expect(computeStatistics([1]).standardDeviation).toBeNaN()
    expect(computeStatistics([1]).lowerLimit).toBeNaN()
  })
})

describe('analyse — statistiques par catégorie', () => {
  const rows = [
    { id: 1, rm: 1.0, am: 1.5, cat: 1, typ: 'a' },
    { id: 2, rm: 2.0, am: 1.8, cat: 1, typ: 'a' },
    { id: 3, rm: 1.5, am: 1.8, cat: 1, typ: 'b' },
    { id: 4, rm: 2.4, am: 2.0, cat: 1, typ: 'b' },
    { id: 5, rm: 3.0, am: 3.1, cat: 1, typ: 'b' },
    { id: 6, rm: 1.0, am: 2.2, cat: 2, typ: 'a' },
    { id: 7, rm: 1.1, am: 2.0, cat: 2, typ: 'a' },
    { id: 8, rm: 1.6, am: 3.0, cat: 2, typ: 'a' },
  ]
  const result = analyse(buildDataset(workbookFrom(rows)))

  it('sépare les catégories et calcule le total', () => {
    expect(result.byCategory.map((c) => c.categoryIndex)).toEqual([1, 2])
    expect(result.byCategory[0]!.meanDifference).toBeCloseTo(0.059999999999999984, 12)
    expect(result.byCategory[1]!.meanDifference).toBeCloseTo(1.1666666666666667, 12)
    expect(result.overall.meanDifference).toBeCloseTo(0.475, 12)
    expect(result.overall.standardDeviation).toBeCloseTo(0.6497252166438187, 12)
    expect(result.overall.lowerLimit).toBeCloseTo(-1.1545516232738873, 12)
    expect(result.overall.upperLimit).toBeCloseTo(2.104551623273887, 12)
  })

  it('reprend ces valeurs dans le tableau 4, catégories puis total', () => {
    const rows4 = table(result.tables, 'Tableau 4').rows
    expect(rows4).toHaveLength(3)
    expect(values(rows4[0]!)[0]).toBe(1)
    expect(values(rows4[2]!)[0]).toBe('All categories')
    expect(values(rows4[2]!)[1]).toBe(8)
  })
})

describe('analyse — effectifs et exclusions', () => {
  const rows = [
    { id: 1, rm: 1.0, am: 1.5, cat: 1, typ: 'a' }, // cas 1
    { id: 2, rm: 2.0, am: 1.8, cat: 1, typ: 'a' }, // cas 1
    { id: 3, rm: '1,30*', am: 1.4, cat: 1, typ: 'a' }, // cas 2
    { id: 4, rm: '<1,00', am: 0.5, cat: 1, typ: 'b' }, // cas 3
    { id: 5, rm: 'ND', am: 2.0, cat: 1, typ: 'b' }, // cas 4
  ]
  const result = analyse(buildDataset(workbookFrom(rows)))

  it('n’intègre aux statistiques que les échantillons interprétables', () => {
    expect(result.overall.n).toBe(2)
  })

  it('ventile les effectifs par cas dans le tableau 2, ordre 1 / 4 / 2 / 3', () => {
    const rows2 = table(result.tables, 'Tableau 2').rows
    const typeA = rows2.find((row) => row[1] === 'Lait')!
    expect(values(typeA).slice(2)).toEqual([3, 2, 0, 1, 0])
    const total = rows2[rows2.length - 1]!
    expect(values(total).slice(2)).toEqual([5, 2, 1, 1, 1])
  })

  it('liste les échantillons écartés avec leur écriture normalisée', () => {
    const rows3 = table(result.tables, 'Tableau 3').rows
    expect(rows3).toHaveLength(3)
    expect(rows3.map((row) => cellValue(row[0]!))).toEqual([3, 4, 5])
    expect(rows3[0]![2]).toBe('1.30*') // virgule convertie, marqueur conservé
  })

  it('omet le tableau 3 quand tout est interprétable', () => {
    const clean = analyse(buildDataset(workbookFrom(rows.slice(0, 2))))
    expect(clean.tables.map((t) => t.sheetName)).not.toContain('Tableau 3')
  })

  it('avertit quand une catégorie a trop peu d’échantillons interprétables', () => {
    expect(result.diagnostics.some((d) => /peu robustes/.test(d.message))).toBe(true)
  })
})

describe('analyse — échantillons hors limites', () => {
  // Douze différences resserrées, puis un écart franc de chaque côté : avec
  // n = 14 les limites tombent à ±0,266, que ±0,4 dépasse nettement.
  const TIGHT = [0, 0.02, -0.02, 0.01, -0.01, 0.03, -0.03, 0.015, -0.015, 0.005, -0.005, 0.025]
  const rows = [
    ...TIGHT.map((d, index) => ({ id: index + 1, rm: 2, am: 2 + d, cat: 1, typ: 'a' })),
    { id: 13, rm: 2, am: 2.4, cat: 1, typ: 'a' },
    { id: 14, rm: 2, am: 1.6, cat: 2, typ: 'a' },
  ]
  const result = analyse(buildDataset(workbookFrom(rows)))

  it('retient les échantillons de part et d’autre des limites globales', () => {
    const rows5 = table(result.tables, 'Tableau 5').rows
    expect(rows5.map((row) => cellValue(row[3]!))).toEqual([13, 14])
  })

  it('note « / » quand aucune valeur n’a été corrigée', () => {
    expect(table(result.tables, 'Tableau 5').rows[0]![7]).toBe('/')
  })

  it('dénombre par cas puis en total dans le tableau 6', () => {
    const rows6 = table(result.tables, 'Tableau 6').rows
    expect(rows6.slice(0, 3).map(values)).toEqual([
      ['Interpretable results by both methods', '<LCL', 1],
      ['Interpretable results by both methods', '>UCL', 1],
      ['Interpretable results by both methods', 'Total', 2],
    ])
    expect(rows6.slice(-3).map(values)).toEqual([
      [' ', 'Total <LCL', 1],
      [' ', 'Total >UCL', 1],
      [' ', 'TOTAL', 2],
    ])
  })
})

describe('analyse — valeurs censurées dans le tableau 5', () => {
  it('restitue les valeurs avant correction, une ou deux selon les méthodes', () => {
    const tight = [0, 0.02, -0.02, 0.01, -0.01, 0.03, -0.03, 0.015, -0.015, 0.005, -0.005, 0.025]
    const rows = [
      ...tight.map((d, index) => ({ id: index + 1, rm: 2, am: 2 + d, cat: 1, typ: 'a' })),
      // Cas 3 : la référence corrigée vaut 8,18, l'écart dépasse largement les limites.
      { id: 13, rm: '>7,18', am: 3.0, cat: 1, typ: 'a' },
      // Cas 3 des deux côtés : 0,00 et 6,00 après correction.
      { id: 14, rm: '<1,00', am: '>5,00', cat: 1, typ: 'a' },
    ]
    const rows5 = table(analyse(buildDataset(workbookFrom(rows))).tables, 'Tableau 5').rows
    const before = new Map(rows5.map((row) => [cellValue(row[3]!), row[7]]))

    expect(before.get(13)).toBe('7.18')
    expect(before.get(14)).toBe('1.00 / 5.00')
  })
})
