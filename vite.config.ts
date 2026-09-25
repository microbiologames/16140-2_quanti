import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// Le site est publié sur https://<user>.github.io/16140-2_quanti/ : les assets
// doivent donc être résolus depuis ce sous-chemin en production.
const base = process.env.GITHUB_ACTIONS ? '/16140-2_quanti/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
