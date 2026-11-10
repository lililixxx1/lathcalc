/// <reference types="vite/client" />

/**
 * 构建期版本注入（V4.12-C）：vite.config.ts define 以 package.json version
 * 注入 `__APP_VERSION__`，p01 页脚 / p14 分享长图消费（消除 v0.1 硬编码陈旧）。
 */
declare const __APP_VERSION__: string;
