import { useState } from 'react'
import { Diagnostics } from '@/ui/Diagnostics'
import { Dropzone } from '@/ui/Dropzone'
import { ExportButtons } from '@/ui/ExportButtons'
import { Figures } from '@/ui/Figures'
import { JobList } from '@/ui/JobList'
import { LocaleToggle } from '@/ui/LocaleToggle'
import { ResultTables } from '@/ui/ResultTables'
import { SheetPreview } from '@/ui/SheetPreview'
import { Summary } from '@/ui/Summary'
import { ThemeToggle } from '@/ui/ThemeToggle'
import { buildFigures } from '@/core/figures'
import { useAppStore, useSelectedJob } from '@/state/store'

const VIEWS = ['Tableaux', 'Figures', 'Diagnostics', 'Fichier lu'] as const
type View = (typeof VIEWS)[number]

export default function App() {
  const jobs = useAppStore((state) => state.jobs)
  const clear = useAppStore((state) => state.clear)
  const job = useSelectedJob()
  const [view, setView] = useState<View>('Tableaux')

  const diagnostics = job?.analysis?.diagnostics ?? job?.workbook?.diagnostics ?? []
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold">ISO 16140-2 — Méthodes quantitatives</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Interprétation des données brutes d'études de validation de méthode. Tout le calcul a
            lieu dans le navigateur : aucune donnée n'est transmise.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span id="locale-hint">Résultats</span>
            <LocaleToggle />
          </div>
          <ThemeToggle />
          <img
            src={`${import.meta.env.BASE_URL}adria.svg`}
            alt="ADRIA"
            width={585}
            height={91}
            className="h-5 w-auto opacity-80"
          />
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          <Dropzone />
          {jobs.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-medium">Lot ({jobs.length})</h2>
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs text-slate-500 hover:text-rose-600"
                >
                  Tout retirer
                </button>
              </div>
              <JobList />
            </section>
          )}
        </aside>

        <main className="min-w-0 space-y-4">
          {!job && (
            <div className="rounded-xl border border-slate-200 p-8 text-sm text-slate-500 dark:border-slate-800">
              <p className="font-medium text-slate-700 dark:text-slate-300">Aucun fichier chargé.</p>
              <p className="mt-2">
                Déposer un ou plusieurs classeurs d'entrée. Les tableaux et les figures de
                l'étude sont calculés à la volée et affichés ici.
              </p>
            </div>
          )}

          {job?.status === 'failed' && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              <p className="font-medium">Lecture impossible</p>
              <p className="mt-1">{job.error}</p>
            </div>
          )}

          {job?.analysis && (
            <>
              <Summary result={job.analysis} />
              <ExportButtons jobs={jobs} current={job} />

              <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
                {VIEWS.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setView(candidate)}
                    className={`-mb-px border-b-2 px-3 py-1.5 text-sm transition-colors ${
                      candidate === view
                        ? 'border-[var(--brand-strong)] font-medium text-[var(--brand-strong)]'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {candidate}
                    {candidate === 'Diagnostics' && diagnostics.length > 0 && (
                      <span
                        className={`ml-1.5 rounded px-1.5 py-0.5 text-xs ${
                          errors > 0
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {diagnostics.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {view === 'Tableaux' && <ResultTables tables={job.analysis.tables} />}
              {view === 'Figures' && <Figures figures={buildFigures(job.analysis)} />}
              {view === 'Diagnostics' && <Diagnostics diagnostics={diagnostics} />}
              {view === 'Fichier lu' && job.workbook && <SheetPreview sheets={job.workbook.sheets} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
