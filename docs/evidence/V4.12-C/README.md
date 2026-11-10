# V4.12-C · SW 更新即刷新 + 版本可见（Lead 直改卡）

> 波次 V4.12（用户反馈 2026-11-10 三问题之 #1 修复卡）。执行者：Lead（主仓直改，
> 按 TEAM_PROMPT「含 Lead 自研产出的批次不得走 G1」直接进 G2 完整轮）。

## 一、缺陷机理与修复

用户反馈「螺纹还是没有图形展示」。取证（2026-11-10，主会话）：

1. p03 牙型剖面图自 v0.7.0 在线（线上 DOM 实测 `svg viewBox="0 0 262 140"`，
   `https://lathcalc-38ps.zai.site/#/p03?family=metric&spec=M30×3.5&d=30&p=3.5`）。
2. 根因 = v0.7.1 走查已登记未修的 SW 回访陈旧缓存：`dist/sw.js` =
   `NavigationRoute(createHandlerBoundToURL("index.html"))` + `skipWaiting` +
   `clientsClaim`，但页面侧**无 controllerchange 监听**——旧 SW 控制的设备回访
   首开必见旧 precache（新 SW 后台装好接管时当前页 JS 已是旧包，不会自刷新），
   二次访问才更新。用户设备上次访问早于 v0.7.0 → 首开看到无牙型图旧版。
   `dist/registerSW.js` 全文仅 load 后 register，确无刷新逻辑（G0 复核实证）。

修复（`src/ui/sw-update.ts` 新模块，`src/main.ts` 挂载）：

- 页面加载时已被 SW 控制（wasControlled）→ 新 SW 接管（controllerchange）
  当次 `location.reload()` 一次；
- 守卫三分支：首装（controller null→有）不刷（防循环）；同页生命周期至多一次
  （done 标志，bfcache 恢复保留堆内标志）；无 SW 环境（container undefined，
  http 非 localhost / 旧浏览器）安全空操作；
- 依赖全可注入（container/reload），单测零浏览器全局。

**诚实边界**：已卡在旧 SW 的设备（含本次反馈用户）在 v0.7.3 部署后仍需
**二次访问**才见新版（旧 bundle 无本监听器，物理不可救）；本修复保证
**今后**更新首开即新。已向用户披露。

## 二、版本可见（连带 v0.1 硬编码陈旧勘正）

- `vite.config.ts`：`define: { __APP_VERSION__: JSON.stringify(pkg.version) }`
  （package.json version 注入）；声明 `src/vite-env.d.ts`（G0-B2 阻塞项落点）。
- `src/ui/pages/p01.ts` 页脚 `v0.1` → `v${__APP_VERSION__}`（线上 0.7.2 仍显
  v0.1 属陈旧硬编码——G0 遗漏点指出）；`src/ui/pages/p14.ts` 分享长图同款。
- 测试对拍同源：`test/ui-p01.test.ts` / `test/ui-p14.test.ts` import
  package.json version 构造期望串（非复制字面值）。

## 三、改动文件

| 文件 | 变更 |
| --- | --- |
| `src/ui/sw-update.ts` | 新增（installUpdateReload + 容器面 + 守卫） |
| `src/main.ts` | 挂载 installUpdateReload() |
| `src/vite-env.d.ts` | 新增（__APP_VERSION__ 声明） |
| `vite.config.ts` | define 注入（读 package.json） |
| `src/ui/pages/p01.ts` | 页脚版本动态化 |
| `src/ui/pages/p14.ts` | 分享长图页脚版本动态化 |
| `test/sw-update.test.ts` | 新增 4 测（三分支 + dispose） |
| `test/ui-p01.test.ts` / `test/ui-p14.test.ts` | 版本断言对拍同源化 |

## 四、判定行

| 门禁 | 命令 | 退出码 | 档 |
| --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | 0 | runs/tsc.txt |
| lint | `npx eslint .` | 0 | runs/eslint.txt |
| 测试 | `npx vitest run --maxWorkers=2` | 0（59 文件 736/736，含 +4 新测） | runs/vitest.txt |
| 构建 | `npm run build` | 0 | runs/build.txt |

四门禁 4×0。测试增量 = 732 → 736（sw-update 4 测；p01/p14 为改锚非增量）。

## 五、未决点

- 无未决实现项。SW 真机二次访问行为（旧设备获救路径）部署后由用户侧验证；
  本仓自动化止于单测三分支（node 环境无 SW 运行时，如实声明）。
