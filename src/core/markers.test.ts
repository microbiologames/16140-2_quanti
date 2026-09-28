import { describe, expect, it } from 'vitest'
import { markerPath, niceTicks } from './markers'
import type { MarkerShape } from '@/core/figures'

describe('markerPath', () => {
  const shapes: MarkerShape[] = [
    'circle', 'square', 'diamond', 'triangle', 'triangleDown',
    'triangleLeft', 'triangleRight', 'pentagon', 'hexagon',
  ]

  it.each(shapes)('produit un chemin fermé pour %s', (shape) => {
    const path = markerPath(shape, 5)
    expect(path.startsWith('M ')).toBe(true)
    expect(path.trimEnd().endsWith('Z')).toBe(true)
    expect(path).not.toMatch(/NaN/)
  })

  it('reste dans une boîte proportionnée à la taille demandée', () => {
    for (const shape of shapes) {
      const coordinates = [...markerPath(shape, 6).matchAll(/-?\d+(?:\.\d+)?/g)].map(Number)
      expect(Math.max(...coordinates.map(Math.abs))).toBeLessThanOrEqual(12)
    }
  })
})

describe('niceTicks', () => {
  it('produit des valeurs rondes', () => {
    expect(niceTicks(0, 10)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceTicks(0, 5)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('reste dans l’intervalle demandé', () => {
    const ticks = niceTicks(-1.37, 0.75)
    expect(ticks[0]).toBeGreaterThanOrEqual(-1.37)
    expect(ticks[ticks.length - 1]!).toBeLessThanOrEqual(0.75)
  })

  it('n’accumule pas d’erreur d’arrondi sur un pas fractionnaire', () => {
    for (const tick of niceTicks(0, 1)) {
      expect(Number(tick.toFixed(10))).toBe(tick)
    }
  })

  it('supporte un intervalle dégénéré sans boucler', () => {
    expect(niceTicks(3, 3)).toEqual([3])
    expect(niceTicks(Number.NaN, 1)).toHaveLength(1)
  })
})
