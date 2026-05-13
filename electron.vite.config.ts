import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          // Ensure default-import interop for externalized CJS deps (yahoo-finance2,
          // googleapis, etc.) — without this, `import X from 'pkg'` resolves to the
          // namespace object instead of the default export.
          interop: 'auto'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: { interop: 'auto' }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@components': resolve('src/renderer/src/components'),
        '@pages': resolve('src/renderer/src/pages'),
        '@stores': resolve('src/renderer/src/stores'),
        '@hooks': resolve('src/renderer/src/hooks')
      }
    },
    plugins: [react()]
  }
})
