import { Diagnostics } from '@/ui/Diagnostics'
import { Dropzone } from '@/ui/Dropzone'
import { JobList } from '@/ui/JobList'
import { SheetPreview } from '@/ui/SheetPreview'
import { useAppStore, useSelectedJob } from '@/state/store'

export default function App() {
  const jobs = useAppStore((state) => state.jobs)
  const clear = useAppStore((state) => state.clear)
  const job = useSelectedJob()

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold">ISO 16140-2 — Méthodes quantitatives</h1>
        <p className="text-sm text-slate-500">
          Interprétation des données brutes d'études de validation de méthode. Tout le calcul a
          lieu dans le navigateur : aucune donnée n'est transmise.
        </p>
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

        <main className="min-w-0">
          {!job && (
            <div className="rounded-xl border border-slate-200 p-8 text-sm text-slate-500 dark:border-slate-800">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                Aucun fichier chargé.
              </p>
              <p className="mt-2">
                Déposer un ou plusieurs fichiers pour en vérifier la lecture. L'application est au
                stade d'amorçage : elle lit les fichiers et signale ce qu'elle n'a pas compris. Les
                blocs d'analyse ISO 16140-2 seront ajoutés une fois l'application MATLAB de
                référence portée.
              </p>
            </div>
          )}

          {job?.status === 'failed' && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              <p className="font-medium">Lecture impossible</p>
              <p className="mt-1">{job.error}</p>
            </div>
          )}

          {job?.workbook && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h2 className="text-sm font-medium">Diagnostics de lecture</h2>
                <Diagnostics diagnostics={job.workbook.diagnostics} />
              </section>
              <section className="space-y-2">
                <h2 className="text-sm font-medium">Contenu lu</h2>
                <SheetPreview sheets={job.workbook.sheets} />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
