import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { readWorkbook } from './readWorkbook'

/** Construit un classeur en mémoire et l'enveloppe dans un `File`, comme un dépôt navigateur. */
async function makeXlsxFile(build: (workbook: ExcelJS.Workbook) => void): Promise<File> {
  const workbook = new ExcelJS.Workbook()
  build(workbook)
  const buffer = await workbook.xlsx.writeBuffer()
  return new File([buffer], 'essai.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('readWorkbook — classeurs Excel', () => {
  it('lit les feuilles, les valeurs et les résultats de formule', async () => {
    const file = await makeXlsxFile((workbook) => {
      const sheet = workbook.addWorksheet('Données')
      sheet.getRow(1).values = ['Échantillon', 'Réf', 'Alt']
      sheet.getRow(2).values = ['E1', 2.31, 2.45]
      sheet.getCell('D2').value = { formula: 'C2-B2', result: 0.14 }
      workbook.addWorksheet('Paramètres').getCell('A1').value = 'Lait'
    })

    const { sheets, diagnostics } = await readWorkbook(file)

    expect(sheets.map((sheet) => sheet.name)).toEqual(['Données', 'Paramètres'])
    expect(sheets[0]!.rows[0]).toEqual(['Échantillon', 'Réf', 'Alt'])
    expect(sheets[0]!.rows[1]).toEqual(['E1', 2.31, 2.45, 0.14])
    expect(diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)
  })

  it('ne conserve la valeur d’une plage fusionnée que dans sa cellule maître', async () => {
    const file = await makeXlsxFile((workbook) => {
      const sheet = workbook.addWorksheet('Données')
      sheet.mergeCells('A1:C1')
      sheet.getCell('A1').value = 'Titre de l’étude'
      sheet.getRow(2).values = ['a', 'b', 'c']
    })

    const { sheets, diagnostics } = await readWorkbook(file)

    expect(sheets[0]!.rows[0]).toEqual(['Titre de l’étude', null, null])
    expect(diagnostics.some((d) => d.severity === 'info' && /fusionnées/.test(d.message))).toBe(true)
  })

  it('conserve les lignes vides pour que la numérotation corresponde à Excel', async () => {
    const file = await makeXlsxFile((workbook) => {
      const sheet = workbook.addWorksheet('Données')
      sheet.getRow(1).values = ['en-tête']
      sheet.getRow(4).values = ['valeur'] // lignes 2 et 3 absentes
    })

    const { sheets } = await readWorkbook(file)

    expect(sheets[0]!.rowCount).toBe(4)
    expect(sheets[0]!.rows[1]).toEqual([])
    expect(sheets[0]!.rows[3]).toEqual(['valeur'])
  })

  it('réduit texte enrichi et texte d’erreur à une valeur simple', async () => {
    const file = await makeXlsxFile((workbook) => {
      const sheet = workbook.addWorksheet('Données')
      sheet.getCell('A1').value = { richText: [{ text: 'log ' }, { text: 'UFC/g' }] }
      sheet.getCell('B1').value = { error: '#DIV/0!' }
    })

    const { sheets } = await readWorkbook(file)

    expect(sheets[0]!.rows[0]![0]).toBe('log UFC/g')
    expect(sheets[0]!.rows[0]![1]).toBeNull()
  })

  it('refuse explicitement le format .xls plutôt que d’échouer obscurément', async () => {
    const file = new File([new Uint8Array([0xd0, 0xcf])], 'ancien.xls')
    const { sheets, diagnostics } = await readWorkbook(file)

    expect(sheets).toHaveLength(0)
    expect(diagnostics[0]!.severity).toBe('error')
    expect(diagnostics[0]!.message).toMatch(/\.xls\b/)
  })
})

describe('readWorkbook — fichiers délimités', () => {
  it('lit un CSV en une feuille unique', async () => {
    const file = new File(['a;b;c\n1;2;3\n'], 'mesures.csv', { type: 'text/csv' })
    const { sheets } = await readWorkbook(file)

    expect(sheets).toHaveLength(1)
    expect(sheets[0]!.name).toBe('mesures')
    expect(sheets[0]!.rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })
})
