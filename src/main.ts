import './ui/tokens.css';
import './ui/store';
import { createRouter } from './ui/router';
import { installUpdateReload } from './ui/sw-update';

// W4-C1 入口接线：挂载 hash 路由（14 页注册表见 src/ui/router.ts）。
// W4-C5 E2E 集成：入口挂 store 单例，保证任意页派发 lathcalc:save 都有监听
//（不必先访问过 p14 才生效）。
// V4.12-C：SW 更新即刷新——旧 SW 控制的回访页在新 SW 接管（controllerchange）
// 当次 reload，消除「二次访问才更新」（模块头注见 sw-update.ts 机理与守卫）。
installUpdateReload();

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const router = createRouter({ root: app });
  void router.start();
}
