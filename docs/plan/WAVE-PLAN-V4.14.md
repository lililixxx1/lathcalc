# WAVE-PLAN-V4.14 · 宽窗自适应舞台 + 性能预算（v0.8.0）

> 用户反馈 2026-11-11（v0.7.4 线上）：「页面优化一下，页面设计的规划不算很好。
> 窗口有大有小。再优化一下性能。」
> 标准波次（V4.4/V4.9/V4.12 三树先例）：Lead 计划（本件）→ G0 → worker-1 树 A +
> worker-2 树 B + Lead 卡 C → G1 → 收获集成 → A4 多窗口验收 → G2 → tag v0.8.0 →
> 重部署。

## 0. 基线（docs/evidence/V4.14/baseline/，工装 tools/baseline-audit.mjs 可复跑）

- 响应式：全仓 **0 个 @media**（grep 全 src/ui 证）；`.rc-route/.la-page
  width:100%`（components/base.ts:14, PageShell.ts:21）——窗口多宽页面就多宽。
  实测拉伸：1920 窗输入行 1888px（手机 358px 的 5.3 倍）、p01 tile 卡 940px
  （stretch=2.41）、768 窗输入 736px；四尺寸零横向溢出。
- 性能：冷启 FCP/LCP 中位 80ms（3 轮 72/80/84）、暖启 68ms（SW precache 零传输）、
  domInteractive 10ms、首屏资源 9 个 16KB（gzip 后）；全量 JS 334KB 已路由级分包
  （threads-worm 42KB 最大数据块、懒加载）。**性能底子已好，本轮交付 = 巩固 +
  可回归，不是抢救。**

## 1. 方案裁决（Lead）

### 1.1 宽窗策略：居中舞台列，不做双栏重排

- **≥560px 起启用「舞台列」**：`body` 背景切 `--la-well`（列外沉一档），`#app`
  `max-width: 540px; margin-inline: auto;` + 两侧 1px 边框 + 侧向阴影——页面内容
  在任何窗口下都是一条设计过的居中列（计算器类 PWA 桌面形态标准解，全页零
  DOM 改动、风险最低）。540 取值：390 设计基线 + 150px 呼吸（input 行 508px、
  12 卡 3 列 tile ≈163px/卡 均在组件已验证宽度带内）。**背景切换须 `html, body`
  同改**（tokens.css:48 html,body 同声明背景；只改 body 会在移动端 overscroll
  橡皮筋瞬间露出 html 的 --la-bg 色带——G0 M-03）。
- **<560px 零变化**（手机/小窗保持现状，`@media (max-width: 559.75px)` 守卫或不
  写 max 侧规则，用 min-width 正向启用）。
- **不做** ≥1024 双栏重排（表单|图两栏）——逐页 DOM 改造风险大、收益边际，
  登记为后续可选升级（v0.8.x 若用户再提桌面体验）。
- p01 tile 网格：**scoped 到 p01**（先例 p01.ts:43 V4.13 滚动 opt-in）——
  `.la-page[data-page="p01"] .la-grid2 { grid-template-columns: repeat(auto-fill,
  minmax(163px, 1fr)); }`；`.la-grid2` 类规则（Tile.ts:15）**不动**——该类与 p05
  工况图库 compact 磁贴共享（p05.ts:384），类级改动会波及 p05（G0 C-02）。
  163 推导（G0 C-01 勘正，双路径算式）：540 列内容宽 = 540−16×2 = 508px，3 列需
  (508−2×9)/3 = 163.33px → 下限取 163；390 视口内容宽 = 390−16×2 = 358px，
  floor((358+9)/(163+9)) = floor(367/172) = 2 列（实宽 174.5 ≈ 现状 175，零回归）。
- 状态栏/顶栏/HomeIndicator 均为 .la-page 子级，随列居中，无需改。

### 1.2 性能（基线巩固 + 可回归）

1. **默认路由预载**：index.html 加 `<link rel="modulepreload" href="/src/ui/pages/p01.ts">`？
   否——生产产物哈希名不可静态写。改为 **vite 配置级**：构建后注入（vitePlugin
   closeBundle 写入 dist/index.html，扫 p01-*.js 产物名写 modulepreload）——首次
   访问（无 SW）并行预取默认路由块，省一次串行往返；SW precache 后无感。
2. **性能预算回归网**（新测 `test/perf-budget.test.ts`）：断言 `dist/assets/*.js`
   总量 ≤ **预注册阈值**（G0 I-01：本计划初笔 334KB 与实测不符——树 B 实现期以
   可复现命令 `find dist/assets -name "*.js" -printf "%s
" | awk '{s+=$1} END{print s}'`
   重定基线，阈值 = ceil(实测×1.05)，命令+数值+「未压缩字节」口径入证据 README）
   + index chunk ≤ 20KB + 路由分块数 ≥ 16（防路由分包退化成单包）。**门禁序列
   增设第 5 步（G0 C-03）**：`npm run build` 之后单独复跑
   `npx vitest run test/perf-budget.test.ts --maxWorkers=2` 留证；测试 skip 分支
   （无 dist）在门禁证据中记「skip=未覆盖」，不得默认视为通过。
3. **指标可复跑**：baseline-audit.mjs 入 tools/ 正册（本轮已在），README 记
   前后对拍（期待：冷启 LCP 持平或略降、暖启不变、首屏资源数不变）。
4. 不做的事：字体子集化（系统字体栈零请求）、图片优化（SVG 内联）、虚拟列表
  （p02 表最长 15 行）——基线数据不支持投入。

### 1.3 设计收口（卡 C，Lead 直改）

- 舞台列视觉细节：列外底纹（--la-well 纯色起步，不加格纹）、列阴影
  `box-shadow: 0 0 24px rgba(0,0,0,.06)`（具体值实现期对拍）、≥560 时 body 背景与
  列背景对比复核（tokens 色板内取值，禁新色值字面量——组件层纪律）。
- p05 hero（冻结手调标注）在 540 列内的适配核查（hero 为 viewBox 等比缩放，
  预计自然适配，A4 拍证）。
- DEFERRED #21（ac12 孤线）/#22（ac03 灰楔）**不并入本波**（标签类观察项，
  与本波舞台改造正交，避免范围蔓延；仍留下波）。

## 2. 契约与改动面

| 项 | 文件 | 改动 |
| --- | --- | --- |
| 舞台断点 | src/ui/tokens.css 或 components/base.ts BASE_CSS | `@media (min-width:560px)` body 背景/#app max-width+边框+阴影（一处全局，组件零改） |
| p01 网格 | src/ui/components/Tile.ts（TileGrid CSS） | auto-fill minmax(168px,1fr) |
| 预载注入 | vite.config.ts | 自定义插件 closeBundle 钩子扫 p01-\*.js 写 modulepreload 进 dist/index.html；**插件须排 VitePWA 之前**（先改 index.html 再让 generateSW 扫描终态，防 revision 不匹配——G0 I-02）；扫不到 p01 chunk 时 fail-fast 报错不静默 |
| 预算测试 | test/perf-budget.test.ts（新） | 总量/主包/分块数三断言 |
| 台账 | team-prompt/ledger/* | DEVIATIONS（设计偏离：冻结稿无宽窗规格，舞台列系新增；用户指令背书）|

- 分工：**树 A = 1.1 全部 + 多尺寸自验机检**（工装复用 baseline-audit.mjs 改造为
  验收口径：五尺寸 pageW 断言 + tile 列数断言 + 零横向溢出回归）+ CSS 断言测；
  **树 B = 1.2 全部**（纯构建侧 + 测试，零 src 改动）；**卡 C = 1.3**（Lead 主仓
  直改，不走 G1、直入本波 G2 完整轮——TEAM_PROMPT Lead 自研不得自审）。
- 版本：0.7.4 → **0.8.0**（舞台/断点体系属布局基建，跳 minor）。

## 3. 验收

1. 四门禁 4×0（REAL_EXIT 留证 docs/evidence/V4.14/runs/；bump 先于 build）；
2. A4 多窗口验收（改造 baseline-audit 为 verify-v414）：**五尺寸**（四竖向 +
   844×390 横屏——用户原文「窗口有大有小」的横屏档，G0 I-03）× 5 代表路由——
   ≥560 时 pageW=540（列内）、tile 列数 390→2 / 540 列→3、零横向溢出、
   <560 与现状逐位一致（390 拍与 v0.7.4 基线拍对拍）；vision 判读 ≥560 三尺寸
   首页 + 一表单页（居中列观感、无拉伸）；
3. perf-budget 测试过 + 冷/暖启指标前后对拍表入 README（LCP 期待 ≤ 基线 +10ms
   容差，资源数 9±1）；
4. 回归网：784 既有测全绿 + 树 A/B 新测（A：舞台 CSS 断言/p01 网格；B：预算三断言）。

## 4. 风险

- 舞台列影响键位/滚动：footer 键盘与 HomeIndicator 在列内（.la-page 子级），
  列宽 540 下键盘 13 键变宽——视觉复核项（A4 拍键盘页 ≥560）。
- modulepreload 注入若扫不到 p01 chunk（命名变动）→ 插件 fail-fast 报错而非
  静默（build 门禁兜底）。
- tokens.css 属全局冷区（冻结件相邻）——改 body 背景走 base.ts BASE_CSS 注入
  层优先，tokens.css 能不动则不动（G0 判断）。

## 5. G0 裁决记录（2026-11-11，plan-code-reviewer）

有条件通过→三条件并入上文（C-01 网格 163 算式双路径 / C-02 scoped p01 不动共享类 /
C-03 门禁第 5 步 build 后复跑预算测）；Important 三条并入（I-01 预算阈值重定基线
+未压缩口径 / I-02 插件序在 VitePWA 前 / I-03 横屏 844×390 档）；Minor 三条
（M-01 附录 A lint 行过时登记 / M-02 卡 C 流程注已并入 §2 / M-03 html,body 同改
已并入 §1.1）。全文已修，冻结下发。
