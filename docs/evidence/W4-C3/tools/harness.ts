/**
 * W4-C3 量测用最小挂载页（证据工具，不是产品入口）。
 *
 * 隔离树基线 src/main.ts 仍是骨架 stub（router 未接线，main.ts 不在本卡写范围），
 * 因此用 Vite dev server 直接加载本页，把真实 src/ui/router 挂到 #app，
 * 仅用于 390×844 布局测量与截图；不改变产品源码。
 */
import '../../../../src/ui/tokens.css';
import { createRouter } from '../../../../src/ui/router';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const router = createRouter({ root: app });
  void router.start();
}
