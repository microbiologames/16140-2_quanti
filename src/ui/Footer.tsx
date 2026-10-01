const REPOSITORY = 'https://github.com/microbiologames/16140-2_quanti'
const OFFLINE_FILE = 'ISO16140-2-quanti.html'

/**
 * Pied de page : la date de construction, et le lien vers la copie hors ligne.
 *
 * Une copie hors ligne ne se met pas à jour toute seule. Afficher sa date est le
 * seul moyen pour l'équipe de savoir si la sienne a vieilli — d'où la mention,
 * présente dans les deux versions.
 */
export function Footer() {
  const date = new Date(__BUILD_DATE__).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <footer className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
      <span>
        Version du {date}
        {__STANDALONE__ && ' · copie hors ligne'}
      </span>

      {__STANDALONE__ ? (
        <span>
          Pour la dernière version,{' '}
          <a
            href="https://microbiologames.github.io/16140-2_quanti/"
            className="text-[var(--brand-strong)] underline underline-offset-2"
          >
            voir en ligne
          </a>
        </span>
      ) : (
        <a
          href={`${import.meta.env.BASE_URL}${OFFLINE_FILE}`}
          download={OFFLINE_FILE}
          className="text-[var(--brand-strong)] underline underline-offset-2"
        >
          Télécharger la version hors ligne (un seul fichier)
        </a>
      )}

      <a
        href={REPOSITORY}
        target="_blank"
        rel="noreferrer"
        className="ml-auto underline underline-offset-2 hover:text-slate-900 dark:hover:text-slate-100"
      >
        Code source
      </a>
    </footer>
  )
}
