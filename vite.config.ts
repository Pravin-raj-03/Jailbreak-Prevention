import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import checker from 'vite-plugin-checker';
// FIX: Import 'process' to provide types for process.cwd()
import process from 'process';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      // FIX: Expose environment variables to the client-side code to be used as process.env.
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY)
      },
      build: {
        lib: {
          // FIX: `__dirname` is not available in ES modules. Use `import.meta.url` to get the current directory.
          entry: resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/index.ts'),
          name: 'JailbreakPreventionSystem',
          fileName: 'jailbreak-prevention-system',
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'recharts'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              'recharts': 'recharts',
            },
          },
        },
      },
      plugins: [
        react(),
        dts({
            insertTypesEntry: true,
        }),
        checker({ typescript: true }),
      ],
      resolve: {
        alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url)),
        }
      }
    };
});
