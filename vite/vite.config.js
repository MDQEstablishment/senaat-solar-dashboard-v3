import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/senaat-solar-dashboard-v3/',
  plugins: [react({ jsxRuntime: 'automatic' })],
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: { '@': path.resolve('./src') },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/xlsx')) return 'xlsx-chunk';
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'charts-chunk';
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor';
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
});
