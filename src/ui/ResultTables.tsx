import { useState } from 'react'
import type { ResultTable, TableCell } from '@/core/analysis'

/** Nombre de décimales à l'affichage. L'export Excel, lui, garde la précision entière. */
const DECIMALS = 4

function render(value: TableCell): string {
  if (value === null) return ''
  if (typeof value !== 'number') return value
  if (Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(DECIMALS)
}

/** Une ligne de total n'a pas de libellé de catégorie et porte « Total » en deuxième colonne. */
const isTotal = (row: TableCell[]) =>
  row[0] === null && typeof row[1] === 'string' && /^total/i.test(row[1])

export function ResultTables({ tables }: { tables: ResultTable[] }) {
  const [active, setActive] = useState(0)
  const table = tables[active]

  if (!table) return <p className="text-sm text-slate-500">Aucun résultat à afficher.</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1" role="tablist">
        {tables.map((candidate, index) => (
          <button
            key={candidate.sheetName}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => setActive(index)}
            className={`rounded-t-lg border-b-2 px-3 py-1.5 text-sm ${
              index === active
                ? 'border-[var(--brand-strong)] font-medium text-[var(--brand-strong)]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {candidate.sheetName}
          </button>
        ))}
      </div>

      <p className="text-sm font-medium">{table.title}</p>

      <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
            <tr>
              {table.columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className="border-b border-slate-200 px-2 py-1.5 text-left font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={
                  isTotal(row)
                    ? 'bg-slate-100 font-medium dark:bg-slate-900'
                    : 'even:bg-slate-50 dark:even:bg-slate-900/50'
                }
              >
                {table.columns.map((_, columnIndex) => {
                  const value = row[columnIndex] ?? null
                  return (
                    <td
                      key={columnIndex}
                      className={`border-b border-slate-100 px-2 py-1 dark:border-slate-800/60 ${
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
