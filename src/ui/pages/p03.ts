/**
 * p03 · 螺纹 · 结果（W4-C2 实现）
 *
 * 设计稿区块（自上而下，docs/车工计算App-无限画布.html:1184-1204）：
 *   状态栏 → 顶栏（规格名 + 标准徽标 + 收藏）→ 族别 · 粗细牙 · 螺距眉标
 *   → 基本尺寸卡（d / d₂ / d₁ / H₁ / 底孔）→ 三针卡（d₀ / M；Tr 追加 ac）
 *   → 「怎么算的」公式（默认展开，设计稿 acc(1)）→ 生成 G76 程序按钮 → Home 指示条
 *
 * 口径：d₂/d₁/H₁/底孔/最佳针径由 core/thread.threadDimensions 计算，
 *   三针跨距由 core/thread.threeWireM 计算（UI 不重算牙型常数）；
 *   Tr 的 ac 由 core 输出的 d₁ 反解（d₁ = d − P − 2ac），不复制 ac 档位表。
 * 收藏：点击顶栏星标派发 `lathcalc:save`（跨卡契约，W4-C5 store.ts 监听）。
 */
import type { PageContext, PageModule } from '../router';
import {
  Accordion,
  Button,
  Eyebrow,
  ResultCard,
  TopBar,
  WarnCard,
  createBody,
  createPage,
  injectStyle,
} from '../components';
import { listThreads } from '../../core/lookup';
import { threeWireM, threadDimensions } from '../../core/thread';
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

const ALL_ROWS: ThreadRow[] = [
  ...(metricRows as unknown as ThreadRow[]),
  ...(trapezoidRows as unknown as ThreadRow[]),
  ...(pipeRows as unknown as ThreadRow[]),
  ...(unifiedRows as unknown as ThreadRow[]),
];

type RouteFamily = 'metric' | 'trapezoid' | 'pipe' | 'unified';

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
`;

function readFamily(value: string | null): RouteFamily | null {
  if (value === 'metric' || value === 'trapezoid' || value === 'pipe' || value === 'unified') {
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

/** 眉标：族别 · 粗/细牙（metric）或 tpi（管/美制）· 螺距 P x mm */
function eyebrowText(params: ThreadParams, row: ThreadRow | undefined): string {
  const meta = FAMILY_META[params.family];
  const parts: string[] = [meta.label];
  if (params.dataFamily === 'metric' && row) {
    parts.push(row.coarse === true ? '粗牙' : '细牙');
  }
  if (params.dataFamily === 'pipe55' && row?.tpi) parts.push(`${row.tpi} tpi`);
  if (params.dataFamily === 'unified') {
    if (params.spec.includes('UNF')) parts.push('UNF');
    else if (params.spec.includes('UNC')) parts.push('UNC');
  }
  parts.push(`螺距 P ${formatPitch(params.p)} mm`);
  return parts.join(' · ');
}

/**
 * 「怎么算的」公式（受信 HTML，仅数值与固定文案）。
 * 公式中的常数来自 WAVE-PLAN §4 冻结常数集；代入值优先由 core 输出反推
 * （如 d − d₂），避免 UI 重算核心常数。
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
    const twoAc = d - p - dims.d1;
    const ac = twoAc / 2;
    return [
      `d₂ = d − 0.5P = ${d} − ${delta2} = ${d2}`,
      `d₁ = d − P − 2ac = ${d} − ${p} − ${format3(twoAc)} = ${d1}（ac = ${ac.toFixed(2)}）`,
      `牙型高 H₁ = 0.5P = ${format3(dims.h1)}`,
      `d₀ = 0.51764P = ${wire}`,
      `三针 M = d₂ + 4.8637d₀ − 1.866P = ${mText}`,
      `底孔 ≈ d − P = ${tap}（= 内螺纹小径 D₁）`,
      '依据：GB/T 5796.3-2005',
    ].join('<br>');
  }

  const metric60 = dataFamily === 'metric' || dataFamily === 'unified';
  const standard = metric60
    ? dataFamily === 'metric'
      ? 'GB/T 196-2003'
      : 'ASME B1.1'
    : 'GB/T 7307-2001';
  const tapNote = metric60 ? '（切削丝锥 · 钢件近似）' : '（切削丝锥近似；55° 管螺纹实际攻孔另表）';
  return [
    metric60
      ? `d₂ = d − 0.6495P = ${d} − ${delta2} = ${d2}`
      : `d₂ = d − 0.6403P = ${d} − ${delta2} = ${d2}`,
    metric60
      ? `d₁ = d − 1.0825P = ${d} − ${delta1} = ${d1}`
      : `d₁ = d − 1.2806P = ${d} − ${delta1} = ${d1}`,
    metric60
      ? `d₀ = 0.57735P = ${wire}`
      : `d₀ = 0.56371P = ${wire}`,
    metric60
      ? `三针 M = d₂ + 3d₀ − 0.866P = ${mText}`
      : `三针 M = d₂ + 3.1657d₀ − 0.9605P = ${mText}`,
    `底孔 ≈ d − P = ${tap}${tapNote}`,
    `依据：${standard}`,
  ].join('<br>');
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
    const spec: ThreadSpec = {
      family: params.dataFamily,
      designation: params.spec,
      pitch: params.p,
      major: params.d,
      flankAngle: params.flankAngle,
    };
    const dims = threadDimensions(spec);
    const wireM = threeWireM(spec, dims.bestWire);
    const row = findRow(params.dataFamily, params.d, params.p);

    const top = TopBar({
      title: params.spec,
      badge: meta.standard,
      star: true,
      onStar: () => dispatchSave(params),
    });

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

    body.append(
      Eyebrow(eyebrowText(params, row)),
      ResultCard({ items: dimensionItems, ariaLabel: '螺纹基本尺寸' }),
      ResultCard({ items: wireItems, ariaLabel: '三针测量' }),
      Accordion({ content: formulaHtml(params, dims, wireM), open: true }),
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
