import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'backend/src/cli/main.ts',
    target: 'node22',
    outDir: 'dist-cli',
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'simulador.mjs' },
    },
  },
});
