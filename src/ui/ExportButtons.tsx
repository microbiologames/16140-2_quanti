import { useState } from 'react'
import { download, zipBlobs } from '@/io/download'
import { buildWorkbook, outputFileName } from '@/io/writeWorkbook'
import { readPalette } from './palette'
import type { Job } from '@/core/types'

type Busy = null | { label: string; done: number; total: number }

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const analysed = (job: Job) => job.analysis !== undefined

export function ExportButtons({ jobs, current }: { jobs: Job[]; current: Job }) {
  const [busy, setBusy] = useState<Busy>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const ready = jobs.filter(analysed)

  const run = async (label: string, task: (progress: (done: number) => void) => Promise<void>) => {
    setFailure(null)
    setBusy({ label, done: 0, total: 1 })
    try {
      await task((done) => setBusy((state) => (state ? { ...state, done } : state)))
    } catch (error) {
      setFailure(message(error))
    } finally {
      setBusy(null)
    }
  }

  const exportOne = () =>
    run('Classeur en préparation', async () => {
      const blob = await buildWorkbook(current.analysis!, { palette: readPalette() })
      download(blob, outputFileName(current.fileName))
    })

  const exportAll = () =>
    run('Lot en préparation', async (progress) => {
      setBusy({ label: 'Lot en préparation', done: 0, total: ready.length })
      const palette = readPalette()
      const files: { name: string; blob: Blob }[] = []
      for (const [index, job] of ready.entries()) {
        files.push({
          name: outputFileName(job.fileName),
          blob: await buildWorkbook(job.analysis!, { palette }),
        })
        progress(index + 1)
      }
      download(await zipBlobs(files), `Resultats_ISO16140-2_${new Date().toISOString().slice(0, 10)}.zip`)
    })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={exportOne}
          disabled={busy !== null || !current.analysis}
          className="rounded-lg bg-[var(--brand-strong)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Télécharger ce classeur
        </button>

        {ready.length > 1 && (
          <button
            type="button"
            onClick={exportAll}
            disabled={busy !== null}
            className="rounded-lg border border-[var(--brand-strong)] px-3 py-1.5 text-sm font-medium text-[var(--brand-strong)] transition-colors hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tout télécharger ({ready.length} fichiers, .zip)
          </button>
        )}

        {busy && (
          <span className="text-xs text-slate-500" role="status">
            {busy.label}
            {busy.total > 1 && ` — ${busy.done} / ${busy.total}`}…
          </span>
        )}
      </div>

      {failure && (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
          L’export a échoué : {failure}
        </p>
      )}
    </div>
  )
}
