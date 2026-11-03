/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    maxWorkers: 2,
    minWorkers: 1,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '车工算 LathCalc',
        short_name: '车工算',
        description: '开源免费、完全离线的中文车工计算器',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        background_color: '#F7F5F0',
        theme_color: '#C74E0D',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2}'],
      },
    }),
  ],
});
