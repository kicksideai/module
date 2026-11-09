import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { wippyComponentPlugin } from '@wippy-fe/vite-plugin'
import { defineConfig } from 'vite'

const moduleRoot = fileURLToPath(new URL('.', import.meta.url))

// Every document a component loads in serves the complete Host import map: the
// top document (auto-registered elements) and the shell frame (surfaces). Its
// pinned keys stay external so the bundle never ships its own copy (a bundled copy
// both bloats the artifact and breaks on `process.env` references in library
// code). Refresh the snapshot when the Host release changes.
const hostImportMap = JSON.parse(readFileSync(resolve(moduleRoot, 'web-host.import-map.snapshot.json'), 'utf8')) as { imports: Record<string, string> }

// The Host requests an entry with a ?declare-tag= query. A lazy chunk that imports the
// entry back has no query, so it would load a second copy of the wrapper. Keeping the
// wrapper in its own chunk leaves the entry with nothing a lazy chunk needs.
const wcRuntimeChunk = (id: string) => (id.includes('/@wippy-fe/webcomponent-') ? 'wc-runtime' : undefined)

export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (t) => t.startsWith('wc-') } } }), wippyComponentPlugin()],
  // Lib builds don't auto-replace process.env; provide it so deps that read
  // NODE_ENV don't throw "process is not defined" in the browser/shadow DOM.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(moduleRoot, 'src/index.ts'),
      name: 'AcmeStarter',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      input: { index: resolve(moduleRoot, 'src/index.ts') },
      external: Object.keys(hostImportMap.imports),
      output: {
        manualChunks: wcRuntimeChunk,
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
      },
      preserveEntrySignatures: 'strict',
    },
    sourcemap: true,
  },
})
