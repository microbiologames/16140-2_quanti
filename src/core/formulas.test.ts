import { describe, expect, it } from 'vitest'
import { analyse, cellValue, type ResultTable, type TableCell } from './analysis'
import { buildDataset } from './dataset'
import type { CellValue, RawWorkbook } from './types'

/**
 * Les cellules calculées du classeur portent une formule **et** sa valeur en cache.
 * La valeur est vérifiée ailleurs, contre les sorties MATLAB ; ici on vérifie la
 * formule elle-même — une plage décalée d'une ligne resterait invisible tant que
 * personne ne recalcule.
 */

const HEADER = ['Year', 'Ech', 'French', 'English', 'RM(log)', 'AM(log)', 'Cat', 'Typ']

function build(rows: { rm: CellValue; am: CellValue; cat: number; typ: string }[], locale?: 'fr' | 'en') {
  const data: CellValue[][] = [
    HEADER,
    ...rows.map((r, i) => [2020, i + 1, `P${i}`, `P${i}`, r.rm, r.am, r.cat, r.typ]),
  ]
  const sheet = (name: string, values: CellValue[][]) => ({
    name,
    rows: values,
    rowCount: values.length,
    columnCount: values.reduce((w, r) => Math.max(w, r.length), 0),
  })
  const workbook: RawWorkbook = {
    fileName: 'essai.xlsx',
    diagnostics: [],
    sheets: [
      sheet('Data', data),
      sheet('Classification', [
        ['Laitiers', 'Lait', 'Fromage', 'Poudre'],
        ['Viandes', 'Crue', 'Cuite', 'Séchée'],
      ]),
    ],
  }
  return analyse(buildDataset(workbook), locale ? { locale } : {})
}

const table = (tables: ResultTable[], sheetName: string) =>
  tables.find((candidate) => candidate.sheetName === sheetName)!

const formulaOf = (cell: TableCell): string => {
  if (cell === null || typeof cell !== 'object') throw new Error('cellule sans formule')
  return cell.formula
}

const SAMPLES = [
  { rm: 1.0, am: 1.2, cat: 1, typ: 'a' },
  { rm: 2.0, am: 1.9, cat: 1, typ: 'a' },
  { rm: 1.5, am: 1.8, cat: 1, typ: 'b' },
  { rm: 2.4, am: 2.0, cat: 2, typ: 'a' },
  { rm: 3.0, am: 3.3, cat: 2, typ: 'a' },
  { rm: '1,30*', am: 1.4, cat: 2, typ: 'a' },
]

describe('feuille de données', () => {
  it('porte une ligne par échantillon, dans l’ordre du fichier', () => {
    const data = table(build(SAMPLES).tables, 'Data')
    expect(data.rows).toHaveLength(SAMPLES.length)
    expect(data.rows[0]!.slice(1, 4)).toEqual([1, 'a', 1])
    expect(data.rows[5]!.slice(1, 4)).toEqual([2, 'a', 2]) // le cas 2
  })

  it('remplace par une cellule vide ce qu’Excel ne sait pas représenter', () => {
    const data = table(build([...SAMPLES, { rm: 'ND', am: 2, cat: 1, typ: 'a' }]).tables, 'Data')
    const last = data.rows[data.rows.length - 1]!
    expect(last[4]).toBeNull() // référence sans résultat
    expect(last[7]).toBeNull() // différence indéfinie
  })

  it('change de nom avec la langue, et les formules suivent', () => {
    expect(table(build(SAMPLES, 'en').tables, 'Data')).toBeDefined()
    expect(table(build(SAMPLES, 'fr').tables, 'Données')).toBeDefined()
    expect(formulaOf(table(build(SAMPLES, 'fr').tables, 'Tableau 4').rows[0]![1]!)).toContain(
      "'Données'!",
    )
  })
})

describe('tableaux 1 et 2 — effectifs et sous-totaux', () => {
  const tables = build(SAMPLES).tables

  it('compte par catégorie et par type', () => {
    const rows = table(tables, 'Tableau 1').rows
    expect(formulaOf(rows[0]![2]!)).toBe(`COUNTIFS('Data'!$B:$B,1,'Data'!$C:$C,"a")`)
    expect(formulaOf(rows[0]![3]!)).toBe(
      `COUNTIFS('Data'!$B:$B,1,'Data'!$C:$C,"a",'Data'!$D:$D,1)`,
    )
  })

  it('somme exactement les lignes de détail de sa catégorie', () => {
    // Catégorie 1 : types a et b en lignes 2 et 3 ; sous-total en ligne 4.
    const rows = table(tables, 'Tableau 1').rows
    expect(formulaOf(rows[2]![2]!)).toBe('SUM(C2:C3)')
    // Catégorie 2 : un seul type, ligne 5 ; sous-total en ligne 6.
    expect(formulaOf(rows[4]![2]!)).toBe('SUM(C5:C5)')
  })

  it('additionne les sous-totaux, et non les lignes de détail, pour le total général', () => {
    const rows = table(tables, 'Tableau 1').rows
    expect(formulaOf(rows[rows.length - 1]![2]!)).toBe('C4+C6')
  })

  it('applique la même structure aux cinq colonnes du tableau 2', () => {
    const rows = table(tables, 'Tableau 2').rows
    const subtotal = rows[2]!
    expect([2, 3, 4, 5, 6].map((column) => formulaOf(subtotal[column]!))).toEqual([
      'SUM(C2:C3)',
      'SUM(D2:D3)',
      'SUM(E2:E3)',
      'SUM(F2:F3)',
      'SUM(G2:G3)',
    ])
  })
})

describe('tableau 4 — statistiques', () => {
  const rows = table(build(SAMPLES).tables, 'Tableau 4').rows

  it('restreint le comptage à la catégorie et aux échantillons interprétables', () => {
    expect(formulaOf(rows[0]![1]!)).toBe(`COUNTIFS('Data'!$B:$B,1,'Data'!$D:$D,1)`)
    expect(formulaOf(rows[0]![2]!)).toBe(
      `AVERAGEIFS('Data'!$H:$H,'Data'!$B:$B,1,'Data'!$D:$D,1)`,
    )
  })

  it('borne la plage de l’écart-type aux lignes réellement remplies', () => {
    // Six échantillons : lignes 2 à 7 de la feuille de données.
    expect(formulaOf(rows[0]![3]!)).toBe(
      `SQRT(SUMPRODUCT(('Data'!$B$2:$B$7=1)*('Data'!$D$2:$D$7=1)*('Data'!$H$2:$H$7-C2)^2)/(B2-1))`,
    )
  })

  it('laisse tomber le critère de catégorie sur la ligne du total', () => {
    const last = rows[rows.length - 1]!
    expect(formulaOf(last[1]!)).toBe(`COUNTIFS('Data'!$D:$D,1)`)
    expect(formulaOf(last[3]!)).not.toContain('$B$2')
  })

  it('construit les limites à partir des cellules de la même ligne', () => {
    expect(formulaOf(rows[0]![4]!)).toBe('C2-TINV(0.05,B2-1)*D2*SQRT(1+1/B2)')
    expect(formulaOf(rows[0]![5]!)).toBe('C2+TINV(0.05,B2-1)*D2*SQRT(1+1/B2)')
  })

  it('n’emploie que des fonctions antérieures à Excel 2010', () => {
    // Les noms modernes (T.INV.2T, STDEV.S) demanderaient un préfixe `_xlfn.`
    // dans le fichier et ne s'ouvriraient pas partout.
    const all = rows.flatMap((row) => row.slice(1).map(formulaOf)).join(' ')
    expect(all).not.toMatch(/T\.INV|STDEV\.|_xlfn/)
    expect(all).toContain('TINV(')
  })
})

describe('tableau 6 — dénombrement des hors-limites', () => {
  // Douze différences resserrées puis un écart franc de chaque côté.
  const TIGHT = [0, 0.02, -0.02, 0.01, -0.01, 0.03, -0.03, 0.015, -0.015, 0.005, -0.005, 0.025]
  const rows = [
    ...TIGHT.map((d) => ({ rm: 2, am: 2 + d, cat: 1, typ: 'a' })),
    { rm: 2, am: 2.4, cat: 1, typ: 'a' },
    { rm: 2, am: 1.6, cat: 2, typ: 'a' },
  ]
  const tables = build(rows).tables

  it('renvoie aux limites du tableau 4, ligne du total', () => {
    // Deux catégories : la ligne « toutes catégories » est la 4e du tableau 4.
    const table6 = table(tables, 'Tableau 6').rows
    expect(formulaOf(table6[0]![2]!)).toBe(
      `COUNTIFS('Data'!$D:$D,1,'Data'!$H:$H,"<"&'Tableau 4'!$E$4)`,
    )
    expect(formulaOf(table6[1]![2]!)).toBe(
      `COUNTIFS('Data'!$D:$D,1,'Data'!$H:$H,">"&'Tableau 4'!$F$4)`,
    )
  })

  it('totalise les lignes qu’il résume', () => {
    const table6 = table(tables, 'Tableau 6').rows
    expect(formulaOf(table6[2]![2]!)).toBe('SUM(C2:C3)')
    expect(formulaOf(table6[table6.length - 1]![2]!)).toBe('SUM(C5:C6)')
  })

  it('reste cohérent avec les valeurs en cache', () => {
    const table6 = table(tables, 'Tableau 6').rows
    const total = table6[table6.length - 1]!
    const below = cellValue(table6[table6.length - 3]![2]!)
    const above = cellValue(table6[table6.length - 2]![2]!)
    expect(cellValue(total[2]!)).toBe((below as number) + (above as number))
  })
})
