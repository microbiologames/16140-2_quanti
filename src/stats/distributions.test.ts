import { describe, expect, it } from 'vitest'
import {
  chiSquareCdf,
  chiSquareQuantile,
  fCdf,
  fQuantile,
  logGamma,
  normalCdf,
  normalQuantile,
  regularizedIncompleteBeta,
  regularizedLowerGamma,
  studentTCdf,
  studentTQuantile,
} from './distributions'

/**
 * Valeurs de référence produites avec SciPy 1.17 (`scipy.stats`, `scipy.special`),
 * elles-mêmes alignées sur les implémentations de référence de MATLAB.
 * Tolérance relative : 1e-10, très au-delà du besoin métier.
 */
const REL_TOL = 1e-10

function expectClose(actual: number, expected: number, tol = REL_TOL) {
  const scale = Math.max(1, Math.abs(expected))
  expect(Math.abs(actual - expected) / scale).toBeLessThan(tol)
}

describe('logGamma', () => {
  const cases: [number, number][] = [
    [0.5, 0.5723649429247],
    [1, 0.0],
    [1.5, -0.12078223763524526],
    [5, 3.1780538303479458],
    [10.3, 13.482036786138359],
    [100, 359.1342053695754],
  ]
  it.each(cases)('logGamma(%f)', (x, expected) => expectClose(logGamma(x), expected))
})

describe('bêta incomplète régularisée', () => {
  const cases: [number, number, number, number][] = [
    [0.5, 2, 3, 0.6875],
    [0.1, 0.5, 0.5, 0.20483276469913345],
    [0.9, 10, 2, 0.6973568802000002],
  ]
  it.each(cases)('I_%f(%f, %f)', (x, a, b, expected) =>
    expectClose(regularizedIncompleteBeta(x, a, b), expected),
  )
})

describe('gamma incomplète inférieure régularisée', () => {
  const cases: [number, number, number][] = [
    [0.5, 1.0, 0.8427007929497151],
    [3, 2.5, 0.45618688411667035],
    [10, 12, 0.7576078383294875],
  ]
  it.each(cases)('P(%f, %f)', (a, x, expected) =>
    expectClose(regularizedLowerGamma(a, x), expected),
  )
})

describe('loi normale', () => {
  const cdfCases: [number, number][] = [
    [-3, 0.0013498980316300933],
    [-1.96, 0.024997895148220435],
    [-0.5, 0.3085375387259869],
    [0, 0.5],
    [1, 0.8413447460685429],
    [2.5, 0.9937903346742238],
  ]
  it.each(cdfCases)('normalCdf(%f)', (z, expected) => expectClose(normalCdf(z), expected))

  const invCases: [number, number][] = [
    [0.001, -3.090232306167813],
    [0.025, -1.9599639845400545],
    [0.05, -1.6448536269514729],
    [0.5, 0.0],
    [0.9, 1.2815515655446004],
    [0.975, 1.959963984540054],
    [0.999, 3.090232306167813],
  ]
  it.each(invCases)('normalQuantile(%f)', (p, expected) =>
    expectClose(normalQuantile(p), expected),
  )
})

describe('loi de Student', () => {
  const cdfCases: [number, number, number][] = [
    [2.228138851986273, 10, 0.975],
    [-1.0, 5, 0.18160873382456144],
    [0.0, 3, 0.5],
    [3.5, 20, 0.9988724384234714],
  ]
  it.each(cdfCases)('studentTCdf(%f, %i)', (t, df, expected) =>
    expectClose(studentTCdf(t, df), expected),
  )

  const invCases: [number, number, number][] = [
    [0.975, 1, 12.706204736174694],
    [0.975, 2, 4.302652729749462],
    [0.95, 5, 2.0150483733330233],
    [0.975, 10, 2.228138851986274],
    [0.995, 30, 2.7499956535672254],
    [0.975, 1000, 1.9623390808264083],
    [0.025, 7, -2.3646242515927844],
  ]
  it.each(invCases)('studentTQuantile(%f, %i)', (p, df, expected) =>
    expectClose(studentTQuantile(p, df), expected),
  )
})

describe('loi du khi-deux', () => {
  const cases: [number, number, number][] = [
    [0.95, 1, 3.841458820694124],
    [0.95, 10, 18.307038053275146],
    [0.05, 10, 3.9402991361190605],
    [0.99, 25, 44.31410489621915],
    [0.5, 4, 3.3566939800333224],
  ]
  it.each(cases)('chiSquareQuantile(%f, %i)', (p, df, expected) =>
    expectClose(chiSquareQuantile(p, df), expected),
  )

  it('chiSquareCdf est l’inverse de chiSquareQuantile', () => {
    expectClose(chiSquareCdf(chiSquareQuantile(0.9, 7), 7), 0.9)
  })
})

describe('loi de Fisher-Snedecor', () => {
  const invCases: [number, number, number, number][] = [
    [0.95, 3, 10, 3.7082648190468435],
    [0.95, 1, 1, 161.4476387975882],
    [0.99, 5, 20, 4.102684630584732],
    [0.05, 4, 8, 0.16553428864049893],
    [0.95, 10, 100, 1.9266924887545493],
  ]
  it.each(invCases)('fQuantile(%f, %i, %i)', (p, df1, df2, expected) =>
    expectClose(fQuantile(p, df1, df2), expected),
  )

  const cdfCases: [number, number, number, number][] = [
    [3.708265, 3, 10, 0.9500000059999202],
    [1.0, 5, 5, 0.49999999999999983],
    [0.5, 2, 30, 0.3885042917915453],
  ]
  it.each(cdfCases)('fCdf(%f, %i, %i)', (f, df1, df2, expected) =>
    expectClose(fCdf(f, df1, df2), expected),
  )
})
