/**
 * Fonctions spéciales et lois de probabilité.
 *
 * Implémentées ici plutôt qu'importées d'une bibliothèque : ce sont les briques
 * sur lesquelles reposent tous les verdicts de l'application, elles doivent être
 * vérifiables et testées ligne à ligne contre des valeurs de référence.
 *
 * Références : Numerical Recipes, 3e éd., §6.2 (gamma incomplète) et §6.4 (bêta
 * incomplète) ; Acklam pour l'inverse de la loi normale.
 */

const EPS = 3e-16
const FPMIN = 1e-300
const MAX_ITER = 500

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
] as const

/** Logarithme népérien de la fonction gamma (approximation de Lanczos, g = 7). */
export function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  const z = x - 1
  let a = LANCZOS[0]
  const t = z + 7.5
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i]! / (z + i)
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a)
}

/** Fraction continue de la bêta incomplète (algorithme de Lentz modifié). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d

  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m
    let num = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + num * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + num / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c

    num = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + num * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + num / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < EPS) break
  }
  return h
}

/** Bêta incomplète régularisée I_x(a, b). */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x),
  )
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b
}

function lowerGammaSeries(a: number, x: number): number {
  let ap = a
  let sum = 1 / a
  let delta = sum
  for (let n = 0; n < MAX_ITER; n++) {
    ap += 1
    delta *= x / ap
    sum += delta
    if (Math.abs(delta) < Math.abs(sum) * EPS) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

function upperGammaContinuedFraction(a: number, x: number): number {
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i <= MAX_ITER; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < EPS) break
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

/** Gamma incomplète inférieure régularisée P(a, x). */
export function regularizedLowerGamma(a: number, x: number): number {
  if (x <= 0) return 0
  return x < a + 1 ? lowerGammaSeries(a, x) : 1 - upperGammaContinuedFraction(a, x)
}

/**
 * Inverse générique d'une fonction de répartition croissante, par dichotomie.
 * Converge à la précision machine sur l'intervalle fourni.
 */
function invertCdf(cdf: (x: number) => number, p: number, lo: number, hi: number): number {
  let a = lo
  let b = hi
  for (let i = 0; i < 200; i++) {
    const mid = (a + b) / 2
    if (mid === a || mid === b) break
    if (cdf(mid) < p) a = mid
    else b = mid
  }
  return (a + b) / 2
}

/* ------------------------------------------------------------------ normale */

/** Fonction de répartition de la loi normale centrée réduite. */
export function normalCdf(z: number): number {
  if (z === 0) return 0.5
  const p = regularizedLowerGamma(0.5, (z * z) / 2)
  return z > 0 ? 0.5 * (1 + p) : 0.5 * (1 - p)
}

/** Quantile de la loi normale centrée réduite (Acklam, affiné par Halley). */
export function normalQuantile(p: number): number {
  if (p <= 0) return Number.NEGATIVE_INFINITY
  if (p >= 1) return Number.POSITIVE_INFINITY

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
             -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
             3.754408661907416]
  const pLow = 0.02425
  let x: number

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p))
    x = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
        ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
  } else if (p <= 1 - pLow) {
    const q = p - 0.5
    const r = q * q
    x = (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
        (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  } else {
    const q = Math.sqrt(-2 * Math.log1p(-p))
    x = -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
         ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
  }

  // Un pas de Halley porte l'erreur relative sous 1e-15.
  const e = normalCdf(x) - p
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2)
  return x - u / (1 + (x * u) / 2)
}

/* ------------------------------------------------------------------ Student */

/** Fonction de répartition de la loi de Student à `df` degrés de liberté. */
export function studentTCdf(t: number, df: number): number {
  const p = regularizedIncompleteBeta(df / (df + t * t), df / 2, 0.5)
  return t > 0 ? 1 - p / 2 : p / 2
}

/** Quantile de la loi de Student — équivalent de `tinv` sous MATLAB. */
export function studentTQuantile(p: number, df: number): number {
  if (p <= 0) return Number.NEGATIVE_INFINITY
  if (p >= 1) return Number.POSITIVE_INFINITY
  if (p === 0.5) return 0
  return invertCdf((t) => studentTCdf(t, df), p, -1e12, 1e12)
}

/* ------------------------------------------------------------ khi-deux et F */

/** Fonction de répartition de la loi du khi-deux à `df` degrés de liberté. */
export function chiSquareCdf(x: number, df: number): number {
  return x <= 0 ? 0 : regularizedLowerGamma(df / 2, x / 2)
}

/** Quantile de la loi du khi-deux — équivalent de `chi2inv`. */
export function chiSquareQuantile(p: number, df: number): number {
  if (p <= 0) return 0
  if (p >= 1) return Number.POSITIVE_INFINITY
  return invertCdf((x) => chiSquareCdf(x, df), p, 0, 1e12)
}

/** Fonction de répartition de la loi de Fisher-Snedecor. */
export function fCdf(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0
  return regularizedIncompleteBeta((df1 * f) / (df1 * f + df2), df1 / 2, df2 / 2)
}

/** Quantile de la loi de Fisher-Snedecor — équivalent de `finv`. */
export function fQuantile(p: number, df1: number, df2: number): number {
  if (p <= 0) return 0
  if (p >= 1) return Number.POSITIVE_INFINITY
  return invertCdf((f) => fCdf(f, df1, df2), p, 0, 1e12)
}
