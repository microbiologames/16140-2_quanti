import { describe, expect, it } from 'vitest'
import { analyse, cellValue, type ResultTable } from './analysis'
import { buildDataset } from './dataset'
import { buildFigures } from './figures'
import { LOCALES, strings, type Locale, type OutputStrings } from './i18n'
import type { CellValue, RawWorkbook } from './types'

const HEADER = ['Year', 'Ech', 'French', 'English', 'RM(log)', 'AM(log)', 'Cat', 'Typ']

function build(locale: Locale) {
  const data: CellValue[][] = [
    HEADER,
    [2020, 1, 'Lait', 'Milk', 1.0, 1.2, 1, 'a'],
    [2020, 2, 'Lait', 'Milk', 2.0, 1.9, 1, 'a'],
    [2020, 3, 'Lait', 'Milk', '1,30*', 1.4, 1, 'b'],
  ]
  const sheet = (name: string, rows: CellValue[][]) => ({
    name,
    rows,
    rowCount: rows.length,
    columnCount: 8,
  })
  const workbook: RawWorkbook = {
    fileName: 'essai.xlsx',
    diagnostics: [],
    sheets: [sheet('Data', data), sheet('Classification', [['Laitiers', 'Lait cru', 'Fromage', 'Poudre']])],
  }
  return analyse(buildDataset(workbook), { locale })
}

/** Toutes les feuilles du dictionnaire, chemin par chemin. */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  if (Array.isArray(value)) return value.flatMap((item, index) => paths(item, `${prefix}[${index}]`))
  return Object.entries(value).flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key))
}

describe('dictionnaire', () => {
  it('couvre les mêmes clés dans les deux langues', () => {
    expect(paths(strings('fr'))).toEqual(paths(strings('en')))
  })

  it('ne laisse aucun libellé vide', () => {
    for (const { id } of LOCALES) {
      const text = strings(id as Locale)
      for (const path of paths(text)) {
        const value = path
          .replace(/\[(\d+)\]/g, '.$1')
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], text)
        if (typeof value === 'string') expect(value.trim(), `${id} · ${path}`).not.toBe('')
      }
    }
  })

  it('emploie le vocabulaire français, pas une traduction littérale', () => {
    const fr: OutputStrings = strings('fr')
    expect(fr.columns.referenceWithUnit).toContain('UFC') // et non CFU
    expect(fr.figures.agreementY).toContain('référence')
    expect(fr.cases[1]).toContain('UFC')
  })
})

describe('résultats traduits', () => {
  const table = (tables: ResultTable[], sheetName: string) =>
    tables.find((candidate) => candidate.sheetName === sheetName)!

  it('traduit intitulés et en-têtes des tableaux', () => {
    expect(table(build('en').tables, 'Tableau 1').columns[0]).toBe('Category')
    expect(table(build('fr').tables, 'Tableau 1').columns[0]).toBe('Catégorie')
    expect(table(build('fr').tables, 'Tableau 4').title).toBe('Biais et limites de concordance')
  })

  it('traduit les libellés de cas du tableau 6', () => {
    const fr = table(build('fr').tables, 'Tableau 6')
    expect(fr.rows.map((row) => cellValue(row[1]!))).toContain('Total < limite inf.')
  })

  it('traduit axes, séries et lignes de repère des figures', () => {
    const [scatter] = buildFigures(build('fr'))
    expect(scatter!.xLabel).toBe('Méthode de référence (log UFC/g)')
    expect(scatter!.series.map((series) => series.label)).toContain('< 4 colonies par boîte')

    const agreement = buildFigures(build('fr')).find((figure) => figure.sheetName === 'Bland Altman')!
    expect(agreement.lines.map((line) => line.label)).toContain('Biais')
  })

  it('laisse intacts les libellés venus du fichier — ce sont les données de l’utilisateur', () => {
    for (const locale of ['fr', 'en'] as Locale[]) {
      const rows = table(build(locale).tables, 'Tableau 1').rows
      expect(cellValue(rows[0]![0]!)).toBe('Laitiers')
      expect(cellValue(rows[0]![1]!)).toBe('Lait cru')
    }
  })

  it('garde les noms de feuilles stables — ce sont des repères pour l’équipe', () => {
    const numbered = (locale: Locale) =>
      build(locale)
        .tables.map((candidate) => candidate.sheetName)
        .filter((name) => name.startsWith('Tableau'))

    expect(numbered('fr')).toEqual(numbered('en'))
    expect(numbered('en')[0]).toBe('Tableau 1')
    // Seule la feuille de données, qui n'existait pas côté MATLAB, suit la langue.
    expect(build('fr').tables.at(-1)!.sheetName).toBe('Données')
    expect(build('en').tables.at(-1)!.sheetName).toBe('Data')
  })
})
