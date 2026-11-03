import './ui/tokens.css';
import './ui/store';
import { createRouter } from './ui/router';

// W4-C1 入口接线：挂载 hash 路由（14 页注册表见 src/ui/router.ts）。
// W4-C5 E2 集成：入口挂 store 单例，保证任意页派发 lathcalc:save 都有监听
//（不必先访问过 p14 才生效）。
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const router = createRouter({ root: app });
  void router.start();
}
