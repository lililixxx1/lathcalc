# V4.14 · 宽窗舞台列 + 性能预算（v0.8.0）

> 用户反馈 2026-11-11（v0.7.4 线上）：「页面优化一下，页面设计的规划不算很好。
> 窗口有大有小。再优化一下性能。」标准波次（V4.4/V4.9/V4.12 三树先例）。

## 一、基线（baseline/）

`baseline-audit.mjs`（CDP 四尺寸 × 5 路由 + 冷暖启各 3 轮）：全仓零 @media、
`.rc-route/.la-page width:100%` 整页随窗拉伸（1920 窗输入行 1888px = 手机 358px 的
5.3 倍、p01 tile 940px stretch 2.41）；性能底子已好（冷 LCP 中位 80ms、暖 68ms、
domInteractive 10ms、首屏 9 资源 16385B gzip）——本轮 = 设计收口 + 可回归，非抢救。

## 二、交付（双树 + 卡 C）

| 卡 | 内容 | 证据 |
| --- | --- | --- |
| 树 A（worker-1） | `@media(min-width:560px)` 舞台列（html,body 底 `--la-well` + `#app` max-width 540 居中 + `--la-border` 1px 边线 + 侧影）+ p01 scoped 网格 `auto-fill minmax(163px)`（G0 C-01 算式：508=(540−32)、3 列 (508−18)/3=163.33→163；390 floor(367/172)=2 零回归）+ ui-stage 3 测 | V4.14-A/ |
| 树 B（worker-2） | vite `v414-module-preload-p01` 插件（closeBundle fail-fast，序前于 VitePWA）+ perf-budget 4 断言（PERF_BUDGET 环境闸门；阈值 ceil(270371×1.05)=283890B 未压缩口径重定基线，I-01） | V4.14-B/ |
| 卡 C（Lead） | §1.3 视觉收口：vision 舞台列判读 6/6 + p06 hero 判读 2/2；verify-stage 口径落地（L1）+ shot-p06-hero 工装 | runs/ + tools/ |

## 三、L1 裁决（横屏 tileCols 口径，2026-11-11）

树 A 机检 24/25，唯一 FAIL `844x390 p01 tileCols==2`：桌面仿真经典滚动条占 15px →
网格实宽 493（≠冻结算式前提 508）→ floor(502/172)=2 列，**同一 163 公式自洽**（真机
横屏 overlay 滚动条 0px → 实宽 508 → 3 列）。裁决选项 A 口径修订：断言口径 = 冻结算式
按**实测网格实宽**推导（verify-stage.mjs `expectColsOf`），163 冻结值不动、零代码改动。
原派工单「≥560 一律 3 列」系 Lead 过断言（冻结计划 §3.2 原文只写「540 列→3」）；
原 FAIL 档原样保留（V4.14-A/runs/verify-stage.json 树内版），详见 V4.14-A/README「L1 裁决」节。

## 四、勘正：计划 §1.3「p05 hero」实名 p06 hero

vision 判读发现 p05 图库态页首无 hero；grep 坐实 hero 变体消费点 = p06 详情页
（p06.ts:256 `arcCaseGraphic(id,'hero')`；缺省黄金用例渲染参数化 SVG，静态 hero 仅
兜底；p05 磁贴点击跳 p06）。§1.3 适配核查以 p06 AC05 态执行，vision 2/2 PASS。
冻结计划文本不改（G0 后冻结），本节为实名勘正记录。

## 五、验收（runs/）

- **主仓五步门禁 5×0**（bump 0.8.0 先于 build）：tsc / vitest（787 passed + 4
  skipped=未覆盖）/ build / eslint / 第五步 `PERF_BUDGET=1` perf-budget 4 断言
  （G0 C-03）；终包 index-DsdmcUIB.js。
- **verify-stage 机检 FAIL=0/30**：五尺寸（+844×390 横屏）× 6 路由（+p05）；
  ≥560 pageW=540、appLeft=(winW−542)/2 逐位（542=540+边框 2，content-box 全仓
  零 box-sizing 声明核查）、tileCols 按 L1 口径全过、390 档与 baseline 对拍 ±1px、
  bundle 对拍全一致。
- **verify-preload**：注入 PASS + sw.js precache revision **MATCH(md5)**（插件序
  先于 VitePWA 的实证）。
- **性能前后对拍（计划 §3.3）**：冷 LCP 中位 80→76ms（−4）、暖 68→72ms（+4），
  均 ≤ 基线+10ms 容差；资源数 9→9（9±1 ✓）；冷启传输 16385→17649B（+1264B =
  modulepreload 预取 p01 块 gzip，设计内交易：首访并行预载默认路由省一次串行往返）。
- **vision 三轮**：舞台列 6/6 PASS（三窗 3 列一致/键盘卡片零越界/无重叠截断）；
  p06 hero 2/2 PASS（AC05 态等比完整/列内/两档一致）。不确定项机检补强：1px 边线
  存在性 = appW 542 全 30 格；色值 = ui-stage `var(--la-well)` 断言 + 相对判读；
  ∅ 系冻结文案。探针两拍不稳即停（shot-p06-hero 直拍路径以 vision 收口，列几何有
  首拍 pageLeft=114=(768−542)/2 留证）。

## 六、G2 完整轮（plan-code-reviewer）

待审。审面：双树收获 08d89df + Lead 卡 C（verify-stage 口径改动/shot-p06-hero/
本 README）——Lead 自研部分按 TEAM_PROMPT 直入 G2 完整轮。

## 七、登记

- DEVIATIONS V4.14-01：舞台列系冻结稿无规格的新增设计（用户指令背书，全既有 token
  零新色值）。
- M-01（G0 Minor）：PROJECT-APPENDIX §A 门禁表 lint 行「暂不设」过时（v0.2 起
  eslint 已在册）——登记不修（附录为团队纪律件，本波不动）。
- DEFERRED #21/#22（ac12 孤线/ac03 灰楔）不并入本波（计划 §1.3 声明）。
