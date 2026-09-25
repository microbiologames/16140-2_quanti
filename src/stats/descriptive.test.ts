import { describe, expect, it } from 'vitest'
import { max, mean, median, min, quantile, standardDeviation, sum, variance } from './descriptive'

/** Référence : NumPy (`ddof=1` pour la variance et l'écart-type). */
const D = [2, 4, 4, 4, 5, 5, 7, 9]

describe('statistiques descriptives', () => {
  it('moyenne, variance et écart-type d’échantillon', () => {
    expect(mean(D)).toBe(5)
    expect(variance(D)).toBeCloseTo(4.571428571428571, 12)
    expect(standardDeviation(D)).toBeCloseTo(2.138089935299395, 12)
  })

  it('médiane et quantiles par interpolation linéaire', () => {
    expect(median(D)).toBe(4.5)
    expect(quantile(D, 0.25)).toBeCloseTo(4, 12)
    expect(quantile(D, 0.9)).toBeCloseTo(7.6, 12)
    expect(quantile(D, 0)).toBe(2)
    expect(quantile(D, 1)).toBe(9)
  })

  it('bornes', () => {
    expect(min(D)).toBe(2)
    expect(max(D)).toBe(9)
  })

  it('renvoie NaN plutôt que de lever sur un échantillon insuffisant', () => {
    expect(mean([])).toBeNaN()
    expect(variance([3])).toBeNaN()
    expect(median([])).toBeNaN()
  })

  it('somme de Kahan : pas d’accumulation d’erreur d’arrondi', () => {
    const tenth = Array.from({ length: 1000 }, () => 0.1)
    expect(tenth.reduce((a, b) => a + b, 0)).not.toBe(100) // sommation naïve : 99.9999999999986
    expect(sum(tenth)).toBe(100)
  })
})
