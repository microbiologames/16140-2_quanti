import { describe, expect, it } from 'vitest'
import { coefficientInterval, linearRegression } from './regression'

/** Référence : `scipy.stats.linregress` sur le même jeu de données. */
const X = [0, 1, 2, 3, 4, 5, 6]
const Y = [0.12, 1.05, 1.98, 3.21, 3.89, 5.12, 5.94]

describe('linearRegression', () => {
  const fit = linearRegression(X, Y)

  it('estime la pente et l’ordonnée à l’origine', () => {
    expect(fit.slope).toBeCloseTo(0.9825000000000002, 12)
    expect(fit.intercept).toBeCloseTo(0.09678571428571381, 12)
  })

  it('estime les incertitudes des coefficients', () => {
    expect(fit.slopeStdError).toBeCloseTo(0.02223196356783668, 12)
    expect(fit.interceptStdError).toBeCloseTo(0.08015848459808249, 12)
  })

  it('calcule R² et l’écart-type résiduel', () => {
    expect(fit.rSquared).toBeCloseTo(0.9974464162577419, 12)
    expect(fit.residualStdError).toBeCloseTo(0.11764049351429001, 12)
    expect(fit.degreesOfFreedom).toBe(5)
  })

  it('renvoie des résidus de somme nulle', () => {
    const expected = [
      0.023214285714286187, -0.029285714285713915, -0.08178571428571413,
      0.16571428571428548, -0.1367857142857143, 0.11071428571428577,
      -0.05178571428571477,
    ]
    fit.residuals.forEach((r, i) => expect(r).toBeCloseTo(expected[i]!, 12))
    expect(fit.residuals.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10)
  })

  it('refuse les entrées inexploitables', () => {
    expect(() => linearRegression([1, 2], [1, 2])).toThrow(/3 observations/)
    expect(() => linearRegression([1, 2, 3], [1, 2])).toThrow(/tailles différentes/)
    expect(() => linearRegression([2, 2, 2], [1, 2, 3])).toThrow(/abscisses/)
  })
})

describe('coefficientInterval', () => {
  it('encadre l’estimation symétriquement', () => {
    const [lo, hi] = coefficientInterval(0.9825, 0.02223196356783668, 5)
    const t975df5 = 2.5705818356363146 // scipy.stats.t.ppf(0.975, 5)
    expect(lo).toBeCloseTo(0.9825 - t975df5 * 0.02223196356783668, 12)
    expect(hi).toBeCloseTo(0.9825 + t975df5 * 0.02223196356783668, 12)
  })
})
