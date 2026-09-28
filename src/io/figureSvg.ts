import { buildScene, type SceneElement, type SceneLine, type SceneLayout } from '@/core/figureScene'
import { markerPath } from '@/core/markers'
import { EXPORT_INK, hexPaint, PALETTE_HEX, type PaletteId } from '@/ui/palette'
import type { Figure } from '@/core/figures'

/**
 * Rend une figure en SVG autonome, couleurs résolues.
 *
 * Le classeur exporté reçoit une image par feuille : elle doit se suffire à elle-même,
 * sans variable CSS ni feuille de style. Le tracé vient de la même scène que
 * l'affichage à l'écran ; seules la mise en page et la résolution des couleurs diffèrent.
 */

const LEGEND_WIDTH = 262
/** Largeur laissée au libellé : la légende moins le marqueur à gauche et l'effectif à droite. */
const LABEL_WIDTH = LEGEND_WIDTH - 22 - 38

export const EXPORT_LAYOUT: SceneLayout = {
  width: 940,
  height: 470,
  margin: { top: 18, right: LEGEND_WIDTH + 18, bottom: 56, left: 74 },
  markerRadius: 5.5,
  fontSize: 13,
}

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const round = (value: number) => Number(value.toFixed(2))

/**
 * Tronque un libellé trop long pour la colonne de légende.
 *
 * Hors du navigateur il n'y a pas de mesure de texte : on estime la largeur à
 * 0,55 em par caractère, ce qui majore légèrement pour de l'Arial en minuscules.
 * Un libellé un peu court vaut mieux qu'un libellé qui recouvre son effectif.
 */
function fit(text: string, size: number, maxWidth = LABEL_WIDTH): string {
  const maxChars = Math.floor(maxWidth / (size * 0.55))
  return text.length <= maxChars ? text : `${text.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`
}

function lineTag(line: SceneLine, palette: PaletteId): string {
  const dash = line.dash ? ` stroke-dasharray="${line.dash}"` : ''
  return (
    `<line x1="${round(line.x1)}" y1="${round(line.y1)}" x2="${round(line.x2)}" y2="${round(line.y2)}"` +
    ` stroke="${hexPaint(line.stroke, palette)}" stroke-width="${line.width}"${dash}/>`
  )
}

function elementTag(element: SceneElement, palette: PaletteId): string {
  if (element.kind === 'line') return lineTag(element, palette)
  if (element.kind === 'marker') return ''

  const transform = element.rotate
    ? ` transform="translate(${round(element.x)}, ${round(element.y)}) rotate(${element.rotate})"`
    : ''
  const position = element.rotate ? 'x="0" y="0"' : `x="${round(element.x)}" y="${round(element.y)}"`
  return (
    `<text ${position} text-anchor="${element.anchor}" font-size="${element.size}"` +
    ` fill="${hexPaint(element.fill, palette)}"${transform}>${escape(element.text)}</text>`
  )
}

/** Légende à droite du tracé : marqueur, libellé, effectif. */
function legend(figure: Figure, palette: PaletteId, layout: SceneLayout): string {
  const colors = PALETTE_HEX[palette]
  const left = layout.width - LEGEND_WIDTH
  const lineHeight = 21
  let y = layout.margin.top + 12
  const parts: string[] = []

  for (const series of figure.series) {
    const fill =
      series.color.kind === 'slot'
        ? colors.series[series.color.index % colors.series.length]!
        : series.color.kind === 'case2'
          ? colors.case2
          : colors.case3
    parts.push(
      `<path d="${markerPath(series.shape, 5.5)}" transform="translate(${left + 8}, ${y - 4})" fill="${fill}"/>`,
      `<text x="${left + 22}" y="${y}" font-size="13" fill="${EXPORT_INK.ink}">${escape(fit(series.label, 13))}</text>`,
      `<text x="${layout.width - 10}" y="${y}" font-size="13" text-anchor="end" fill="${EXPORT_INK.axis}">${series.points.length}</text>`,
    )
    y += lineHeight
  }

  for (const line of figure.lines) {
    const stroke = EXPORT_INK[line.role]
    const dash = line.role === 'identity' ? ' stroke-dasharray="4 3"' : ''
    const y1 = line.diagonal ? y - 1 : y - 4
    const y2 = line.diagonal ? y - 8 : y - 4
    parts.push(
      `<line x1="${left + 2}" y1="${y1}" x2="${left + 15}" y2="${y2}" stroke="${stroke}" stroke-width="2"${dash}/>`,
      `<text x="${left + 22}" y="${y}" font-size="13" fill="${EXPORT_INK.ink}">${escape(fit(line.label, 13))}</text>`,
    )
    if (line.value !== undefined) {
      parts.push(
        `<text x="${layout.width - 10}" y="${y}" font-size="13" text-anchor="end" fill="${EXPORT_INK.axis}">${line.value.toFixed(2)}</text>`,
      )
    }
    y += lineHeight
  }

  return parts.join('')
}

export function figureToSvg(
  figure: Figure,
  palette: PaletteId,
  layout: SceneLayout = EXPORT_LAYOUT,
): string {
  const scene = buildScene(figure, layout)
  const colors = PALETTE_HEX[palette]

  const markers = scene.markers
    .map((marker) => {
      const fill =
        marker.fill.token === 'series'
          ? colors.series[marker.fill.index % colors.series.length]!
          : hexPaint(marker.fill, palette)
      return (
        `<path d="${markerPath(marker.shape, marker.radius)}"` +
        ` transform="translate(${round(marker.x)}, ${round(marker.y)})"` +
        ` fill="${fill}" stroke="${EXPORT_INK.surface}" stroke-width="1.5"/>`
      )
    })
    .join('')

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}"`,
    ` viewBox="0 0 ${layout.width} ${layout.height}" font-family="Arial, Helvetica, sans-serif">`,
    `<rect width="${layout.width}" height="${layout.height}" fill="${EXPORT_INK.surface}"/>`,
    `<text x="${layout.margin.left}" y="14" font-size="14" font-weight="bold" fill="${EXPORT_INK.ink}">`,
    escape(figure.title),
    '</text>',
    scene.grid.map((line) => lineTag(line, palette)).join(''),
    scene.axes.map((element) => elementTag(element, palette)).join(''),
    scene.references.map((line) => lineTag(line, palette)).join(''),
    markers,
    legend(figure, palette, layout),
    '</svg>',
  ].join('')
}
