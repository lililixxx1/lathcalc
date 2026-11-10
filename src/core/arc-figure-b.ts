/**
 * arc-figure-b.ts · 参数化图形 b 组六案：AC07 凸圆弧收尾 / AC08 端面切弧 /
 * AC09 锥面切弧 / AC10 圆弧螺纹入口 / AC11 球面收尾 / AC12 内孔圆弧过渡
 * （V4.4，worker-2 实现）
 *
 * 规格：docs/plan/WAVE-PLAN-V4.4.md §4（实体表 + 各点算式，源 arc-cases-b.ts:71-163；
 * solver 只输出 center/tangent——ArcSolution 无 start 字段，起点按 §4 算式构造）
 * + §1 显示约定 + §2 契约（工具全部取自 arc-figure-kit）。
 *
 * 装配口径（V4.3 §1/§2 + V4.4 §2 沿用）：
 *  - 轮廓段裁至轴线 r≥0（clipSegAtAxis；b 组各段构造即 r≥0，裁线为口径守卫）；
 *  - 弧 = 求解实体不裁；cw = solution.direction === 'G02'（前刀架图面顺时针冻结契约，
 *    solveFor 不传 rearToolPost，图形与刀架方位无关）；
 *  - 轴线 = 轮廓实体（segs+arcs）z 范围，标注类点/虚线不计（V4.4-04④）；
 *  - bbox = 全部被绘制实体（轮廓端点/弧采样/虚半径端点/圆心点/轴线）+ refCircles 四极值
 *    （V4.3 §2 + V4.4 §2 增量）；标签锚点不计。
 */
import type { FigureView } from './arc-figure';
import type { ViewLabel, WP, WArc, WSeg } from './arc-figure-kit';
import {
  addP,
  arcView,
  circleExtremes,
  clipSegAtAxis,
  deg2rad,
  fmtFigureValue,
  makeMap,
  midView,
  mulP,
  rotScreen,
  sampleArc,
  segView,
  solveFor,
  unitView,
} from './arc-figure-kit';

/** 虚线整圆参照（工件半径空间） */
interface CircleRef {
  center: WP;
  radius: number;
}

/** 六案共用的几何输入（裁线前） */
interface CaseGeometry {
  segs: readonly WSeg[];
  arc: WArc;
  center: WP;
  /** 橙点 = solution.tangent 映射（§4 每案末尾「橙点=map(tangent)」） */
  point: WP;
  radiusDashes: readonly WSeg[];
  refCircles: readonly CircleRef[];
}

/** 映射后的装配结果 */
interface Assembled {
  map: ReturnType<typeof makeMap>;
  segs: WSeg[];
  axis: WSeg;
  axisY: number;
}

/** 裁显示段 → 轴线（轮廓 z 范围）→ bbox（含 refCircles 极值）→ 等比映射 */
function assemble(geo: CaseGeometry): Assembled {
  const segs = geo.segs.map(clipSegAtAxis).filter((s): s is WSeg => s !== null);
  // 轴线跨度只取轮廓实体（V4.4-04④：标注类点/虚线不计入）
  const contourPts: WP[] = [
    ...segs.flatMap((s) => [s.from, s.to]),
    geo.arc.from,
    geo.arc.to,
    ...sampleArc(geo.arc),
  ];
  const zMin = Math.min(...contourPts.map((p) => p.z));
  const zMax = Math.max(...contourPts.map((p) => p.z));
  const axis: WSeg = { from: { z: zMin, r: 0 }, to: { z: zMax, r: 0 } };
  // bbox 点集 = 全部被绘制实体（V4.3 §2）+ refCircles 四极值（V4.4 §2）
  const bboxPts: WP[] = [
    ...contourPts,
    geo.center,
    ...geo.radiusDashes.flatMap((s) => [s.from, s.to]),
    ...geo.refCircles.flatMap((c) => circleExtremes(c.center, c.radius)),
    axis.from,
    axis.to,
  ];
  const map = makeMap(bboxPts);
  return { map, segs, axis, axisY: map.toView({ z: 0, r: 0 }).y };
}

/** 统一装配 FigureView（b 组六案共用；六案参照列均无 refDashes，§4 表） */
function render(geo: CaseGeometry, labels: (a: Assembled) => readonly ViewLabel[]): FigureView {
  const a = assemble(geo);
  const toView = a.map.toView;
  return {
    segs: a.segs.map((s) => segView(a.map, s)),
    arcs: [arcView(a.map, geo.arc)],
    axis: segView(a.map, a.axis),
    refDashes: [],
    refCircles: geo.refCircles.map((c) => {
      const center = toView(c.center);
      return { cx: center.x, cy: center.y, r: c.radius * a.map.scale };
    }),
    centerDots: [toView(geo.center)],
    radiusDashes: geo.radiusDashes.map((s) => segView(a.map, s)),
    labels: [...labels(a)],
    point: toView(geo.point),
    scale: a.map.scale,
  };
}

/** §4 通用 R 标签锚法：mid(切点v,Cv)+3·rotScreen(unit(切点v−Cv)) */
function radialLabel(a: Assembled, center: WP, tangent: WP, text: string): ViewLabel {
  const cv = a.map.toView(center);
  const tv = a.map.toView(tangent);
  const dir = rotScreen(unitView({ x: tv.x - cv.x, y: tv.y - cv.y }));
  const mid = midView(tv, cv);
  return { text, x: mid.x + 3 * dir.x, y: mid.y + 3 * dir.y, anchor: 'middle' };
}

/** 居中值标签 */
const valueLabel = (text: string, x: number, y: number): ViewLabel => ({
  text,
  x,
  y,
  anchor: 'middle',
});

/* ------------------------------------------------------------------ AC07 */

/** AC07 凸圆弧收尾（§4）：圆柱 (z_left,dX/2)→T1、弧 T1→T2、端面 T2→(dZ,0)、轴线=轮廓 z 范围 */
export function figureAC07(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const dX = input.dX ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  const solution = solveFor('AC07', input);
  const C: WP = { z: solution.center.z, r: solution.center.x / 2 }; // (dZ+R, dX/2−R)
  const T2: WP = { z: solution.tangent.z, r: solution.tangent.x / 2 }; // (dZ, dX/2−R)
  // solver 无 start 字段：外圆切点按 §4 构造 T1=(dZ+R, dX/2)
  const T1: WP = { z: dZ + R, r: dX / 2 };
  const zLeft = dZ - 2.8 * R; // V4.4-04② 墙起点左探 2.8R
  const arc: WArc = { from: T1, to: T2, center: C, radius: R, cw: solution.direction === 'G02' };
  return render(
    {
      segs: [
        { from: { z: zLeft, r: dX / 2 }, to: T1 }, // 圆柱
        { from: T2, to: { z: dZ, r: 0 } }, // 端面到轴线
      ],
      arc,
      center: C,
      point: T2,
      radiusDashes: [{ from: C, to: T2 }],
      refCircles: [],
    },
    (a) => [
      radialLabel(a, C, T2, `R${fmtFigureValue(R)}`),
      valueLabel(
        `Ø${fmtFigureValue(dX)}`,
        a.map.toView({ z: (zLeft + T1.z) / 2, r: dX / 2 }).x,
        // A4-R1（V4.4-06）：原「上方−3」在限高映射下顶线已居 y≈3.5，标签溢出
        // viewBox 被裁——改圆柱线下方+3，与 AC05（Ø 小径下）/AC12（Ø 孔壁下）同规
        a.map.toView({ z: 0, r: dX / 2 }).y + 3,
      ),
      valueLabel(`Z${fmtFigureValue(dZ)}`, a.map.toView({ z: dZ, r: 0 }).x, a.axisY + 3),
    ],
  );
}

/* ------------------------------------------------------------------ AC08 */

/** AC08 端面切弧（§4）：端面 (0,0)→(0,r_t+1.9R)、弧 E→T、轴线=(dZ,0)→(0,0) */
export function figureAC08(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const dZ = input.dZ ?? Number.NaN;
  const solution = solveFor('AC08', input);
  const C: WP = { z: solution.center.z, r: solution.center.x / 2 }; // (sign(dZ)·R, r_t)
  const T: WP = { z: solution.tangent.z, r: solution.tangent.x / 2 }; // (0, r_t)
  // solver 无 start 字段：§4 起点 E=(dZ,0)
  const E: WP = { z: dZ, r: 0 };
  const arc: WArc = { from: E, to: T, center: C, radius: R, cw: solution.direction === 'G02' };
  return render(
    {
      segs: [{ from: { z: 0, r: 0 }, to: { z: 0, r: T.r + 1.9 * R } }], // 端面（面顶 r_t+1.9R）
      arc,
      center: C,
      point: T,
      radiusDashes: [{ from: C, to: T }],
      refCircles: [],
    },
    (a) => [
      radialLabel(a, C, T, `R${fmtFigureValue(R)}`),
      valueLabel(`dZ=${fmtFigureValue(dZ)}`, a.map.toView({ z: dZ, r: 0 }).x, a.axisY + 3),
    ],
  );
}

/* ------------------------------------------------------------------ AC09 */

/** AC09 锥面切弧（§4）：端面 (0,0)→(0,d+1.9R)、弧 F→T、锥面 T→T+2.4R·u、轴线到锥面末端 */
export function figureAC09(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const angle = input.angle ?? Number.NaN;
  const solution = solveFor('AC09', input);
  const alpha = deg2rad(angle);
  const C: WP = { z: solution.center.z, r: solution.center.x / 2 }; // (R, d)
  const T: WP = { z: solution.tangent.z, r: solution.tangent.x / 2 }; // (d·cosα, d·sinα)
  // solver 无 start 字段：§4 端面切点 F=(0,d)
  const F: WP = { z: 0, r: C.r };
  const u: WP = { z: Math.cos(alpha), r: Math.sin(alpha) }; // 锥面母线方向
  const coneEnd = addP(T, mulP(u, 2.4 * R)); // V4.4-04① 锥面延伸 2.4R
  const arc: WArc = { from: F, to: T, center: C, radius: R, cw: solution.direction === 'G02' };
  return render(
    {
      segs: [
        { from: { z: 0, r: 0 }, to: { z: 0, r: C.r + 1.9 * R } }, // 端面（面顶 d+1.9R）
        { from: T, to: coneEnd }, // 锥面
      ],
      arc,
      center: C,
      point: T,
      radiusDashes: [{ from: C, to: T }],
      refCircles: [],
    },
    (a) => {
      const tv = a.map.toView(T);
      const ev = a.map.toView(coneEnd);
      const mid = midView(tv, ev);
      // α 标签：锥面段中点 − 2.2·rotScreen(u_view)，u_view=(cosα,−sinα)（§4 / V4.3 α 式）
      const uView = unitView({ x: Math.cos(alpha), y: -Math.sin(alpha) });
      const off = rotScreen(uView);
      return [
        radialLabel(a, C, T, `R${fmtFigureValue(R)}`),
        valueLabel(
          `α${fmtFigureValue(angle)}°`,
          mid.x - 2.2 * off.x,
          mid.y - 2.2 * off.y,
        ),
      ];
    },
  );
}

/* ------------------------------------------------------------------ AC10 */

/** AC10 圆弧螺纹入口（§4）：圆柱 (−2.4R,R)→T、弧 E→T、轴线 (−2.4R,0)→(lead,0)、refCircle(C,R) */
export function figureAC10(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const lead = input.lead ?? Number.NaN;
  const solution = solveFor('AC10', input);
  const C: WP = { z: solution.center.z, r: solution.center.x / 2 }; // (0,0)
  const T: WP = { z: solution.tangent.z, r: solution.tangent.x / 2 }; // (0,R)
  // solver 无 start 字段：§4 起点 E=(lead, √(R²−lead²))
  const E: WP = { z: lead, r: Math.sqrt(R * R - lead * lead) };
  const arc: WArc = { from: E, to: T, center: C, radius: R, cw: solution.direction === 'G02' };
  return render(
    {
      segs: [{ from: { z: -2.4 * R, r: R }, to: T }], // 圆柱
      arc,
      center: C,
      point: T,
      radiusDashes: [{ from: C, to: T }],
      refCircles: [{ center: C, radius: R }], // 虚线整圆参照（§4）
    },
    (a) => {
      const cv = a.map.toView(C);
      // V4.12 Lead 补位（A4-R 实拍 FAIL 重锚）：
      //   R5：cv.y 即轴线 y（C.r=0），原 y=cv.y 锚的 est 盒 [23.89,27.61]×[14.44,17.8]
      //   被灰色轴线（y=17）横穿 → 下移 2.86（= 0.3 漆半宽 + 2.56 字盒上高）到轴下，
      //   盒顶距轴 0.3；x 不动（盒右缘 27.61 < 虚线整圆左缘 27.95，横向圆外）。
      //   lead=3.5：原 mid(T,E)+3.5 锚的 est 盒 x∈[48.72,52.08] 段被虚线整圆与实弧
      //   穿越 → 移到 R 标签同排左侧（轴下注记行）：x = R 盒左缘 − 1.6 − w/2，
      //   与 R 盒净距 1.6 ≥1.5（label-sweep 阈）；盒 x∈[7.4,22.4] 全在虚线圆
      //   x∈[27.95,54.95] 之左，横向圆外。
      const rText = `R${fmtFigureValue(R)}`;
      const leadText = `lead=${fmtFigureValue(lead)}`;
      const wHalf = (text: string): number => (text.length * 0.58 * 3.2) / 2;
      const rX = cv.x - (R * a.map.scale + 2.2);
      return [
        valueLabel(rText, rX, cv.y + 2.86),
        valueLabel(
          leadText,
          Math.max(rX - wHalf(rText) - 1.6 - wHalf(leadText), 0.4 + wHalf(leadText)),
          cv.y + 2.86,
        ),
      ];
    },
  );
}

/* ------------------------------------------------------------------ AC11 */

/** AC11 球面收尾（§4）：弧 P→T、圆柱 (0,R)→(2.4R,R)、轴线 (−R,0)→(2.4R,0)、refCircle(C,R) */
export function figureAC11(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const solution = solveFor('AC11', input);
  const C: WP = { z: solution.center.z, r: solution.center.x / 2 }; // (0,0)
  const T: WP = { z: solution.tangent.z, r: solution.tangent.x / 2 }; // (0,R)
  // solver 无 start 字段：§4 极点 P=(−R,0)
  const P: WP = { z: -R, r: 0 };
  const arc: WArc = { from: P, to: T, center: C, radius: R, cw: solution.direction === 'G02' };
  return render(
    {
      segs: [{ from: { z: 0, r: R }, to: { z: 2.4 * R, r: R } }], // 圆柱（V4.4-04① 2.4R）
      arc,
      center: C,
      point: T,
      radiusDashes: [{ from: C, to: T }],
      refCircles: [{ center: C, radius: R }], // 虚线整圆参照（§4）
    },
    (a) => [radialLabel(a, C, T, `R${fmtFigureValue(R)}`)],
  );
}

/* ------------------------------------------------------------------ AC12 */

/** AC12 内孔过渡（§4）：孔壁 (R−2.8R,boreD/2)→T1、弧 T1→T2、底面上延 1.9R */
export function figureAC12(input: Record<string, number>): FigureView {
  const R = input.R ?? Number.NaN;
  const boreD = input.boreD ?? Number.NaN;
  const solution = solveFor('AC12', input);
  const C: WP = { z: solution.center.z, r: solution.center.x / 2 }; // (R, boreD/2+R)
  const T2: WP = { z: solution.tangent.z, r: solution.tangent.x / 2 }; // (0, boreD/2+R)
  // solver 无 start 字段：§4 孔壁切点 T1=(R, boreD/2)
  const T1: WP = { z: R, r: boreD / 2 };
  const zLeft = R - 2.8 * R; // V4.4-04② 孔壁左探 2.8R
  const arc: WArc = { from: T1, to: T2, center: C, radius: R, cw: solution.direction === 'G02' };
  return render(
    {
      segs: [
        { from: { z: zLeft, r: boreD / 2 }, to: T1 }, // 孔壁
        { from: { z: 0, r: boreD / 2 + R }, to: { z: 0, r: boreD / 2 + R + 1.9 * R } }, // 底面上延
      ],
      arc,
      center: C,
      point: T2,
      radiusDashes: [{ from: C, to: T2 }],
      refCircles: [],
    },
    (a) => [
      radialLabel(a, C, T2, `R${fmtFigureValue(R)}`),
      valueLabel(
        `Ø${fmtFigureValue(boreD)}`,
        a.map.toView({ z: (zLeft + R) / 2, r: 0 }).x,
        a.map.toView({ z: 0, r: boreD / 2 }).y + 3,
      ),
    ],
  );
}
