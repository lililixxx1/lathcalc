/**
 * anchors-v44.mjs · V4.4 G2 三路互证锚点脚本（Lead 预置，独立于 src 实现）
 *
 * 依据：docs/plan/WAVE-PLAN-V4.4.md §2（映射公式）+ §3/§4（各案实体表与公式源
 * arc-cases-a/b.ts）。**零 import src**——纯公式重算，作 G2 独立复算第三路
 * （reviewer 自算 / 本脚本 / vitest worker 测试）。
 *
 * 锚点案选取：AC04（a 组代表：双弧+线+refCircles+无轴线）、AC09（G0 勘正案）、
 * AC10（b 组代表：一般小弧+refCircle+轴线）。每案输出：bbox/s/x0/y0 +
 * tangent/center 视图坐标（8 位）。
 *
 * bbox 点集口径（V4.3 §2 沿用）：轮廓段端点 + 弧采样点 + refCircles 四极值 +
 * 圆心点 + 轴线端点；标签锚点不计。三案的弧采样点均落于圆极值/段端点构成的
 * 盒内（AC09 弧 180°→300° ccw 含 270° 点 r=3.66025<faceTop 18.16025；
 * AC10 弧 45.52°→90° 无内部 cardinal；AC04 弧在圆内），故盒=可枚举极值集。
 */
const f = (v) => Number(v.toFixed(8));

/** §2 映射：内框 [4,60]×[3.5,30.5] 等比居中 */
function mapOf(pts) {
  const zs = pts.map((p) => p.z);
  const rs = pts.map((p) => p.r);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const r0 = Math.min(...rs);
  const r1 = Math.max(...rs);
  const w = z1 - z0;
  const h = r1 - r0;
  const s = Math.min(56 / w, 27 / h);
  const x0 = 4 + (56 - w * s) / 2;
  const y0 = 30.5 - (27 - h * s) / 2;
  const toView = (p) => ({ x: x0 + (p.z - z0) * s, y: y0 - (p.r - r0) * s });
  return { s, x0, y0, w: f(w), h: f(h), toView };
}

const circleBox = (c, R) => [
  { z: c.z - R, r: c.r },
  { z: c.z + R, r: c.r },
  { z: c.z, r: c.r - R },
  { z: c.z, r: c.r + R },
];

/** AC04（§3 表 + V4.4-01）：R1=5,R2=3,α=45° */
function anchorAC04() {
  const R1 = 5;
  const R2 = 3;
  const a = (45 * Math.PI) / 180;
  const u = { z: Math.cos(a), r: Math.sin(a) };
  const n = { z: -u.r, r: u.z }; // rot90ccw(u)
  const P1 = { z: 0, r: 0 };
  const P2 = { z: (R1 + R2) * u.z, r: (R1 + R2) * u.r };
  const C1 = { z: R1 * n.z, r: R1 * n.r };
  const C2 = { z: P2.z + R2 * n.z, r: P2.r + R2 * n.r };
  const S1 = { z: C1.z - R1 * u.z, r: C1.r - R1 * u.r }; // V4.4-01 伴弧
  const S2 = { z: C2.z - R2 * u.z, r: C2.r - R2 * u.r }; // solver 冻结式
  // 守恒自检
  const near = (x, y) => Math.abs(x - y) < 1e-9;
  if (!near(Math.hypot(S1.z - C1.z, S1.r - C1.r), R1) || !near(Math.hypot(S1.z - P1.z, S1.r - P1.r), R1 * Math.SQRT2)) {
    throw new Error('AC04 S1 守恒失败');
  }
  if (!near(Math.hypot(S2.z - C2.z, S2.r - C2.r), R2) || !near(Math.hypot(S2.z - P2.z, S2.r - P2.r), R2 * Math.SQRT2)) {
    throw new Error('AC04 S2 守恒失败');
  }
  const pts = [...circleBox(C1, R1), ...circleBox(C2, R2), P1, P2, C1, C2, S1, S2];
  const m = mapOf(pts);
  return {
    case: 'AC04',
    input: { R1: 5, R2: 3, angle: 45 },
    bbox: { w: m.w, h: m.h },
    s: f(m.s),
    x0: f(m.x0),
    y0: f(m.y0),
    tangent: m.toView(P2),
    center2: m.toView(C2),
    s1: m.toView(S1),
    s2: m.toView(S2),
  };
}

/** AC09（§4 表，G0 勘正后口径）：R=5,α=30° */
function anchorAC09() {
  const R = 5;
  const a = (30 * Math.PI) / 180;
  const d = (R * (1 + Math.sin(a))) / Math.cos(a);
  const C = { z: R, r: d };
  const F = { z: 0, r: d };
  const T = { z: d * Math.cos(a), r: d * Math.sin(a) }; // G0 勘正：z=d·cosα, r=d·sinα
  const u = { z: Math.cos(a), r: Math.sin(a) };
  const coneEnd = { z: T.z + 2.4 * R * u.z, r: T.r + 2.4 * R * u.r };
  const faceTop = { z: 0, r: d + 1.9 * R };
  // 守恒自检：|T−C|=R；弧 F→T 两端半径
  const near = (x, y) => Math.abs(x - y) < 1e-9;
  if (!near(Math.hypot(T.z - C.z, T.r - C.r), R)) throw new Error('AC09 |T−C|≠R');
  if (!near(Math.hypot(F.z - C.z, F.r - C.r), R)) throw new Error('AC09 |F−C|≠R');
  const pts = [
    { z: 0, r: 0 },
    faceTop,
    F,
    T,
    C,
    coneEnd,
    { z: coneEnd.z, r: 0 }, // 轴线末端（轴线=轮廓 z 范围）
  ];
  const m = mapOf(pts);
  return {
    case: 'AC09',
    input: { R: 5, angle: 30 },
    bbox: { w: m.w, h: m.h },
    s: f(m.s),
    x0: f(m.x0),
    y0: f(m.y0),
    tangent: m.toView(T),
    center: m.toView(C),
    startF: m.toView(F),
    coneEnd: m.toView(coneEnd),
  };
}

/** AC10（§4 表）：R=5, lead=3.5 */
function anchorAC10() {
  const R = 5;
  const lead = 3.5;
  const C = { z: 0, r: 0 };
  const E = { z: lead, r: Math.sqrt(R * R - lead * lead) };
  const T = { z: 0, r: R };
  const near = (x, y) => Math.abs(x - y) < 1e-9;
  if (!near(Math.hypot(E.z - C.z, E.r - C.r), R)) throw new Error('AC10 |E−C|≠R');
  const cylStart = { z: -2.4 * R, r: R };
  const pts = [
    ...circleBox(C, R), // refCircle 四极值（含 (0,−5)——几何参照不裁）
    cylStart,
    T,
    E,
    { z: -2.4 * R, r: 0 },
    { z: lead, r: 0 },
  ];
  const m = mapOf(pts);
  return {
    case: 'AC10',
    input: { R: 5, lead: 3.5 },
    bbox: { w: m.w, h: m.h },
    s: f(m.s),
    x0: f(m.x0),
    y0: f(m.y0),
    tangent: m.toView(T),
    startE: m.toView(E),
  };
}

const out = [anchorAC04(), anchorAC09(), anchorAC10()].map((a) => ({
  ...a,
  tangent: { x: f(a.tangent.x), y: f(a.tangent.y) },
  ...(a.center ? { center: { x: f(a.center.x), y: f(a.center.y) } } : {}),
  ...(a.center2 ? { center2: { x: f(a.center2.x), y: f(a.center2.y) } } : {}),
  ...(a.startF ? { startF: { x: f(a.startF.x), y: f(a.startF.y) } } : {}),
  ...(a.startE ? { startE: { x: f(a.startE.x), y: f(a.startE.y) } } : {}),
  ...(a.s1 ? { s1: { x: f(a.s1.x), y: f(a.s1.y) } } : {}),
  ...(a.s2 ? { s2: { x: f(a.s2.x), y: f(a.s2.y) } } : {}),
  ...(a.coneEnd ? { coneEnd: { x: f(a.coneEnd.x), y: f(a.coneEnd.y) } } : {}),
}));
console.log(JSON.stringify(out, null, 2));
