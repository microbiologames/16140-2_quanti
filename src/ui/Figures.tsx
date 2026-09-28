import { useState } from 'react'
import { FigureChart } from './FigureChart'
import { PALETTES, readPalette, writePalette, type PaletteId } from './palette'
import type { Figure } from '@/core/figures'

export function Figures({ figures }: { figures: Figure[] }) {
  const [active, setActive] = useState(0)
  const [palette, setPalette] = useState<PaletteId>(readPalette)
  const figure = figures[Math.min(active, figures.length - 1)]

  const choose = (id: PaletteId) => {
    writePalette(id)
    setPalette(id)
  }

  if (!figure) return <p className="text-sm text-slate-500">Aucune figure à afficher.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {figures.map((candidate, index) => (
            <button
              key={candidate.sheetName}
              type="button"
              onClick={() => setActive(index)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                index === active
                  ? 'bg-[var(--brand-strong)] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {candidate.sheetName}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-500">
          Couleurs
          <select
            value={palette}
            onChange={(event) => choose(event.target.value as PaletteId)}
            className="rounded-lg border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
          >
            {PALETTES.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.label} — {choice.note}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FigureChart figure={figure} />
    </div>
  )
}
