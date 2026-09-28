import { describe, expect, it } from 'vitest'
import { buildDataset } from './dataset'
import type { CellValue, RawWorkbook } from './types'

const HEADER = ['Year', 'Ech', 'French', 'English', 'RM(log)', 'AM(log)', 'Cat', 'Typ']

function workbook(
  data: CellValue[][],
  classification: CellValue[][] = [['Produits laitiers', 'Lait cru', 'Fromage', 'Poudre']],
  options: { dataSheetName?: string; omitClassification?: boolean } = {},
): RawWorkbook {
  const sheet = (name: string, rows: CellValue[][]) => ({
    name,
    rows,
    rowCount: rows.length,
    columnCount: rows.reduce((width, row) => Math.max(width, row.length), 0),
  })
  return {
    fileName: 'essai.xlsx',
    diagnostics: [],
    sheets: [
      sheet(options.dataSheetName ?? 'Data', data),
      ...(options.omitClassification ? [] : [sheet('Classification', classification)]),
    ],
  }
}

const row = (rm: CellValue, am: CellValue, cat = 1, typ = 'a'): CellValue[] =>
  [2020, 1, 'Lait', 'Milk', rm, am, cat, typ]

describe('buildDataset — reconnaissance de la structure', () => {
  it('lit les échantillons et calcule moyenne et différence', () => {
    const { samples, diagnostics } = buildDataset(workbook([HEADER, row(2, 2.5)]))

    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
    expect(samples).toHaveLength(1)
    expect(samples[0]).toMatchObject({ row: 2, case: 1, average: 2.25, difference: 0.5 })
  })

  it('repère les colonnes par en-tête, quel que soit leur ordre', () => {
    const shuffled = ['Typ', 'AM(log)', 'Cat', 'RM(log)']
    const { samples } = buildDataset(workbook([shuffled, ['a', 2.5, 1, 2]]))

    expect(samples[0]).toMatchObject({ type: 'a', categoryIndex: 1, difference: 0.5 })
  })

  it('tolère accents, casse et espaces dans les en-têtes', () => {
    const messy = ['  ANNÉE ', 'RM (log)', 'AM (log)', 'Catégorie', 'Type']
    const { samples } = buildDataset(workbook([messy, [2020, 2, 2.5, 1, 'b']]))

    expect(samples[0]).toMatchObject({ type: 'b', difference: 0.5 })
  })

  it('accepte une feuille de données nommée autrement', () => {
    const { samples } = buildDataset(
      workbook([HEADER, row(2, 2.5)], undefined, { dataSheetName: 'Données' }),
    )
    expect(samples).toHaveLength(1)
  })

  it('ignore les lignes vides sans décaler la numérotation', () => {
    const { samples } = buildDataset(workbook([HEADER, [], row(2, 2.5)]))

    expect(samples).toHaveLength(1)
    expect(samples[0]!.row).toBe(3)
  })

  it('signale une colonne obligatoire absente sans lever d’exception', () => {
    const { samples, diagnostics } = buildDataset(workbook([['Year', 'Ech'], [2020, 1]]))

    expect(samples).toHaveLength(0)
    expect(diagnostics.some((d) => d.severity === 'error' && /Colonnes introuvables/.test(d.message))).toBe(true)
  })
})

describe('buildDataset — onglet Classification', () => {
  it('nomme catégories et types', () => {
    const { categories } = buildDataset(workbook([HEADER, row(2, 2.5)]))

    expect(categories[0]).toMatchObject({
      index: 1,
      name: 'Produits laitiers',
      typeNames: { a: 'Lait cru', b: 'Fromage', c: 'Poudre' },
    })
  })

  it('écarte les colonnes de limites d’axe laissées par l’application MATLAB', () => {
    const polluted = [['Produits laitiers', 'Lait cru', 'Fromage', 'Poudre', 'Auto', 'Auto']]
    const { categories, diagnostics } = buildDataset(workbook([HEADER, row(2, 2.5)], polluted))

    expect(Object.keys(categories[0]!.typeNames)).toEqual(['a', 'b', 'c'])
    expect(categories[0]!.blandAltmanLimits).toBeUndefined()
    expect(diagnostics.some((d) => /limites d’axe/.test(d.message))).toBe(true)
  })

  it('reprend les limites d’axe quand elles sont renseignées', () => {
    const withLimits = [['Produits laitiers', 'Lait cru', 'Fromage', 'Poudre', -1.5, 1.5]]
    const { categories } = buildDataset(workbook([HEADER, row(2, 2.5)], withLimits))

    expect(categories[0]!.blandAltmanLimits).toEqual([-1.5, 1.5])
  })

  it('désigne par leur numéro les catégories absentes de la classification', () => {
    const { categories, diagnostics } = buildDataset(workbook([HEADER, row(2, 2.5, 3)]))

    expect(categories.find((c) => c.index === 3)).toMatchObject({ name: 'Catégorie 3' })
    expect(diagnostics.some((d) => d.severity === 'warning' && /absentes/.test(d.message))).toBe(true)
  })

  it('calcule quand même sans onglet Classification', () => {
    const { samples, categories, diagnostics } = buildDataset(
      workbook([HEADER, row(2, 2.5)], undefined, { omitClassification: true }),
    )

    expect(samples).toHaveLength(1)
    expect(categories[0]!.name).toBe('Catégorie 1')
    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
  })
})

describe('buildDataset — lignes douteuses', () => {
  it('écarte une ligne dont la catégorie n’est pas un entier positif', () => {
    const { samples, diagnostics } = buildDataset(workbook([HEADER, row(2, 2.5, 0), row(2, 2.5, 1)]))

    expect(samples).toHaveLength(1)
    expect(diagnostics.some((d) => d.severity === 'error' && d.location?.row === 2)).toBe(true)
  })

  it('rattache les diagnostics de mesure à leur ligne et à leur méthode', () => {
    const { diagnostics } = buildDataset(workbook([HEADER, row('environ 3', 2.5)]))
    const found = diagnostics.find((d) => d.severity === 'error')

    expect(found?.message).toMatch(/Méthode référence/)
    expect(found?.location).toMatchObject({ sheet: 'Data', row: 2 })
  })

  it('conserve un type inattendu en le signalant', () => {
    const { samples, diagnostics } = buildDataset(workbook([HEADER, row(2, 2.5, 1, 'z')]))

    expect(samples[0]!.type).toBe('z')
    expect(diagnostics.some((d) => /Types hors a\/b\/c/.test(d.message))).toBe(true)
  })

  it('propage les diagnostics de lecture du classeur', () => {
    const source = workbook([HEADER, row(2, 2.5)])
    source.diagnostics.push({ severity: 'info', message: 'plage fusionnée' })

    expect(buildDataset(source).diagnostics[0]).toMatchObject({ message: 'plage fusionnée' })
  })
})
