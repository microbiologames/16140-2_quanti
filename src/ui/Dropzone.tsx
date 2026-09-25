import { useCallback, useRef, useState } from 'react'
import { useAppStore } from '@/state/store'

const ACCEPTED = '.xlsx,.xlsm,.csv,.tsv,.txt'

export function Dropzone() {
  const addFiles = useAppStore((state) => state.addFiles)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setDragging(false)
      const files = Array.from(event.dataTransfer.files)
      if (files.length > 0) addFiles(files)
    },
    [addFiles],
  )

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        dragging
          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
          : 'border-slate-300 dark:border-slate-700'
      }`}
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Glisser un ou plusieurs fichiers de données ici
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        Choisir des fichiers
      </button>
      <p className="mt-3 text-xs text-slate-500">Formats acceptés : {ACCEPTED}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) addFiles(files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
