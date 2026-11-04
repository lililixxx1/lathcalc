# WAVE-PLAN-V3 · 车工算 LathCalc v0.2.1 数据扩张包（里程碑 M3）

> 冻结于 2026-11-04。v0.2.0（W6–W7 + G3 通过，HEAD eaa8d78）之上的数据扩张波。
> 前计划：`WAVE-PLAN.md`（v0.1 W1–W5）、`WAVE-PLAN-V2.md`（v0.2.0 W6–W7）——纪律条款全部继续有效。
> 用户裁决沿袭：V2-1（数据扩张挪 v0.2.1=本包）为本包立项依据；范围=DEFERRED 未结项 #2/#12/#14/#15/#16/#17
> + V2 遗留 Tr 大螺距 12 行（COVERAGE.md:22 在册）。**无新增用户裁决项**（不砍功能/不改里程碑/
> 无新依赖/不破坏兼容，全部冻结计划内）。

## 0. 范围与验收基线

### 范围（6 卡 + 收口）

| # | 功能 | 落点 | DEFERRED |
| --- | --- | --- | --- |
| G1 | **螺纹三族**：密封管 R/Rc/Rp（GB/T 7306，55° 1:16 锥）+ 锥管 NPT（GB/T 12716，60° 1:16 锥）+ 蜗杆（GB/T 10088 模数制，ZA 40°）+ **Tr 大螺距 12 行**补全 | data 新三表 + threads-trapezoid 扩 + p02 七族页签 + p03 随族公式 | #2 |
| G2 | **core 牙型角常数集导出**（消 p03 双写，p03.ts:168-172 与 core/thread.ts 同数异处） | core/thread.ts PROFILE_CONSTANTS + p03 引用 | #15 |
| G3 | **GSK 型号细分**：GSK×G76 解灰——988TA（mm 小数）/980TDc（0.0001mm 增量 №.182.7）两口径，型号选择器 | core/gcode g76Dialect 第三参 + p04 | #16 |
| G4 | **HNC G82 单循环**：HNC×直进循环解灰（G92 语义=工件坐标系设定 → 生成 G82） | core/gcode g92Cycle 扩 system + p04 | #17 |
| G5 | **常用配合实算**：基本偏差表（轴 g/k/p）+ H7/g6·k6·p6 三配合实算 | data 新表 + core/tolerance fitTolerance + p08 chips 激活 | #12 |
| G6 | **p13 速查填充**：钻头页签（M 系列攻丝底孔）+ 硬度页签（GB/T 1172 精简对照） | data 新两表 + p13 drill/hardness 页签渲染 | #14 |
| — | 收口：版本 0.2.1 + README + A1–A4 + G3-v0.2.1 | 工程 | — |

**不在本包**：蜗杆三针测量（40° 量针常数无已核双源，宁缺毋滥——p03 蜗杆态不显示三针行，登记偏差）；
蜗杆分度圆/导程角计算（q 值由设计给定，非查表事务）；基本偏差全字母表（仅 g/k/p 三带，全表后续波）；
p13 螺纹/莫氏页签（有意引导空态，W4-C5 冻结，不改）。

### 验收基线 A1–A4（W9 收口全跑；A1 每提交）

- **A1 四门禁**：lint=0 / tsc=0 / vitest 全绿 / build ✓（W7 起四门禁不变）。
- **A2 黄金用例**：§4 锚点全部入 vitest，逐字符对拍。
- **A3 链流**（30 秒预算，实走 DOM，工装沿用 W6W7/tools/verify-w7.mjs 扩展——**Emulation
  390×844@2x 必须保留**，V2-A4-P1 教训）：p02 切「密封管 R」页签选 R1/16 行 → p03 断言基面值 →
  回 p02 切「蜗杆」选 m=2 → p03 断言 px=6.283 → p04 切 GSK 选 988TA 断言两行 mm 小数格式 →
  切 980TDc 断言增量格式 → HNC 切直进循环断言 G82 单行 → p08 Ø30 点 H7/g6 断言间隙 7~41μm
  （表值双源核对后以派工单冻结值为准）。
- **A4 对拍**：改动五页（p02/p03/p04/p08/p13）390×844 截图 vision-reader 判定，差异登记 V3-A4-xx；
  豁免清单随单下发（**含 V2-A4 全部已裁决项**，V2-A4-01 教训：漏列=误报）。

## 1. 契约扩展面（Lead 派工前预置：签名 + panic 桩，worker 只填实现）

冻结于 `src/core/types.ts`（预置提交入主仓后建树；**types.ts 全程卡内禁改**）：

```ts
// thread.ts —— threadDimensions 保留不动（v0.1/v0.2 契约零破坏）；新增：
export type ThreadFamily = 'metric' | 'trapezoid' | 'pipe55' | 'unified' | 'sealpipe' | 'npt' | 'worm';
// flankAngleFor 扩：sealpipe→55、npt→60、worm→40（GB/T 10087 ZA 牙型角）。
// 锥管族（sealpipe/npt）d₂/d₁ 走既有 55°/60° 常数活算，语义=「基准平面处直径」（GB/T 7306/12716），
// p03 展示加「基准平面」标注行；底孔=基面小径（d−1.2806P / d−1.0825P）。

export interface WormGeometry { axialPitch: number; wholeDepth: number; flankAngle: 40; }
export type WormGeometryFn = (moduleMM: number) => WormGeometry;
// px=π·m（活算单一真源）；全齿高 h₁=2.2·m（GB/T 10087 基本牙型）。m≤0 或非数抛错。
// 蜗杆不走 threadDimensions/threeWireM（模数制，见 §0 不在本包）。

// gcode.ts —— fanucG76/g76Dialect/g92Cycle 现签名保留（默认参）；扩展：
export type GskModel = '988ta' | '980tdc';
export type G76DialectFn = (p: G76Params, system: CncSystem, gskModel?: GskModel) => G76Program;
// system='gsk' 必带 gskModel：缺省 throw「GSK 需先选型号（988TA mm / 980TDc 增量）」——防静默误解（V2-4 精神）。
// 988TA 行格式（g76-dialects.md §1 行1，mm 半径小数）：
//   `G76 P021060 Q0.1 R0.05` / `G76 X26.211 Z-30. P1.894 Q0.4 F3.5`（P/Q 为 mm 值非 μm 整数）
// 980TDc（№.182.7=0.0001mm 增量，R 保持 mm）：
//   `G76 P021060 Q1000 R0.05` / `G76 X26.211 Z-30. P18944 Q4000 F3.5`（0.1→1000；1.894375→P18944；0.4→4000）
export type G92CycleFn = (p: G76Params, system?: CncSystem) => G76Program;
// system='hnc' → G82 单行（g76-dialects.md §1 行4 脚注冻结模板）：
//   `G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5`（I 锥度半径差/R·E 退尾/C 头数/P 起始角，直螺纹模板值）
// 其余/缺省 = 现 FANUC 格式不变（向后兼容，v0.2 既有测试零改）。

// tolerance.ts —— toleranceCompose 保留不动；新增：
export interface FitInput { nominal: number; shaftBand: 'g6' | 'k6' | 'p6'; }   // 孔恒 H7（基孔制）
export interface FitResult {
  hole: { lowerUM: number; upperUM: number };      // H7：EI=0，ES=+IT7（μm，未舍入路径）
  shaft: { upperUM: number; lowerUM: number };     // 基本偏差端=表值（g:es / k,p:ei），另一端=±IT6
  fitType: 'clearance' | 'transition' | 'interference';
  minUM: number; maxUM: number;                    // 间隙为正/过盈为负（Xmin=EI−es，Xmax=ES−ei）
}
export type FitToleranceFn = (input: FitInput) => FitResult;
// **基本偏差端别（GB/T 1800.1：a–h 基本偏差=上偏差 es；k–zc=下偏差 ei）**：
//   g6：es=表值（负），ei=es−IT6；k6/p6：ei=表值（正），es=ei+IT6。
// fitType 判定：Xmin≥0 且 Xmax≥0=clearance；Xmin<0<Xmax=transition；Xmax≤0=interference。
// 数据缺段/尺寸越界抛错（不臆造）。

// data 契约：fundamental-deviations.json = { source: string; bands: Array<
//   { band: '>18–30'（GB/T 1800.1 分段，左开右闭，与 tolerance-it.json 同口径）;
//     g: number; k: number; p: number }> }
// 存轴基本偏差（μm 带号）：g 列=es（负），k/p 列=ei（微正/正）——**端别按 GB/T 1800.1 定义，非统一 es**
// （计划冻结前 WebSearch 双源核对：ISO 286-1 同构表 >18–30 段 g es=−7 / k ei=+2 / p ei=+22）。
// 逐值双源录入（GB/T 1800.1 轴基本偏差表 g/k/p 三列 × 全尺寸段 ≤3…>500）。
```

UI 契约（链路键；各卡证据档登记，Lead W9 波末并入 ui/README §5.2，同 V2 先例）：
- p02 页签扩七：`普通 M / 梯形 Tr / 55° 管 / 美制 UN / 密封管 R / 锥管 NPT / 蜗杆`——la-seg 加
  `overflow-x: auto`（390px 容纳不下七签；设计稿未覆盖新族=V2 先例 p07 反推同性质，组件内适配）。
  路由 family 键：`sealpipe` / `npt` / `worm`（README §5.2 现口径 `pipe` 非 `pipe55` 的教训：键=表值 family）。
- p04：GSK+G76 下增「型号」Segmented（988TA mm / 980TDc 增量№.182.7），URL 键 `gskmodel`；
  HNC+直进循环不再置灰，代码卡出 G82，G82_ROW_NOTE=`G82 为单循环行，完整螺纹需后续 X 递减分刀`。
- p08：三 chips（H7/g6·k6·p6）激活可点 → 配合结果卡（孔/轴极限偏差 μm + 间隙/过盈 min–max + 类别）。
- p13：drill/hardness 页签渲染数据表（复用 gcode 页签交互惯例：点按复制）。

## 2. 波次拆解

### W8 数据波（4 卡全并行；路径互斥已核）

| 卡 | 内容 | 写范围 | 依赖 |
| --- | --- | --- | --- |
| W8-A | 三族数据+Tr 12 行（G1）+ PROFILE_CONSTANTS 导出与 p03 引用（G2） | src/data/threads-sealpipe.json（新）, threads-npt.json（新）, threads-worm.json（新）, threads-trapezoid.json（扩 12 行）, src/core/thread.ts, src/ui/pages/p02.ts, p03.ts, test/（本卡测试文件）, PROVENANCE/COVERAGE | — |
| W8-B | GSK 型号 + HNC G82（G3+G4） | src/core/gcode.ts, src/ui/pages/p04.ts, test/gcode.test.ts, test/ui-p04.test.ts | — |
| W8-C | 基本偏差 + p08 配合实算（G5） | src/data/fundamental-deviations.json（新）, src/core/tolerance.ts, src/ui/pages/p08.ts, test/（本卡测试文件）, PROVENANCE | — |
| W8-D | p13 钻头/硬度填充（G6） | src/data/drill-tap.json（新）, hardness-conv.json（新）, src/ui/pages/p13.ts, test/（本卡测试文件）, PROVENANCE | — |

互斥注记：A 写 core/thread.ts、B 写 core/gcode.ts、C 写 core/tolerance.ts——core 三文件分卡单写；
types.ts 由 Lead 预置冻结；测试文件按卡钉清单（A: thread 新用例+ui-p02/p03 既有；B: gcode.test.ts+
ui-p04.test.ts 既有；C: tolerance 新用例+ui-p08 既有；D: ui-p13 既有+data 新用例）。

### W9 收口波（Lead 自研，产出直进 G2/G3）

版本 0.2.1；README 功能表/数据精度说明更新（七族口径、GSK 型号口径、G82 语义、配合实算、
p13 填充）；A1–A4 全跑 + 证据档 `docs/evidence/W8W9/`（工装复制 W6W7 版扩链流断言，
**Emulation 参数原样保留**）；ui/README §5.2 并入；**G3-v0.2.1 终局审**。

## 3. 裁决记录（本包无新用户裁决；Lead 裁决如下）

- **V3-1（Lead）锥管口径**：R/NPT 的 d₂/d₁=基准平面处直径，底孔=基面小径；p03 加「基准平面」
  标注行。依据 GB/T 7306/12716 基面距离定义（报告:170「NPT 是 1:16 锥」同源）。
- **V3-2（Lead）蜗杆=查表+几何活算**：表列 m（GB/T 10088 标准模数）→ px=π·m、h=2.2·m 活算展示；
  不做三针/分度圆/导程角（§0 不在本包）。牙型角 40°（ZA，GB/T 10087）。
- **V3-3（Lead）GSK 双口径全解灰**：g76-dialects.md §1 行1 两代手册格式与示例双源齐（[1][2]），
  keep-gray 理由「未限定型号」由型号选择器消除；988TA=mm 小数、980TDc=0.0001 增量（№.182.7），
  R 位两型号均保持 mm。缺 gskModel 调用即 throw（防静默）。
- **V3-4（Lead）HNC G82 落位**：循环形式「G92 直进循环」在 HNC 下生成 G82（R3 置灰解除），
  形式名保持「直进循环」文案不变（G92/G82 仅为系统方言差异）；金值模板取 §1 行4 脚注
  （HNC-8 手册+21ic 双源）。p04 提示语由「请用 G82」改为生成的 G82 代码卡+首行注。
- **V3-5（Lead）配合实算=结构式+双源表值**：ei=es−IT6 / Xmin=EI−es / Xmax=ES−ei 由 core 活算；
  es 表值（g/k/p × 全尺寸段）worker 双源录入并在测试中与 GB/T 1800.1 原表逐值对拍锚点 ≥3 段。
- **V3-6（Lead）硬度表单源披露**：GB/T 1172 为唯一原表（转引无独立第二源），按原表精简录入
  （HRC 20–65 段，HB/HV 对应值），PROVENANCE 标注单源+页脚注「换算值为近似对照，
  以标准原表为准」；不伪造第二源。
- **V3-7（Lead）钻头表双源**：M 系列（M1–M48 常用）攻丝底孔钻头直径，普通螺纹按
  d−P 活算校验 + 丝锥厂商样本/机械手册双源核对表值；差异值如实登记。

## 4. 黄金用例（A2 锚点；算式 + 来源，禁裸值）

| 锚点 | 期望（未舍入值 + 断言精度） | 算式 / 来源 |
| --- | --- | --- |
| R1/16 基面 | P=25.4/28=0.9071→**0.907** mm；大径/中径/小径表值（GB/T 7306.1 表，worker 双源录入后派工单冻结）；d₂=d−0.6403P、d₁=d−1.2806P（55° 常数活算） | 28 牙/in（GB/T 7306.1 R1/16 行）；报告:170 55° 公式 |
| NPT1/16 基面 | P=25.4/27=0.9407→**0.941** mm；60° 常数活算 d₂/d₁ | 27 牙/in（GB/T 12716 NPT1/16 行）；报告:170「NPT 是 1:16 锥」 |
| 蜗杆 m=2 | px=π×2=6.28319→**6.283** mm；h=2.2×2=**4.4** mm；flankAngle=**40** | GB/T 10088 m=2 标准模数；GB/T 10087 基本牙型（h₁=2.2m）；px=πm |
| Tr 大螺距补行 | 12 行 designation/pitch/major 逐行（GB/T 5796.2 大螺距系列，worker 双源录入后冻结；现有表 41 行→53 行） | COVERAGE.md:22 在册缺口；GB/T 5796.2-2005 |
| GSK 988TA G76 | 两行：`G76 P021060 Q0.1 R0.05` / `G76 X26.211 Z-30. P1.894 Q0.4 F3.5` | g76-dialects.md §1 行1 示例（[1][2] 双源冻结）——P/Q 为 **mm 小数**（P=1.894375→1.894 三位；Q=0.4；Δdmin=0.1），非 μm |
| GSK 980TDc G76 | 两行：`G76 P021060 Q1000 R0.05` / `G76 X26.211 Z-30. P18944 Q4000 F3.5` | §1 行1 示例——0.0001mm 增量：0.1mm→Q1000、1.894375→P18944（1.8944×10⁴）、0.4→Q4000；R 保持 mm（§1 行1 单位注） |
| HNC G82 | 单行：`G82 X26.211 Z-30. I0 R0 E0 C1 P0 F3.5` | §1 行4 脚注（[4][7]：HNC-8 手册+21ic 双源冻结模板） |
| H7/g6 Ø30 | es(g)=**−7**μm（基本偏差=上偏差端）、IT6=**13**→ei=−20；IT7=**21**→孔 0/+21；Xmin=0−(−7)=**+7**μm、Xmax=21−(−20)=**+41**μm，fitType=**clearance** | GB/T 1800.1 轴基本偏差表 >18–30 段 g=−7μm（冻结前 WebSearch 核对 ISO 286-1 同构表一致）；IT6=13/IT7=21μm 对照 tolerance-it.json（>18–30] 段）；结构式见 V3-5 |
| H7/k6 Ø30 | ei(k)=**+2**μm（基本偏差=**下偏差**端）、es=+2+13=**+15**；孔 0/+21；Xmin=0−15=**−15**μm、Xmax=21−2=**+19**μm，fitType=**transition** | GB/T 1800.1 k（IT4–IT7 级）>18–30 段 ei=+2μm（WebSearch 核对一致） |
| H7/p6 Ø30 | ei(p)=**+22**μm（下偏差端）、es=+22+13=**+35**；孔 0/+21；Xmin=0−35=**−35**μm、Xmax=21−22=**−1**μm，fitType=**interference** | GB/T 1800.1 p >18–30 段 ei=+22μm（WebSearch 核对一致）；与 p08 现静态标签「H7/p6 过盈」互证 |
| 钻头 M10 | 底孔 **8.5** mm（常用钢件切削丝锥口径） | d−P=10−1.5=8.5 活算校验 + 双源表值（GB/T 丝锥口径/厂商样本，W8-D 双源录入）；三例锚点 M6→5.0、M12→10.2 同法 |

## 5. 基线与树

- 基线 = Lead 契约预置提交（types.ts 扩展 + thread/gcode/tolerance panic 桩 + 本计划 + 台账，主仓单提交）。
- 树：T-W8A / T-W8B / T-W8C / T-W8D（git archive 法，同 v0.1/v0.2 惯例）。
- 四卡零依赖全并行（core 三文件分卡、types 预置冻结、页面五页分卡：p02/p03｜p04｜p08｜p13）。
