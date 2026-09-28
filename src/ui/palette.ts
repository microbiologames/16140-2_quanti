import type { Paint } from '@/core/figureScene'
import type { ColorRole } from '@/core/figures'

export type PaletteId = 'matlab' | 'accessible'

export interface PaletteChoice {
  id: PaletteId
  label: string
  note: string
}

/**
 * Deux jeux de couleurs, définis en variables CSS dans `index.css` — ce qui permet
 * d'en changer, et de surcharger une teinte, sans relancer le moindre calcul.
 *
 * La palette « MATLAB » échoue aux contrôles de lisibilité : sur les huit teintes de
 * catégorie, le rouge pur et l'olive se distinguent d'un ΔE de 1,7 en vision
 * deutéranope — autant dire pas du tout — et le vert pur n'offre qu'un contraste de
 * 1,34:1 sur fond clair. Les marqueurs de forme différente rattrapent en partie le
 * premier défaut, pas le second. Elle reste néanmoins le choix par défaut : les
 * rapports déjà rendus utilisent ces couleurs.
 */
export const PALETTES: PaletteChoice[] = [
  { id: 'matlab', label: 'MATLAB', note: 'couleurs de l’application d’origine' },
  { id: 'accessible', label: 'Accessible', note: 'lisible en vision des couleurs déficiente' },
]

/**
 * Les mêmes teintes qu'`index.css`, en dur.
 *
 * L'export du classeur produit un SVG autonome, hors de la page : les variables CSS
 * n'y sont pas résolues, il faut donc des valeurs littérales. Les deux définitions
 * sont verrouillées ensemble par un test.
 */
export const PALETTE_HEX: Record<PaletteId, { series: string[]; case2: string; case3: string }> = {
  matlab: {
    series: ['#5472ae', '#a42424', '#708d23', '#ff33ff', '#999900', '#ff0000', '#00ff00', '#0000ff'],
    case2: '#e67e30',
    case3: '#ffff00',
  },
  accessible: {
    series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
    case2: '#8a6d3b',
    case3: '#6b7280',
  },
}

/** Encres et lignes de repère du tracé exporté : toujours sur fond clair. */
export const EXPORT_INK = {
  surface: '#ffffff',
  grid: '#e7e5e4',
  axis: '#a8a29e',
  ink: '#44403c',
  identity: '#0b0b0b',
  bias: '#0ca30c',
  limit: '#d03b3b',
} as const

/** Nom de la variable CSS portant la couleur d'une série. */
export function colorVariable(role: ColorRole): string {
  if (role.kind === 'case2') return '--series-case2'
  if (role.kind === 'case3') return '--series-case3'
  return `--series-${(role.index % 8) + 1}`
}

export const colorOf = (role: ColorRole): string => `var(${colorVariable(role)})`

/** Couleur d'un rôle de scène à l'écran : une variable CSS, donc thémable à chaud. */
export function cssPaint(paint: Paint): string {
  switch (paint.token) {
    case 'series':
      return `var(--series-${(paint.index % 8) + 1})`
    case 'case2':
      return 'var(--series-case2)'
    case 'case3':
      return 'var(--series-case3)'
    case 'line':
      return `var(--chart-line-${paint.role})`
    case 'ink':
      return 'var(--chart-ink)'
    case 'grid':
      return 'var(--chart-grid)'
    case 'axis':
      return 'var(--chart-axis)'
    case 'surface':
      return 'var(--chart-surface)'
  }
}

/** Couleur d'un rôle de scène à l'export : une valeur littérale, sur fond clair. */
export function hexPaint(paint: Paint, palette: PaletteId): string {
  const colors = PALETTE_HEX[palette]
  switch (paint.token) {
    case 'series':
      return colors.series[paint.index % colors.series.length]!
    case 'case2':
      return colors.case2
    case 'case3':
      return colors.case3
    case 'line':
      return EXPORT_INK[paint.role]
    case 'ink':
      return EXPORT_INK.ink
    case 'grid':
      return EXPORT_INK.grid
    case 'axis':
      return EXPORT_INK.axis
    case 'surface':
      return EXPORT_INK.surface
  }
}
