# WAVE-PLAN-V4.5 · p12 三角示意图参数化（v0.6.0）

> 触发：用户反馈 #3（2026-11-06）「三角 没有图形变化」——p12 示意图为静态三角形
> （固定 path `M28 86 196 86 96 20z`），仅边值文字随输入变，形状不变。
> 沿革：与反馈 #2（p06 参数化，V4.3 试点→V4.4 推广全 12 案）同族；本卡为 p12 单页
> 推广，执行形态=Lead 直改（V4.2/V4.3 先例：单卡计划 + A4 两轮 + G2 完整轮）。

## 0. 范围

- p12 示意图卡：静态稿降级为初值解析失败兜底帧（V4.4 §0 同规）；默认 SSS 30/40/50
  入页即解算成功 → 实际入页即参数化。
- p05/p06 及其余页面不动；设计稿静态示意仅登记偏离（见 DEVIATIONS V4.5-01）。

## 1. 裁决与显示约定（编号登记）

- **V4.5-01 形值同源**（V4.3-01 血统）：图由**解算结果** `TriangleResult` 驱动——
  任何模式成功解算后六值齐备，故一个通用生成器覆盖 SSS/SAS/ASA/SSA；标签回显
  求解器真值，非输入串回显（SAS/ASA/SSA 的非输入边显示计算值）。
- **V4.5-02 标签格式**：沿用 p12 v0.1 空格式（`a 30` / `A 36.9°`），不用 p06 的
  连写/等号式——p12 键为单字符，空格式与既有 ui-p12 断言零回归；边值 **2 位定点
  去尾零**（与结果卡 toFixed(2) 同源；实现期勘正：kit 的 fmtFigureValue 为 3 位
  G 坐标规则，SAS/ASA/SSA 计算边在图面显 3 位过宽，不复用），角值 1 位定点去尾零
  （结果卡保持 2 位——登记：图/卡精度分工）。
- **V4.5-03 几何与映射**：底边 c 水平，A=(0,0) 左、B=(c,0) 右、C=(x,y) 上（数学系
  y 向上），x=(b²+c²−a²)/2c（余弦定理投影，survey 同源 triangle.ts:16）、
  y=√(b²−x²)；钝角时 x 可越 [0,c]（A 或 B 钝角），bbox 取三顶点包络。映射：
  viewBox 220×104（沿静态稿），内框 [16,204]×[16,88]，s=min(188/w, 72/y_h)，
  水平居中 + 贴底（底边恒在 y=88 基线，顶点向上——三角形天然底对齐，与静态稿
  构图一致）；y 翻屏（数学→屏幕 y 下）。
- **V4.5-04 SSA 双解叠画**：解₁（锐角，solutions[0]）实线全标签；解₂ 虚线
  （stroke-dasharray，var(--la-sub)）叠画**不带标签**（两解共享底 c 与 A 角，
  顶点 C 各异；标签叠放必糊）。单解不画虚线。
- **V4.5-05 直角标记**：solution.right 时在直角顶点沿两邻边方向画小方块
  （两段 7px 屏幕长度，var(--la-sub) 细线）；非直角不画。
- **V4.5-06 重绘时机与失败保帧**：onInput / 模式切换后**解算成功即重绘**
  diagram innerHTML；缺值 / 抛错（构不成/模式非法）保上一帧（V4.3 §5 同规，
  提示已在结果区）。
- **V4.5-07 标签锚法**：边标签=边中点+外法向偏移 11px（外法向=远离对顶点）；
  顶点标签=顶点+外角平分向偏移 13px（外=背离三角形内部）；anchor=middle。
- **V4.5-08 标签钳位入界（A4-R1 勘正）**：高瘦/扁宽三角下 V4.5-07 的固定偏移可
  把标签推出 viewBox 顶/底/侧界（实测 13/14/15 与 SAS 60° 顶部角标签上缘被裁
  10-15% 字高——AC07 同族教训：锚法偏移必须先验边界余量）。终位钳位
  x∈[20,200]、y∈[9,101]，只影响本会越界的极端案。

## 2. 契约（src/core/triangle-figure.ts，纯数字零 DOM）

```ts
export interface TriSeg { x1: number; y1: number; x2: number; y2: number }
export interface TriLabel { text: string; x: number; y: number }
export interface TriFigureView {
  segs: readonly TriSeg[];       // 解₁ 三边 A→B / B→C / C→A
  altSegs: readonly TriSeg[];    // SSA 解₂ 三边（不传 alt 或单解=空数组）
  rightMarks: readonly TriSeg[]; // 直角小方块两段（非直角=空数组）
  labels: readonly TriLabel[];   // 六标签：a/b/c 边值 + A/B/C 角值
  scale: number;                 // 测试不变量用
}
export function buildTriangleFigure(result: TriangleResult, alt?: TriangleResult): TriFigureView
```

- 只消费已解算 `TriangleResult`（types.ts:180；六值由 solver 保证有效），不再
  解算；防御：三边退化（y 非有限 / b²−x²<0）抛错（UI 保帧）。
- 边值 2 位定点去尾零 + 角值 1 位定点去尾零（V4.5-02，本文件内 fmtSide/fmtDeg）。

## 3. 金锚（机生成口径，测试按本节公式独立复算——勿抄表值，G2-V4.3 C-1 教训）

- **SSS 30/40/50**（默认）：x=(1600+2500−900)/100=32，y=√(1600−1024)=24；
  bbox w=c=50、h=24 → s=min(188/50, 72/24)=3（h 限制维）；x0=16+(188−150)/2=35，
  基线 y=88。视图：A=(35,88)、B=(185,88)、C=(35+96=131, 88−72=16)。
  守恒：|AB|=150=50·3 ✓ |BC|=√(54²+72²)=90=30·3 ✓ |CA|=√(96²+72²)=120=40·3 ✓。
  角：cosA=0.8→36.87°（triangle.ts:2 同式）、B=53.13°、C=90°；标签
  `a 30 / b 40 / c 50 / A 36.9° / B 53.1° / C 90°`。
- **SAS b40 c50 A36.87°**：a=√(1600+2500−4000·cos36.87°)（余弦定理，triangle.ts:165
  同式）=30.000071；与 SSS 30/40/50 同三角形（角化边往返）→ 视图同上、标签
  `a 30`。
- **ASA A36.87 B53.13 c50**：C=90°；a=50·sinA/sinC=30.000071、b=39.999946
  （正弦定理，triangle.ts:194 同式）→ 同上三角形。
- **SSA a40 c50 A36.87 双解**（ui-p12.test.ts:229-236 冻结值）：解₁ C=48.590533°、
  B=94.539467°、b=66.457378；解₂ C=131.409467°、b=13.542514。两解共享 A/B 底
  两端（底 c=50 不变）→ altSegs 底边与 segs 底边逐位相同；顶点同射线
  y/x≡tan36.87°。解₁ 视图：x₁=(b₁²+2500−1600)/100=28.224…（由测试按公式复算），
  y₁=√(b₁²−x₁²)；标签取解₁ 真值（`B 94.5°` 等）。
- **13/14/15 非直角**：x=8.4、y=11.2；s=min(188/15, 72/11.2)=72/11.2；
  rightMarks 空。

## 4. UI（src/ui/pages/p12.ts）

- 新增 `parametricDiagramSVG(view)`（本文件内装配，零几何）：层序 altSegs 虚线 →
  rightMarks → segs 实线（currentColor 1.6 沿静态稿）→ labels（var(--la-sub)，
  font-size 11 沿静态稿）；viewBox 220×104、width=100% height=94 沿静态稿。
- `diagramMarkup`（静态）保留为初值兜底帧；renderResult 成功路径末尾
  `diagramCard.innerHTML = parametricDiagramSVG(buildTriangleFigure(sol, dual ? sol2 : undefined))`；
  缺值/抛错路径不触碰 diagram（V4.5-06）。
- input 事件不再单独调 renderDiagram（标签-only 重绘废除，统一走解算成功重绘）。
- 色值契约：零内联十六进制，token / currentColor（ui-source 契约 §4.2）。

## 5. 测试计划（628→~644，门禁以实跑为准）

- 新 `test/triangle-figure.test.ts`（~12 例）：§3 四组金锚独立复算（mapSpec 本地
  重实现，不 import src 的映射）；守恒三边长=真值·s；全坐标/标签界内；c 标签在
  基线下方、C 标签在顶点上方；参数响应（30/40/50 vs 40/40/40 等边 vs 13/14/15
  segs+labels 均变）；直角方块两段=7px 且非直角为空；SSA 双解：alt 底边与主底边
  逐位同、alt 顶点同射线 tanA、altSegs 与主 segs 顶点不同；防御抛错（1/2/3 退化）。
- `test/ui-p12.test.ts` 增补（不改既有断言语义）：入页 svg path d 含参数化三点
  （非静态 `M28 86…`）；SSS 改 13/14/15 → path d 变；缺值保上一帧（d 不变）；
  SSA 双解 → svg 含 dasharray 虚线组；装配零内联十六进制 + token 色。
- 回归：ui-p12 既有 25 例零改动（'c 50' 等断言在新图面语义下仍真）。

## 6. 验收

- A1 四门禁 0（vitest 全量）。
- A4 两轮（CDP 390×844@2x；工装 verify-tri.mjs：SSS×2 / SAS / ASA / SSA 双解 /
  SSA 无解保帧 / 直角标记，约 8 拍 + 标签集排序对拍 + path 变化断言）；vision-reader
  判定，R1 修复后二轮复核。
- G2 完整轮（Lead 产出不走 G1；金锚三路互证：本计划 §3 公式 / 实现 / 测试独立复算）。
- 通过后 tag v0.6.0 → 重部署 → 台账/记忆收口。
