/**
 * p03 · 螺纹 · 结果（W4-C2 实现；W8-A 七族扩展 + PROFILE_CONSTANTS 单源）
 *
 * 设计稿区块（自上而下，docs/车工计算App-无限画布.html:1184-1204）：
 *   状态栏 → 顶栏（规格名 + 标准徽标 + 收藏）→ 族别 · 粗细牙 · 螺距眉标
 *   → 牙型剖面示意图（WAVE-PLAN-V4.9 A 卡，用户反馈 #6：几何全在 core/thread-figure，
 *   本页零几何 SVG 装配；锥管族加基面竖虚线）→ 基本尺寸卡（d / d₂ / d₁ / H₁ / 底孔）
 *   → 三针卡（d₀ / M；Tr 追加 ac）
 *   → 「怎么算的」公式（默认展开，设计稿 acc(1)）→ 生成 G76 程序按钮 → Home 指示条
 *
 * 口径：d₂/d₁/H₁/底孔/最佳针径由 core/thread.threadDimensions 计算，
 *   三针跨距由 core/thread.threeWireM 计算（UI 不重算牙型常数；W8-A 起常数统一引用
 *   core/thread.PROFILE_CONSTANTS，消除与公式文案的双写）。
 *   密封管 R / 锥管 NPT：d₂/d₁ = 基准平面处直径（V3-1），底孔 = 基面小径，
 *   展示区加「基准平面」标注行（GB/T 7306 / GB/T 12716）。
 *   蜗杆：走 core/thread.wormGeometry（px=π·m、h₁=2.2·m、ZA 40°），
 *   不走 threadDimensions / threeWireM，不显示三针卡（V3-2）。
 * 收藏：点击顶栏星标派发 `lathcalc:save`（跨卡契约，W4-C5 store.ts 监听）。
 *
 * W10-C（WAVE-PLAN-V4 §2，DEFERRED #20）：sealpipe/npt 两族「生成 G76 程序」按钮解禁——
 *   正常跳转 p04 并带 family/spec/d/p（锥度位由 p04 按 L/32 活算，数据表不存锥度）；
 *   蜗杆（模数制、非标准牙型）仍不显示按钮（V3-2 行为不变）。
 */
import type { PageContext, PageModule } from '../router';
import {
  Accordion,
  Button,
  Card,
  Eyebrow,
  ResultCard,
  SubText,
  TopBar,
  WarnCard,
  createBody,
  createPage,
  escapeHtml,
  injectStyle,
} from '../components';
import { listThreads } from '../../core/lookup';
import {
  THREAD_FIGURE_VIEW,
  buildThreadFigure,
  type ThreadFigureView,
} from '../../core/thread-figure';
import {
  PROFILE_CONSTANTS,
  threeWireM,
  threadDimensions,
  wormGeometry,
} from '../../core/thread';
import type {
  FlankAngle,
  ThreadDimensions,
  ThreadFamily,
  ThreadRow,
  ThreadSpec,
} from '../../core/types';
import metricRows from '../../data/threads-metric.json';
import trapezoidRows from '../../data/threads-trapezoid.json';
import pipeRows from '../../data/threads-pipe.json';
import unifiedRows from '../../data/threads-unified.json';
import sealpipeRows from '../../data/threads-sealpipe.json';
import nptRows from '../../data/threads-npt.json';
import wormRows from '../../data/threads-worm.json';

const ALL_ROWS: ThreadRow[] = [
  ...(metricRows as unknown as ThreadRow[]),
  ...(trapezoidRows as unknown as ThreadRow[]),
  ...(pipeRows as unknown as ThreadRow[]),
  ...(unifiedRows as unknown as ThreadRow[]),
  ...(sealpipeRows as unknown as ThreadRow[]),
  ...(nptRows as unknown as ThreadRow[]),
  ...(wormRows as unknown as ThreadRow[]),
];

type RouteFamily =
  | 'metric'
  | 'trapezoid'
  | 'pipe'
  | 'unified'
  | 'sealpipe'
  | 'npt'
  | 'worm';

interface FamilyMeta {
  /** 眉标族名（设计稿「普通螺纹」） */
  label: string;
  /** 顶栏标准徽标 */
  standard: string;
  dataFamily: ThreadFamily;
  /** 牙型角（core/thread 按此路由常数族） */
  flankAngle: FlankAngle;
}

const FAMILY_META: Record<RouteFamily, FamilyMeta> = {
  metric: { label: '普通螺纹', standard: 'GB/T 196', dataFamily: 'metric', flankAngle: 60 },
  trapezoid: { label: '梯形螺纹', standard: 'GB/T 5796', dataFamily: 'trapezoid', flankAngle: 30 },
  pipe: { label: '55° 管螺纹', standard: 'GB/T 7307', dataFamily: 'pipe55', flankAngle: 55 },
  unified: { label: '美制统一螺纹', standard: 'ASME B1.1', dataFamily: 'unified', flankAngle: 60 },
  sealpipe: {
    label: '55° 密封管螺纹',
    standard: 'GB/T 7306',
    dataFamily: 'sealpipe',
    flankAngle: 55,
  },
  npt: { label: '60° 锥管螺纹', standard: 'GB/T 12716', dataFamily: 'npt', flankAngle: 60 },
  worm: { label: '蜗杆', standard: 'GB/T 10087', dataFamily: 'worm', flankAngle: 40 },
};

interface ThreadParams {
  family: RouteFamily;
  dataFamily: ThreadFamily;
  flankAngle: FlankAngle;
  spec: string;
  d: number;
  p: number;
}

const CSS = `
.rc-p03__body { padding-top: 2px; }
.rc-p03__body .la-formula { overflow-wrap: anywhere; }
.rc-p03__figure { padding: 10px; display: grid; place-items: center; }
.rc-p03__figure svg { color: var(--la-ink-body); }
`;

function readFamily(value: string | null): RouteFamily | null {
  if (
    value === 'metric' ||
    value === 'trapezoid' ||
    value === 'pipe' ||
    value === 'unified' ||
    value === 'sealpipe' ||
    value === 'npt' ||
    value === 'worm'
  ) {
    return value;
  }
  return null;
}

/** 解析并校验 hash 参数；缺 family / d / p 或非法 → null（页面降级为「请先选型」） */
function readParams(params: URLSearchParams): ThreadParams | null {
  const family = readFamily(params.get('family'));
  const d = Number(params.get('d'));
  const p = Number(params.get('p'));
  if (!family || !Number.isFinite(d) || d <= 0 || !Number.isFinite(p) || p <= 0) return null;

  const meta = FAMILY_META[family];
  const spec = params.get('spec')?.trim() || `${d} × ${p}`;
  return { family, dataFamily: meta.dataFamily, flankAngle: meta.flankAngle, spec, d, p };
}

/** 按大径 + 螺距回查数据行（用于粗牙 / tpi 眉标；回查失败不阻断计算） */
function findRow(dataFamily: ThreadFamily, d: number, p: number): ThreadRow | undefined {
  return listThreads(ALL_ROWS, dataFamily).find(
    (row) => row.major === d && Math.abs(row.pitch - p) < 1e-9,
  );
}

function formatPitch(pitch: number): string {
  return String(Math.round(pitch * 1000) / 1000);
}

function format3(value: number): string {
  return value.toFixed(3);
}

/** 眉标：族别 · 粗/细牙（metric）或 tpi（管/制）· 螺距 P x mm（蜗杆为模数 m） */
function eyebrowText(params: ThreadParams, row: ThreadRow | undefined): string {
  const meta = FAMILY_META[params.family];
  const parts: string[] = [meta.label];
  if (params.dataFamily === 'worm') {
    parts.push('ZA 40°');
    parts.push(`模数 m ${formatPitch(params.p)} mm`);
    return parts.join(' · ');
  }
  if (params.dataFamily === 'metric' && row) {
    parts.push(row.coarse === true ? '粗牙' : '细牙');
  }
  if (
    (params.dataFamily === 'pipe55' ||
      params.dataFamily === 'sealpipe' ||
      params.dataFamily === 'npt') &&
    row?.tpi
  ) {
    parts.push(`${row.tpi} tpi`);
  }
  if (params.dataFamily === 'unified') {
    if (params.spec.includes('UNF')) parts.push('UNF');
    else if (params.spec.includes('UNC')) parts.push('UNC');
  }
  parts.push(`螺距 P ${formatPitch(params.p)} mm`);
  return parts.join(' · ');
}

/** 公式区标准徽标（按族切换；显示文案与 W4 冻结口径一致） */
function standardOf(dataFamily: ThreadFamily): string {
  if (dataFamily === 'metric') return 'GB/T 196-2003';
  if (dataFamily === 'unified') return 'ASME B1.1';
  if (dataFamily === 'sealpipe') return 'GB/T 7306.1-2000';
  if (dataFamily === 'npt') return 'GB/T 12716-2011';
  return 'GB/T 7307-2001';
}

/**
 * 「怎么算的」公式（受信 HTML，仅数值与固定文案）。
 * 牙型常数一律取自 core/thread.PROFILE_CONSTANTS（W8-A G2 消双写），
 * 代入值优先由 core 输出反推（如 d − d₂），避免 UI 重算核心常数。
 */
function formulaHtml(params: ThreadParams, dims: ThreadDimensions, m: number): string {
  const { d, p, dataFamily } = params;
  const d2 = format3(dims.d2);
  const d1 = format3(dims.d1);
  const wire = format3(dims.bestWire);
  const mText = format3(m);
  const delta2 = format3(d - dims.d2);
  const delta1 = format3(d - dims.d1);
  const tap = dims.tapDrill.toFixed(1);

  if (dataFamily === 'trapezoid') {
    const c = PROFILE_CONSTANTS.deg30Tr;
    const twoAc = d - p - dims.d1;
    const ac = twoAc / 2;
    return [
      `d₂ = d − ${c.d2Factor}P = ${d} − ${delta2} = ${d2}`,
      `d₁ = d − P − 2ac = ${d} − ${p} − ${format3(twoAc)} = ${d1}（ac = ${ac.toFixed(2)}）`,
      `牙型高 H₁ = ${c.h1Factor}P = ${format3(dims.h1)}`,
      `d₀ = ${c.wireFactor}P = ${wire}`,
      `三针 M = d₂ + ${c.threeWireK1}d₀ − ${c.threeWireK2}P = ${mText}`,
      `底孔 ≈ d − P = ${tap}（= 内螺纹小径 D₁）`,
      '依据：GB/T 5796.3-2005',
    ].join('<br>');
  }

  const metric60 = dataFamily === 'metric' || dataFamily === 'unified' || dataFamily === 'npt';
  const taper = dataFamily === 'sealpipe' || dataFamily === 'npt';
  const c = metric60 ? PROFILE_CONSTANTS.deg60 : PROFILE_CONSTANTS.deg55;
  const tapNote = taper
    ? '（密封锥管：取基准平面小径，实际攻孔另表）'
    : metric60
      ? '（切削丝锥 · 钢件近似）'
      : '（切削丝锥近似；55° 管螺纹实际攻孔另表）';
  const tapExpr = taper ? '底孔 ≈ 基面小径 d₁' : '底孔 ≈ d − P';
  return [
    `d₂ = d − ${c.d2Factor}P = ${d} − ${delta2} = ${d2}`,
    `d₁ = d − ${c.d1Factor}P = ${d} − ${delta1} = ${d1}`,
    `d₀ = ${c.wireFactor}P = ${wire}`,
    `三针 M = d₂ + ${c.threeWireK1}d₀ − ${c.threeWireK2}P = ${mText}`,
    `${tapExpr} = ${tap}${tapNote}`,
    `依据：${standardOf(dataFamily)}`,
  ].join('<br>');
}

/** 蜗杆公式（模数制；px=π·m 与 h₁=2.2m 均取自 core 活算结果，常数取 PROFILE_CONSTANTS） */
function wormFormulaHtml(moduleMM: number): string {
  const g = wormGeometry(moduleMM);
  const c = PROFILE_CONSTANTS.deg40Worm;
  const m = formatPitch(moduleMM);
  return [
    `px = π·m = π × ${m} = ${format3(g.axialPitch)}`,
    `h₁ = ${c.wholeDepthFactor}m = ${c.wholeDepthFactor} × ${m} = ${format3(g.wholeDepth)}`,
    `牙型角 α = ${c.flankAngle}°（ZA，GB/T 10087）`,
    '依据：GB/T 10087-2018 / GB/T 10088-2018',
  ].join('<br>');
}

/**
 * 牙型剖面示意图 SVG 装配（WAVE-PLAN-V4.9 A 卡；零几何，坐标全来自 core/thread-figure 视图模型）：
 * 牙型折线实线 → d/d₂/d₁（蜗杆为 齿顶/分度/齿根）水平虚线贯穿 [10,210] + 线上右侧标签
 * （双 tspan：代号 sub + 值 currentColor 600，p16 先例；基线 = 线 y−3，core 保证 ≥12）→
 * P/px 顶部双箭头 + 标签 → α 文字（sub 色，不画角弧）→ 锥管族基面竖虚线 + 「基面」标签。
 */
function threadFigureSVG(view: ThreadFigureView): string {
  const n2 = (value: number): string => value.toFixed(2);
  /** 线/箭头标签：含空格 → 双 tspan（代号 sub + 值 600）；否则整段 sub（分度线等纯名）。 */
  const labelText = (label: string): string => {
    const split = label.indexOf(' ');
    if (split < 0) {
      return `<tspan fill="var(--la-sub)">${escapeHtml(label)}</tspan>`;
    }
    return `<tspan fill="var(--la-sub)">${escapeHtml(label.slice(0, split))}</tspan> <tspan fill="currentColor" font-weight="600">${escapeHtml(label.slice(split + 1))}</tspan>`;
  };
  const lineLabel = (label: string, y: number): string =>
    `<text x="${n2(208)}" y="${n2(Math.max(12, y - 3))}" font-size="8.5" text-anchor="end" stroke="none">${labelText(label)}</text>`;

  const profile = `<polyline points="${view.profile
    .map((point) => `${n2(point.x)},${n2(point.y)}`)
    .join(' ')}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>`;

  const diameterLines = view.diameterLines
    .map(
      (line) =>
        `<line x1="10" y1="${n2(line.y)}" x2="210" y2="${n2(line.y)}" stroke="var(--la-sub)" stroke-width="0.8" stroke-dasharray="4 2.5"/>${lineLabel(line.label, line.y)}`,
    )
    .join('');

  const pitch = view.pitchMark;
  const pitchSvg =
    `<line x1="${n2(pitch.x1 + 4)}" y1="${n2(pitch.y)}" x2="${n2(pitch.x2 - 4)}" y2="${n2(pitch.y)}" stroke="currentColor" stroke-width="1"/>` +
    `<polygon points="${n2(pitch.x1)},${n2(pitch.y)} ${n2(pitch.x1 + 4.5)},${n2(pitch.y - 2)} ${n2(pitch.x1 + 4.5)},${n2(pitch.y + 2)}" fill="currentColor" stroke="none"/>` +
    `<polygon points="${n2(pitch.x2)},${n2(pitch.y)} ${n2(pitch.x2 - 4.5)},${n2(pitch.y - 2)} ${n2(pitch.x2 - 4.5)},${n2(pitch.y + 2)}" fill="currentColor" stroke="none"/>` +
    `<text x="${n2((pitch.x1 + pitch.x2) / 2)}" y="${n2(Math.max(12, pitch.y - 3))}" font-size="8.5" text-anchor="middle" stroke="none">${labelText(pitch.label)}</text>`;

  const flank = `<text x="${n2(view.flankMark.x)}" y="${n2(view.flankMark.y)}" font-size="8.5" text-anchor="middle" fill="var(--la-sub)" stroke="none">${escapeHtml(view.flankMark.label)}</text>`;

  const gauge = view.gaugeLine
    ? `<line class="rc-p03__gauge" x1="${n2(view.gaugeLine.x)}" y1="${n2(view.gaugeLine.y1)}" x2="${n2(view.gaugeLine.x)}" y2="${n2(view.gaugeLine.y2)}" stroke="var(--la-sub)" stroke-width="0.8" stroke-dasharray="5 2.5 1.2 2.5"/>` +
      `<text x="${n2(view.gaugeLine.x)}" y="${n2(view.gaugeLine.y2 + 8)}" font-size="8.5" text-anchor="middle" fill="var(--la-sub)" stroke="none">${escapeHtml(view.gaugeLine.label)}</text>`
    : '';

  return `<svg viewBox="0 0 ${THREAD_FIGURE_VIEW.width} ${THREAD_FIGURE_VIEW.height}" width="100%" height="${THREAD_FIGURE_VIEW.height}" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">${profile}${diameterLines}${pitchSvg}${flank}${gauge}</svg>`;
}

/** 牙型剖面图卡（Eyebrow 之后、首张 ResultCard 之前；入参已过 readParams 校验，无保帧分支）。 */
function threadFigureCard(view: ThreadFigureView, worm: boolean): HTMLElement {
  const card = Card({
    className: 'rc-p03__figure',
    ariaLabel: worm ? '蜗杆牙型剖面示意图' : '螺纹牙型剖面示意图',
  });
  card.innerHTML = threadFigureSVG(view);
  return card;
}

/** 收藏事件（跨卡契约：detail = {kind,title,params,ts,favorite?}；无监听方时无副作用） */
function dispatchSave(params: ThreadParams): void {
  document.dispatchEvent(
    new CustomEvent('lathcalc:save', {
      detail: {
        kind: 'thread',
        title: params.spec,
        params: {
          family: params.family,
          spec: params.spec,
          d: params.d,
          p: params.p,
        },
        ts: Date.now(),
        // W4 集成裁决：星标语义 = 收藏 + 历史双落（store.recordSave 消费）。
        favorite: true,
      },
    }),
  );
}

export const title = '螺纹 · 结果';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p03-styles', CSS);

    const params = readParams(ctx.params);
    const body = createBody({ className: 'rc-p03__body', ariaLabel: '螺纹计算结果' });

    if (!params) {
      const top = TopBar({ title: '螺纹 · 结果' });
      body.append(
        Eyebrow('螺纹 · 结果'),
        WarnCard({ text: '未选择螺纹规格。请先在「螺纹 · 选型」中选择规格。' }),
        Button({
          label: '去螺纹选型',
          icon: 'thread',
          onClick: () => {
            void ctx.navigate('p02');
          },
        }),
      );
      ctx.root.append(createPage({ id: 'p03', top, body }));
      return;
    }

    const meta = FAMILY_META[params.family];
    const row = findRow(params.dataFamily, params.d, params.p);

    const top = TopBar({
      title: params.spec,
      badge: meta.standard,
      star: true,
      onStar: () => dispatchSave(params),
    });

    if (params.dataFamily === 'worm') {
      // V3-2：模数制只做查表 + 几何活算；不走 threadDimensions/threeWireM，不显示三针卡。
      const worm = wormGeometry(params.p);
      const moduleMM = params.p;
      const dimensionItems = [
        { label: '模数 m', value: format3(moduleMM), unit: 'mm' },
        {
          label: '轴向齿距 px',
          value: format3(worm.axialPitch),
          unit: 'mm',
          copyValue: format3(worm.axialPitch),
        },
        { label: '全齿高 h₁', value: format3(worm.wholeDepth), unit: 'mm' },
        { label: '牙型角 α', value: String(worm.flankAngle), unit: '°' },
      ];
      body.append(
        Eyebrow(eyebrowText(params, row)),
        // V4.9 A 卡：牙型剖面图（分度线在 cy，齿顶 +m/齿根 −1.2m，px=π·m 同源 wormGeometry）
        threadFigureCard(buildThreadFigure({ kind: 'worm', moduleMM }), true),
        ResultCard({ items: dimensionItems, ariaLabel: '蜗杆几何' }),
        Accordion({ content: wormFormulaHtml(moduleMM), open: true }),
      );
      ctx.root.append(createPage({ id: 'p03', top, body }));
      return;
    }

    const spec: ThreadSpec = {
      family: params.dataFamily,
      designation: params.spec,
      pitch: params.p,
      major: params.d,
      flankAngle: params.flankAngle,
    };
    const dims = threadDimensions(spec);
    const wireM = threeWireM(spec, dims.bestWire);
    const taper = params.dataFamily === 'sealpipe' || params.dataFamily === 'npt';

    // V4.9 A 卡：牙型剖面图（d₂/d₁ 同源 threadDimensions；锥管族加基面竖虚线，不画锥度）。
    // worm 族已在上方早退（FAMILY_META 仅 worm 映射 40°），此处牙型角必为 30/55/60。
    const figureCard = threadFigureCard(
      buildThreadFigure({
        kind: 'thread',
        major: params.d,
        pitch: params.p,
        flankAngle: params.flankAngle as 30 | 55 | 60,
        gaugeLine: taper,
      }),
      false,
    );

    const dimensionItems = [
      { label: '大径 d', value: format3(params.d), unit: 'mm' },
      { label: '中径 d₂', value: format3(dims.d2), unit: 'mm' },
      { label: '小径 d₁', value: format3(dims.d1), unit: 'mm' },
      { label: '牙型高 H₁', value: format3(dims.h1), unit: 'mm' },
      {
        label: '底孔钻头',
        value: `≈ ${dims.tapDrill.toFixed(1)}`,
        unit: 'mm',
        copyValue: dims.tapDrill.toFixed(1),
      },
    ];

    const wireItems = [
      { label: '三针量针 d₀', value: format3(dims.bestWire), unit: 'mm' },
      { label: '三针跨距 M', value: format3(wireM), unit: 'mm' },
    ];

    if (params.dataFamily === 'trapezoid') {
      // ac 由 core 输出的 d₁ 反解：d₁ = d − P − 2ac ⇒ ac = (d − P − d₁)/2
      const ac = (params.d - params.p - dims.d1) / 2;
      wireItems.push({ label: '牙顶间隙 ac', value: ac.toFixed(2), unit: 'mm' });
    }

    // V3-1：锥管族的尺寸语义 = 基准平面处直径，展示区显式标注（GB/T 7306 / 12716）
    const taperNote = taper
      ? SubText(
          `基准平面处直径（${params.dataFamily === 'sealpipe' ? 'GB/T 7306' : 'GB/T 12716'}，1:16 锥）`,
          { center: true },
        )
      : null;

    body.append(
      Eyebrow(eyebrowText(params, row)),
      figureCard,
      ResultCard({ items: dimensionItems, ariaLabel: '螺纹基本尺寸' }),
      ...(taperNote ? [taperNote] : []),
      ResultCard({ items: wireItems, ariaLabel: '三针测量' }),
      Accordion({ content: formulaHtml(params, dims, wireM), open: true }),
      // W10-C：sealpipe/npt 与其他族同路径跳 p04（锥管模式由 p04 显示 L 输入并输出锥度位）；
      // 蜗杆在上方提前 return，按钮维持隐藏。
      Button({
        label: '生成 G76 程序',
        onClick: () => {
          void ctx.navigate('p04', {
            family: params.family,
            spec: params.spec,
            d: params.d,
            p: params.p,
          });
        },
      }),
    );

    ctx.root.append(createPage({ id: 'p03', top, body }));
  },
};

export default page;
