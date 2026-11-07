# V4.9-A 证据档 · p03 螺纹牙型剖面图（A 卡，worker-1 / 树 A）

## 0. 范围与基线

- 隔离树：`<REPO>`（主仓基线 5d7a253 的 git archive + node_modules 预置，无 .git）。
- 任务：用户反馈 #6「螺母没有图形展示螺纹形状」→ p03 螺纹页加牙型轴向剖面图。
- 写范围（派工单冻结，五路径，无越界改动）：
  1. `src/core/thread-figure.ts`（新建，纯数字零 DOM 视图模型，契约 = WAVE-PLAN-V4.9 §2）
  2. `src/ui/pages/p03.ts`（修改，零几何 SVG 装配，图卡插 Eyebrow 之后、首张 ResultCard 之前）
  3. `test/thread-figure.test.ts`（新建，§3 A 卡金锚七组）
  4. `test/ui-p03.test.ts`（文末增组，既有测试零改动）
  5. `docs/evidence/V4.9-A/`（本档）
- 形值同源（V4.9-01）：d₂/d₁ 调 `core/thread.threadDimensions`；蜗杆 px/h₁/α 调
  `core/thread.wormGeometry`；图模块零牙型常数复写（tan(α/2) 由角活算，齿根偏移
  = wholeDepth − m 派生）。

## 1. 结论

- 四门禁全绿（见 §2），全量 704 测试通过（基线 686 + 新增 18），既有测试零回归。
- 金锚独立复算双盲合流：脚本终跑 **MATCH=49 FAIL=0**（首跑 8 FAIL 均为脚本侧
  转录/符号缺陷，全档披露见 `anchors/recompute-first-run.txt`）。
- 实现按 §1 V4.9-02 冻结构造链执行；与计划 §3 字面锚的两处结构性出入已按派工单
  「按公式代入实际入参独立复算、勿抄计划字面锚」处置并上报（见 §5）。

## 2. 门禁（全部在树 A 根单独整句执行；捕获模板 = 派工单原样模板）

| 门禁 | 命令原文 | 退出码 | 档 |
| --- | --- | --- | --- |
| 1 | `npx tsc --noEmit > docs/evidence/V4.9-A/runs/tsc.log 2>&1; echo "REAL_EXIT=$?" >> docs/evidence/V4.9-A/runs/tsc.log` | REAL_EXIT=0 | runs/tsc.log |
| 2 | `npx vitest run --maxWorkers=2 > docs/evidence/V4.9-A/runs/vitest.log 2>&1; echo "REAL_EXIT=$?" >> docs/evidence/V4.9-A/runs/vitest.log` | REAL_EXIT=0 | runs/vitest.log（56 files / 704 tests passed） |
| 3 | `npm run build > docs/evidence/V4.9-A/runs/build.log 2>&1; echo "REAL_EXIT=$?" >> docs/evidence/V4.9-A/runs/build.log` | REAL_EXIT=0 | runs/build.log |
| 4 | `npm run lint > docs/evidence/V4.9-A/runs/lint.log 2>&1; echo "REAL_EXIT=$?" >> docs/evidence/V4.9-A/runs/lint.log` | REAL_EXIT=0 | runs/lint.log（0 error 0 warning） |

- 档内容 = 派工单捕获模板原样产物（命令原始输出 + 末行 REAL_EXIT）；命令原文即上表，
  与档分离存放。档内机器绝对路径（正/反斜杠两形态）已 sed 替换为 `<REPO>`。
- 取证时点说明：四门禁曾首捕于测试文件注释修订前；源码定稿（含注释修订）后**全部
  重捕**，本档四份 runs/*.log 为终态代码的取证（vitest 704/704、lint 0/0）。

## 3. 测试增量（自报，待 Lead G1 核对增量与文件归属）

- `test/thread-figure.test.ts`：新增 **12** 测
  - 金锚 5：M10×1.5（60°）、Tr40×7（30°，ac=0.5）、G1/2（55°，数据行真 pitch）、
    蜗杆 m=2、sealpipe R1/2 基面；
  - 构造代数 4：60°（0.125011/0.249987，注明与 P/8、P/4 四位常数舍入差 1.1e-5/1.3e-5）、
    55°（0.166681 对称，与 P/6 差 1.4e-5）、30°（0.366025，tan15° 精确活算）、
    牙侧过 (d₂,±P/4)（中径处牙厚=槽宽=P/2，M10 像素 40.00u + 蜗杆同构断言）；
  - 校验 3：非有限 / 非正 / 缺 kind 必填字段（含非法 kind、牙型角越界 40 与非数值）。
- `test/ui-p03.test.ts`：新增 **6** 测（文末增组「p03 牙型剖面图（WAVE-PLAN-V4.9 A 卡）」，
  既有 14 测零改动）：metric 图卡存在 + 位置（Eyebrow 下一兄弟、下一兄弟为 ResultCard）
  + polyline 1 / line 4 + 五标签；Tr/pipe55/worm 关键标签文本；sealpipe 基面线
  （.rc-p03__gauge x=110.00）+「基面」；无参数无图卡。
- 合计：686 → **704**（+18），与 runs/vitest.log 实测 704 passed 一致。

## 4. 金锚独立复算留痕（双盲对拍）

- 脚本：`anchors/recompute.mjs`（node 直跑，**不 import src、不抄实现常数**——公式按
  V4.9-02 冻结式本地重写，入参取页面/数据行实际值；expected 列 = 测试断言所用字面值）。
- 终跑档：`anchors/recompute-output.txt`，判定行 **`JUDGMENT: MATCH=49 FAIL=0`**，
  REAL_EXIT=0（脚本约定：有 FAIL 退出码 1）。
- 首跑档：`anchors/recompute-first-run.txt`（MATCH=41 FAIL=8，8 FAIL 全部归因脚本侧
  ——6 个 expected 转录用教科书/手算舍入值、rootFactor 符号写反、前置崩溃一次
  wormGeom 漏 periodPx——实现与测试零改动，逐项归因表见该档）。
- 数值纪律：所有期望值附算式与来源（计划 §3 行号 / core/thread.ts 常数式），测试与
  脚本均无裸值锚。

## 5. 契约与计划偏离披露（全部为实现期披露，无 L2 事项）

1. **计划 §3 字面锚缺陷（上报项，冻结参考件只登记不修复）**：M10「d₂ 线 38.02」与
   Tr「d₂ 线 44.00」和各自牙顶/牙根值及 V4.9-02 构造链矛盾——按构造链
   y_d2 = y_d + (d−d₂)·k 应为 **72.66 / 58.29**（与计划自身牙顶 20.70/18.29、牙根
   107.30/109.71 链内自洽）。计划把 d₂ 线误置于「牙顶 + (d₂−d₁)/2·k」半距处。
   实现与测试按构造链取值；recompute.mjs 以构造链为 derived 复核合流。
2. **G1/2、sealpipe 入参取数据行真 pitch = 25.4/14 = 1.8142857…**（派工单明示，非
   计划字面 1.814）：k=41.3192（高度约束，计划字面锚 41.326 系按字面 pitch 所算）、
   x0=16.2939、横向 187.4122u、牙顶/牙底宽 12.4952u。派工单预告差 <0.03u，实测与
   字面锚差在此量级。
3. **计划宽度字面为 2 位呈现**：M10 牙顶宽 10.00u/牙底宽 20.00u、蜗杆 21.46u/17.76u、
   x0=16.29 —— 构造实得 10.0009/20.0006/21.4631/17.7558/16.2939（四位常数
   0.6495/0.6403 舍入所致，计划 §1 构造代数注记同口径）。测试/脚本按 4 位构造值
   断言（toBeCloseTo 4 位），2 位呈现与构造值一致无矛盾。
4. **蜗杆高度预算口径**：计划 k 式按 96/(d−d₁) 书写，蜗杆无 d；按计划自身锚
   （min(12.732, 21.82)，96/4.4=21.82）实现为 96/h₁（带高），与锚一致。
5. **契约 §2 逐字段核对：零增删**（ThreadFigureInput / ThreadFigureView /
   THREAD_FIGURE_VIEW / buildThreadFigure 签名与字段语义均按 §2）。实现定义的
   填空项（计划未钉死，已在代码头注声明）：
   - diameterLines 蜗杆第三条（齿根线）label = `h₁ 4.400`（值=wormGeometry.wholeDepth
     toFixed(3)，齿根线恰在距齿顶 h₁ 处；§3 锚要求 `h₁ 4.400` 标签，契约无独立字段可载）；
     齿顶线 label `齿顶 +m`、分度线 label `分度线`（V4.9-02 的 +m/分度线语义）。
   - flankMark 位置 = x0+0.1·轴期像素、牙顶线+8（计划只定「首牙左侧」），经半宽夹持
     [半宽+2, 218−半宽] 与 y∈[12,128]。
   - pitchMark.y = max(牙顶线−7, 15)（下限保证 UI 标签基线 y−3 ≥ 12）。
   - gaugeLine y1/y2 = 带上下外延 8（夹持 [6,119]，UI 标签基线 y2+8 ≤ 127）；x=110 冻结。
   - gaugeLine 入参仅 kind='thread' 生效（worm 模数制无基面语义，恒 null）。
6. **标签格式**：直径线标签 toFixed(3)（计划「值与页面显示同源 toFixed(3)」；计划示例
   `d 10` 为式样示意，实取 `d 10.000`）；P 标签与页面眉标同式（三位舍入去尾零，
   `P 1.5`/`P 1.814`）；蜗杆 px/h₁ 标签 toFixed(3)（`px 6.283`/`h₁ 4.400`，同 §3 锚）。
7. **UI 装配口径**：p03 图卡 SVG aria-hidden（数值在 ResultCard 同源可读，图作装饰），
   标签双 tspan（代号 var(--la-sub) + 值 currentColor 600，p16 先例）、α 与「基面」
   整段 sub 色（计划 §1 α 文字 sub 色）；零新 CSS 变量、零内联色值（ui-source 契约
   测试全绿）。URL 参数页无保帧需求（派工单），buildThreadFigure 直调无 catch——
   入参已过 readParams 校验 + worm 早退，构造上不可抛错。
8. **本档自披露的执行瑕疵**（已闭环，不影响交付质量）：金锚脚本首跑 8 FAIL（脚本侧，
   见 §4）；测试文件一处断言初稿错误（把右缘半牙的 p10/p11 中点当牙顶中心，改为
   「p10=中心−半宽、p11=右缘」的正确几何语义）。

## 6. 交付文件清单

| 路径 | 性质 | 要点 |
| --- | --- | --- |
| `src/core/thread-figure.ts` | 新建 313 行 | 纯数字视图模型；threadDimensions/wormGeometry 形值同源；12 点轮廓折线构造链；标注位夹持 |
| `src/ui/pages/p03.ts` | 修改 | +threadFigureSVG/threadFigureCard（零几何装配）；两分支插图卡；CSS +2 规则 |
| `test/thread-figure.test.ts` | 新建 | 12 测，期望值全部测试内公式复算 |
| `test/ui-p03.test.ts` | 文末增组 | +6 测，既有 14 测零改动 |
| `docs/evidence/V4.9-A/README.md` | 本档 | — |
| `docs/evidence/V4.9-A/runs/{tsc,vitest,build,lint}.log` | 门禁档 | 命令输出 + REAL_EXIT，路径脱敏 |
| `docs/evidence/V4.9-A/anchors/recompute.mjs` | 复算脚本 | 不 import src、不抄实现常数 |
| `docs/evidence/V4.9-A/anchors/recompute-output.txt` | 终跑档 | MATCH=49 FAIL=0，REAL_EXIT=0 |
| `docs/evidence/V4.9-A/anchors/recompute-first-run.txt` | 首跑存档 | MATCH=41 FAIL=8 全档披露 + 归因 |
