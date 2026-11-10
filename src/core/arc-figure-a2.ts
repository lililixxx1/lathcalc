/**
 * arc-figure-a2.ts · 参数化图形 a 组四案：AC02 两圆外切 / AC03 两圆内切 /
 * AC04 圆弧—斜线—圆弧 / AC06 凹圆弧切入（V4.4，worker-1 实现位）
 *
 * 规格：docs/plan/WAVE-PLAN-V4.4.md §3（实体表 + 公式源 arc-cases-a.ts /
 * test/arc-cases-a.test.ts）+ §1 显示约定 + §2 契约（工具全部取自 arc-figure-kit）。
 *
 *  ===== 实现约定（与 §3 实体表逐条对应）=====
 *  - AC02/03：两整圆轮廓各 = 2 条互补半圆（kit circleArcs，cw 同取 true → sweep=1）；
 *    圆心灰点 + 连心虚线 + 橙点切点；无轴线（V4.4-03，axis 置零长段）。
 *  - AC04：弧1 S1→P1（V4.4-01 伴弧）+ 线 P1↔P2 + 弧2 S2→P2（solver 冻结式）；
 *    refCircles 虚线整圆 ×2 + 圆心点 + C↔P 虚半径 ×2；无轴线。
 *  - AC06：入口段（裁轴）/ 弧 S→E / 出口段 + 圆心点 + C↔E 虚半径；轴线 = 其余
 *    轮廓实体（segs+arcs）z 范围（V4.4-04④）。
 *  - 标签=输入回显（V4.4-02）：多字符键加等号（R1=/R2=/dX=/dZ=），单字符键
 *    直接拼接（R）；小数同 fmtFigureValue。
 *  - 求解单源 = kit solveFor；缺失 / 非有限 / 越界参数由 solver 原文上抛。
 */
import type { FigureView } from './arc-figure';
import type { ViewCircle, ViewLabel, ViewPoint, ViewSeg, WArc, WSeg, WP } from './arc-figure-kit';
import {
  addP,
  arcView,
  circleArcs,
  circleExtremes,
  clipSegAtAxis,
  deg2rad,
  fmtFigureValue,
  makeMap,
  midView,
  mulP,
  rotCcw,
  rotScreen,
  sampleArc,
  segView,
  solveFor,
  subP,
  unitView,
} from './arc-figure-kit';

/** solver 输出（X=直径）→ 半径空间 (z, r = X/2) */
const toWP = (p: { x: number; z: number }): WP => ({ z: p.z, r: p.x / 2 });

/** viewBox 内向量差（仅本文件标签 / 方向计算用） */
const subView = (a: ViewPoint, b: ViewPoint): ViewPoint => ({ x: a.x - b.x, y: a.y - b.y });

/** 无轴线案（AC02/03/04，V4.4-03）：零长退化段，装配层 p05 已跳过渲染 */
const NO_AXIS: ViewSeg = { x1: 0, y1: 0, x2: 0, y2: 0 };

/** 标签框估算（p05/p06 装配 font-size=3.2；0.58em/字符保守估宽，字高 1.05em）。
 *  仅用于 V4.6 标签避让判定，不参与几何/映射——映射仍是纯数值恒等式。 */
const LABEL_FONT = 3.2;
const LABEL_CHAR_W = 0.58 * LABEL_FONT;
const labelBox = (l: ViewLabel): { x0: number; x1: number; y0: number; y1: number } => {
  const w = l.text.length * LABEL_CHAR_W;
  const x0 = l.anchor === 'middle' ? l.x - w / 2 : l.x;
  return { x0, x1: x0 + w, y0: l.y - 0.8 * LABEL_FONT, y1: l.y + 0.25 * LABEL_FONT };
};
const boxesOverlap = (a: ViewLabel, b: ViewLabel, pad = 0): boolean => {
  const A = labelBox(a);
  const B = labelBox(b);
  return A.x0 < B.x1 + pad && B.x0 < A.x1 + pad && A.y0 < B.y1 + pad && B.y0 < A.y1 + pad;
};

/* ------------------------------------------------------------------ AC02 */

/** AC02 两圆弧外切（§3）：整圆1(C1,R1)、整圆2(C2,R2) 各 2 半圆 + 圆心点 + 连心虚线 +
 *  橙点外切点 + R1=/R2=/dZ= 标签 */
export function figureAC02(input: Record<string, number>): FigureView {
  const R1 = input.R1 ?? Number.NaN;
  const R2 = input.R2 ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / 越界（0 < dZ < R1+R2、R>0）原文上抛
  const solution = solveFor('AC02', input);

  // §3 表：C1 为坐标基准；C2=(dZ, √((R1+R2)²−dZ²))（arc-cases-a.ts 文件头 AC02）
  const C1: WP = { z: 0, r: 0 };
  const sum = R1 + R2;
  const C2: WP = { z: dZ, r: Math.sqrt(sum * sum - dZ * dZ) };
  const T = toWP(solution.tangent); // 橙点 = solver.tangent 映射

  const arcs: WArc[] = [...circleArcs(C1, R1), ...circleArcs(C2, R2)];
  const centerDots: WP[] = [C1, C2];
  const refDashes: WSeg[] = [{ from: C1, to: C2 }]; // 连心线

  // bbox 点集 = 全部被绘制实体：实线整圆走 circleExtremes（2 半圆拼圆自含四极值）；
  // 圆心 / 切点 / 连心线均落在圆内，不扩界
  const others: WP[] = [
    ...circleExtremes(C1, R1),
    ...circleExtremes(C2, R2),
    C1,
    C2,
    T,
  ];
  const map = makeMap(others);
  const C1v = map.toView(C1);
  const C2v = map.toView(C2);
  const Tv = map.toView(T);
  const s = map.scale;

  // §3 标签锚法（V4.12 Lead 补位，A4-R 实拍 FAIL 整改）：沿 ±e 逃逸 2.2 对 9.28 宽
  // 字盒几何不可行——最近角到圆心距离恒 < 半径（默认案 R1 角距 4.01 < 6），标签
  // 压小圆弧线。改侧距锚法（工程制图惯例）：R1 → C1 左侧中高、R2 → C2 右侧中高，
  // 盒缘距圆弧恒 0.6（RIM_CLEAR）；dZ → 底行 y=34−0.8（AC07/08 金样同款约定）对齐
  // C2 正下——对齐圆心中点则 C1 圆底点 (26,30.5) 距盒顶 30.64 仅 0.14 贴线，对齐
  // C2 时 C1 弧线在盒左缘 x=30.36 处 y=28.61，净距 2.03。
  const w = (text: string): number => text.length * LABEL_CHAR_W;
  const r1Text = `R1=${fmtFigureValue(R1)}`;
  const r2Text = `R2=${fmtFigureValue(R2)}`;
  const RIM_CLEAR = 0.6; // 弧线漆半宽 0.3 + 视觉余量 0.3
  const labels: ViewLabel[] = [
    {
      text: r1Text,
      x: Math.max(C1v.x - (R1 * s + RIM_CLEAR) - w(r1Text) / 2, 0.4 + w(r1Text) / 2),
      y: C1v.y,
      anchor: 'middle',
    },
    {
      text: r2Text,
      x: Math.min(C2v.x + R2 * s + RIM_CLEAR + w(r2Text) / 2, 63.6 - w(r2Text) / 2),
      y: C2v.y,
      anchor: 'middle',
    },
    {
      text: `dZ=${fmtFigureValue(dZ)}`,
      x: C2v.x,
      y: 33.2, // viewBox 高 34 − 字盒下沉 0.8（kit labelBox y1 = y+0.8）
      anchor: 'middle',
    },
  ];

  return {
    segs: [],
    arcs: arcs.map((a) => arcView(map, a)),
    axis: NO_AXIS,
    refDashes: refDashes.map((d) => segView(map, d)),
    refCircles: [],
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: [],
    labels,
    point: Tv,
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC03 */

/** AC03 两圆弧内切（§3）：同 AC02 双整圆轮廓；圆2 恒在圆1 内；R2 标签置圆2 内（A4 仲裁） */
export function figureAC03(input: Record<string, number>): FigureView {
  const R1 = input.R1 ?? Number.NaN;
  const R2 = input.R2 ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / 越界（R1>R2>0、0 < dZ < R1−R2）原文上抛
  const solution = solveFor('AC03', input);

  // §3 表：C2=(dZ, √((R1−R2)²−dZ²))（arc-cases-a.ts 文件头 AC03）
  const C1: WP = { z: 0, r: 0 };
  const diff = R1 - R2;
  const C2: WP = { z: dZ, r: Math.sqrt(diff * diff - dZ * dZ) };
  const T = toWP(solution.tangent); // 橙点 = solver.tangent 映射

  const arcs: WArc[] = [...circleArcs(C1, R1), ...circleArcs(C2, R2)];
  const centerDots: WP[] = [C1, C2];
  const refDashes: WSeg[] = [{ from: C1, to: C2 }]; // 连心线

  const others: WP[] = [
    ...circleExtremes(C1, R1),
    ...circleExtremes(C2, R2),
    C1,
    C2,
    T,
  ];
  const map = makeMap(others);
  const C1v = map.toView(C1);
  const C2v = map.toView(C2);
  const Tv = map.toView(T);
  const s = map.scale;

  // §3 标签锚法（V4.12 Lead 补位）：R1 在 C1 外侧沿 −e —— 沿 −e 逃逸对宽字盒几何
  // 不可行（同 AC02 勘误），改左侧中高侧距锚（盒缘距大圆弧 0.6）；R2 圆内置圆心点
  // 下方（V4.6-03 圆内居中在 A4-R 实拍 FAIL：圆心点漆 (36.86,10.52) 叠字——文字宽
  // 9.28 vs 小圆直径 10.8 余量仅 1.52，任何居中偏移必叠点或切弧，圆内仅在直径 ≥
  // 字宽 + 2×DOT_CLEAR 时放点下方）；否则圆外右侧 + 水平虚线引线到小圆右缘（V4.6
  // 机制原样，默认案 R2=10 即走此分支）；dZ 在圆心中点下方（圆1 底 +3，A4 实拍通过）
  const r2Text = `R2=${fmtFigureValue(R2)}`;
  const r2W = r2Text.length * LABEL_CHAR_W;
  const r2H = 1.05 * LABEL_FONT;
  // 圆心点下方净放距：点漆半径 ≈0.5 + 余量 0.3 + 字盒上高 0.8×3.2 = 3.36
  const DOT_CLEAR = 0.5 + 0.3 + 0.8 * LABEL_FONT;
  let r2Label: ViewLabel;
  let r2Leader: WSeg | null = null;
  if (2 * R2 * s >= r2W + 2 * DOT_CLEAR) {
    // 圆内点下方放得下（直径 ≥ 字宽 + 2×净放距）：盒角到圆心距
    // √((w/2)²+(DOT_CLEAR+0.8)²) ≤ R2·s − 0.3 恒成立（w/2 ≥1.3 时，代数可证）
    r2Label = { text: r2Text, x: C2v.x, y: C2v.y + DOT_CLEAR, anchor: 'middle' };
  } else {
    // 圆外右侧：文字框整体推到外圆（C1,R1）之外，留 0.8 余量；右缘钳位 ≤59
    const dy = Math.max(0, Math.abs(C1v.y - C2v.y) - r2H / 2);
    const need = Math.sqrt(Math.max(0, (R1 * s + 0.8) ** 2 - dy * dy));
    const x = Math.min(C1v.x + need + r2W / 2, 59 - r2W / 2);
    r2Label = { text: r2Text, x, y: C2v.y, anchor: 'middle' };
    r2Leader = {
      from: { z: C2.z + R2, r: C2.r }, // 小圆右缘
      to: { z: C2.z + (x - r2W / 2 - C2v.x) / s, r: C2.r }, // 标签左缘
    };
  }
  // dZ 底行 x：盒顶距大圆底弧 ≥0.3（弧漆半宽）→ 盒左缘 ≥ C1v.x + √((R1·s)² − (盒顶−0.3−C1v.y)²)。
  // 默认案：√(13.5²−13.34²)=2.07 → 盒左缘 ≥34.07，取 37.79（圆心中点 34.43 处弧底
  // (32,30.5) 距盒顶 30.64 仅 0.14 压漆，label-sweep Lead 补位机检拦截）
  const dzText = `dZ=${fmtFigureValue(dZ)}`;
  const dzRowY = Math.min(C1v.y + R1 * s + 3, 34 - 0.8); // 底行钳位（kit labelBox 下沉 0.8）
  const dzTop = dzRowY - 0.8 * LABEL_FONT;
  const dzClearX =
    C1v.x + Math.sqrt(Math.max(0, (R1 * s) ** 2 - (dzTop - 0.3 - C1v.y) ** 2));
  const labels: ViewLabel[] = [
    {
      text: `R1=${fmtFigureValue(R1)}`,
      x: Math.max(
        C1v.x - R1 * s - 0.6 - (`R1=${fmtFigureValue(R1)}`.length * LABEL_CHAR_W) / 2,
        0.4 + (`R1=${fmtFigureValue(R1)}`.length * LABEL_CHAR_W) / 2,
      ),
      y: C1v.y,
      anchor: 'middle',
    },
    r2Label,
    {
      text: dzText,
      x: Math.max(
        (C1v.x + C2v.x) / 2,
        dzClearX + (dzText.length * LABEL_CHAR_W) / 2 + 0.01,
      ),
      y: dzRowY,
      anchor: 'middle',
    },
  ];

  return {
    segs: [],
    arcs: arcs.map((a) => arcView(map, a)),
    axis: NO_AXIS,
    refDashes: [
      ...refDashes.map((d) => segView(map, d)),
      ...(r2Leader ? [segView(map, r2Leader)] : []),
    ],
    refCircles: [],
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: [],
    labels,
    point: Tv,
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC04 */

/** AC04 圆弧—斜线—圆弧（§3）：弧1 S1→P1（V4.4-01 伴弧）+ 线 P1↔P2 + 弧2 S2→P2
 *  （solver 冻结式）+ 两虚线整圆 + 圆心点 + C↔P 虚半径 ×2 + R1=/R2=/α 标签 */
export function figureAC04(input: Record<string, number>): FigureView {
  const R1 = input.R1 ?? Number.NaN;
  const R2 = input.R2 ?? Number.NaN;
  const alphaDeg = input.angle ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / R≤0 原文上抛
  const solution = solveFor('AC04', input);

  // §3 冻结算式（arc-cases-a.ts 文件头 AC04 + test:180-206）：
  //   u=(cosα,sinα)，n=rot90ccw(u)，P1=(0,0)，P2=(R1+R2)·u，
  //   C1=P1+R1·n，C2=P2+R2·n，S2=C2−R2·u；V4.4-01 伴弧 S1=C1−R1·u
  const alpha = deg2rad(alphaDeg);
  const u: WP = { z: Math.cos(alpha), r: Math.sin(alpha) };
  const n = rotCcw(u);
  const L = R1 + R2; // 冻结约定：斜线段长 = R1+R2
  const P1: WP = { z: 0, r: 0 };
  const P2 = addP(P1, mulP(u, L));
  const C1 = addP(P1, mulP(n, R1));
  const C2 = addP(P2, mulP(n, R2));
  const S2 = subP(C2, mulP(u, R2));
  const S1 = subP(C1, mulP(u, R1));
  const T = toWP(solution.tangent); // = P2（橙点 = solver.tangent 映射，单源）

  // 弧1 S1→P1：S1−C1=−R1·u（角 θ+180°），P1−C1=−R1·n（角 θ+270°）→ 逆时针 90° → cw=false；
  // 弧2 S2→P2：S2−C2=−R2·u，P2−C2=−R2·n → 逆时针 90°（solver 冻结 G03）→ cw=false
  const arcs: WArc[] = [
    { from: S1, to: P1, center: C1, radius: R1, cw: false },
    { from: S2, to: P2, center: C2, radius: R2, cw: false },
  ];
  const segs: WSeg[] = [{ from: P1, to: P2 }];
  const centerDots: WP[] = [C1, C2];
  const radiusDashes: WSeg[] = [
    { from: C1, to: P1 },
    { from: C2, to: P2 },
  ];

  // bbox：虚线整圆计四极值点（§2）；线段 / 弧 / 圆心 / 虚半径均在圆内
  const others: WP[] = [
    ...circleExtremes(C1, R1),
    ...circleExtremes(C2, R2),
    P1,
    P2,
    T,
    C1,
    C2,
    S1,
    S2,
  ];
  const map = makeMap(others);
  const P1v = map.toView(P1);
  const P2v = map.toView(P2);
  const C1v = map.toView(C1);
  const C2v = map.toView(C2);
  const s = map.scale;

  // §3 标签锚法：R1 沿虚半径中点 rotScreen(单位半径向量) 外移 5.4（V4.6-02b 实拍
  // 通过不动）。R2/α 在 V4.12 Lead 补位实拍 FAIL 重锚（A4-R 视觉终验）：
  //   R2=3（默认案）：5.4·rDir 锚的 est 盒 [38.19,42.86]×[13.71,17.07] 含过渡弧2
  //   下凸点 (42.0,16.74)（圆2 视图心 (42.0,10.12) r 6.62）→ 弧穿 R/2 字。改圆2
  //   右侧侧距锚（同 AC02/AC03 款）：x = C2v.x + R2·s + 0.6 + w/2，y = C2v.y——
  //   盒缘距虚线整圆2恒 0.6，距切线段/弧1 横向 ≥2.5（默认案实算）。
//   α45°（默认案）：P1 反向 −2.2 锚的 est 盒落在虚线整圆1（r 11.03）径向穿越带
//   [6.1,13.35] → 虚线穿 5 字。改斜线中点法向下侧距 d=5.5：45° 斜线到盒最近角
//   （右上角）距离 = d − 0.707·(w/2 + 2.56) = 5.5 − 4.43 = 1.07 ≥ 0.3（漆半宽；
//   0.707×(3.71+2.56)=4.43，α 盒 4 字宽半 3.71——V4.12 G2 C-01 勘正：初笔 5.09
//   误代 5 字半宽 4.64）；d 下界同式 ≈ 4.73，取 5.5。
  const r1Dir = rotScreen(unitView(subView(P1v, C1v)));
  const r1Label: ViewLabel = {
    text: `R1=${fmtFigureValue(R1)}`,
    x: midView(C1v, P1v).x + 5.4 * r1Dir.x,
    y: midView(C1v, P1v).y + 5.4 * r1Dir.y,
    anchor: 'middle',
  };
  const r2Text = `R2=${fmtFigureValue(R2)}`;
  const r2Label: ViewLabel = {
    text: r2Text,
    x: C2v.x + R2 * s + 0.6 + (r2Text.length * LABEL_CHAR_W) / 2,
    y: C2v.y,
    anchor: 'middle',
  };
  // 斜线中点 + 法向下侧（屏幕 y 向下：取法向 y 分量为正的一侧）：
  const mid = midView(P1v, P2v);
  const segDir = unitView(subView(P2v, P1v));
  const down =
    segDir.x >= 0 ? { x: -segDir.y, y: segDir.x } : { x: segDir.y, y: -segDir.x };
  const alphaLabel: ViewLabel = {
    text: `α${fmtFigureValue(alphaDeg)}°`,
    x: mid.x + 5.5 * down.x,
    y: mid.y + 5.5 * down.y,
    anchor: 'middle',
  };
  // 按 0.64/步（对角 0.905）向右上避让，直到与 R1/R2 框不重叠（留 0.4 净空）
  // 且字框不含任何圆心点（r=0.9 + 0.5 余量）；仍贴 P1 外侧上方，锚法语义不变。
  // （V4.6-02 修正：只上移会落到 C1 圆心点上，A4-R2 判 α30° 不可读。）
  const dotHit = (l: ViewLabel): boolean => {
    const b = labelBox(l);
    return [C1v, C2v].some(
      (c) => b.x0 < c.x + 1.4 && c.x - 1.4 < b.x1 && b.y0 < c.y + 1.4 && c.y - 1.4 < b.y1,
    );
  };
  for (
    let i = 0;
    i < 8 && (boxesOverlap(alphaLabel, r1Label, 0.4) || boxesOverlap(alphaLabel, r2Label, 0.4) || dotHit(alphaLabel));
    i += 1
  ) {
    alphaLabel.x += 0.64;
    alphaLabel.y -= 0.64;
  }
  alphaLabel.y = Math.max(alphaLabel.y, 4.2); // 不越内框顶（[4,60]×[3.5,30.5]）
  const labels: ViewLabel[] = [r1Label, r2Label, alphaLabel];

  const refCircles: ViewCircle[] = [
    { cx: C1v.x, cy: C1v.y, r: R1 * s },
    { cx: C2v.x, cy: C2v.y, r: R2 * s },
  ];

  return {
    segs: segs.map((seg) => segView(map, seg)),
    arcs: arcs.map((a) => arcView(map, a)),
    axis: NO_AXIS,
    refDashes: [],
    refCircles,
    centerDots: centerDots.map((p) => map.toView(p)),
    radiusDashes: radiusDashes.map((seg) => segView(map, seg)),
    labels,
    point: map.toView(T),
    scale: map.scale,
  };
}

/* ------------------------------------------------------------------ AC06 */

/** AC06 凹圆弧切入（§3）：入口段（裁轴）/ 弧 S→E / 出口段 + 圆心点 + C↔E 虚半径 +
 *  R/dX=/dZ= 标签；轴线 = 轮廓实体 z 范围（V4.4-04④） */
export function figureAC06(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const dX = input.dX ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  // 求解单源：缺键 / 非有限 / R≤0 / 0 < |chord| < 2R 原文上抛
  const solution = solveFor('AC06', input);

  // §3 冻结算式（arc-cases-a.ts:220-230）：S=(0,0)，E=S+c=(dZ,dX/2)，C=M+q·n；
  // tS/tE = rot90ccw(S−C)/R、rot90ccw(E−C)/R（G03 前刀架逆时针）
  const S: WP = { z: 0, r: 0 };
  const E = toWP(solution.tangent); // = 弦终点（橙点）
  const C = toWP(solution.center);
  const tS = mulP(rotCcw(subP(S, C)), 1 / R);
  const tE = mulP(rotCcw(subP(E, C)), 1 / R);
  const entry: WSeg = { from: subP(S, mulP(tS, 2.4 * R)), to: S }; // 2.4R 显示长度（V4.4-04①）
  const exit: WSeg = { from: E, to: addP(E, mulP(tE, 2.4 * R)) };

  // A4-R1：显示段裁至轴线 r≥0（两端均 <0 → 弃段）；裁后零长段（默认入口段与轴交于
  // S，t=1）同样弃段——§3「弃段或退化」两合规，取弃段避免圆帽线端渲染成伪点
  const segs: WSeg[] = [entry, exit]
    .map(clipSegAtAxis)
    .filter((seg): seg is WSeg => seg !== null)
    .filter((seg) => !(seg.from.z === seg.to.z && seg.from.r === seg.to.r));
  // 弧 = 求解实体不裁；S→E 逆时针（solver G03）→ cw=false
  const arc: WArc = { from: S, to: E, center: C, radius: R, cw: false };
  const arcPts = sampleArc(arc);

  // V4.4-04④：轴线 z 范围 = 其余轮廓实体（segs+arcs）z 范围，无额外延伸；
  // 标注类点 / 虚线（圆心点、C↔E 虚半径）不计入轴线跨度
  const contourPts: WP[] = [...segs.flatMap((seg) => [seg.from, seg.to]), ...arcPts];
  const zMin = Math.min(...contourPts.map((p) => p.z));
  const zMax = Math.max(...contourPts.map((p) => p.z));
  const axis: WSeg = { from: { z: zMin, r: 0 }, to: { z: zMax, r: 0 } };

  const others: WP[] = [...contourPts, C, E, axis.from, axis.to];
  const map = makeMap(others);
  const Sv = map.toView(S);
  const Ev = map.toView(E);
  const Cv = map.toView(C);
  const axisY = map.toView({ z: zMin, r: 0 }).y;
  const exitEndV = map.toView(exit.to);

  // §3 标签锚法：R 在 C↔E 虚半径中点 +3·rotScreen(单位半径向量)；
  // dX 在出口端点右侧（V4.6-04：原正下方 `+3` 被出口斜线穿框）——半宽按
  // 0.58em×字符数推算，右缘钳位 ≤59（内框右界 60）；dZ 在轴线下方 [S,E] 中点
  const rDir = rotScreen(unitView(subView(Ev, Cv)));
  const dXText = `dX=${fmtFigureValue(dX)}`;
  const dXHalf = (dXText.length * LABEL_CHAR_W) / 2;
  const labels: ViewLabel[] = [
    {
      text: `R${fmtFigureValue(R)}`,
      x: midView(Ev, Cv).x + 3 * rDir.x,
      y: midView(Ev, Cv).y + 3 * rDir.y,
      anchor: 'middle',
    },
    {
      text: dXText,
      x: Math.min(exitEndV.x + dXHalf + 1.0, 59 - dXHalf),
      y: exitEndV.y + 3.2,
      anchor: 'middle',
    },
    {
      text: `dZ=${fmtFigureValue(dZ)}`,
      x: midView(Sv, Ev).x,
      y: axisY + 3,
      anchor: 'middle',
    },
  ];

  return {
    segs: segs.map((seg) => segView(map, seg)),
    arcs: [arcView(map, arc)],
    axis: segView(map, axis),
    refDashes: [],
    refCircles: [],
    centerDots: [Cv],
    radiusDashes: [{ from: C, to: E }].map((seg) => segView(map, seg)),
    labels,
    point: Ev,
    scale: map.scale,
  };
}
