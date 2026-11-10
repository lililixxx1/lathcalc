/**
 * test/label-sweep.test.ts · p06 圆弧工况图标签防重叠扫查（V4.12-A）
 *
 * 判定口径（派工单预置，禁自选他套估宽；全文见 docs/evidence/V4.12-A/README.md）：
 *  - 字号 font = 3.2 view-unit（源 src/ui/pages/p05.ts:336 font-size="3.2" 渲染真值
 *    + src/core/arc-figure-a2.ts:53 LABEL_FONT）
 *  - 估宽 1.856 u/西文字符（= 0.58 × 3.2，源 src/core/arc-figure-a2.ts:50-58 labelBox
 *    现行推导）；CJK 字符按 3.2 u/字符（1em；现 12 案标签实测 Latin/符号）
 *  - 字高框 [y − 2.56, y + 0.8]（0.8em + 0.25em 基线框，同源 a2:50-58）
 *  - 锚语义：start = bbox 左缘 x 起；middle = bbox 中心 x；anchor='end' 立即断言失败
 *    （现 12 案无 end 用例，防未来静默错算）
 *  - 间距 = 两 bbox 净距（axis-gap max，同 V4.6-02 boxesOverlap pad 口径：
 *    src/core/arc-figure-a2.ts:59-63 / test/arc-figure-a2.test.ts:788 先例式），
 *    验收阈值 ≥1.5 view-unit（1.5/1.856 ≈ 0.81 字符宽 ≈ 64 宽 viewBox 的 2.3%；
 *    较 V4.6 0.4u 净空先例收紧——用户可分辨而非仅不叠印）
 *  - viewBox 64×34：全部 est. bbox 落 [0,64]×[0,34] 内（含边界）
 *
 * 输入集：12 案默认值（源 src/ui/pages/p06.ts:105-118 DEFAULTS，逐案注 :行）
 * + 每案既有边界输入组（逐组注测试文件 :行；来源为 test/arc-cases-a.test.ts /
 * arc-cases-b.test.ts 冻结例题，辅以 golden 图形测试既有用例参数——纯数值自造输入
 * 违反数值纪律，故只用既有用例参数，可满足处已注满 ≥2 组）。
 */
import { describe, expect, it } from 'vitest';
import { buildArcFigure } from '../src/core/arc-figure';
import type { ParametricCaseId, ViewLabel } from '../src/core/arc-figure-kit';

/* ---- 判定口径常量（全部附算式与来源，见文件头） ---- */
const FONT = 3.2; // p05.ts:336 font-size="3.2"
const CHAR_W = 0.58 * FONT; // = 1.856 u/西文字符（a2:50-58）
const CJK_W = FONT; // CJK 1em = 3.2 u（派工单口径）
const ASCENT = 0.8 * FONT; // = 2.56 基线上方（a2:50-58）
const DESCENT = 0.25 * FONT; // = 0.8 基线下方（a2:50-58）
const MIN_GAP = 1.5; // 验收净距（派工单判定口径）
const VB = { w: 64, h: 34 }; // viewBox（p05.ts 装配 viewBox="0 0 64 34"）

/** CJK 判定：CJK 部首/统一表意/兼容表意/全角形声（U+2E80–9FFF、F900–FAFF、FF00–FFEF） */
const isCjk = (ch: string): boolean => {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x2e80 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xff00 && c <= 0xffef)
  );
};

/** est. 文本宽：逐码点累计（西文 1.856 / CJK 3.2） */
const textWidth = (text: string): number =>
  [...text].reduce((sum, ch) => sum + (isCjk(ch) ? CJK_W : CHAR_W), 0);

/** est. bbox（口径：start=左缘起、middle=中心；end 立即抛错上报） */
function labelBox(l: ViewLabel): { x0: number; x1: number; y0: number; y1: number } {
  if (l.anchor === 'end') {
    throw new Error(`label-sweep: anchor="end" 估宽口径未定义（"${l.text}"）——按派工单立即上报`);
  }
  const w = textWidth(l.text);
  const x0 = l.anchor === 'middle' ? l.x - w / 2 : l.x;
  return { x0, x1: x0 + w, y0: l.y - ASCENT, y1: l.y + DESCENT };
}

/** 两框净距（axis-gap max；负值 = 相交。先例式：test/arc-figure-a2.test.ts:788） */
function boxGap(
  a: { x0: number; x1: number; y0: number; y1: number },
  b: { x0: number; x1: number; y0: number; y1: number },
): number {
  return Math.max(b.x0 - a.x1, a.x0 - b.x1, b.y0 - a.y1, a.y0 - b.y1);
}

/* ---- 扫查输入集（全部既有用例参数，逐组注 :行） ---- */

/** 12 案默认值 = src/ui/pages/p06.ts:105-118 DEFAULTS（逐案 :行） */
const DEFAULTS: Record<ParametricCaseId, { input: Record<string, number>; src: string }> = {
  AC01: { input: { R: 5, angle: 45, stepD: 36 }, src: 'p06.ts:106' },
  AC02: { input: { R1: 10, R2: 15, dZ: 15 }, src: 'p06.ts:107' },
  AC03: { input: { R1: 25, R2: 10, dZ: 9 }, src: 'p06.ts:108' },
  AC04: { input: { R1: 5, R2: 3, angle: 45 }, src: 'p06.ts:109' },
  AC05: { input: { R: 4, stepX: 20, stepZ: -10 }, src: 'p06.ts:110' },
  AC06: { input: { R: 10, dX: 12, dZ: 8 }, src: 'p06.ts:111' },
  AC07: { input: { R: 5, dX: 30, dZ: -30 }, src: 'p06.ts:112' },
  AC08: { input: { R: 6, dZ: -4 }, src: 'p06.ts:113' },
  AC09: { input: { R: 5, angle: 30 }, src: 'p06.ts:114' },
  AC10: { input: { R: 5, lead: 3.5 }, src: 'p06.ts:115' },
  AC11: { input: { R: 10 }, src: 'p06.ts:116' },
  AC12: { input: { R: 3, boreD: 20 }, src: 'p06.ts:117' },
};

/** 每案边界输入组（既有用例参数，逐组注 文件:行）：
 *  - 主源 test/arc-cases-a.test.ts / test/arc-cases-b.test.ts 冻结例题（每案 1 组非默认例）
 *  - 辅源 golden 图形测试既有用例参数（可满足处补足第 2 组；AC02/04/07/09/10/11/12
 *    全测试库仅有 1 组非默认例题，如实少报不造值） */
const BOUNDARIES: Record<ParametricCaseId, { input: Record<string, number>; src: string }[]> = {
  AC01: [
    { input: { R: 3, angle: 30, stepD: 20 }, src: 'arc-cases-a.test.ts:79' },
    { input: { R: 12, angle: 30, stepD: 50 }, src: 'arc-figure.test.ts:110' },
    { input: { R: 20, angle: 30, stepD: 20 }, src: 'arc-figure.test.ts:120' },
  ],
  AC02: [{ input: { R1: 6, R2: 10, dZ: 8 }, src: 'arc-cases-a.test.ts:123' }],
  AC03: [
    { input: { R1: 20, R2: 8, dZ: 6 }, src: 'arc-cases-a.test.ts:165' },
    { input: { R1: 20, R2: 5, dZ: 6 }, src: 'arc-figure-a2.test.ts:804' },
  ],
  AC04: [{ input: { R1: 4, R2: 6, angle: 30 }, src: 'arc-cases-a.test.ts:215' }],
  AC05: [
    { input: { R: 6, stepX: 40, stepZ: -25 }, src: 'arc-cases-a.test.ts:255' },
    { input: { R: 4, stepX: 20, stepZ: -40 }, src: 'arc-figure.test.ts:186' },
    { input: { R: 8, stepX: 50, stepZ: -10 }, src: 'arc-figure.test.ts:198' },
  ],
  AC06: [
    { input: { R: 13, dX: 10, dZ: 12 }, src: 'arc-cases-a.test.ts:310' },
    { input: { R: 10, dX: 16, dZ: 6 }, src: 'arc-figure-a2.test.ts:710' },
    { input: { R: 8, dX: 16, dZ: 9 }, src: 'arc-figure-a2.test.ts:833' },
  ],
  AC07: [{ input: { R: 4, dX: 24, dZ: -12 }, src: 'arc-cases-b.test.ts:88' }],
  AC08: [
    { input: { R: 6, dZ: 3 }, src: 'arc-cases-b.test.ts:119' },
    // 半圆极限（§5 边界例）：dZ = −(2R−1e-6)，fmtFigureValue 归整为 dZ=-12
    { input: { R: 6, dZ: -(2 * 6 - 1e-6) }, src: 'arc-figure-b.test.ts:228' },
  ],
  AC09: [{ input: { R: 4, angle: 45 }, src: 'arc-cases-b.test.ts:153' }],
  AC10: [{ input: { R: 8, lead: 4 }, src: 'arc-cases-b.test.ts:186' }],
  AC11: [{ input: { R: 6.5 }, src: 'arc-cases-b.test.ts:216' }],
  AC12: [{ input: { R: 2.5, boreD: 16 }, src: 'arc-cases-b.test.ts:245' }],
};

/* ---- 扫查主流程（全收集后断言：单组失败不掩盖同案后续组的判定行） ---- */

interface GroupResult {
  id: ParametricCaseId;
  src: string;
  input: Record<string, number>;
  conflicts: string[];
  outOfBounds: string[];
}

function sweepInput(id: ParametricCaseId, input: Record<string, number>, src: string): GroupResult {
  const fig = buildArcFigure(id, input);
  const boxes = fig.labels.map(labelBox);
  const conflicts: string[] = [];
  const outOfBounds: string[] = [];
  let minGap = Infinity;
  const pairs: string[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const g = boxGap(boxes[i]!, boxes[j]!);
      minGap = Math.min(minGap, g);
      pairs.push(`${fig.labels[i]!.text}~${fig.labels[j]!.text}=${g.toFixed(2)}`);
      if (g < MIN_GAP) {
        conflicts.push(`${fig.labels[i]!.text}~${fig.labels[j]!.text} gap=${g.toFixed(2)}`);
      }
    }
    const b = boxes[i]!;
    if (b.x0 < 0 || b.x1 > VB.w || b.y0 < 0 || b.y1 > VB.h) {
      outOfBounds.push(
        `${fig.labels[i]!.text} bbox=[${b.x0.toFixed(2)},${b.y0.toFixed(2)};${b.x1.toFixed(2)},${b.y1.toFixed(2)}]`,
      );
    }
  }
  console.log(
    `[sweep] ${id} ${JSON.stringify(input)} ${src} labels=${fig.labels.length} ` +
      `pairs=${(fig.labels.length * (fig.labels.length - 1)) / 2} minGap=${minGap === Infinity ? 'n/a' : minGap.toFixed(2)} ` +
      `${conflicts.length === 0 && outOfBounds.length === 0 ? 'PASS' : 'FAIL'}` +
      (pairs.length > 0 ? ` | ${pairs.join(' ')}` : '') +
      (conflicts.length > 0 ? ` | 冲突: ${conflicts.join('; ')}` : '') +
      (outOfBounds.length > 0 ? ` | 越界: ${outOfBounds.join('; ')}` : ''),
  );
  return { id, src, input, conflicts, outOfBounds };
}

describe('label-sweep · p06 圆弧工况图标签防重叠扫查（V4.12-A）', () => {
  for (const id of Object.keys(DEFAULTS) as ParametricCaseId[]) {
    it(`${id}：默认值 + 边界输入 全部两两净距 ≥${MIN_GAP}u 且落 viewBox 内`, () => {
      const groups = [
        sweepInput(id, DEFAULTS[id]!.input, `default ${DEFAULTS[id]!.src}`),
        ...BOUNDARIES[id]!.map((b) => sweepInput(id, b.input, b.src)),
      ];
      const bad = groups.filter((g) => g.conflicts.length > 0 || g.outOfBounds.length > 0);
      const detail = bad
        .map(
          (g) =>
            `${g.id} ${JSON.stringify(g.input)} (${g.src})` +
            (g.conflicts.length > 0 ? ` 冲突: ${g.conflicts.join('; ')}` : '') +
            (g.outOfBounds.length > 0 ? ` 越界: ${g.outOfBounds.join('; ')}` : ''),
        )
        .join('\n  ');
      expect(bad, `${id} 有 ${bad.length} 组输入未过扫查（净距 ≥${MIN_GAP}u + viewBox 界内）:\n  ${detail}`).toEqual([]);
    });
  }
});

/* ---- V4.12 Lead 补位补充：重锚标签 vs 几何线/圆/圆心点（5 案默认） ----
 * 缺口：上方扫查只测 label-label；label 压线/压点此前仅靠 vision 裸奔（本轮 A4-R
 * 实拍 FAIL 集：AC01 R5 压切线斜线、AC02 标签压小圆弧线、AC03 圆心点叠字、AC04
 * R2 压过渡弧 + α 压虚线整圆、AC10 R5 压轴线 + lead 压虚线圆/实弧）。重锚后补机检。
 * 口径（与 vision 判读一致）：
 *  - 圆（refCircles + 半弧直径对重建 + AC01 弧心点整圆上界）采样 128 点，点到盒
 *    净距 ≥0.3 = 漆半宽（stroke 0.6，p05 装配层实值）；
 *  - 线段（segs + axis + refDashes + radiusDashes）128 点密采样判「穿越」（有点
 *    严格落入盒内才 FAIL）——AC03 引线止于标签左缘、AC06–08 基线贴边标签等
 *    A4 仲裁过的贴线设计不误杀；
 *  - 圆心点 ≥0.9（点漆半径 0.5 + 余量 0.4，先例 test/arc-figure-a2.test.ts:793）。
 *  仅查重锚标签（RELABELED，未动标签 vision 已过不设此门防误报）；仅默认案——
 *  vision 拍照即此集；边界组侧距锚有 viewBox 钳位退化路径（源码注释已披露）。 */
describe('label-sweep · 重锚标签避让几何线/圆/圆心点（V4.12 Lead 补位，5 案）', () => {
  const STROKE_HALF = 0.3; // 线漆半宽（stroke 0.6 / 2，p05 装配层）
  const DOT_R = 0.9; // 圆心点净距（先例 arc-figure-a2.test.ts:793）

  /** 点到盒的净距（点在盒内 = 0 相交） */
  function pointBoxGap(
    px: number,
    py: number,
    b: { x0: number; x1: number; y0: number; y1: number },
  ): number {
    const dx = Math.max(b.x0 - px, 0, px - b.x1);
    const dy = Math.max(b.y0 - py, 0, py - b.y1);
    return Math.hypot(dx, dy);
  }

  /** 采样整圆（128 点）到盒的最小净距 */
  function circleBoxGap(
    c: { cx: number; cy: number; r: number },
    b: { x0: number; x1: number; y0: number; y1: number },
  ): number {
    let min = Infinity;
    for (let k = 0; k < 128; k += 1) {
      const t = (k / 128) * Math.PI * 2;
      min = Math.min(min, pointBoxGap(c.cx + c.r * Math.cos(t), c.cy + c.r * Math.sin(t), b));
    }
    return min;
  }

  /** 线段是否有采样点严格落入盒内（128 点密采样 = 穿越判定）。贴线/止于盒缘的
   *  设计（AC03 引线止于标签左缘、AC06–08 基线贴边标签）与 vision 判读口径一致
   *  判 PASS——只有线穿过字盒内部才 FAIL；零长段（NO_AXIS）恒 false。 */
  function segCrossesBox(
    s: { x1: number; y1: number; x2: number; y2: number },
    b: { x0: number; x1: number; y0: number; y1: number },
  ): boolean {
    if (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 1e-9) return false;
    for (let k = 0; k <= 128; k += 1) {
      const t = k / 128;
      const px = s.x1 + (s.x2 - s.x1) * t;
      const py = s.y1 + (s.y2 - s.y1) * t;
      if (px > b.x0 && px < b.x1 && py > b.y0 && py < b.y1) return true;
    }
    return false;
  }

  /** 各案几何重建（视图不含原输入）：圆 = refCircles + 半弧直径对重建 + AC01 弧心点圆；
   *  线 = segs + axis（非零长）+ refDashes + radiusDashes */
  interface CaseGeo {
    circles: Array<{ cx: number; cy: number; r: number }>;
    segs: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  }
  function geoOf(id: 'AC01' | 'AC02' | 'AC03' | 'AC04' | 'AC10'): CaseGeo {
    const fig = buildArcFigure(id, DEFAULTS[id].input);
    const circles: CaseGeo['circles'] = [...fig.refCircles];
    for (let i = 0; i < fig.arcs.length; i += 2) {
      const a = fig.arcs[i]!;
      // 直径对切半弧（circleArcs，a2.ts 文件头注）：端点中点即圆心、rx 即半径
      if (Math.hypot(a.x2 - a.x1, a.y2 - a.y1) > 1e-9) {
        circles.push({ cx: (a.x1 + a.x2) / 2, cy: (a.y1 + a.y2) / 2, r: a.rx });
      }
    }
    if (id === 'AC01') {
      // AC01 四分之一弧：圆心 = centerDots[0]，半径 = arcs[0].rx（按整圆采样，
      // 含未画弧段——对重锚标签为更严的上界）
      circles.push({ cx: fig.centerDots[0]!.x, cy: fig.centerDots[0]!.y, r: fig.arcs[0]!.rx });
    }
    const segs = [
      ...fig.segs,
      ...(Math.hypot(fig.axis.x2 - fig.axis.x1, fig.axis.y2 - fig.axis.y1) > 1e-9
        ? [fig.axis]
        : []),
      ...fig.refDashes,
      ...fig.radiusDashes,
    ];
    return { circles, segs };
  }

  /** V4.12 Lead 补位重锚的标签（按文本前缀匹配）；未动标签（vision 已过、设计贴线
   *  款如 AC01 Ø36 贴轴线、AC04 R1）不入列，避免对 A4 仲裁过的贴线设计误报。 */
  const RELABELED: Record<'AC01' | 'AC02' | 'AC03' | 'AC04' | 'AC10', string[]> = {
    AC01: ['R', 'α'],
    AC02: ['R1', 'R2', 'dZ'],
    AC03: ['R1', 'R2', 'dZ'],
    AC04: ['R2', 'α'],
    AC10: ['R', 'lead'],
  };

  for (const id of ['AC01', 'AC02', 'AC03', 'AC04', 'AC10'] as const) {
    it(`${id} 默认案：重锚标签不被任何线段穿越、距圆 ≥${STROKE_HALF}u、距圆心点 ≥${DOT_R}u`, () => {
      const fig = buildArcFigure(id, DEFAULTS[id].input);
      const geo = geoOf(id);
      const problems: string[] = [];
      for (const l of fig.labels) {
        if (!RELABELED[id].some((prefix) => l.text.startsWith(prefix))) continue;
        const b = labelBox(l);
        for (const c of geo.circles) {
          const gap = circleBoxGap(c, b);
          if (gap < STROKE_HALF) {
            problems.push(`"${l.text}" 距圆(心${c.cx.toFixed(1)},${c.cy.toFixed(1)} r${c.r.toFixed(1)}) ${gap.toFixed(2)}u`);
          }
        }
        for (const s of geo.segs) {
          if (segCrossesBox(s, b)) {
            problems.push(`"${l.text}" 被线段(${s.x1.toFixed(1)},${s.y1.toFixed(1)})-(${s.x2.toFixed(1)},${s.y2.toFixed(1)}) 穿越`);
          }
        }
        for (const d of fig.centerDots) {
          const gap = pointBoxGap(d.x, d.y, b);
          if (gap < DOT_R) {
            problems.push(`"${l.text}" 距圆心点(${d.x.toFixed(1)},${d.y.toFixed(1)}) ${gap.toFixed(2)}u`);
          }
        }
      }
      expect(problems, problems.join('; ')).toEqual([]);
    });
  }
});
