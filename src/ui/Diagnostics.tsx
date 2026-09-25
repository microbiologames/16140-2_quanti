import type { Diagnostic, Severity } from '@/core/types'

const SEVERITY_STYLE: Record<Severity, string> = {
  error: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
  warning:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Erreur',
  warning: 'Avertissement',
  info: 'Information',
}

function describeLocation(location: Diagnostic['location']): string | null {
  if (!location) return null
  const parts = [
    location.sheet && `onglet « ${location.sheet} »`,
    location.row !== undefined && `ligne ${location.row}`,
    location.column && `colonne ${location.column}`,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export function Diagnostics({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
        Aucune anomalie relevée à la lecture.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {diagnostics.map((diagnostic, index) => {
        const location = describeLocation(diagnostic.location)
        return (
          <li
            key={index}
            className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLE[diagnostic.severity]}`}
          >
            <span className="font-medium">{SEVERITY_LABEL[diagnostic.severity]}</span>
            {location && <span className="opacity-75"> — {location}</span>}
            <p>{diagnostic.message}</p>
            {diagnostic.autoFix && (
              <p className="mt-1 text-xs opacity-75">Corrigé automatiquement : {diagnostic.autoFix}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
