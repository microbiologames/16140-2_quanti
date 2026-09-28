import { LOCALES, type Locale } from '@/core/i18n'
import { useAppStore } from '@/state/store'

/**
 * Langue des résultats : intitulés des tableaux, titres et légendes des figures,
 * contenu du classeur exporté.
 *
 * Ce qui vient du fichier d'entrée — noms de catégories, de types et de produits —
 * n'est pas traduit : ce sont les données de l'utilisateur.
 */
export function LocaleToggle() {
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)

  return (
    <div
      role="radiogroup"
      aria-label="Langue des résultats"
      className="inline-flex rounded-lg border border-slate-300 p-0.5 text-xs dark:border-slate-700"
    >
      {LOCALES.map((candidate) => (
        <button
          key={candidate.id}
          type="button"
          role="radio"
          aria-checked={locale === candidate.id}
          title={`Résultats en ${candidate.label.toLowerCase()}`}
          onClick={() => setLocale(candidate.id as Locale)}
          className={`rounded-md px-2 py-1 transition-colors ${
            locale === candidate.id
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
