import { describe, expect, it } from 'vitest'
import { combineCases, parseMeasurement, type MeasurementCase } from './measurement'

const parse = (raw: unknown) => parseMeasurement(raw as never).measurement
const diagnostics = (raw: unknown) => parseMeasurement(raw as never).diagnostics

describe('parseMeasurement — cas 1, résultat exploitable', () => {
  it('accepte un nombre', () => {
    expect(parse(2.31)).toMatchObject({ case: 1, corrected: 2.31 })
    expect(parse(0)).toMatchObject({ case: 1, corrected: 0 })
  })

  it('accepte un nombre saisi en texte, virgule ou point', () => {
    expect(parse('3,07')).toMatchObject({ case: 1, corrected: 3.07 })
    expect(parse('3.07')).toMatchObject({ case: 1, corrected: 3.07 })
  })

  it('tolère espaces de bord et espaces insécables', () => {
    expect(parse('  3,07 ')).toMatchObject({ case: 1, corrected: 3.07 })
    expect(parse('3,07 ')).toMatchObject({ case: 1, corrected: 3.07 })
  })

  it('signale la saisie en texte sans la traiter comme une anomalie', () => {
    const found = diagnostics('3,07')
    expect(found).toHaveLength(1)
    expect(found[0]!.severity).toBe('info')
  })
})

describe('parseMeasurement — cas 2, moins de 4 colonies par boîte', () => {
  it('retire le marqueur et conserve la valeur', () => {
    expect(parse('0,70*')).toMatchObject({ case: 2, corrected: 0.7 })
    expect(parse('1.30*')).toMatchObject({ case: 2, corrected: 1.3 })
  })

  it('tolère un espace avant le marqueur, et le marqueur en tête', () => {
    expect(parse('1,30 *')).toMatchObject({ case: 2, corrected: 1.3 })
    expect(parse('*1,30')).toMatchObject({ case: 2, corrected: 1.3 })
  })
})

describe('parseMeasurement — cas 3, hors limites de quantification', () => {
  it('ajoute 1 log au-dessus de la limite haute', () => {
    expect(parse('>5,18')).toMatchObject({ case: 3, corrected: 6.18, censored: 5.18 })
  })

  it('retire 1 log en dessous de la limite basse', () => {
    expect(parse('<1,00')).toMatchObject({ case: 3, corrected: 0, censored: 1 })
    expect(parse('<1.00')).toMatchObject({ case: 3, corrected: 0, censored: 1 })
  })

  it('tolère un espace après le signe et accepte ≤ et ≥', () => {
    expect(parse('< 2,00')).toMatchObject({ case: 3, corrected: 1 })
    expect(parse('≥7,18')).toMatchObject({ case: 3, corrected: 8.18 })
    expect(parse('≤2,00')).toMatchObject({ case: 3, corrected: 1 })
  })
})

describe('parseMeasurement — cas 4, absence de résultat', () => {
  it('reconnaît ND quelle que soit la forme', () => {
    for (const raw of ['ND', 'nd', 'N.D.', ' Nd ']) {
      expect(parse(raw)).toMatchObject({ case: 4 })
      expect(parse(raw).corrected).toBeNaN()
    }
  })

  it('traite une cellule vide comme une absence de résultat, en le signalant', () => {
    expect(parse(null)).toMatchObject({ case: 4 })
    expect(diagnostics(null)[0]).toMatchObject({ severity: 'warning' })
    expect(diagnostics('   ')[0]).toMatchObject({ severity: 'warning' })
  })
})

describe('parseMeasurement — valeurs non reconnues', () => {
  it('écarte la valeur et produit une erreur plutôt que de s’interrompre', () => {
    const { measurement, diagnostics: found } = parseMeasurement('environ 3')
    expect(measurement.case).toBe(4)
    expect(measurement.corrected).toBeNaN()
    expect(found[0]!.severity).toBe('error')
  })

  it('signale un marqueur sans nombre', () => {
    expect(diagnostics('<')[0]!.severity).toBe('error')
    expect(diagnostics('*')[0]!.severity).toBe('error')
  })

  it('donne la priorité au * sur < , comme MATLAB, en prévenant', () => {
    const { measurement, diagnostics: found } = parseMeasurement('<1,00*')
    expect(measurement.case).toBe(2)
    expect(measurement.corrected).toBe(1)
    expect(found[0]).toMatchObject({ severity: 'warning' })
  })
})

describe('combineCases', () => {
  const cases: [MeasurementCase, MeasurementCase, MeasurementCase][] = [
    [1, 1, 1],
    [1, 2, 2],
    [2, 1, 2],
    [2, 3, 3],
    [3, 4, 4],
    [4, 1, 4],
    [2, 4, 4],
    [3, 3, 3],
  ]
  it.each(cases)('cas %i et %i donnent %i', (a, b, expected) =>
    expect(combineCases(a, b)).toBe(expected),
  )
})
