/**
 * arc-figure.test.ts · 参数化工况图形（V4.3 试点 AC01/AC05）
 *
 * 双盲对拍：期望值由**文件头冻结模型公式**（arc-cases-a.ts 头注）独立代入推导
 * （实现侧走 solve()+四分之一弧旋转导出，测试侧走 C=P−R·n / S=C−R·u 直代），
 * 再按 WAVE-PLAN-V4.3 §2 映射式换算 viewBox——两条路径互证。
 * 数值纪律：期望值全部附算式与来源，无裸值。
 */
import { describe, expect, it } from 'vitest';
import { buildArcFigure, fmtFigureValue, PARAMETRIC_CASES } from '../src/core/arc-figure';
import {
  resolveLabelOverlaps,
  type ParametricCaseId,
  type ViewLabel,
} from '../src/core/arc-figure-kit';

const C45 = Math.cos(Math.PI / 4); // cos45° = 0.7071067811865476
const S45 = Math.sin(Math.PI / 4);

/** V4.3 §2 映射式（冻结契约，测试与实现共用该规格定义） */
function mapSpec(zMin: number, zMax: number, rMin: number, rMax: number) {
  const w = zMax - zMin;
  const h = rMax - rMin;
  const s = Math.min(56 / w, 27 / h);
  const x0 = 4 + (56 - w * s) / 2;
  const y0 = 30.5 - (27 - h * s) / 2;
  return { s, x: (z: number) => x0 + (z - zMin) * s, y: (r: number) => y0 - (r - rMin) * s };
}

describe('arc-figure · AC01 直线—圆弧相切', () => {
  // 算式（源：arc-cases-a.ts 文件头 AC01 + V4.3 §3 金锚，测试独立代入）：
  //   P=(0,18)（r=stepD/2=36/2）；C=(R·sin45°, 18−R·cos45°)=(3.53553,14.46447)
  //   S=C−R·u=(0,10.92893)；Ld=2.4·5+0.25·36=21
  //   线端 z=±21·cos45°=±14.84924、r 上界=18+21·sin45°=32.84924
  //   直腿端=S−2.4R·n，n=(−sin45°,cos45°) → (8.48528, 2.44365)
  //   bbox：z∈[−14.84924,14.84924]、r∈[0,32.84924]（轴线 r=0 计入；直腿端 r=2.44365>0）
  //   s=min(56/29.69848, 27/32.84924)=0.82194（h 定界）；x0=19.79486；y0=30.5
  const R = 5;
  const stepD = 36;
  const fig = buildArcFigure('AC01', { R, angle: 45, stepD });

  const zC = R * S45;
  const rC = stepD / 2 - R * C45;
  const Ld = 2.4 * R + 0.25 * stepD; // = 21
  const zExt = Ld * C45; // = 14.84924
  const m = mapSpec(-zExt, zExt, 0, stepD / 2 + Ld * S45);

  it('金锚：切点/圆心/弧起点 viewBox 坐标逐位对拍（两条独立推导路径）', () => {
    expect(fig.point.x).toBeCloseTo(m.x(0), 5); // P.z = 0
    expect(fig.point.y).toBeCloseTo(m.y(stepD / 2), 5); // P.r = 18
    expect(fig.centerDots[0]!.x).toBeCloseTo(m.x(zC), 5);
    expect(fig.centerDots[0]!.y).toBeCloseTo(m.y(rC), 5);
    const Sv = { x: fig.arcs[0]!.x1, y: fig.arcs[0]!.y1 }; // 弧起点 = S
    expect(Sv.x).toBeCloseTo(m.x(zC - R * C45), 5); // S.z = R(sin45°−cos45°) = 0
    expect(Sv.y).toBeCloseTo(m.y(rC - R * S45), 5); // S.r = 10.92893
  });

  it('不变量：|Pv−Cv| = R·s；|Sv−Pv| = R√2·s；rx = R·s；sweep=1（图面顺时针）', () => {
    const P = fig.point;
    const C = fig.centerDots[0]!;
    const arc = fig.arcs[0]!;
    expect(Math.hypot(P.x - C.x, P.y - C.y)).toBeCloseTo(R * m.s, 5);
    expect(Math.hypot(arc.x1 - P.x, arc.y1 - P.y)).toBeCloseTo(R * Math.SQRT2 * m.s, 5);
    expect(arc.rx).toBeCloseTo(R * m.s, 5);
    expect(arc.sweep).toBe(1); // 前刀架 G02 = (z,r) 顺时针 → 屏幕 sweep=1（§2）
    expect(fig.scale).toBeCloseTo(m.s, 9);
  });

  it('全部绘制实体落在 viewBox 0–64 × 0–34 内', () => {
    const pts: { x: number; y: number }[] = [];
    for (const s of [fig.axis, ...fig.segs, ...fig.refDashes, ...fig.radiusDashes]) {
      pts.push({ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 });
    }
    for (const a of fig.arcs) pts.push({ x: a.x1, y: a.y1 }, { x: a.x2, y: a.y2 });
    for (const c of fig.centerDots) pts.push(c);
    for (const l of fig.labels) pts.push(l);
    pts.push(fig.point);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(64);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(33.6); // 轴线下标签基线 ≤ y_axis+3 ≤ 33.5+0.1 容差
    }
    expect(fig.arcs[0]!.rx).toBeLessThanOrEqual(34);
  });

  it('值标签回显求解器真值：R5 / α45° / Ø36（V4.3-01）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R5', 'α45°', 'Ø36']);
  });

  it('参数响应：R 5→20 图变（比例缩小、屏上弧变厚、标签 R20）', () => {
    // 算式：R=20 时 Ld=2.4·20+0.25·36=57；bbox w=2·57·cos45°=80.61、
    // h=18+57·sin45°=58.305 → s=min(56/80.61, 27/58.305)=0.46308（h 定界）；
    // rx₂=20·0.46309=9.26 > rx₁=5·0.82194=4.11（屏上弧更厚）
    const fig2 = buildArcFigure('AC01', { R: 20, angle: 45, stepD });
    expect(fig2.scale).toBeLessThan(fig.scale);
    expect(fig2.arcs[0]!.rx).toBeGreaterThan(fig.arcs[0]!.rx);
    expect(fig2.labels.map((l) => l.text)).toEqual(['R20', 'α45°', 'Ø36']);
    expect(fig2.arcs[0]!.sweep).toBe(1); // 形变向不变
  });

  it('参数响应：α 45→75 与 stepD 36→60 标签随值（α75° / Ø60）', () => {
    const fig3 = buildArcFigure('AC01', { R, angle: 75, stepD: 60 });
    expect(fig3.labels.map((l) => l.text)).toEqual(['R5', 'α75°', 'Ø60']);
  });

  it('刀架无关：rearToolPost 键被择除，图形逐位不变（§1）', () => {
    const rear = buildArcFigure('AC01', { R, angle: 45, stepD, rearToolPost: 1 });
    expect(JSON.stringify(rear)).toBe(JSON.stringify(fig));
  });

  it('A4-R1 裁线：α30°/R12/Ø50 直腿止于轴线（不穿轴压 Ø 标签）', () => {
    // 算式：E=S−2.4R·n=(10.008,−16.336) r<0 → 裁至 r=0 交点 z≈0.568；
    // 切线 A.r=25−(2.4·12+0.25·50)·sin30°=4.85>0 不裁
    const clipped = buildArcFigure('AC01', { R: 12, angle: 30, stepD: 50 });
    const leg = clipped.segs[1]!;
    expect(Math.abs(leg.y1 - clipped.axis.y1) < 1e-9 || Math.abs(leg.y2 - clipped.axis.y1) < 1e-9).toBe(true);
    expect(Math.max(leg.y1, leg.y2)).toBeLessThanOrEqual(clipped.axis.y1 + 1e-9);
    const line = clipped.segs[0]!;
    expect(Math.max(line.y1, line.y2)).toBeLessThan(clipped.axis.y1 - 1);
  });

  it('A4-R1 弃段：R20/α30°/Ø20 直腿两端 r<0 整段弃，弧为求解实体保真不裁', () => {
    // 算式：C=(10,−7.32)、S=(−7.32,−17.32)，E=S−48n=(16.68,−58.9) 两端 r<0 → 弃
    const dropped = buildArcFigure('AC01', { R: 20, angle: 30, stepD: 20 });
    expect(dropped.segs).toHaveLength(1); // 仅剩裁后的切线
    expect(dropped.arcs).toHaveLength(1);
  });

  it('异常上抛：R≤0 / 缺键（solve 原文，UI 保上一帧）', () => {
    expect(() => buildArcFigure('AC01', { R: 0, angle: 45, stepD })).toThrow(/R must be > 0/);
    expect(() => buildArcFigure('AC01', { R, stepD })).toThrow(/missing or non-finite/);
  });
});

describe('arc-figure · AC05 台阶倒圆', () => {
  // 算式（源：arc-cases-a.ts 文件头 AC05 + V4.3 §4 金锚，测试独立代入）：
  //   P=(stepZ, stepX/2+R)=(−10,14)；C=(stepZ−R, stepX/2+R)=(−14,14)；Q=(−14,10)
  //   z_left=stepZ−2.8R=−21.2；r_top=stepX/2+1.9R=17.6
  //   bbox：z∈[−21.2,0]（w=21.2）、r∈[0,17.6]（h=17.6）
  //   s=min(56/21.2, 27/17.6)=1.53409（h 定界）；x0=4+(56−21.2·s)/2=15.73864；y0=30.5
  const R = 4;
  const stepX = 20;
  const stepZ = -10;
  const fig = buildArcFigure('AC05', { R, stepX, stepZ });

  const zLeft = stepZ - 2.8 * R; // = −21.2
  const m = mapSpec(zLeft, 0, 0, stepX / 2 + 1.9 * R);

  it('金锚：切点/圆心/弧起点（Q）viewBox 坐标逐位对拍', () => {
    expect(fig.point.x).toBeCloseTo(m.x(stepZ), 5);
    expect(fig.point.y).toBeCloseTo(m.y(stepX / 2 + R), 5); // P.r = 14
    expect(fig.centerDots[0]!.x).toBeCloseTo(m.x(stepZ - R), 5); // C.z = −14
    expect(fig.centerDots[0]!.y).toBeCloseTo(m.y(stepX / 2 + R), 5); // C.r = 14（C 与 P 同高）
    expect(fig.arcs[0]!.x1).toBeCloseTo(m.x(stepZ - R), 5); // Q.z = −14
    expect(fig.arcs[0]!.y1).toBeCloseTo(m.y(stepX / 2), 5); // Q.r = 10
  });

  it('不变量与方向：|Pv−Cv| = R·s；sweep=0（图面逆时针 G03）；rx = R·s', () => {
    const P = fig.point;
    const C = fig.centerDots[0]!;
    expect(Math.hypot(P.x - C.x, P.y - C.y)).toBeCloseTo(R * m.s, 5);
    expect(fig.arcs[0]!.sweep).toBe(0);
    expect(fig.arcs[0]!.rx).toBeCloseTo(R * m.s, 5);
    expect(fig.scale).toBeCloseTo(m.s, 9);
  });

  it('实体齐套：轴线 r=0 / 端面 / 小径 / 台阶面 / 大径显示段 + 角点残料双虚线', () => {
    // 残料虚线 Q→K→P（K=尖角 (stepZ, stepX/2)=(−10,10)，§4 算式注：仅触弧于 Q/P）
    expect(fig.refDashes).toHaveLength(2);
    const kx = m.x(stepZ);
    const ky = m.y(stepX / 2);
    expect(fig.refDashes[0]!.x2).toBeCloseTo(kx, 5);
    expect(fig.refDashes[0]!.y2).toBeCloseTo(ky, 5);
    expect(fig.refDashes[1]!.x1).toBeCloseTo(kx, 5);
    expect(fig.refDashes[1]!.y1).toBeCloseTo(ky, 5);
    // 轴线：r=0（屏幕 y = y0），z 覆盖 [z_left, 0]
    expect(fig.axis.y1).toBeCloseTo(m.y(0), 5);
    expect(fig.axis.x1).toBeCloseTo(m.x(zLeft), 5);
    expect(fig.axis.x2).toBeCloseTo(m.x(0), 5);
    // 轮廓段数 = 端面+小径+台阶面+大径显示段 = 4（§4 表）
    expect(fig.segs).toHaveLength(4);
  });

  it('值标签：R4 / Ø20 / Z-10（V4.3-01；Z 负值原样 ASCII 连字符）', () => {
    expect(fig.labels.map((l) => l.text)).toEqual(['R4', 'Ø20', 'Z-10']);
  });

  it('参数响应：stepZ −10→−40 走 w 定界分支，图变且界内，标签 Z-40', () => {
    // 算式：z_left=−40−11.2=−51.2 → w=51.2、h=17.6 → s=min(56/51.2,27/17.6)=1.09375（w 定界）
    const fig2 = buildArcFigure('AC05', { R, stepX, stepZ: -40 });
    expect(fig2.scale).toBeLessThan(fig.scale); // 1.09375 < 1.53409
    expect(fig2.labels.map((l) => l.text)).toEqual(['R4', 'Ø20', 'Z-40']);
    expect(fig2.axis.x1).toBeGreaterThanOrEqual(0);
    expect(fig2.axis.x2).toBeLessThanOrEqual(64);
    for (const l of fig2.labels) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.x).toBeLessThanOrEqual(64);
    }
  });

  it('参数响应：stepX 20→50 与 R 4→8 标签随值（Ø50 / R8）', () => {
    const fig3 = buildArcFigure('AC05', { R: 8, stepX: 50, stepZ });
    expect(fig3.labels.map((l) => l.text)).toEqual(['R8', 'Ø50', 'Z-10']);
  });
});

describe('arc-figure · 契约面', () => {
  it('PARAMETRIC_CASES = 全 12 案（V4.4-05 集成翻转，v0.5.0；AC01–AC12 升序）', () => {
    expect(PARAMETRIC_CASES).toEqual([
      'AC01', 'AC02', 'AC03', 'AC04', 'AC05', 'AC06',
      'AC07', 'AC08', 'AC09', 'AC10', 'AC11', 'AC12',
    ]);
  });

  it('fmtFigureValue：去尾零 / 整数无点 / −0 归 0（与 fmtCoord 同规则）', () => {
    expect(fmtFigureValue(5)).toBe('5');
    expect(fmtFigureValue(4.5)).toBe('4.5');
    expect(fmtFigureValue(-10)).toBe('-10');
    expect(fmtFigureValue(3.14159)).toBe('3.142'); // Math.round(v·1000)/1000
    expect(fmtFigureValue(-0)).toBe('0');
  });
});

describe('arc-figure · V4.12-A 标签防碰撞后处理契约（kit resolveLabelOverlaps）', () => {
  // 判定口径（派工单预置）：font=3.2（p05.ts:336）；估宽 0.58em=1.856（a2:50-58）；
  // 字高框 [y−2.56, y+0.8]；净距 = axis-gap max（a2:59-63 先例式）；阈值 1.5。
  const FONT = 3.2;
  const CHAR_W = 0.58 * FONT;
  const box = (l: ViewLabel) => {
    const w = l.text.length * CHAR_W;
    const x0 = l.anchor === 'middle' ? l.x - w / 2 : l.x;
    return { x0, x1: x0 + w, y0: l.y - 0.8 * FONT, y1: l.y + 0.25 * FONT };
  };
  const gap = (
    a: { x0: number; x1: number; y0: number; y1: number },
    b: { x0: number; x1: number; y0: number; y1: number },
  ) => Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1);

  it('硬约束①：输出保序保文保锚（数组序与 text 不变，ui-p06-param.test.ts:77-88 有序断言前提）', () => {
    // 合成三标签：前两框叠印（middle 同点位），第三框与前者 x 重叠
    const src: ViewLabel[] = [
      { text: 'R5', x: 30, y: 10, anchor: 'middle' },
      { text: 'α45°', x: 30, y: 10, anchor: 'middle' },
      { text: 'Ø36', x: 33, y: 33.5, anchor: 'middle' },
    ];
    const out = resolveLabelOverlaps(src);
    expect(out.map((l) => l.text)).toEqual(['R5', 'α45°', 'Ø36']);
    expect(out.map((l) => l.anchor)).toEqual(['middle', 'middle', 'middle']);
    expect(out).toHaveLength(src.length);
    // labels[0] 优先级最高：永不避让，仅钳位（本例在界内 → 原位不动）
    expect(out[0]!.x).toBe(src[0]!.x);
    expect(out[0]!.y).toBe(src[0]!.y);
    // 输入对象不被原地改写（纯函数）
    expect(src[1]!.x).toBe(30);
    expect(src[1]!.y).toBe(10);
  });

  it('避让生效：冲突标签 nudge 后两两净距 ≥1.5u 且全部落 viewBox 64×34 内', () => {
    const src: ViewLabel[] = [
      { text: 'R5', x: 30, y: 10, anchor: 'middle' },
      { text: 'α45°', x: 30, y: 10, anchor: 'middle' }, // 与 labels[0] 完全叠印
      { text: 'Ø36', x: 33, y: 33.5, anchor: 'middle' }, // 降部 0.8 越下缘（33.5+0.8=34.3>34）
    ];
    const out = resolveLabelOverlaps(src);
    const boxes = out.map(box);
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        expect(gap(boxes[i]!, boxes[j]!)).toBeGreaterThanOrEqual(1.5);
      }
      expect(boxes[i]!.x0).toBeGreaterThanOrEqual(0);
      expect(boxes[i]!.x1).toBeLessThanOrEqual(64);
      expect(boxes[i]!.y0).toBeGreaterThanOrEqual(0);
      expect(boxes[i]!.y1).toBeLessThanOrEqual(34);
    }
    // 确定性：同输入两次调用逐位一致
    expect(JSON.stringify(resolveLabelOverlaps(src))).toBe(JSON.stringify(out));
  });

  it('anchor="end" 立即上抛（估宽口径未定义，防未来静默错算——派工单口径）', () => {
    expect(() =>
      resolveLabelOverlaps([{ text: 'X', x: 10, y: 10, anchor: 'end' }]),
    ).toThrow(/anchor="end"/);
  });

  it('buildArcFigure 出口已应用：12 案默认值 labels 两两净距 ≥1.5u 且锚点全界内（口径同 sweep）', () => {
    // 默认值源 src/ui/pages/p06.ts:105-118（逐案 :行；与 test/label-sweep.test.ts 同源同值）
    const defaults: Record<ParametricCaseId, Record<string, number>> = {
      AC01: { R: 5, angle: 45, stepD: 36 }, // p06.ts:106
      AC02: { R1: 10, R2: 15, dZ: 15 }, // p06.ts:107
      AC03: { R1: 25, R2: 10, dZ: 9 }, // p06.ts:108
      AC04: { R1: 5, R2: 3, angle: 45 }, // p06.ts:109
      AC05: { R: 4, stepX: 20, stepZ: -10 }, // p06.ts:110
      AC06: { R: 10, dX: 12, dZ: 8 }, // p06.ts:111
      AC07: { R: 5, dX: 30, dZ: -30 }, // p06.ts:112
      AC08: { R: 6, dZ: -4 }, // p06.ts:113
      AC09: { R: 5, angle: 30 }, // p06.ts:114
      AC10: { R: 5, lead: 3.5 }, // p06.ts:115
      AC11: { R: 10 }, // p06.ts:116
      AC12: { R: 3, boreD: 20 }, // p06.ts:117
    };
    for (const id of PARAMETRIC_CASES) {
      const fig = buildArcFigure(id, defaults[id]!);
      const boxes = fig.labels.map(box);
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          expect(gap(boxes[i]!, boxes[j]!)).toBeGreaterThanOrEqual(1.5);
        }
        expect(boxes[i]!.x0).toBeGreaterThanOrEqual(0);
        expect(boxes[i]!.x1).toBeLessThanOrEqual(64);
        expect(boxes[i]!.y0).toBeGreaterThanOrEqual(0);
        expect(boxes[i]!.y1).toBeLessThanOrEqual(34);
      }
    }
  });
});
