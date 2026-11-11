/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

// V4.12-C：构建期注入 package.json version → __APP_VERSION__
//（消费方 p01 页脚 / p14 分享长图；声明见 src/vite-env.d.ts）。
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8')) as {
  version: string;
};

// V4.14-B · 默认路由 modulepreload 预载注入（出处：WAVE-PLAN-V4.14.md §1.2.1
// + G0 I-02）。closeBundle 阶段扫 dist/assets/ 下 p01-*.js 产物名，向
// dist/index.html 的 </head> 前注入 modulepreload——首次访问（无 SW）并行预取
// 默认路由块，省一次串行往返。插件必须排 VitePWA 之前（G0 I-02：先改 index.html
// 再让 generateSW 扫描终态，防 precache revision 与注入后内容不匹配）。
const v414ModulePreloadP01 = {
  name: 'v414-module-preload-p01',
  closeBundle(): void {
    const assetsDir = fileURLToPath(new URL('./dist/assets', import.meta.url));
    const indexHtmlPath = fileURLToPath(new URL('./dist/index.html', import.meta.url));
    const p01Chunks = readdirSync(assetsDir)
      .filter((f) => /^p01-[\w-]+\.js$/.test(f))
      .sort();
    if (p01Chunks.length === 0) {
      // fail-fast（计划 §2 表行：扫不到 p01 chunk 时不静默跳过，build 门禁兜底）
      throw new Error('[v414-module-preload-p01] dist/assets 未扫到匹配 /^p01-[\\w-]+\\.js$/ 的路由块');
    }
    const picked = p01Chunks[0];
    if (picked === undefined) {
      throw new Error('[v414-module-preload-p01] p01 chunk 取值失败');
    }
    if (p01Chunks.length > 1) {
      // 多匹配时取字典序首个（构建日志可见，最终汇报如实披露）
      console.warn(
        `[v414-module-preload-p01] p01 chunk 匹配 ${p01Chunks.length} 个，取字典序首个：${picked}`,
      );
    }
    const href = `/assets/${picked}`;
    const html = readFileSync(indexHtmlPath, 'utf8');
    // 幂等：index.html 已含同 href 则跳过，不重复注入
    if (html.includes(`href="${href}"`)) {
      return;
    }
    const tag = `<link rel="modulepreload" crossorigin href="${href}">`;
    const headClose = html.lastIndexOf('</head>');
    if (headClose === -1) {
      throw new Error('[v414-module-preload-p01] dist/index.html 未找到 </head>，注入中止');
    }
    const injected = `${html.slice(0, headClose)}    ${tag}\n  ${html.slice(headClose)}`;
    writeFileSync(indexHtmlPath, injected);
  },
};

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
    // G0 I-02：预载注入插件必须先于 VitePWA（closeBundle 依插件序执行，
    // 先落终态 index.html，generateSW 再据此算 precache revision）
    v414ModulePreloadP01,
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
