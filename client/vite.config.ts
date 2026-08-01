import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      // TypeScript error မတက်စေရန် ခေတ္တ type cast လုပ်ခြင်း
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    } as any),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})