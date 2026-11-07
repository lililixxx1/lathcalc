# WAVE-PLAN-V4.9 · v0.7.0 全站图形化收口（用户反馈 #6）

> 触发：用户反馈 2026-11-07「螺母没有图形展示螺纹形状，再看下其他项目，能用图形
> 展示的尽量都用图形展示」。执行形态 = **标准波次**（多页独立改动，V4.4 双树先例）：
> Lead 计划 → G0 计划闸门 → 双 worker 树并行（A/B 卡）+ Lead 补位卡（C，静态图）
> → G1 批次复验 → 收获 → 集成回归（版本 bump + 四门禁 + A4）→ G2 完整轮 →
> tag v0.7.0 → 重部署 → 台账/记忆。
> 血统：超越冻结稿新增家族第七案（V4.2/V4.5/V4.7/V4.8 同族；登记 DEVIATIONS
> V4.9-01）。图形模块先例 5 例（arc/tolerance/triangle/gear + p07 页内）：**core 纯
> 数字零 DOM → 页面零几何 SVG 装配 → 非法保帧**，本波全部沿用。

## 0. 覆盖盘点（冻结）与范围

| 页 | 现状 | 本波 |
| --- | --- | --- |
| p05/p06 圆弧切点 | 已参数化（arc-figure） | 不动 |
| p07 锥度 | 已随输入重绘（梯形轮廓为固定形状、标签随值——几何不随输入缩放，G0 注记） | 不动 |
| p08 公差配合 | 已参数化（tolerance-figure，V4.7） | 不动 |
| p12 三角 | 已参数化（triangle-figure，V4.5） | 不动 |
| p16 挂轮 | 已参数化（gear-figure，V4.8） | 不动 |
| **p03 螺纹·结果** | 纯数字（反馈 #6 直指：无牙型图） | **A 卡：牙型剖面图** |
| **p11 重量** | 纯数字（圆钢/六方/钢管/平板） | **B 卡：料型截面 + 侧视图** |
| **p09 转速·线速度** | 纯数字（D/Vc/n/f） | **B 卡：切速示意图** |
| **p10 切削参数** | 纯查表（Vc/f 区间卡） | **C 卡（Lead）：切削三要素静态示意** |
| p01 首页 / p02 选型 / p04 G76 / p13 速查 / p14 收藏 / p15 宏程序 | 索引 / 列表 / 文本 / 数据页 | 不做（V4.9-06） |

| 卡 | 内容 | 执行 | 树 |
| --- | --- | --- | --- |
| A | `core/thread-figure.ts` + p03 装配 + 测试 | worker-1 | 树 A |
| B | `core/stock-figure.ts` + p11 装配、`core/speed-figure.ts` + p09 装配 + 测试 | worker-2 | 树 B |
| C | p10 页内静态三要素示意（零 core 模块）+ ui 测试 | **Lead 补位**（走 G2 完整轮不走 G1） | 主仓（路径无交集） |

## 1. 裁决（编号登记）

- **V4.9-01 形值同源**：图形数值一律取既有 core 真值——A 卡用 `threadDimensions`
  （core/thread.ts 常数集唯一源）/`wormGeometry`；B 卡用页面既有输入 dims（重量
  真值已在 core/weight.ts，图不重算业务值）；C 卡静态。图模块只算**布局几何**
  （比例、坐标、标注位），禁止在图模块内复写牙型常数（B.2「牙型角常数绑定」条款）。
- **V4.9-02 牙型剖面几何冻结**（A 卡）：轴向剖面画**外螺纹**牙型带（2 完整牙 +
  两端半牙 = 2.5P 跨度；蜗杆 2.5px），等比缩放
  `k = min(200/(2.5P), 96/(d−d₁))`（宽度约束 vs 高度约束取小；高度约束生效时
  横向不满幅如实呈现，V4.8-02 cap 同规）；牙型带竖向居中 cy=64，viewBox
  220×140。**牙型构造全部由冻结常数 + 中径定义推导**（教科书精确，禁另立常数）：
  - 中径线处牙厚 = 槽宽 = P/2（中径定义，全族通用）→ 牙半宽 P/4 at d₂；
  - 牙侧自 (d₂, ±P/4) 与垂直线成 α/2 倾斜（α=flankAngle 全角）；
  - 牙顶宽 `w_crest = P/2 − (d−d₂)·tan(α/2)`、牙底宽 `w_root = P/2 − (d₂−d₁)·tan(α/2)`。
    验证（推导留痕，非新常数）：60° 得 P/8 与 P/4（GB/T 192 基本牙型）；55° 得
    P/6 与 P/6；30°Tr 得 0.366P−… 与 0.366P−0.536ac（GB/T 5796.1 基本牙型方向）；
  - 蜗杆（模数制，无 d）：轴向周期 px 替代 P、分度线替代中径线（齿顶 +m、齿根
    −1.2m、α=40°，h₁=2.2m 与 wormGeometry 同源）；
  - 锥管族（sealpipe/npt）：轴向剖面同 55°/60° 构造**不画锥度变形**，中央加
    「基面」竖虚线（直径语义 = 基面处，页面 taperNote 已有文字，图不重复）。
  - 标注（继承 V4.7/V4.8 全部教训清单）：d/d₂/d₁ 三条水平虚线贯穿 [10,210]，
    线上右侧标签 `d 10` 式（font 8.5，贴线 +3 上移，三条线间距由构造保证
    ≥(d−d₂)/2·k 与 (d₂−d₁)/2·k，宽度约束下 metric 恒值：d₂−d₁ 线距 =(1.0825−0.6495)P/2×(200/2.5P)
    =0.2165×80=**17.32u**，仍容 8.5 号字（G0 勘正：初笔 >20u 误））；P 双箭头
    标注在牙型带顶部两相邻牙顶间 `P 1.5` 式；α 文字 `α 60°` 置首牙左侧（sub 色，
    不画角弧）；蜗杆标 `px`/`h₁`/`α 40°` + 分度线标签。标签 y 硬夹持 [12,128]、
    x 夹持 [半宽+2, 218−半宽]（V4.8-03 G2-C-01 同款兜底）。
- **V4.9-03 料型图几何冻结**（B 卡 p11）：单卡双视图 viewBox 220×150——上视图
  = 横截面（cy=42，包围盒预算 68 宽 ×70 高），下视图 = 侧视长条（L×截面高，
  条区 y 96..140，长 ≤200、高 ≤40）；**两视图各自等比、视图间允许不同比例**
  （工程制图局部放大惯例，图内不标比例）。截面比例 `ka = min(68/截面宽, 70/截面高)`，
  侧视比例 `kb = min(200/L, 40/截面高)`。四形状截面：
  - 圆钢：圆 ⌀D，中心线十字（dash-dot）；
  - 六方：平顶正六边形，对边 S → 外接半径 R=S/√3=0.57735·S（顶点
    (±R,0)、(±R/2,±S/2)），中心线十字；
  - 钢管：同心双圆 ⌀D 外 + ⌀(D−2t) 内，中心线十字；
  - 平板：W×T 矩形截面 + 侧视 L×T 扁条。
  标注：截面尺寸 D/S（/t/W/T）贴轮廓缘（引线允许，V4.6-AC03 圆外右侧先例），
  侧视 L 双箭头于条下。截面高 = D（圆/管）、S（六方，平顶方向）、T（平板）。
- **V4.9-04 切速图几何冻结**（B 卡 p09）：viewBox 220×120，工件正圆
  `r = min(40, 36·(50/D))`（来源：D=50 = 页面默认锚（p09.ts state 默认 '50'）
  → r=36；40 = 圆区高度预算——圆心 y=56、上下标注带各 10+；D 增大如实缩小
  （D=200 → r=9），D≤45 封顶 40 防溢出）。圆心
  (110,56) + 中心线十字；D 水平双箭头穿圆心标 `⌀50`；Vc 切向箭头在圆右上
  （−45° 切线方向，箭头长 22u）标 `Vc 150`（当前主结果值，rpm/vc 模式切换只改
  文本不改几何）；`n 955 r/min` 文字标签置圆下方（值=页面计算真值
  n=1000×150/(π×50)=955，p09 默认 D='50'/Vc='150'；G0-C-02 勘正：初笔 637
  系过期默认 Vc=100 所算，V4.9-01）。
- **V4.9-05 保帧与退化**（B 卡）：p11/p09 非法输入（≤0/NaN/解析失败）保上一帧
  + 既有 hint（V4.8-04/V4.7-04 同规）；figure 对非有限/非正尺寸抛错（UI catch
  保帧）。p03 为 URL 参数页无输入框，不适用保帧（无 params → 无图卡，既有
  WarnCard 分支不动）。极端比例（D≫L 等）不抛错——侧视条按 kb 缩放如实呈现；
  钢管 **t ≥ D/2（内径 ≤0，物理无效）抛错保帧**，与 p11 页面层 currentDims
  校验（p11.ts `t*2>=D` 拒算）口径一致——weight.ts 本身无此校验（G0 勘正措辞）。
- **V4.9-06 不做项**：p01（索引页无计算对象）；p02（选型列表，图形对象是 p03
  真子集，避免重复）；p04（G76 程序文本页，螺纹几何已在 p03 呈现）；p13 速查
  表 / p14 收藏数据页 / p15 宏程序文本库（无参数化几何对象）；牙型圆角/圆弧
  根部（GB 基本牙型为直线轮廓，制造圆角属公差细节非示意图口径）；p09 进给
  f 箭头（f 是每转进给，图上与 Vc 箭头混排降可读性，文字标签足够）；p11 平板
  侧视立体化（三视图超范围）。

## 2. 契约（types 归各 core 模块自持，不进 types.ts——页面私有视图，V4.7/V4.8 同例）

```ts
// core/thread-figure.ts
export interface ThreadFigureInput {
  kind: 'thread' | 'worm';
  /** kind='thread' 必填 */
  major?: number; pitch?: number; flankAngle?: 30 | 55 | 60;
  /** kind='worm' 必填（模数 mm） */
  moduleMM?: number;
  /** 锥管族基面竖线（sealpipe/npt） */
  gaugeLine?: boolean;
}
export interface ThreadFigureView {
  /** 牙型外轮廓折线（轴向剖面，屏幕坐标，单条 polyline） */
  profile: ReadonlyArray<{ x: number; y: number }>;
  /** 径向标线（d/d₂/d₁ 或蜗杆 齿顶/分度/齿根），label 含值 */
  diameterLines: ReadonlyArray<{ y: number; label: string }>;
  /** 螺距/轴向齿距标注 */
  pitchMark: { x1: number; x2: number; y: number; label: string };
  /** 牙型角标注 */
  flankMark: { x: number; y: number; label: string };
  /** 基面竖虚线（锥管族） */
  gaugeLine: { x: number; y1: number; y2: number; label: string } | null;
}
export const THREAD_FIGURE_VIEW = { width: 220, height: 140 } as const;
export function buildThreadFigure(input: ThreadFigureInput): ThreadFigureView;

// core/stock-figure.ts
export type StockShape = 'round' | 'hex' | 'pipe' | 'plate';
export interface StockFigureInput { shape: StockShape; dims: Record<string, number> }
export interface StockFigureView {
  /** 截面轮廓（圆=单点圆心+半径；多边形=顶点列）——契约 A 卡不实现，B 卡自定 */
  section: { kind: 'circle'; cx: number; cy: number; r: number }
    | { kind: 'ring'; cx: number; cy: number; rOuter: number; rInner: number }
    | { kind: 'polygon'; points: ReadonlyArray<{ x: number; y: number }> };
  /** 侧视长条（左上角 + 宽高） */
  sideView: { x: number; y: number; width: number; height: number };
  /** 尺寸标注（引线或双箭头） */
  marks: ReadonlyArray<{
    kind: 'linear' | 'leader'; x1: number; y1: number; x2: number; y2: number;
    label: string;
  }>;
}
export const STOCK_FIGURE_VIEW = { width: 220, height: 150 } as const;
export function buildStockFigure(input: StockFigureInput): StockFigureView;

// core/speed-figure.ts
export interface SpeedFigureInput {
  /** 工件直径 mm（几何唯一驱动） */
  d: number;
  /** 标注文本值（形值同源：由页面计算传入，图不重算） */
  vcLabel: string; nLabel: string;
}
export interface SpeedFigureView {
  circle: { cx: number; cy: number; r: number };
  /** D 双箭头（水平穿圆心） */
  diameterMark: { x1: number; x2: number; y: number; label: string };
  /** Vc 切向箭头（起点/终点 + 标签位） */
  vcArrow: { x1: number; y1: number; x2: number; y2: number; labelX: number; labelY: number };
  /** n 标签位 */
  nLabel: { x: number; y: number };
}
export const SPEED_FIGURE_VIEW = { width: 220, height: 120 } as const;
export function buildSpeedFigure(input: SpeedFigureInput): SpeedFigureView;
```

（B 卡两契约允许实现期微调字段名/增删派生字段，**语义与入参冻结**；微调在
证据档 README 披露。）

## 3. 金锚（测试按公式独立复算，不复用实现常量；双盲：worker 执行时独立代入复核）

### A 卡（thread-figure，viewBox 220×140、cy=64、k=min(200/(2.5P), 96/(d−d₁))）

- **M10×1.5（metric 60°）**：threadDimensions d₂=9.02575、d₁=8.37625（=10−
  0.6495×1.5 / 10−1.0825×1.5，core/thread.ts 常数）；k=min(53.333, 59.117)=
  **53.333（宽度约束，恰满幅 10→210）**；牙型带 y：牙顶（d）64−0.811875×53.333
  =**20.70**、d₂ 线 **38.02**（=64−0.487125×53.333）、牙根（d₁）**107.30**；
  牙顶宽 P/8=0.1875mm→**10.00u**、牙底宽 P/4=0.375mm→**20.00u**；首牙顶中心
  x=10+40=**50**（牙顶中心 x=50/130/210，槽中心 90/170）；P 标注跨距 80.00u；
  直径线标签 `d 10`/`d₂ 9.026`/`d₁ 8.376`（值与页面显示同源 toFixed(3)）。
- **Tr40×7（30°，ac=0.5 档 5<P≤12）**：d₂=36.5、d₁=32；k=min(11.4286, 12)=
  **11.4286（宽度约束）**；牙顶宽 =3.5−3.5·tan15°=3.5−0.93782=**2.56218mm**
  →29.28u；牙底宽 =3.5−4.5·tan15°=3.5−1.20577=**2.29423mm**→26.22u；牙顶线
  y=64−4×11.4286=**18.29**、d₂ 线 **44.00**、牙根线 **109.71**。
- **G1/2（pipe55，d=20.955、P=1.814 字面值）**：d₂=19.79350、d₁=**18.63199**
  （=20.955−1.2806×1.814=20.955−2.3230084；初笔 18.63207 为手算舍入误，
  G0 勘正）；数据行真值 pitch=25.4/14=1.8142857（k=41.3192，与字面值锚差
  <0.03u，测试按公式代入实际入参复算，不锚字面数）；k=min
  (44.103, 41.326)=**41.326（高度约束，不满幅：横向 187.41u，x0=16.29）**；牙顶
  宽 =0.907−1.1615·tan27.5°=0.907−0.60464=**0.30236mm**（=P/6，55° 双侧对称）
  →12.50u；牙底宽 =P/6 同值 →12.50u（0.30236×41.326=12.4952）。
- **蜗杆 m=2（worm）**：px=π·2=6.28319；k=min(12.732, 21.82)=**12.732（宽度
  约束）**；分度线 y=64、齿顶线 =64−m·k=64−25.46=**38.54**、齿根线
  =64+1.2m·k=64+30.56=**94.56**（带高 2.2m·k=56.02，G0-C-01 勘正：初笔
  误把系数 1.0/1.2 当值代入）；分度线处齿宽 px/2→40.00u；齿顶宽 =px/2−2m·tan20°=3.14159−
  1.45588=**1.68571mm**→21.46u；齿根宽 =px/2−2.4m·tan20°=3.14159−
  1.74706=**1.39454mm**→17.76u（1.3945355 四舍五入，G0 勘正）；标签 `px 6.283`/`h₁ 4.400`/`α 40°` + 分度线。
- **锥管（sealpipe R1/2，d=20.955、P=1.814）**：剖面同 55° 构造 + 基面竖虚线
  x=110（居中）、label `基面`。
- **构造代数断言（全角族）**：w_crest 公式对 60°/55°/30° 代入 → P/8、P/6、
  0.366P−0.134P=0.366P… 精确：0.5−2·0.25·tan15°=0.5−0.13397=0.36603P。**断言精度 4 位**（G0-C-03 勘正：
  V4.9-01 强制走四位常数 0.6495/0.6403，构造实得 60°=0.125011P、55°=
  0.166681P，与 P/8、P/6 差 1.1e-5/1.4e-5 超 5 位容差 5e-6——期望值列常数
  导出值 0.125011/0.166681/0.366025，注明四位常数舍入差）；中径处牙厚恒 P/2。
- **校验**：非有限/非正/缺 kind 必填字段 → 抛错（3 案）。

### B 卡（stock/speed）

- **p11 圆钢 D=50 L=100**：截面圆 ka=34/25=**1.36** → r=**34**（cx=110, cy=42）；
  侧视 kb=min(2, 40/50)=**0.8** → 条 **80×40**（=100×0.8 × 50×0.8，等比 y 96..136）；标 D（截面引线）
  + L（条下双箭头）。
- **p11 六方 S=20**：截面宽 2R=23.094、高 S=20；ka=min(68/23.094, 70/20)=
  min(2.944, 3.5)=**2.944** → 顶视宽 68、高 58.9；顶点 (±R·ka, 0)、(±R/2·ka,
  ±S/2·ka)；kb=min(200/100, 40/20)=**2** → 条 200×40。**六方对边即螺母毛坯
  常用料**（反馈 #6「螺母」语境落点之一，README 披露）。
- **p11 钢管 D=60 t=5**：rOuter ka=34/30=**1.1333** → r=34、rInner=(25/30)×34
  =**28.33**；kb=min(2, 40/60)=**0.6667** → 条 66.67×40（=100×0.6667 × 60×0.6667）。
- **p11 平板 W=100 T=10**：截面 ka=min(68/100, 70/10)=**0.68** → 68×6.8 扁条
  （T 标引线）；侧视 kb=min(200/200, 40/10)=**1** → 200×10。
- **p11 校验**：t≥D/2 抛错（管壁越界）；非正/非有限抛错。
- **p09 D=50**：r=min(40, 36×50/50)=**36**（cx=110, cy=56）；D 双箭头 110±36
  y=56 标 `⌀50`；Vc 箭头 −45° 切向起点 (110+36·cos45°, 56−36·sin45°)=
  (135.46, 30.54) 方向切线长 22；标签 `Vc 150`/`n 955`（值=页面真值传入；n=1000×150/(π×50)=954.93→toFixed(0)='955'）。
- **p09 校验**：D 非正/非有限抛错。

### C 卡（Lead，p10 静态）

- 静态 SVG（页内常量模板，零 core）：车削示意——工件圆 + 车刀矩形 + 三标注
  文本 `Vc`（工件圆切向箭头）、`f`（轴向箭头）、`ap`（径向双箭头），viewBox
  220×120，token 全用既有 CSS 变量（V4.1 §4 零新变量零内联色值）。

## 4. 验收

- **A1 四门禁**（附录 A 清单引用：`npx tsc --noEmit` / `npx vitest run
  --maxWorkers=2` / `npm run build` + `npm run lint`，各单独整句，REAL_EXIT
  留证，捕获模板 `cmd >file 2>&1; echo "REAL_EXIT=$?" >> file`）：树内 A/B 卡
  各自跑（基线 0.6.3 + 本卡代码）；主仓收获后 Lead bump **0.6.3→0.7.0 再跑
  终态四门禁**（V4.7-M2 教训：bump 先于终态门禁）。
- **A2 断言**：§3 金锚逐值（测试按公式独立复算）+ 构造代数 + 校验抛错；
  ui-p03 增组（URL 参数五族：metric/Tr/pipe55/worm/sealpipe 各一 + 锥管基面线 + 无参数无图）+ ui-p11 增组
  （四形状图变 + 非法保帧）+ ui-p09 增组（图随 D 重绘 + 模式只改标签）+
  ui-p10 增组（静态图存在 + 三要素文本）；既有测试零回归（预期新增测试数
  worker 自报，Lead G1 核对增量与文件归属）。
- **A4**（Lead 集成后，工装沿革 verify-w5→…→gear→**pro**）：≥10 拍——p03
  metric/Tr/pipe55/worm（URL 取 threads 数据行实测值）/sealpipe 基面/p03 无参
  （无图断言）；p11 四形状切换 + 改 D 重绘 + 非法保帧；p09 默认 + 模式切换 +
  改 D 重绘；p10 静态存在。每拍标签集/元素数/保帧逐位对拍 + 0 异常。
  **A4 前必 `npm run build` 并核对 preview serve bundle hash 与 dist 一致**
  （V4.8-R2 教训，固化）。vision-reader 视觉判定（FAIL/WARN 口径沿 V4.8）。
- **G2 完整轮**：reviewer 独立复算 §3 锚 + 复跑四门禁与 verify-pro。
- 通过后 tag v0.7.0 → 重部署 → 台账/记忆收口。

## 5. 卡片拆分与写范围（派工单同步引用）

- 树 A（worker-1）写范围：`src/core/thread-figure.ts`、`src/ui/pages/p03.ts`、
  `test/thread-figure.test.ts`、`test/ui-p03.test.ts`（增组）、
  `docs/evidence/V4.9-A/`。禁改其余一切。
- 树 B（worker-2）写范围：`src/core/stock-figure.ts`、`src/core/speed-figure.ts`、
  `src/ui/pages/p11.ts`、`src/ui/pages/p09.ts`、`test/stock-figure.test.ts`、
  `test/speed-figure.test.ts`、`test/ui-p11.test.ts`（增组）、`test/ui-p09.test.ts`
  （增组）、`docs/evidence/V4.9-B/`。禁改其余一切。
- Lead C 卡主仓写范围：`src/ui/pages/p10.ts`、`test/ui-p10.test.ts`（增组）、
  `docs/evidence/V4.9-C/`。与树 A/B 零路径交集（并行安全）。
- 集成期 Lead 主仓：版本 bump + README 测试数 + A4 工装
  `docs/evidence/V4.9/tools/verify-pro.mjs` + 收获提交。
