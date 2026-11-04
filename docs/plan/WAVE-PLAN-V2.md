# WAVE-PLAN-V2 · 车工算 LathCalc v0.2.0 功能包（里程碑 M2）

> 冻结于 2026-11-04。v0.1（W1–W5 + G3 通过，HEAD a4d9526）之上的功能扩张波。
> v0.1 计划见 `WAVE-PLAN.md`（W1–W5 已完，其 §1 架构与全部纪律条款对 v0.2 继续有效）。
> 用户裁决：V2-1 功能包先行 v0.2.0（数据扩张挪 v0.2.1）；V2-2 上 eslint 门禁。

## 0. 范围与验收基线

### 范围（6 项功能 + 收口，对应 DEFERRED #1/#2b/#7/#8/#10/#11 + #3/#13 顺手收账）

| # | 功能 | 落点 | DEFERRED |
| --- | --- | --- | --- |
| F1 | GSK / KND / 华中 G76 模板（解灰） | p04 页签 + core/gcode | #1 |
| F2 | G92 直进循环程序生成 | p04 增「循环形式」切换 + core/gcode | #2b |
| F3 | p02 自定义规格输入（d + P → p03） | p02 | #10 |
| F4 | 三角 SAS / ASA / SSA 模式 | p12 增模式切换 + core/triangle | #7 |
| F5 | 锥度反推（锥比 C + 两值 → 第三值 + 大小端差） | p07 + core/taper（扩契约） | #8 |
| F6 | p09 进给 f 输入 → vf = f·n 实算 | p09 + core/speed（#13 反向函数顺手 core 化） | #11+#13 |
| — | 收口：eslint 四门禁 + 版本 0.2.0 + README + 验收 + G3 | 工程 | #3 |

**不在本包**（挪 v0.2.1，见 DEFERRED 更新；Tr 大螺距 12 行现仅 COVERAGE.md:22 在册，
其标签随基线提交改判 v0.2.1——G0-Minor 兑现）：蜗杆/NPT/R·Rc·Rp 锥管数据、Tr 大螺距 12 行、
基本偏差表+常用配合实算（#12）、p13 非 G 分类数据（#14）、core 牙型角常数集导出（#15）。

### 验收基线 A1–A4（W7 收口时全跑；A1 每提交）

- **A1 门禁**：W6 期间 tsc=0 / vitest 全绿 / vite build ✓（三门禁，同 v0.1）；
  W7 起**四门禁**：+ `npm run lint`（eslint 0 error）。
- **A2 黄金用例**：§4 锚点全部入 vitest（新增/扩展测试文件），逐字符对拍。
- **A3 链流**：30 秒预算内实走 DOM——p01 → p02（**普通 M 页签**）**自定义输入 d=30 P=3.5**
  → p03 断言 27.727/26.211 → p04 切 G92 断言单行 `G92 X26.211 Z-30. F3.5` →
  复制程序剪贴板与代码卡逐字符一致（**1 行**，G0-B2 对齐）。
  （若 F1 三系统成，另跑 GSK 页签单点断言。）
- **A4 对拍**：改动 5 页（p02/p04/p07/p09/p12）390×844 截图，vision-reader 判定，
  差异登记 V2-A4-xx；未改 9 页不重拍（v0.1 基准图在档）。

## 1. 契约扩展面（Lead 派工前预置：签名 + panic 桩，worker 只填实现）

冻结于 `src/core/types.ts` + 各 core 模块（预置提交入主仓后建树）：

```ts
// triangle.ts —— SSS 保留不动（v0.1 契约/测试零破坏）；新增模式解算：
export interface TriangleSolveOutput {
  mode: 'SSS' | 'SAS' | 'ASA' | 'SSA';
  solutions: TriangleResult[];   // SSA 双解时两解，锐角解在前（V2-3）
}
export type SolveTriangleByFn = (input: TriangleInput) => TriangleSolveOutput;
// 模式判定（G0-I2 冻结）：恰三边=SSS；恰两边+其夹角=SAS；恰两边+对角=SSA；恰两角+其夹边=ASA；
// 其余组合（AAS/AAA/缺值/多值/零值负值）一律抛错，文案「无法判定解算模式或输入非法」。

// taper.ts —— taperCalc 保留不动；新增反推：
export interface TaperReverseInput extends TaperInput { taperC: number; }
export interface TaperReverseResult extends TaperResult {
  solved: 'big' | 'small' | 'length';   // 反推出的第三值字段名
  halfDiffMM: number;                    // (D − d)/2，由未舍入值计算（G0-I4 钉路径）
}
export type TaperReverseFn = (input: TaperReverseInput) => TaperReverseResult;
// 语义：taperC(>0) + big/small/length 恰两值 → 解第三值；缺/多值或 taperC≤0 抛错（不臆造）。
// missing 字段 = 反推所得第三值的数值（G0-Minor 钉死）。

// gcode.ts —— fanucG76 保留不动；新增：
export type CncSystem = 'fanuc' | 'gsk' | 'knd' | 'hnc';
export type G76DialectFn = (p: G76Params, system: CncSystem) => G76Program;  // C1 语义冻结后实现；恒等式 g76Dialect(p,'fanuc') ≡ fanucG76(p)（G0-Minor 钉死）
export type G92CycleFn = (p: G76Params) => G76Program;  // FANUC 基线格式，单行输出（G0-B2 冻结行数）
// CncSystem 'hnc' ↔ p04 现 SYSTEMS value 'huanzhong'：C2 在 p04 写范围内将 value 统一为 'hnc'（G0-Minor）。

// speed.ts —— spindleSpeed 保留不动；新增（#13 收账）：
export type SurfaceSpeedFn = (input: { d: number; n: number }) => number;  // Vc = n·π·D/1000，返回 m/min（G0-B1：返回标量，不滥用 SpeedResult）
export type FeedRateFn = (f: number, n: number) => number;                  // vf = f·n（mm/min）
```

UI 契约（链路键；**ui/README §5.2 不入卡写范围**——各卡在自己证据档登记链路键行，
Lead 于 W6 波末串行并入 §5.2，同 v0.1 PROVENANCE 先例，G0-I5 消同路径写）：
- p02 自定义 → p03：复用 `family/spec/d/p` 四键，`spec` 形如 `自定义 Ø30×3.5`（family 随页签）。
- p07 反推：`#/p07?mode=reverse&taperC=0.05194&small=30&length=50`（mode 增 `reverse`）。
- p09：`f` 键新增（`#/p09?d=50&vc=150&f=0.2`）。
- p12：`mode=sss|sas|asa|ssa` 键（默认 sss）。

## 2. 波次拆解

### W6 功能波（4 卡；C1 ∥ C3 ∥ C4 并行，C2 待 C1 回卡后派）

| 卡 | 内容 | 写范围 | 依赖 |
| --- | --- | --- | --- |
| W6-C1 | **调研卡：G76/G92 方言语义双源取证**（GSK 980TD/988、KND、华中 HNC-21T × G76/G92：行格式单行/两行、P/Q/R 语义与单位、平/锥螺纹差异）→ `docs/research/g76-dialects.md`（结论表 + 逐条双源脚注 + M30×3.5 三系统示例行） | docs/research/（新建）+ 证据档 | — |
| W6-C2 | core/gcode 实现 g76Dialect/g92Cycle + p04 三系统解灰 + 循环形式切换 + 测试 | src/core/gcode.ts, src/ui/pages/p04.ts, test/（仅本卡测试文件） | **C1**（语义双源结论） |
| W6-C3 | p02 自定义输入 + p09 f/vf + speed core 化（surfaceSpeed/feedRate + p09 反求改引 core）+ 测试 | src/ui/pages/p02.ts, p09.ts, src/core/speed.ts, test/（仅本卡测试文件） | — |
| W6-C4 | core/triangle solveTriangleBy + core/taper taperReverse + p12 模式切换 + p07 反推模式 + 测试 | src/core/triangle.ts, taper.ts, src/ui/pages/p07.ts, p12.ts, test/（仅本卡测试文件） | — |

路径互斥已核（C2/C3/C4 core 三文件 + 页面五页互不重叠；types.ts 由 Lead 预置冻结，卡内禁改；
test/ 按文件级互斥——各卡只写自己的新测试文件与对应页面既有测试文件
ui-pXX.test.ts，派工单钉文件名清单；ui/README §5.2 由 Lead 波末并入，G0-I5）。

### W7 收口波（Lead 自研，产出直进 G2/G3）

eslint@9 flat config + typescript-eslint 最小规则集 + `lint` script → 四门禁；
package.json 0.1.0→0.2.0；README 功能表/测试数更新；A1–A4 全跑 + 证据档
`docs/evidence/W6W7/`；**G3 终局审（v0.2.0）**。

## 3. 裁决记录（Lead 落账；V2-1/2 为用户裁决，不再回炉）

- **V2-1（用户）**：功能包先行 v0.2.0；数据扩张（蜗杆/NPT/锥管/Tr 12 行/基本偏差/p13 数据）
  挪 v0.2.1。
- **V2-2（用户）**：上 eslint（devDependency；运行时零依赖承诺不变）；W7 起四门禁。
- **V2-3（Lead）SSA 取解规则**：sinC>1 无解（报错文案「构不成三角形」）；双解条件
  （对边 a<邻边 c 且 A<90° 且 sinC<1）返回**两解并列，锐角解在前**，UI 标「SSA 双解」；
  其余单解。**边界补全（G0-I1）**：A≥90° 且 a≤c → 无解；解出后 B≤0 或 C≤0 的退化解
  （如 A=120°, a=45, c=50 → B=−14.21°）一律判无解，同「构不成三角形」文案。
  依据：三角函数多值性 + 计算器惯例（锐角主解）。
- **V2-4（Lead）方言宁缺毋滥**：C1 调研若某系统的 G76 或 G92 语义仅单源或两源冲突 →
  该能力**维持置灰**、差异登记，不猜格式（同 DEFERRED #1「宁缺毋滥」精神，DEFERRED.md:7）。
  **置灰粒度 = 系统 × 循环形式**（G0-Minor 采纳）：G76 双源过而 G92 单源时，仅 G92 在该
  系统下置灰，G76 照常解灰。C2 派工单按 C1 结论逐（系统×形式）标注 enable/keep-gray。
- **V2-5（Lead）自定义规格口径**：统一输入 **d（大径 mm）+ P（螺距 mm）**，牙型角随族
  （M/UN 60°、Tr 30°、G 55°）；**不做 tpi 输入**（tpi→P 换算属表值事务，登记偏差说明）。
  spec 显示名 `自定义 Ø30×3.5`。
- **V2-6（Lead）#13 顺手收账**：p09 改动在 F6 写范围内，surfaceSpeed core 化随卡完成
  （DEFERRED #13 关账）；#15（牙型角常数集导出）p03 本包不动，推 v0.2.1。
- **V2-7（Lead）G92 落位**：p04 增「循环形式：G76 复合循环 | G92 直进循环」Segmented，
  不新开页（设计稿 14 页无 G92 页；组件体系内扩展，同 v0.1 先例）。
- **V2-8（Lead）p02 自定义行**：激活现有静态占位行为可展开输入（两格 d/P + 计算按钮），
  不新增页面元素类型；`aria-disabled` 移除。

## 4. 黄金用例（A2 锚点；算式 + 来源，禁裸值）

| 锚点 | 期望（含未舍入值与断言精度，G0-I3/I4） | 算式 / 来源 |
| --- | --- | --- |
| 三角 SAS | b=40, c=50, A=36.87° → a=30.000071 → **30.00**（断言 toFixed(2)，禁 toBe(30)） | a=√(b²+c²−2bc·cosA)=√(1600+2500−4000×0.7999989)=√900.0043（cos36.87°=0.7999989 非精确 0.8，G0-I3 勘正）；金三角 30/40/50（A=36.87° 对边 a=30，v0.1 W2-C1 SSS 金值同源互证；node 复核 30.000071） |
| 三角 ASA | A=36.87°, B=53.13°, c=50 → a=30.000071→**30.00**，b=39.999946→**40.00**（toFixed(2)） | C=90°，a=c·sinA/sinC=50×0.6000018；b=50×0.7999989（同金三角互证；node 复核 30.000071/39.999946） |
| 三角 SSA 双解 | a=40, c=50, A=36.87° → 解₁ C=48.590533→**48.59°** B=94.539467→**94.54°** b=66.457378→**66.46**；解₂ C=131.409467→**131.41°** B=11.720533→**11.72°** b=13.542514→**13.54**（全部 toFixed(2)） | sinC=c·sinA/a=50×0.6000014291/40=0.7500017864<1 且 a<c 且 A 锐角 → 双解（V2-3 锐角在前；node 逐位复核；**W6-C4 双盲勘正**：原表 b₁/b₂ 六位值系 Lead 用舍入中间值推写，已按双精度真值修正——G1 复算 66.4573784936/13.5425143211 逐位吻合） |
| vf 实算 | f=0.2, n=955 → vf=191.0 mm/min（toFixed(1)） | vf=f·n；n=955 为 v0.1 金值（1000×150/(π×50)=954.9297→955，WAVE-PLAN §4） |
| 锥度反推 | taperC=1/19.254, small=30, length=50 → big=32.596863→**32.597**，halfDiff=（未舍入路径 (32.596863−30)/2=1.298431→**1.298**）**（G0-I4 钉：core 由未舍入 D 计算，禁先舍入再算的 1.299 路径）**，半角 1°29′15″ | D=d+C·L=30+50/19.254=32.596863；半角 1.4875586°=1°29′15.21″ 与 morse.json number=4 行一致（GB/T 1443-2016 主源，PROVENANCE 在档） |
| G92 M30×3.5 | **单行**（G0-B2 冻结行数）：`G92 X26.211 Z-30. F3.5`（lines.length===1） | X=d1=26.21125（core threadDimensions，G76 X 同源）；行格式 FANUC 车螺纹单行程循环 G92 X(U)_ Z(W)_ F_（C1 双源结论冻结后落 C2 派工单） |
| 三系统 G76 M30×3.5 | 逐字期望值 **待 C1 结论冻结**（C2 派工单补入，双源脚注必附；A2 全量达成时点=C2 收获后） | docs/research/g76-dialects.md 结论表 |

## 5. 基线与树

- 基线 = Lead 契约预置提交（types.ts 扩展 + gcode/triangle/taper/speed 四处 panic 桩 +
  本计划（含 G0 修复）+ COVERAGE.md Tr 12 行标签改判 v0.2.1 + 台账，主仓单提交）。
- 树：T-W6C1 / T-W6C2 / T-W6C3 / T-W6C4（git archive 法，同 v0.1 W4 惯例）。
- C2 树在 C1 收获入主仓后**重建**（基线含 g76-dialects.md，C2 派工单引用其结论表）。
