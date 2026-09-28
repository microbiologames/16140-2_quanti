import { describe, expect, it } from 'vitest'
import { analyse } from './analysis'
import { buildDataset } from './dataset'
import { buildFigures, scatterDomain } from './figures'
import type { CellValue, RawWorkbook } from './types'

const HEADER = ['Year', 'Ech', 'French', 'English', 'RM(log)', 'AM(log)', 'Cat', 'Typ']

function figuresFor(
  rows: { rm: CellValue; am: CellValue; cat: number; typ: string }[],
  classification: CellValue[][] = [
    ['Laitiers', 'Lait', 'Fromage', 'Poudre'],
    ['Viandes', 'Crue', 'Cuite', 'Séchée'],
  ],
) {
  const data: CellValue[][] = [
    HEADER,
    ...rows.map((r, i) => [2020, i + 1, `Produit ${i + 1}`, `Product ${i + 1}`, r.rm, r.am, r.cat, r.typ]),
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
    sheets: [sheet('Data', data), sheet('Classification', classification)],
  }
  return buildFigures(analyse(buildDataset(workbook)))
}

const simple = [
  { rm: 1.0, am: 1.2, cat: 1, typ: 'a' },
  { rm: 2.0, am: 1.9, cat: 1, typ: 'b' },
  { rm: 3.0, am: 3.4, cat: 1, typ: 'a' },
  { rm: 2.5, am: 2.4, cat: 2, typ: 'a' },
  { rm: 4.0, am: 4.2, cat: 2, typ: 'a' },
]

describe('scatterDomain', () => {
  it('part de zéro et dépasse le maximum d’un log, arrondi', () => {
    const [low, high] = scatterDomain(
      analyse(buildDataset({
        fileName: 'x',
        diagnostics: [],
        sheets: [{ name: 'Data', rows: [HEADER, [2020, 1, '', '', 4.2, 5.7, 1, 'a']], rowCount: 2, columnCount: 8 }],
      })).dataset.samples,
    )
    expect(low).toBe(0)
    expect(high).toBe(7) // round(5,7) = 6, puis +1
  })

  it('ne se laisse pas entraîner par les valeurs manquantes', () => {
    const samples = analyse(buildDataset({
      fileName: 'x',
      diagnostics: [],
      sheets: [{
        name: 'Data',
        rows: [HEADER, [2020, 1, '', '', 'ND', 2.0, 1, 'a']],
        rowCount: 2,
        columnCount: 8,
      }],
    })).dataset.samples
    expect(scatterDomain(samples)).toEqual([0, 3])
  })
})

describe('buildFigures — inventaire', () => {
  const figures = figuresFor(simple)

  it('produit un nuage et un Bland-Altman par catégorie, plus les deux vues d’ensemble', () => {
    expect(figures.map((figure) => figure.sheetName)).toEqual([
      'Plot_cat_1',
      'Plot_cat_2',
      'Plot_allcat',
      'Bland Altman',
      'Plot_BA_cat_1',
      'Plot_BA_cat_2',
    ])
  })

  it('donne aux nuages la même étendue en abscisse et en ordonnée', () => {
    const scatter = figures.find((figure) => figure.sheetName === 'Plot_allcat')!
    expect(scatter.xDomain).toEqual(scatter.yDomain)
    expect(scatter.lines).toEqual([{ role: 'identity', label: 'y = x', diagonal: true }])
  })

  it('trace biais et limites sur les Bland-Altman', () => {
    const agreement = figures.find((figure) => figure.sheetName === 'Bland Altman')!
    expect(agreement.lines.map((line) => line.role)).toEqual(['identity', 'bias', 'limit', 'limit'])
    expect(agreement.yDomain).toBeUndefined()
  })
})

describe('buildFigures — séries', () => {
  it('découpe par type dans une catégorie et par catégorie dans la vue d’ensemble', () => {
    const figures = figuresFor(simple)
    const byType = figures.find((figure) => figure.sheetName === 'Plot_cat_1')!
    expect(byType.series.map((series) => series.label)).toEqual(['Lait', 'Fromage'])

    const byCategory = figures.find((figure) => figure.sheetName === 'Plot_allcat')!
    expect(byCategory.series.map((series) => series.label)).toEqual(['Laitiers', 'Viandes'])
  })

  it('attribue formes et couleurs selon le rang des séries présentes, pas leur numéro', () => {
    // Seules les catégories 1 et 3 portent des données : la seconde série doit
    // prendre le deuxième rang, sans quoi la légende se décale.
    const figures = figuresFor(
      [
        { rm: 1, am: 1.1, cat: 1, typ: 'a' },
        { rm: 2, am: 2.1, cat: 3, typ: 'a' },
      ],
      [['Un', 'A'], ['Deux', 'B'], ['Trois', 'C']],
    )
    const overall = figures.find((figure) => figure.sheetName === 'Plot_allcat')!
    expect(overall.series.map((series) => [series.label, series.shape, series.color])).toEqual([
      ['Un', 'diamond', { kind: 'slot', index: 0 }],
      ['Trois', 'square', { kind: 'slot', index: 1 }],
    ])
  })

  it('range les cas 2 et 3 dans des séries propres, indépendantes du type', () => {
    const figures = figuresFor([
      { rm: 1.0, am: 1.2, cat: 1, typ: 'a' },
      { rm: '1,30*', am: 1.4, cat: 1, typ: 'b' },
      { rm: '<1,00', am: 0.5, cat: 1, typ: 'c' },
      { rm: 'ND', am: 2.0, cat: 1, typ: 'a' },
    ])
    const scatter = figures.find((figure) => figure.sheetName === 'Plot_cat_1')!

    expect(scatter.series.map((series) => series.label)).toEqual([
      'Lait',
      '<4 colonies/plate',
      'corrected values',
    ])
    expect(scatter.series[1]!.color).toEqual({ kind: 'case2' })
    expect(scatter.series[2]!.color).toEqual({ kind: 'case3' })
  })

  it('n’émet pas de série vide', () => {
    const figures = figuresFor(simple)
    for (const figure of figures) {
      for (const series of figure.series) expect(series.points.length).toBeGreaterThan(0)
    }
  })

  it('exclut du tracé les échantillons sans résultat', () => {
    const figures = figuresFor([
      { rm: 1.0, am: 1.2, cat: 1, typ: 'a' },
      { rm: 'ND', am: 2.0, cat: 1, typ: 'a' },
    ])
    const points = figures[0]!.series.flatMap((series) => series.points)
    expect(points).toHaveLength(1)
  })
})

describe('buildFigures — limites d’axe du fichier', () => {
  it('reprend les bornes verticales déclarées dans la classification', () => {
    const figures = figuresFor(simple, [
      ['Laitiers', 'Lait', 'Fromage', 'Poudre', -1.5, 1.5],
      ['Viandes', 'Crue', 'Cuite', 'Séchée', 'Auto', 'Auto'],
    ])
    expect(figures.find((f) => f.sheetName === 'Plot_BA_cat_1')!.yDomain).toEqual([-1.5, 1.5])
    expect(figures.find((f) => f.sheetName === 'Plot_BA_cat_2')!.yDomain).toBeUndefined()
  })

  it('laisse le Bland-Altman global en échelle automatique', () => {
    const figures = figuresFor(simple, [
      ['Laitiers', 'Lait', 'Fromage', 'Poudre', -1.5, 1.5],
      ['Viandes', 'Crue', 'Cuite', 'Séchée', -2, 2],
    ])
    expect(figures.find((f) => f.sheetName === 'Bland Altman')!.yDomain).toBeUndefined()
  })
})
