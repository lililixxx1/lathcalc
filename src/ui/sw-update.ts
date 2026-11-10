/**
 * sw-update.ts · SW 更新即刷新（V4.12-C，用户反馈 #8「螺纹还是没有图形展示」根因修复）
 *
 * 缺陷机理（2026-11-10 取证，dist/sw.js 实读）：
 *   sw.js = NavigationRoute 绑 precache index.html + skipWaiting + clientsClaim，
 *   但页面侧无 controllerchange 监听——旧 SW 控制的设备回访首开必见旧 precache
 *   （新 SW 后台装好并接管，当前页 JS 已是旧包，不会自刷新），二次访问才更新。
 *   用户上次访问早于 v0.7.0 → 首开看到无牙型图旧版。
 *
 * 修复：页面加载时若已被某 SW 控制（wasControlled），则新 SW 接管
 * （controllerchange）当次即 reload 一次。守卫：
 *   - 首次安装（controller 由 null 变有）不刷——防装完即刷循环；
 *   - 同一页面生命周期内至多刷一次（done 标志，bfcache 恢复也保留 JS 堆内标志）；
 *   - 同页二次更新不刷，留待下次导航（可接受：下一跳必新）。
 * 诚实边界：已卡在旧 SW 的设备本次部署后仍需二次访问才见新版
 * （旧 bundle 无本监听器，物理不可救）；本修复保证今后更新首开即新。
 */

/** 可注入的最小容器面（测试用 stub；生产传 navigator.serviceWorker）。 */
export interface UpdateReloadContainer {
  readonly controller: unknown | null;
  addEventListener(type: 'controllerchange', listener: () => void): void;
}

export interface InstallUpdateReloadOptions {
  /** SW 容器；生产默认 navigator.serviceWorker（无 SW 环境传 undefined 安全返回）。 */
  container?: UpdateReloadContainer;
  /** 刷新动作；生产默认 location.reload（测试注入 spy）。 */
  reload?: () => void;
}

/**
 * 安装 controllerchange 单次自动刷新。幂等语义：每页面实例至多触发一次 reload。
 * 返回卸载函数（测试清理用；生产无需调用）。
 */
export function installUpdateReload(options: InstallUpdateReloadOptions = {}): () => void {
  const container =
    options.container ??
    (typeof navigator !== 'undefined' ? (navigator.serviceWorker as UpdateReloadContainer | undefined) : undefined);
  const reload = options.reload ?? (() => window.location.reload());
  if (!container) return () => undefined; // 无 SW 环境（http 非 localhost / 旧浏览器）：安全空操作

  const wasControlled = container.controller !== null && container.controller !== undefined;
  let done = false;

  const onControllerChange = (): void => {
    if (!wasControlled || done) return;
    done = true;
    reload();
  };

  container.addEventListener('controllerchange', onControllerChange);
  return () => {
    // 容器无 removeEventListener 面则不摘（生产 navigator.serviceWorker 有，stub 可省）
    (container as UpdateReloadContainer & { removeEventListener?: (t: string, l: () => void) => void })
      .removeEventListener?.('controllerchange', onControllerChange);
  };
}
