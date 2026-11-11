import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devDocsSync } from './scripts/devDocsSync';
export default defineConfig({
  plugins: [react(), devDocsSync()],
  base: '/AI-Friesekenniseconomie-2035/',
});
