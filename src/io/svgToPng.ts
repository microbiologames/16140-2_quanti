/**
 * Convertit un SVG autonome en PNG, dans le navigateur.
 *
 * Le classeur Excel n'affiche pas de SVG ; l'application MATLAB y insérait des
 * métafichiers Windows, invisibles ailleurs. Un PNG rendu à plusieurs fois la
 * résolution d'écran s'ouvre partout et reste net à l'impression.
 */

export interface RenderedImage {
  data: ArrayBuffer
  /** Dimensions en points, avant facteur d'échelle — celles à donner à Excel. */
  width: number
  height: number
}

/** Facteur par défaut : 2 donne ~190 ppp sur une figure de 940 points de large. */
export const DEFAULT_SCALE = 2

function dimensions(svg: string): { width: number; height: number } {
  const width = /width="(\d+(?:\.\d+)?)"/.exec(svg)
  const height = /height="(\d+(?:\.\d+)?)"/.exec(svg)
  if (!width || !height) throw new Error('SVG sans dimensions explicites')
  return { width: Number(width[1]), height: Number(height[1]) }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Le SVG n’a pas pu être décodé'))
    image.src = url
  })
}

export async function svgToPng(svg: string, scale = DEFAULT_SCALE): Promise<RenderedImage> {
  const { width, height } = dimensions(svg)
  // Un blob plutôt qu'une data-URI : pas de limite de longueur, pas d'encodage à
  // surveiller sur des figures de plusieurs centaines de points.
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Contexte 2D indisponible')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Le PNG n’a pas pu être encodé')
    return { data: await blob.arrayBuffer(), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}
