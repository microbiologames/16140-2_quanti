import { useState } from 'react'
import type { CellValue, RawSheet } from '@/core/types'

const MAX_ROWS = 40
const MAX_COLUMNS = 25

function render(value: CellValue): string {
  if (value === null) return ''
  if (value instanceof Date) return value.toLocaleDateString('fr-FR')
  return String(value)
}

/** Nom de colonne au format Excel : 1 → A, 27 → AA. */
function columnName(index: number): string {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const remainder = (n - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

export function SheetPreview({ sheets }: { sheets: RawSheet[] }) {
  const [active, setActive] = useState(0)
  const sheet = sheets[active]

  if (!sheet) return <p className="text-sm text-slate-500">Aucune feuille à afficher.</p>

  const columns = Math.min(sheet.columnCount, MAX_COLUMNS)
  const rows = sheet.rows.slice(0, MAX_ROWS)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {sheets.map((candidate, index) => (
          <button
            key={candidate.name}
            type="button"
            onClick={() => setActive(index)}
            className={`rounded-t-lg border-b-2 px-3 py-1.5 text-sm ${
              index === active
                ? 'border-sky-600 font-medium text-sky-700 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {candidate.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {sheet.rowCount} lignes × {sheet.columnCount} colonnes
        {(sheet.rowCount > MAX_ROWS || sheet.columnCount > MAX_COLUMNS) &&
          ` — aperçu limité à ${MAX_ROWS} lignes et ${MAX_COLUMNS} colonnes`}
      </p>

      <div className="overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="w-10 border-r border-slate-200 px-2 py-1 text-slate-400 dark:border-slate-800" />
              {Array.from({ length: columns }, (_, index) => (
                <th
                  key={index}
                  className="border-r border-slate-200 px-2 py-1 font-medium text-slate-500 dark:border-slate-800"
                >
                  {columnName(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:bg-slate-50 dark:even:bg-slate-900/50">
                <td className="border-r border-slate-200 px-2 py-1 text-right text-slate-400 dark:border-slate-800">
                  {rowIndex + 1}
                </td>
                {Array.from({ length: columns }, (_, columnIndex) => {
                  const value = row[columnIndex] ?? null
                  return (
                    <td
                      key={columnIndex}
                      className={`max-w-48 truncate border-r border-slate-200 px-2 py-1 dark:border-slate-800 ${
                        typeof value === 'number' ? 'numeric' : ''
                      }`}
                    >
                      {render(value)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
