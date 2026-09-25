/** Statistiques descriptives de base, avec gestion explicite des cas dégénérés. */

export function sum(xs: readonly number[]): number {
  // Sommation de Kahan : les jeux de données restent petits, mais la neutralité
  // numérique évite des écarts de dernier chiffre avec MATLAB sur les cumuls.
  let total = 0
  let compensation = 0
  for (const x of xs) {
    const y = x - compensation
    const t = total + y
    compensation = t - total - y
    total = t
  }
  return total
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return Number.NaN
  return sum(xs) / xs.length
}

/** Variance d'échantillon (dénominateur n − 1), comme `var` sous MATLAB. */
export function variance(xs: readonly number[]): number {
  if (xs.length < 2) return Number.NaN
  const m = mean(xs)
  return sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1)
}

/** Écart-type d'échantillon (dénominateur n − 1), comme `std` sous MATLAB. */
export function standardDeviation(xs: readonly number[]): number {
  return Math.sqrt(variance(xs))
}

/**
 * Quantile par interpolation linéaire entre les points (n − 1)·p,
 * convention par défaut de `quantile` sous MATLAB/NumPy.
 */
export function quantile(xs: readonly number[], p: number): number {
  if (xs.length === 0) return Number.NaN
  const sorted = [...xs].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]!
  const pos = (sorted.length - 1) * Math.min(Math.max(p, 0), 1)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]!
  return sorted[lo]! + (pos - lo) * (sorted[hi]! - sorted[lo]!)
}

export function median(xs: readonly number[]): number {
  return quantile(xs, 0.5)
}

export function min(xs: readonly number[]): number {
  return xs.length === 0 ? Number.NaN : Math.min(...xs)
}

export function max(xs: readonly number[]): number {
  return xs.length === 0 ? Number.NaN : Math.max(...xs)
}
