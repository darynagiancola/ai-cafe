import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages project site path: https://<user>.github.io/ai-cafe/
  base: command === 'build' ? '/ai-cafe/' : '/',
  plugins: [react(), tailwindcss()],
}))
