
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      build: {
        lib: {
          // FIX: `__dirname` is not available in ES modules. Use `import.meta.url` to get the current directory.
          entry: resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/index.ts'),
          name: 'JailbreakPreventionSystem',
          fileName: 'jailbreak-prevention-system',
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
          },
        },
      },
      plugins: [
        react(),
        dts({
            insertTypesEntry: true,
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url)),
        }
      }
    };
});
