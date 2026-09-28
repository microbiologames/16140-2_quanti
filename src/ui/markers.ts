import type { MarkerShape } from '@/core/figures'

/**
 * Chemin SVG d'un marqueur, centré sur l'origine. `size` est le rayon en pixels ;
 * les formes sont mises à l'échelle pour occuper à peu près la même aire visuelle,
 * un carré de même rayon paraissant sinon plus gros qu'un losange.
 */
export function markerPath(shape: MarkerShape, size: number): string {
  const polygon = (sides: number, rotation = -Math.PI / 2, radius = size) =>
    Array.from({ length: sides }, (_, index) => {
      const angle = rotation + (index * 2 * Math.PI) / sides
      return `${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`
    }).join(' L ')

  switch (shape) {
    case 'circle':
      return `M ${-size},0 a ${size},${size} 0 1,0 ${size * 2},0 a ${size},${size} 0 1,0 ${-size * 2},0 Z`
    case 'square': {
      const half = size * 0.86
      return `M ${-half},${-half} L ${half},${-half} L ${half},${half} L ${-half},${half} Z`
    }
    case 'diamond':
      return `M ${polygon(4)} Z`
    case 'triangle':
      return `M ${polygon(3, -Math.PI / 2, size * 1.15)} Z`
    case 'triangleDown':
      return `M ${polygon(3, Math.PI / 2, size * 1.15)} Z`
    case 'triangleLeft':
      return `M ${polygon(3, Math.PI, size * 1.15)} Z`
    case 'triangleRight':
      return `M ${polygon(3, 0, size * 1.15)} Z`
    case 'pentagon':
      return `M ${polygon(5, -Math.PI / 2, size * 1.06)} Z`
    case 'hexagon':
      return `M ${polygon(6, -Math.PI / 2, size * 1.04)} Z`
  }
}

/** Graduations « rondes » couvrant l'intervalle, environ `target` d'entre elles. */
export function niceTicks(min: number, max: number, target = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min]
  const rawStep = (max - min) / target
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  // On retient le pas « rond » le plus proche du pas idéal, et non le plus petit
  // qui lui soit inférieur : sinon un intervalle de 0 à 10 sort onze graduations.
  const step = (normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10) * magnitude

  // Un pas fractionnaire cumulé dérive en flottant : on l'indexe et on arrondit au
  // nombre de décimales que porte le pas.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  const first = Math.ceil(min / step) * step
  const count = Math.floor((max - first) / step + 1e-9) + 1

  return Array.from({ length: Math.max(count, 0) }, (_, index) =>
    Number((first + index * step).toFixed(decimals)),
  )
}
