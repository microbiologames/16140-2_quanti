import type { JobStatus } from '@/core/types'
import { useAppStore } from '@/state/store'

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: 'en attente',
  reading: 'lecture…',
  ready: 'lu',
  failed: 'échec',
}

const STATUS_STYLE: Record<JobStatus, string> = {
  queued: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  reading: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

export function JobList() {
  const jobs = useAppStore((state) => state.jobs)
  const selectedJobId = useAppStore((state) => state.selectedJobId)
  const selectJob = useAppStore((state) => state.selectJob)
  const removeJob = useAppStore((state) => state.removeJob)

  if (jobs.length === 0) return null

  return (
    <ul className="space-y-1">
      {jobs.map((job) => (
        <li key={job.id}>
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              job.id === selectedJobId
                ? 'bg-slate-200 dark:bg-slate-800'
                : 'hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <button
              type="button"
              onClick={() => selectJob(job.id)}
              className="min-w-0 flex-1 truncate text-left"
              title={job.fileName}
            >
              {job.fileName}
            </button>
            <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS_STYLE[job.status]}`}>
              {STATUS_LABEL[job.status]}
            </span>
            <button
              type="button"
              onClick={() => removeJob(job.id)}
              aria-label={`Retirer ${job.fileName}`}
              className="text-slate-400 hover:text-rose-600"
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
