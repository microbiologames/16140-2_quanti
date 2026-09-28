import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analyse } from '@/core/analysis'
import { buildDataset } from '@/core/dataset'
import { buildFigures } from '@/core/figures'
import { figureToSvg } from './figureSvg'
import { PALETTE_HEX, type PaletteId } from '@/ui/palette'
import type { CellValue, RawWorkbook } from '@/core/types'

const HEADER = ['Year', 'Ech', 'French', 'English', 'RM(log)', 'AM(log)', 'Cat', 'Typ']

const ROWS: CellValue[][] = [
  HEADER,
  [2020, 1, 'Lait', 'Milk', 1.0, 1.2, 1, 'a'],
  [2020, 2, 'Lait', 'Milk', 2.0, 1.9, 1, 'b'],
  [2020, 3, 'Lait', 'Milk', 3.0, 3.4, 1, 'a'],
  [2020, 4, 'Bœuf', 'Beef', 2.5, 2.4, 2, 'a'],
  [2020, 5, 'Bœuf', 'Beef', 4.0, 4.2, 2, 'a'],
  [2020, 6, 'Bœuf', 'Beef', '<1,00', 0.5, 2, 'a'],
  [2020, 7, 'Bœuf', 'Beef', '1,30*', 1.4, 2, 'a'],
]

const sheet = (name: string, rows: CellValue[][]) => ({
  name,
  rows,
  rowCount: rows.length,
  columnCount: rows.reduce((width, row) => Math.max(width, row.length), 0),
})

const workbook: RawWorkbook = {
  fileName: 'essai.xlsx',
  diagnostics: [],
  sheets: [
    sheet('Data', ROWS),
    sheet('Classification', [
      ['Produits laitiers <&>', 'Lait cru', 'Fromage', 'Poudre'],
      ['Viandes', 'Crue', 'Cuite', 'Séchée'],
    ]),
  ],
}

const figures = buildFigures(analyse(buildDataset(workbook)))

describe('figureToSvg', () => {
  it.each(['matlab', 'accessible'] as PaletteId[])('produit un SVG exploitable — %s', (palette) => {
    for (const figure of figures) {
      const svg = figureToSvg(figure, palette)
      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).not.toMatch(/NaN|undefined|Infinity/)
      // Aucune variable CSS : l'image doit se suffire à elle-même hors de la page.
      expect(svg).not.toContain('var(--')
    }
  })

  it('trace un marqueur par point', () => {
    const scatter = figures.find((figure) => figure.sheetName === 'Plot_allcat')!
    const expected = scatter.series.reduce((total, series) => total + series.points.length, 0)
    const svg = figureToSvg(scatter, 'matlab')
    // Seuls les points de données portent un anneau de la couleur du fond ; les
    // marqueurs de la légende, eux, sont des aplats.
    const markers = svg.match(/<path d="M [^"]+" transform="translate\([^)]+\)" fill="[^"]+" stroke=/g) ?? []

    expect(markers).toHaveLength(expected)
  })

  it('échappe le texte plutôt que de casser le document', () => {
    const svg = figureToSvg(figures[0]!, 'matlab')
    expect(svg).toContain('Produits laitiers &lt;&amp;&gt;')
    expect(svg).not.toContain('laitiers <&>')
  })

  it('reprend les couleurs de la palette demandée', () => {
    const scatter = figures.find((figure) => figure.sheetName === 'Plot_allcat')!
    expect(figureToSvg(scatter, 'matlab')).toContain(PALETTE_HEX.matlab.series[0]!)
    expect(figureToSvg(scatter, 'accessible')).toContain(PALETTE_HEX.accessible.series[0]!)
  })

  it('porte le titre, les axes et la légende', () => {
    const agreement = figures.find((figure) => figure.sheetName === 'Bland Altman')!
    const svg = figureToSvg(agreement, 'matlab')

    expect(svg).toContain('Bland-Altman')
    expect(svg).toContain('Mean (log CFU/g)')
    expect(svg).toContain('95 % lower limit')
    expect(svg).toContain('&lt;4 colonies/plate')
  })
})

describe('cohérence des couleurs entre le CSS et l’export', () => {
  /**
   * Les teintes existent à deux endroits : en variables CSS pour l'écran, en valeurs
   * littérales pour l'export, qui sort de la page. Ce test interdit qu'elles divergent.
   */
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf-8')

  const block = (selector: string): Record<string, string> => {
    const start = css.indexOf(selector)
    expect(start, `bloc « ${selector} » introuvable dans index.css`).toBeGreaterThan(-1)
    const body = css.slice(start, css.indexOf('}', start))
    return Object.fromEntries(
      [...body.matchAll(/(--series-[\w-]+):\s*(#[0-9a-f]{6})/g)].map((match) => [match[1]!, match[2]!]),
    )
  }

  const cases: [PaletteId, string][] = [
    ['matlab', ":root[data-palette='matlab']"],
    ['accessible', ":root[data-palette='accessible']"],
  ]

  it.each(cases)('palette %s', (palette, selector) => {
    const declared = block(selector)
    const expected = PALETTE_HEX[palette]

    expected.series.forEach((hex, index) => {
      expect(declared[`--series-${index + 1}`]).toBe(hex)
    })
    expect(declared['--series-case2']).toBe(expected.case2)
    expect(declared['--series-case3']).toBe(expected.case3)
  })
})

describe('légende', () => {
  it('tronque un libellé trop long plutôt que de le laisser recouvrir son effectif', () => {
    const long = figures.find((figure) => figure.sheetName === 'Plot_allcat')!
    const named = {
      ...long,
      series: long.series.map((series) => ({
        ...series,
        label: 'Ready to eat and ready to reheat products, catering and similar',
      })),
    }
    const svg = figureToSvg(named, 'matlab')

    expect(svg).toContain('…</text>')
    for (const match of svg.matchAll(/font-size="13" fill="#44403c">([^<]*)<\/text>/g)) {
      expect(match[1]!.length).toBeLessThanOrEqual(29)
    }
  })
})
