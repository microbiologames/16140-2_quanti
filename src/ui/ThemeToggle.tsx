import { useEffect, useState } from 'react'

const STORAGE_KEY = 'iso16140-theme'

export type ThemeChoice = 'system' | 'light' | 'dark'

const CHOICES: { id: ThemeChoice; label: string; title: string }[] = [
  { id: 'light', label: 'Clair', title: 'Toujours en clair' },
  { id: 'system', label: 'Système', title: 'Suivre le réglage du système' },
  { id: 'dark', label: 'Sombre', title: 'Toujours en sombre' },
]

function read(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Navigation privée ou stockage bloqué : on suit le système.
  }
  return 'system'
}

/**
 * Le thème effectif est toujours écrit dans `data-theme`, y compris en mode « système ».
 * Les variantes `dark:` de Tailwind lisent cet attribut : le basculement manuel n'a donc
 * pas à lutter contre la préférence du navigateur.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(read)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = choice === 'system' ? media.matches : choice === 'dark'
      document.documentElement.dataset['theme'] = dark ? 'dark' : 'light'
    }
    apply()

    try {
      if (choice === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      // Sans persistance, le choix vaut pour la session.
    }

    // En mode « système », suivre les changements de préférence à chaud.
    if (choice !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [choice])

  return (
    <div
      role="radiogroup"
      aria-label="Thème"
      className="inline-flex rounded-lg border border-slate-300 p-0.5 text-xs dark:border-slate-700"
    >
      {CHOICES.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          role="radio"
          aria-checked={choice === candidate.id}
          title={candidate.title}
          onClick={() => setChoice(candidate.id)}
          className={`rounded-md px-2 py-1 transition-colors ${
            choice === candidate.id
              ? 'bg-[var(--brand-strong)] font-medium text-white'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          {candidate.label}
        </button>
      ))}
    </div>
  )
}
