import { mean, sum } from './descriptive'
import { studentTQuantile } from './distributions'

export interface LinearFit {
  /** Ordonnée à l'origine. */
  intercept: number
  /** Pente. */
  slope: number
  /** Incertitudes-types des coefficients. */
  interceptStdError: number
  slopeStdError: number
  /** Coefficient de détermination. */
  rSquared: number
  /** Écart-type résiduel (racine du carré moyen résiduel). */
  residualStdError: number
  /** Degrés de liberté résiduels : n − 2. */
  degreesOfFreedom: number
  /** Résidus, dans l'ordre des observations fournies. */
  residuals: number[]
  /** Nombre d'observations utilisées. */
  n: number
}

/** Régression linéaire simple par moindres carrés ordinaires : y = intercept + slope·x. */
export function linearRegression(x: readonly number[], y: readonly number[]): LinearFit {
  if (x.length !== y.length) {
    throw new Error(`linearRegression : x (${x.length}) et y (${y.length}) de tailles différentes`)
  }
  const n = x.length
  if (n < 3) {
    throw new Error('linearRegression : au moins 3 observations sont nécessaires')
  }

  const xBar = mean(x)
  const yBar = mean(y)
  const sxx = sum(x.map((xi) => (xi - xBar) ** 2))
  if (sxx === 0) {
    throw new Error('linearRegression : toutes les abscisses sont identiques')
  }
  const sxy = sum(x.map((xi, i) => (xi - xBar) * (y[i]! - yBar)))
  const syy = sum(y.map((yi) => (yi - yBar) ** 2))

  const slope = sxy / sxx
  const intercept = yBar - slope * xBar
  const residuals = x.map((xi, i) => y[i]! - (intercept + slope * xi))
  const df = n - 2
  const sse = sum(residuals.map((r) => r ** 2))
  const mse = sse / df
  const residualStdError = Math.sqrt(mse)

  return {
    intercept,
    slope,
    interceptStdError: Math.sqrt(mse * (1 / n + xBar ** 2 / sxx)),
    slopeStdError: Math.sqrt(mse / sxx),
    rSquared: syy === 0 ? Number.NaN : 1 - sse / syy,
    residualStdError,
    degreesOfFreedom: df,
    residuals,
    n,
  }
}

/** Intervalle de confiance bilatéral d'un coefficient de la régression. */
export function coefficientInterval(
  estimate: number,
  stdError: number,
  degreesOfFreedom: number,
  confidenceLevel = 0.95,
): [number, number] {
  const t = studentTQuantile(1 - (1 - confidenceLevel) / 2, degreesOfFreedom)
  return [estimate - t * stdError, estimate + t * stdError]
}
