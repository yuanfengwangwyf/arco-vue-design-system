import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { compileDemos } from './scripts/compile-demos.mjs';
import { paletteAssets } from './scripts/palette-assets.mjs';

const root = new URL('./', import.meta.url);

export default defineConfig(({ mode }) => {
  compileDemos(root);
  const offline = mode === 'offline';
  return {
    base: offline ? './' : '/',
    define: offline ? { 'process.env.NODE_ENV': JSON.stringify('production') } : undefined,
    build: offline ? {
      outDir: 'offline',
      lib: {
        entry: 'demo/main.js',
        name: 'ArcoDocs',
        formats: ['iife'],
        fileName: () => 'arco-docs.js',
        cssFileName: 'styles',
      },
      minify: 'esbuild',
    } : undefined,
    resolve: { alias: [{ find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' }] },
    plugins: [
      paletteAssets(root),
      vue(),
      {
        name: 'arco-doc-examples',
        configureServer(server) {
          server.watcher.on('change', path => {
            if (/[\\/](?:basic|page)[\\/].+\.html$/.test(path)) compileDemos(root);
          });
        },
      },
    ],
    server: { host: '127.0.0.1' },
  };
});

