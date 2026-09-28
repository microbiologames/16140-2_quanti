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

/** Nom de la variable CSS portant la couleur d'une série. */
export function colorVariable(role: ColorRole): string {
  if (role.kind === 'case2') return '--series-case2'
  if (role.kind === 'case3') return '--series-case3'
  return `--series-${(role.index % 8) + 1}`
}

export const colorOf = (role: ColorRole): string => `var(${colorVariable(role)})`
