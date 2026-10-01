import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Deux cibles de construction.
 *
 * Par défaut, le site publié sur https://<user>.github.io/16140-2_quanti/ : les
 * ressources sont résolues depuis ce sous-chemin et servies en fichiers séparés,
 * pour que le navigateur les mette en cache.
 *
 * En mode `STANDALONE`, une version destinée à tenir dans un fichier unique :
 * chemins relatifs, un seul module JavaScript, et toutes les ressources intégrées
 * en base64. `scripts/build-standalone.ts` replie ensuite le tout dans l'HTML.
 */
const standalone = Boolean(process.env.STANDALONE)
const base = standalone ? './' : process.env.GITHUB_ACTIONS ? '/16140-2_quanti/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  define: {
    // Une copie hors ligne ne se met pas à jour toute seule : elle affiche sa date.
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    __STANDALONE__: JSON.stringify(standalone),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: standalone ? 'dist-standalone' : 'dist',
    // Sans limite, polices et logotype deviennent des data-URI au lieu de fichiers.
    assetsInlineLimit: standalone ? Number.POSITIVE_INFINITY : 4096,
    ...(standalone
      ? {
          // ExcelJS est chargé à la demande : dans un fichier unique il n'y a pas de
          // second fichier à aller chercher, tout doit tenir dans le même module.
          rolldownOptions: { output: { codeSplitting: false } },
          chunkSizeWarningLimit: 4096,
        }
      : {}),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
