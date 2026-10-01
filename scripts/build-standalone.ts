/**
 * Replie la construction `STANDALONE` en un fichier HTML unique.
 *
 * L'application ne fait aucun appel réseau : tout le calcul a lieu dans le navigateur.
 * Il ne reste donc, pour qu'elle fonctionne hors ligne, qu'à mettre le script, la
 * feuille de style et l'icône dans la page elle-même. Les polices et le logotype y
 * sont déjà, en data-URI, grâce à `assetsInlineLimit` (voir `vite.config.ts`).
 *
 *   npm run build:standalone
 */
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const SOURCE = 'dist-standalone'
const FILE_NAME = 'ISO16140-2-quanti.html'

/**
 * Une fin de balise à l'intérieur du code refermerait l'élément qui le porte.
 * Le cas se présente dès qu'une chaîne du bundle contient `</script`.
 */
const escapeClosingTags = (code: string) =>
  code.replace(/<\/(script|style)/gi, (_, tag: string) => String.raw`<\/` + tag)

/**
 * Insère du code dans la page sans que son contenu soit réinterprété.
 *
 * Passer la chaîne directement à `replace` serait un piège : `$&`, `` $\` `` et `$'`
 * y sont des séquences d'échappement, et un bundle JavaScript en contient à foison —
 * la page s'y recopierait par morceaux. Une fonction de remplacement les neutralise.
 */
function substitute(html: string, pattern: RegExp, replacement: string, what: string): string {
  const next = html.replace(pattern, () => replacement)
  if (next === html) {
    console.error(`✗ Aucune balise à remplacer pour ${what}`)
    process.exit(1)
  }
  return next
}

const dataUri = (path: string, type: string) =>
  `data:${type};base64,${readFileSync(path).toString('base64')}`

const kibibytes = (bytes: number) => `${Math.round(bytes / 1024)} kio`

const html0 = readFileSync(join(SOURCE, 'index.html'), 'utf-8')

/*
 * Le contrôle porte sur la page **avant** intégration : une fois le bundle inséré,
 * la page contient un mégaoctet de code où « src=" » apparaît en tant que chaîne, et
 * toute recherche de références externes y perdrait son sens.
 */
const references = [...html0.matchAll(/(?:src|href)="(?!data:)([^"]+)"/g)].map((match) => match[1]!)
const expected = new Set(['favicon.svg'])
for (const name of readdirSync(join(SOURCE, 'assets'))) expected.add(name)

const unexpected = references.filter((reference) => !expected.has(basename(reference)))
if (unexpected.length > 0) {
  console.error(`✗ Références externes inattendues : ${unexpected.join(', ')}`)
  console.error('  Une version hors ligne ne peut dépendre d’aucun fichier voisin.')
  process.exit(1)
}

let html = html0

for (const name of readdirSync(join(SOURCE, 'assets'))) {
  const content = escapeClosingTags(readFileSync(join(SOURCE, 'assets', name), 'utf-8'))
  const before = html

  if (name.endsWith('.css')) {
    html = substitute(
      html,
      /\s*<link[^>]+rel="stylesheet"[^>]*>/,
      `\n    <style>${content}</style>`,
      name,
    )
  } else if (name.endsWith('.js')) {
    html = substitute(
      html,
      /\s*<script[^>]+type="module"[^>]*><\/script>/,
      `\n    <script type="module">${content}</script>`,
      name,
    )
  } else {
    console.error(`✗ Ressource inattendue dans assets/ : ${name}`)
    process.exit(1)
  }

  // Le nom est haché : le retrouver dans la page signifierait qu'une référence
  // au fichier voisin a survécu.
  if (html.includes(name)) {
    console.error(`✗ Le nom ${name} subsiste dans la page : une référence n’a pas été remplacée`)
    process.exit(1)
  }
  if (html.length <= before.length) {
    console.error(`✗ L’insertion de ${name} n’a rien ajouté à la page`)
    process.exit(1)
  }
}

html = substitute(
  html,
  /href="[^"]*favicon\.svg"/,
  `href="${dataUri(join(SOURCE, 'favicon.svg'), 'image/svg+xml')}"`,
  'favicon.svg',
)

html = substitute(
  html,
  /<head>/,
  `<head>\n    <!-- ISO 16140-2 — méthodes quantitatives · version hors ligne du ` +
    `${new Date().toISOString().slice(0, 10)} · ` +
    `https://github.com/microbiologames/16140-2_quanti -->`,
  'en-tête',
)

// Ne laisser que le fichier unique : le reste induirait en erreur.
for (const entry of readdirSync(SOURCE)) rmSync(join(SOURCE, entry), { recursive: true, force: true })

const output = join(SOURCE, FILE_NAME)
writeFileSync(output, html, 'utf-8')
console.log(`✓ ${output} — ${kibibytes(statSync(output).size)}, aucune ressource externe`)
