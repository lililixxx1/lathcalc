import './ui/tokens.css';
import { createRouter } from './ui/router';

// W4-C1 入口接线：挂载 hash 路由（14 页注册表见 src/ui/router.ts）。
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const router = createRouter({ root: app });
  void router.start();
}
