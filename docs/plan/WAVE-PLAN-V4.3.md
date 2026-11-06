# WAVE-PLAN-V4.3 · p06 参数化图形试点（AC01 + AC05）

> 触发：用户第二条反馈（2026-11-06）——「展示的图形能否随着数值的变化而变化」。
> 用户裁决：**先试点 2 案看效果**（AC01 直线—圆弧相切 + AC05 台阶倒圆），展示效果后
> 再决定是否推广其余 10 案。本计划只冻结试点两案，推广另立计划。
> 版本：**0.4.0**（新功能位，非补丁）；Lead 直改单卡（用户反馈驱动，v0.3.1 先例），
> Lead 产出不走 G1 直接进 G2 完整轮。

## 1. 裁决与偏差登记

- **V4.3-01（再裁决）**：v0.3.1 维持的 DEVIATION W4-C3-03「数值半」（图上文字为符号
  不带数值）在**参数化图形上推翻**——静态示意图无值可回显故维持符号；参数化图形
  形值同源，文字回显**求解器真值**（非设计稿 mock，W4-C3-03 G0 阻塞 1 的「几何不可能
  的假数值」不适用于回显真实输入）。静态 10 案（AC02–AC04、AC06–AC12）hero 标注
  维持 v0.3.1 符号层不变；p05 缩略图全部不变。
- **图形方向与刀架无关**：几何实体取前刀架冻结契约（AC01 前刀架 G02=图面顺时针、
  AC05 前刀架 G03=图面逆时针，arc-cases-a.ts 文件头），不用 solution.direction
  （随 rearToolPost 翻转的是判向标签，不是几何）。求解调用不传 rearToolPost。
- **显示长度约定**（同 AC04「L=R1+R2」先例，登记式冻结，非模型值）：
  - AC01 切线显示长 Ld = 2.4R + 0.25·|stepD|（P 两侧对称）；切入直腿长 Lleg = 2.4R。
  - AC05 小径外圆延伸 z_left = stepZ − 2.8R；台阶面显示顶 r_top = stepX/2 + 1.9R。
  作用：bbox 随输入真实变化（stepD/stepX/stepZ 可见），同时圆角始终有零件语境。

## 2. 契约（core 新模块 src/core/arc-figure.ts）

```ts
export type ParametricCaseId = 'AC01' | 'AC05';
export const PARAMETRIC_CASES: readonly ParametricCaseId[];
export interface FigureView {           // 全部已映射到 viewBox 64×34
  segs:    readonly { x1: number; y1: number; x2: number; y2: number }[]; // 零件轮廓 currentColor
  arcs:    readonly { x1: number; y1: number; x2: number; y2: number;
                      rx: number; sweep: 0 | 1 }[];  // rx=ry（等比映射保圆）
  axis:    { x1: number; y1: number; x2: number; y2: number };            // 回转轴线 la-sub
  refDashes: readonly { x1: number; y1: number; x2: number; y2: number }[]; // 角点残料等 la-sub 虚线
  centerDots: readonly { x: number; y: number }[];   // 圆心灰点
  radiusDashes: readonly { x1: number; y1: number; x2: number; y2: number }[]; // 圆心↔切点虚线
  labels:  readonly { text: string; x: number; y: number;
                      anchor: 'start' | 'middle' | 'end' }[];             // 值标签 la-sub
  point:   { x: number; y: number };                 // 橙点=切点（solution.tangent）
  scale:   number;                                   // 工件→viewBox 比例（测试用）
}
export function buildArcFigure(id: ParametricCaseId, input: Record<string, number>): FigureView;
```

- **坐标**：工件半径空间 (z, r)（r = X/2；z 右正、r 上正）→ viewBox：x = x0+(z−zmin)·s，
  y = y0−(r−rmin)·s。内框 x∈[4,60]、y∈[3.5,30.5]；**等比** s = min(56/w, 27/h) 后居中：
  x0 = 4+(56−w·s)/2，y0 = 30.5−(27−h·s)/2。
- **bbox 点集** = 全部被绘制实体：轮廓段端点、弧采样（每 22.5°，四分之一弧 5 点）、
  虚线端点、圆心点、轴线（r=0，取其余实体 z 范围；其 r=0 计入 bbox）。标签锚点不计。
- **弧起点导出**（ArcSolution 无起点）：四分之一弧恒等式——顺时针 S→P 时
  S = C + rot90ccw(P−C)，逆时针时 S = C + rot90cw(P−C)；rot90ccw(z,r)=(−r,z)。
  本式仅对四分之一弧成立，两试点案均满足（AC01/AC05 文件头「顺/逆时针 90°」）。
- **SVG sweep 换算**：(z,r) 平面顺时针 → 屏幕（y 向下）sweep=1；逆时针 → sweep=0；
  四分之一弧 large-arc 恒 0。
- **值格式 fmtv**：≤3 位小数、去尾零、整数不带点、−0 归 0（与 arc-cases-a fmtCoord
  同规则；core 本地实现，不引 UI）。
- **求解单源**：只调 core solve()（按 solver.inputs 择键），异常原样上抛（UI 保上一帧）。

## 3. AC01 几何规格（inputs: R / angle α / stepD）

实体（工件 (z,r)，u=(cosα,sinα)，n=rot90ccw(u)=(−sinα,cosα)）：

| 实体 | 定义 | 样式 |
| --- | --- | --- |
| 轴线 | (z_bbox_min, 0)→(z_bbox_max, 0)，取其余实体 z 范围 | la-sub 细线 |
| 切线 | P−Ld·u ↔ P+Ld·u，P=(0, stepD/2)，Ld=2.4R+0.25\|stepD\| | 轮廓 |
| 圆弧 | S→P 顺时针（sweep=1），C=P−R·n，S=C−R·u=导出式 | 轮廓 |
| 切入直腿 | S−2.4R·n → S（S 处弧切向 = n，切入段隐含） | 轮廓 |
| 圆心/虚半径 | 灰点 C；虚线 C↔P | 标注 |
| 橙点 | P（solution.tangent） | 切点 |

标签（屏幕偏移，rotScreen((x,y))=(−y,x)；单位 viewBox）：

| 文本 | 锚点 | anchor |
| --- | --- | --- |
| `R{R}` | mid(Pv,Cv)+2.2·rotScreen(unit(Pv−Cv)) | middle |
| `α{angle}°` | Pv−2.2·rotScreen((cosα,−sinα)) | middle |
| `Ø{stepD}` | (map(P.z), y_axis+3.0)，y_axis=map(r=0) | middle |

**金锚（R=5, α=45, stepD=36；Lead 预复算，测试独立代入对拍）**
（算式：u=(0.70711,0.70711)；P=(0,18)；C=(3.53553,14.46447)；S=(0,10.92893)；
Ld=2.4·5+0.25·36=21，线端 z=±21·cos45°=±14.84924，r 上界 18+14.84924=32.84924；
bbox z∈[−14.84924,14.84924] w=29.69848，r∈[0,32.84924] h=32.84924；
s=min(56/29.69848,27/32.84924)=0.82193676（h 定界）；x0=4+(56−24.41028)/2=19.79486175；
y0=30.5（h 定界）；y(r)=30.5−r·s）：

| 点 | viewBox | 复核 |
| --- | --- | --- |
| P | (32.00000000, 15.70513825) | x0+14.84924·s≡32（z 对称+h 定界恒等式：x0+w·s/2=32） |
| C | (34.90598530, 18.61112355) | y=30.5−14.46447·s |
| S | (32.00000000, 21.51710884) | y=30.5−10.92893·s |
| \|Pv−Cv\| | 4.10968382 | = R·s = 5×0.82193676 ✓ |

## 4. AC05 几何规格（inputs: R / stepX / stepZ）

实体（C=(stepZ−R, stepX/2+R)，P=(stepZ, stepX/2+R)，Q=(stepZ−R, stepX/2)，
尖角 K=(stepZ, stepX/2)；z_left=stepZ−2.8R，r_top=stepX/2+1.9R）：

| 实体 | 定义 | 样式 |
| --- | --- | --- |
| 轴线 | (z_left, 0)→(0, 0) | la-sub 细线 |
| 端面 z=0 | (0,0)→(0,r_top) | 轮廓 |
| 小径外圆 | (z_left, stepX/2)→Q | 轮廓 |
| 圆弧 | Q→P 逆时针（sweep=0） | 轮廓 |
| 台阶面 | P→(stepZ, r_top) | 轮廓 |
| 大径显示段 | (stepZ, r_top)→(0, r_top) | 轮廓（显示约定） |
| 角点残料 | Q→K、K→P 两段（被圆角去除的尖角棱，仅触弧于 Q/P 不相交，见 §4 算式注） | la-sub 虚线 |
| 圆心/虚半径 | 灰点 C；虚线 C↔P | 标注 |
| 橙点 | P（solution.tangent） | 切点 |

标签：`R{R}` at (mid(Pv,Cv).x, mid.y−2.4) middle；`Ø{stepX}` at
(map((z_left+stepZ−R)/2), map(stepX/2)+3.0) middle；`Z{stepZ}` at
(map(stepZ/2), y_axis+3.0) middle。

**金锚（R=4, stepX=20, stepZ=−10）**
（算式：P=(−10,14)，C=(−14,14)，Q=(−14,10)；z_left=−10−11.2=−21.2，
r_top=10+7.6=17.6；bbox z∈[−21.2,0] w=21.2，r∈[0,17.6] h=17.6；
s=min(56/21.2,27/17.6)=1.534091；x0=4+(56−32.52273)/2=15.73864；y0=30.5）：

| 点 | viewBox | 复核 |
| --- | --- | --- |
| P | (32.92045, 9.02273) | x=15.73864+11.2·s；y=30.5−14·s |
| C | (26.78409091, 9.02272727) | x=15.73863636+7.2·s |
| Q | (26.78409091, 15.15909091) | y=30.5−10·s |
| \|Pv−Cv\| | 6.13636 | = R·s = 4×1.534091 ✓ |

§4 算式注（残料虚线不穿弧）：|K−C|=√(R²+R²)=R√2>R（K 在圆外）；Q→K 段上
各点 (z, stepX/2) 距 C = √((z−(stepZ−R))²+R²) ≥ R，等号仅 z=stepZ−R（Q）；
K→P 段同理仅触 P。AC01 互不交叉：切线 r−z=18，直腿 r−z∈[−6.04,10.93] 不含 18。

## 3.1 R1 修订（A4 首轮 WARN 处置，2026-11-06）

首轮判定通过但有 1 真实叠压：AC01 R12/α30°/Ø50 拍——切入直腿显示段沿 −n 伸至
r=−16.3 穿轴线压 `Ø50` 文字（α 小 / R 大时 2.4R 定长腿必越轴）。处置：

1. **显示段裁至轴线**（`clipSegAtAxis`）：切线与直腿为显示长度段，r<0 端裁至
   r=0 交点，两端均 <0 整段弃；**弧为求解实体不裁**（保几何真值）。车工图
   r≥0 半平面惯例。bbox 改取裁后端点。
2. R 标签避让 2.2→3.0（红点压 R 左缘轻微项）。
3. α 标签方向改直接取 (cosα,−sinα)（原从线端点差取，裁后不可靠；§3 表本式）。
   默认锚（无裁剪路径）数值不变；新增 2 条裁线/弃段测试。

## 5. 实现与测试

- `src/core/arc-figure.ts`（§2 契约 + §3/§4 两案生成器）；`src/ui/pages/p05.ts`
  增 `arcCaseParametricSVG(fig)`（SVG 装配，token 色，chrome 同 hero：viewBox
  0 0 64 34 / 220×102 / stroke-width 0.55；数字 n2 两位定点）；`src/ui/pages/p06.ts`
  接线：PARAMETRIC_CASES 命中时初值即参数图，onInput 求解成功后重绘 innerHTML，
  异常保上一帧（结果区已呈 WarnCard）；非试点案维持静态 hero 不变。
- 新测试 `test/arc-figure.test.ts`（金锚 toBeCloseTo / 不变量 |Pv−Cv|=R·s、
  |Sv−Pv|=R√2·s、bbox 界内、sweep 位 / 值标签 / 参数响应（R 5→20、stepZ −10→−40
  → 图变+标签变）/ rearToolPost 不改图 / 异常上抛）。
- 新测试 `test/ui-p06-param.test.ts`（jsdom 路由：AC01 默认值标签入页 / 改输入
  R→20 图 path 变+标签变 / 非法输入保上一帧+WarnCard / AC05 同 / AC02 静态回归）。
- **修订既有断言 1 条**（V4.3-01 语义变化）：test/ui-p05.test.ts p06 集成
  AC01 键集 `['R','α','Ø']` → `['R5','α45°','Ø36']`。零删（无删除用例）。
- 终态 548 → 572（+24：arc-figure 18 含 R1 裁线 2 + ui-p06-param 6；README 随终态数更新）。

## 6. 验收

1. 四门禁 REAL_EXIT=0（lint / tsc / vitest / build），测试数以 §5 终态为准。
2. **A4 对拍（新增 tools/verify-v43.mjs，沿革 verify-p06）**：每案两组输入
   （AC01: 5/45/36 → 12/30/50；AC05: 4/20/−10 → 8/28/−16），逐拍 DOM 断言
   svg text 集随输入变化 + 390×844@2x 截图；vision-reader 判定：同案两拍
   **图形随值可见变化**、标签=输入真值、无叠压/越界/裁切、无回归（静态案抽查 1）。
3. G2 快审（完整轮，Lead 接管卡）：diff + 金锚独立复算 + 抽查复跑。
4. 通过后：package.json 0.4.0 → 提交 → tag v0.4.0 → 重部署 → **向用户展示两案
   两输入对拍截图**，由用户裁决是否推广其余 10 案（推广另立 V4.4 计划）。
