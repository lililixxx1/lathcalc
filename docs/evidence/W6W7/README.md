# W6W7 证据档 · A3 v0.2 全链流 + A4 五页对拍（W7-3）

主诉：WAVE-PLAN-V2 §0 A3（30 秒链流）与 A4（改动五页截图对拍）双达成。
复核路径：本档 + 主仓 `team-prompt/ledger/`（W7-3a/W7-3b 行、DEVIATIONS V2-A4-01..12+P1/P2）。

## 目录

- `tools/verify-w7.mjs` —— 终局验收工装（Chrome headless + CDP）。段 1 a3chain：p01 →
  p02 自定义展开（d=30 P=3.5）→ p03 金值 d₂=27.727 / d₁=26.211 → p04 切 G92 单行
  `G92 X26.211 Z-30. F3.5`（lines=1，G0-B2）→ 复制程序剪贴板逐字符一致 → KND 两行
  `R50`+KND-1000T 口径注 → enable 矩阵（G76×GSK 禁用 / G92×HNC 禁用+G82 提示，
  R1/R3 落地）。段 2 a4shots：12 张截图（五页默认态 + v0.2 新态 + p07-calc 补拍）。
  - 用法：`CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe" node tools/verify-w7.mjs http://localhost:4173/ <outDir>`
    （先 `npm run build && npm run preview`；CHROME 需绝对路径——PATH 无 chrome）。
  - **管线要点**：必须 `Emulation.setDeviceMetricsOverride {390×844@2x mobile}`（W5 工装同参）；
    缺失时 Windows DPI 129% 下 `--window-size=390,844` 产出 504×748 错误视口
    （首轮实测踩坑，V2-A4-P1）。补齐后 12 张均 780×1688（=390×844@2x），与 W5 基准同规格。
- `tools/probe-a4.mjs` —— A4 裁决辅助量测（p09-f 键盘可见性 / p02 末行间距）。
  **注意**：首版 `lastKeyReachable` 存在坐标系混用（视口坐标 bottom 对比 clientHeight 高度值）
  导致误判「末行被裁 24.6px」，已勘误为 `lastKeyVisibleInBody`（对 body.getBoundingClientRect().bottom）；
  正确口径见 probe-scroll.mjs。
- `tools/probe-scroll.mjs` —— p09 修复验证：真 844 视口下 computed overflowY / scrollTo 实测。
  结论：末行 bottom 751.6 < body 底 824（余量 72px 完整可见），scrollTop=0（内容不满屏无需滚）。
- `runs/verify-w7.json` —— 工装终报（ok_all=true；A3 674ms / 预算 30s；12 shots；
  0 运行时异常 / 0 console error）。
- `runs/*.png` —— 12 张 780×1688 截图（文件名沿 W5 `-390x844` 惯例，指 CSS 视口）：
  p02-default / p02-custom-open / p04-fanuc-g76 / p04-knd-g76 / p04-g92 /
  p07-calc（补拍）/ p07-morse / p07-reverse / p09-vc / p09-f / p12-sss / p12-ssa。
- `runs/_crops/` —— 首轮 vision-reader 判定裁剪件 17 件（基于首轮 504×748 图；
  复判以 `runs/` 780×1688 为准，首轮件仅留判定过程存档）。

## A4 两轮判定记录

- **首轮（11 张 504×748，视口伪影图）**：判 3 阻塞 + 5 发现 + 3 低建议。Lead 逐项核实：
  在档豁免 4 组（W4-C2-01 / W5-A4-03 / W5-A4-10 / v0.1 W2-C5）、v0.1 遗留 2 组
  （p04 推导注释、p07 收起态）、视口伪影 2 项（V2-A4-02/08）、真缺口 1 项（p07-calc 补拍）。
- **二轮（3 张 780×1688 窄复判）**：p09-f PASS（末行余量 74px、键盘与 p09-vc 布局一致、
  vf 卡 0.2×955=191.0 自洽）；p07-calc PASS（输入/结果/分段与 design-p07 对应）；
  p02-default PASS（末行距卡底 15px 常规量级，「4px 贴边」不复现）。
- 处置明细：DEVIATIONS V2-A4-01..12（豁免/结案/有意新增）+ V2-A4-P1/P2（管线两项）。

## 顺带加固（首轮外推发现）

p09 页级 `.la-body { overflow-y: auto }`（src/ui/pages/p09.ts）：844 基准视口内容不满屏
不触发；真机矮屏（如 667px 高）f 卡态内容必超屏，全局 `overflow: hidden` 会硬裁键盘——
C3 新增 f 态设计稿未覆盖，页面级开滚兜底。修复后四门禁复跑：lint=0 / tsc=0 / 387 tests / build=0。
