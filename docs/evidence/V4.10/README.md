# V4.10 证据档 · v0.7.1 UI 审计三 WARN 修复（反馈小修波，Lead 直改）

上游：`docs/evidence/UI-AUDIT-2026-11-08/README.md` 终表 3 条 WARN（用户裁决「修」）。
范围外不动：p04 分享（任务书笔误已排除）、Eyebrow uppercase（设计 token）、托管水印。

## 一、修复清单（7 文件 +136/−6）

| # | 页面 | 修前 | 修法 | 文件 |
| --- | --- | --- | --- | --- |
| 1 | p16 挂轮 | 「可用齿数」长串右缘硬截断无提示（残字紧邻单位「齿」） | 溢出时（scrollWidth>clientWidth，input 事件 + 挂载后初判驱动）输入区右缘 26px 渐隐蒙层（`::after`，混入 `--la-card`；右端 67px = padding13+单位46+gap8 恰齐输入区右缘）；不溢出自动摘除 | p16.ts |
| 2 | p12 三角 | 默认 30/40/50 案底边顶点标签净空 0.11/1.82u ≈ 1–2px@2x 紧贴底边 | `triangle-figure.ts` VERTEX_OFFSET 13→17（向下分量 = offset·sin(θ/2)，字顶净空 = offset·sin(θ/2)+4−8）；A 1.38u / B 3.60u，C 钳位吸收 y=9 不变 | triangle-figure.ts |
| 3 | p02 选型 | 七族页签横滚无指示纹（第 6/7 族需横滑） | 外包不滚动 `segwrap` 承载左右 22px 渐隐蒙层（混入 `--la-bg` 页底）；`--r/--l` 由滚动位置挂摘（右滚到头摘 --r、回滚挂 --l、无溢出双摘）；seg 持久 DOM 监听挂一次 | p02.ts |

新增测试 3：triangle V4.10 净空金锚（基线 97.3759/99.6026 公式复算）+ ui-p02/ui-p16
伪布局（Object.defineProperty 覆写 scrollWidth/clientWidth/scrollLeft）驱动挂摘逻辑。

## 二、四门禁（bump 0.7.1 先于跑门禁，V4.7-M2 时序；留证为 G2 整改后终态重捕）

| 门禁 | 结果 | 留证 |
| --- | --- | --- |
| tsc --noEmit | 0 | runs/gate-tsc.txt |
| vitest run | **729/729**（58 文件，726+3） | runs/gate-vitest.txt |
| build | 0，dist `index-B3coWjyJ.js` | runs/gate-build.txt |
| lint | 0 | runs/gate-lint.txt |

均含 REAL_EXIT=0，路径脱敏 `<REPO>`。

## 三、A4 机检复验（IAB 390×844，本地 preview index-B3coWjyJ.js 与 dist 一致）

> 端口归属：4173 系前次会话遗留 preview 进程（本轮新起落在 4174）；vite preview
> 按磁盘现态伺服 dist，curl 与页面 `script[src]` 双重核验 4173 伺服
> `index-B3coWjyJ.js` = dist 一致，机检证据有效。

| 项 | 结果 |
| --- | --- |
| p02 默认态 | 7 签全在；seg 溢出真实（scrollWidth 456 > clientWidth 358）；wrap 类 `--r` 已挂；docOverflowX=0 |
| p02 滚到头 | scrollLeft 98.4（满程，经 focus() 真实滚动通道）→ 首签 rect.x=−79.4 滚出屏外、蜗签 rect 326–371 可见；dispatchEvent 驱动同款监听器 → 仅 `--l`；回 0 → 仅 `--r`（挂摘对称） |
| p12 默认态 | 标签 A y=97.38 / B y=99.60 / C y=9（DOM 属性实测 = 推导值）；三角 svg 渲染 336.8px 宽 scale=1.531 → 净空 A 4.2px@2x / B 11.0px@2x（≥3px 口径）；docOverflowX=0 |
| p16 默认态 | 默认 17 枚齿数（68 字符）scrollWidth 398 > clientWidth 189 → `--clip` 挂载初判即挂；改短串 `20 40 60 80`（189=189）→ `--clip` 摘除；docOverflowX=0 |

实拍四帧：runs/{p02-default, p02-scrolled, p12-default, p16-default}.png（1x 分辨率
390×844；判读按最不利口径 ×2 折算 @2x 判据）。

vision 复判（第一轮，2026-11-08）：p02-default / p12-default / p16-default 三拍
**PASS**（p12 净空实测 A·c 2px@1x≈4px@2x、B 3px@1x≈6px@2x 均 ≥3px 口径，无叠压
无穿越；p02 右缘 22px 渐隐平滑单调、左缘按滚动位正确摘除；p16 渐隐覆盖截断尾部、
框内背景纯白无色差、「齿」完整可读；三拍均无本轮引入的新缺陷）。p02-scrolled
首轮判 **FAIL（采集缺陷）**：与 default 帧字节级相同（MD5 一致，判读员独立发现）
——程序性 scrollLeft 在 IAB 改 DOM 属性但不合成像素滚动。重采：focus() 触发布局
引擎真实滚动（像素滚动以 rect.x=−79.4 机检证实）+ dispatchEvent 同步指示纹，
   新帧 MD5 84e9a1e7 ≠ default d2144726。重采帧复判 **PASS**：① 左缘渐隐出现
   （x≈12→38 渐变带，剖面两行一致排除圆角干扰；「Tr」被侵蚀变浅、滚出签无残影）；
   ② 右缘渐隐消失（x330→370 零梯度恒定药丸底色）；③ 「锥管 NPT」「蜗杆」完整
   锐利可读；④ 列表/chips/页脚无异常且未随横滚切换——与 DOM 取证互证一致。
   **四拍终态全 PASS（0 WARN 0 FAIL）。**

## 四、执行期披露

1. **IAB Service Worker 陈旧缓存（工具侧坑，非产品缺陷）**：preview 页签首载跑的是
   旧包 `index-C2xqFmSO.js`（V4.9 A4 期在 localhost:4173 源注册的 workbox
   precache 拦截了新 index.html 的资产请求，而 index.html 本身是新包引用）。
   处置：注销 SW + 删 `workbox-precache-v2-http://localhost:4173/` 后 reload，
   页面跑 `index-B3coWjyJ.js` 与 dist 一致。教训入 DEVIATIONS：localhost 源的
   A4 复验前先查 `navigator.serviceWorker.getRegistrations()`。
2. **IAB 滚动通道三层失真（工具侧，产品逻辑无洞）**：① 程序性 `scrollLeft` 赋值
   改 DOM 属性但**不合成像素滚动**（首轮 p02-scrolled 与 default 帧字节级相同，
   vision 复判独立发现后废弃）；② IAB 内**原生 scroll 事件对非手势滚动不派发**
   （focus() 真实滚动后事件计数仍 0，指示纹未随动）——复验以 dispatchEvent 驱动
   同款监听器代码取证，挂摘逻辑单测 + 机检双证；真实设备手势由合成器路径派发
   事件（浏览器保证）；③ `focus()` 默认 scrollIntoView 是有效像素滚动通道
   （rect.x=−79.4 机检证实），本轮滚动帧即循此重采。cua.scroll 合成器手势通道
   本轮两次 30s 卡死超时（审核期已知间歇病），弃用。
3. **旋转场景已知局限（登记不修）**：p02 渐隐类仅在挂载初判 + scroll 事件刷新，
   横屏旋转后溢出态若变化、且用户未再滑动，指示纹可能滞后一拍（手机 PWA 竖屏
   主用，影响可忽略）。

## 五、G2 快审（plan-code-reviewer，2026-11-08）

裁决 **PASS（✅ 可合并，0 Critical / 0 Important / 2 注释级 Minor）**：
- 四门禁独立复跑全绿（729/729、lint 0、确定性构建哈希 `index-B3coWjyJ.js` 一致）；
- VERTEX_OFFSET 17 几何第一性重推（不 import 项目模块）：修前 A/B 净空 0.1110/1.8138u、
  修后 97.3759/99.6026、C 与高瘦/扁宽未钳值全对；67px/22px 蒙层推导、CSS 三契约、
  挂摘边界（阈值 2px 抗亚像素、happy-dom 双 0 双摘）、segwrap 兼容性逐项通过；
  纪律核查（冻结三件干净 / team-prompt 与 .zcode-site.json 不入库 / 期望值附算式）通过。

整改处置（本波顺手清，终态门禁 4×0 重捕）：
- Minor-A：扁宽注释分量 0.9496→0.9500、A 未钳 y 108.14→108.15（旧锚 104.350
  = 88+13×0.9500+4 反证精度口径）；
- Minor-B：「B ≈10.9px@2x」→11.0px（3.6026×1.5309×2=11.03）。
- 说明项不动作：Firefox 桌面对 input scrollWidth 的历史行为差异（纯视觉退化、
  目标平台移动 PWA）。

## 六、目录索引

- `runs/`：四门禁（终态）+ 四帧实拍 PNG。
- 上游审计：`docs/evidence/UI-AUDIT-2026-11-08/`（18 页 27 拍，3 WARN 终表）。
