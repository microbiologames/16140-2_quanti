import { create } from 'zustand'
import { analyse } from '@/core/analysis'
import { buildDataset } from '@/core/dataset'
import { readWorkbook } from '@/io/readWorkbook'
import type { Job } from '@/core/types'

interface AppState {
  jobs: Job[]
  selectedJobId: string | null
  addFiles: (files: File[]) => void
  selectJob: (id: string) => void
  removeJob: (id: string) => void
  clear: () => void
}

let nextId = 0

export const useAppStore = create<AppState>((set) => ({
  jobs: [],
  selectedJobId: null,

  addFiles: (files) => {
    const jobs: Job[] = files.map((file) => ({
      id: `job-${++nextId}`,
      fileName: file.name,
      sizeBytes: file.size,
      status: 'queued',
    }))

    set((state) => ({
      jobs: [...state.jobs, ...jobs],
      selectedJobId: state.selectedJobId ?? jobs[0]?.id ?? null,
    }))

    // Les fichiers sont lus en parallèle : c'est tout l'intérêt du traitement par lot.
    files.forEach((file, index) => {
      const id = jobs[index]!.id
      patch(set, id, { status: 'reading' })
      readWorkbook(file)
        .then((workbook) => {
          patch(set, id, { status: 'analysing', workbook })
          const analysis = analyse(buildDataset(workbook))
          patch(set, id, { status: 'ready', analysis })
        })
        .catch((cause: unknown) =>
          patch(set, id, {
            status: 'failed',
            error: cause instanceof Error ? cause.message : String(cause),
          }),
        )
    })
  },

  selectJob: (id) => set({ selectedJobId: id }),

  removeJob: (id) =>
    set((state) => {
      const jobs = state.jobs.filter((job) => job.id !== id)
      return {
        jobs,
        selectedJobId: state.selectedJobId === id ? (jobs[0]?.id ?? null) : state.selectedJobId,
      }
    }),

  clear: () => set({ jobs: [], selectedJobId: null }),
}))

type SetState = (updater: (state: AppState) => Partial<AppState>) => void

function patch(set: SetState, id: string, changes: Partial<Job>) {
  set((state) => ({
    jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...changes } : job)),
  }))
}

/** Sélecteur : le job actuellement affiché. */
export function useSelectedJob(): Job | undefined {
  return useAppStore((state) => state.jobs.find((job) => job.id === state.selectedJobId))
}
