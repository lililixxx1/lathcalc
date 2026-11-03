/**
 * p04 · G76 参考程序（W4-C2 实现；仅 FANUC）
 *
 * 设计稿区块（自上而下，docs/车工计算App-无限画布.html:1206-1225）：
 *   状态栏 → 顶栏（G76 参考程序 + FANUC）→ 系统页签（GSK/KND/华中置灰 + 待补）
 *   → 带入参数眉标 → 六格参数（牙底 X / 终点 Z / 牙高 P / 首切 Q / 导程 F / 精修 R）
 *   → 暗色代码卡（两行 + 注释）→ P 位说明 → 复制程序 → 免责警示条 → Home 指示条
 *
 * P 位正名（W2-C5 裁决 2 冻结，禁写错）：
 *   P(m)(r)(a) 三位 = 02 精车次数 / 10 退尾量（倒角量）/ 60 刀尖角。
 * 两行式输出一律经 core/gcode.fanucG76()，UI 不另拼字符串；
 * 参数卡数值同样从 fanucG76 输出反解，保证与代码行逐字符一致。
 * 牙高 P 位（行 2 的 P 字）取实际单边牙深 (d − d₁)/2，M30×3.5 → 1894 μm（禁 1895）。
 */
import type { PageContext, PageModule } from '../router';
import {
  Button,
  CodeCard,
  Eyebrow,
  ParamGrid,
  Segmented,
  SubText,
  TopBar,
  WarnCard,
  createBody,
  createPage,
  injectStyle,
  type ParamItem,
} from '../components';
import { fanucG76, G76_DISCLAIMER } from '../../core/gcode';
import { threadDimensions } from '../../core/thread';
import type { FlankAngle, G76Program, ThreadFamily, ThreadSpec } from '../../core/types';

type RouteFamily = 'metric' | 'trapezoid' | 'pipe' | 'unified';

interface FamilyMeta {
  dataFamily: ThreadFamily;
  flankAngle: FlankAngle;
}

const FAMILY_META: Record<RouteFamily, FamilyMeta> = {
  metric: { dataFamily: 'metric', flankAngle: 60 },
  trapezoid: { dataFamily: 'trapezoid', flankAngle: 30 },
  pipe: { dataFamily: 'pipe55', flankAngle: 55 },
  unified: { dataFamily: 'unified', flankAngle: 60 },
};

interface ThreadParams {
  family: RouteFamily;
  dataFamily: ThreadFamily;
  flankAngle: FlankAngle;
  spec: string;
  d: number;
  p: number;
}

/** 系统页签（WAVE-PLAN §3 裁决 1：仅 FANUC 可用，其余置灰 + 待补） */
const SYSTEMS: readonly { value: string; label: string; disabled?: boolean }[] = [
  { value: 'fanuc', label: 'FANUC' },
  { value: 'gsk', label: '广数 GSK', disabled: true },
  { value: 'knd', label: 'KND', disabled: true },
  { value: 'huanzhong', label: '华中', disabled: true },
];

/** 设计稿 p04 冻结示例参数（非标准表值）：Z 终点 −30 mm、首刀 0.4 mm（Q400 μm） */
const END_Z_MM = -30;
const FIRST_CUT_MM = 0.4;

const P_BITS_NOTE = 'P021060 = 02 精车次数 · 10 退尾量（倒角量）· 60 刀尖角';

const CSS = `
.rc-p04__body { padding-top: 2px; }
.rc-p04__meta { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
/* A4 修复+复审修正：待补语义属系统页签；独立徽标挤爆页签行，改为行下右对齐小字注 */
.rc-p04__syswrap { flex: 0 0 auto; }
.rc-p04__sysnote { display: block; text-align: right; margin-top: 2px; }
.rc-p04__pnote { white-space: pre-line; }
/* 六格参数在 390px 下保持单行（设计稿 3 列紧凑排布） */
.rc-p04__body .rc-param { padding: 7px 8px; gap: 4px; }
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

/** 从 fanucG76 输出反解参数卡数值（单一事实源；行 2 P/Q 反向补 μm 单位） */
function buildParamItems(program: G76Program): ParamItem[] {
  const line1 = program.lines[0] ?? '';
  const line2 = program.lines[1] ?? '';
  const token = (line: string, prefix: string): string =>
    line
      .split(' ')
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? '';
  const z = token(line2, 'Z');
  return [
    { key: '牙底 X', value: token(line2, 'X') },
    { key: '终点 Z', value: z.endsWith('.') ? `${z}0` : z },
    { key: '牙高 P', value: `${token(line2, 'P')} μm` },
    { key: '首切 Q', value: `${token(line2, 'Q')} μm` },
    { key: '导程 F', value: token(line2, 'F') },
    { key: '精修 R', value: token(line1, 'R') },
  ];
}

function systemsRow(): HTMLElement {
  return Segmented({
    options: SYSTEMS.map((system) => ({
      value: system.value,
      label: system.label,
      ...(system.disabled ? { disabled: true } : {}),
    })),
    value: 'fanuc',
    ariaLabel: '数控系统',
  });
}

function metaRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'rc-p04__meta';
  row.append(Eyebrow('带入参数（来自上一步）'));
  return row;
}

/** 系统页签行 + 「待补」脚注（WAVE-PLAN §3 裁决 1：仅 FANUC，GSK/KND/华中置灰待补）。
 *  A4 复审修正：独立 Badge 会挤爆 390px 页签行（FANUC/GSK/KND/华中 + 徽标放不下，
 *  设计稿页签区本无徽标位）；改为页签行下右对齐小字注，零挤压、语义保留。 */
function systemsRowWithBadge(systems: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'rc-p04__syswrap';
  const note = SubText('GSK / KND / 华中 · 模板待补（置灰）');
  note.classList.add('rc-p04__sysnote');
  note.setAttribute('title', 'GSK / KND / 华中 待补');
  note.setAttribute('aria-label', 'GSK / KND / 华中 待补');
  wrap.append(systems, note);
  return wrap;
}

export const title = 'G76 参考程序';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p04-styles', CSS);

    const params = readParams(ctx.params);
    const body = createBody({ className: 'rc-p04__body', ariaLabel: 'G76 参考程序' });
    const top = TopBar({ title: 'G76 参考程序', badge: 'FANUC' });
    const systems = systemsRowWithBadge(systemsRow());

    if (!params) {
      // 首页 G76 直达（#/p04，无参数）：容忍空参数并提示先选型（README §5.2）
      body.append(
        systems,
        WarnCard({ text: '未选择螺纹规格。请先在「螺纹 · 选型」中选择规格，再生成 G76 程序。' }),
        Button({
          label: '去螺纹选型',
          icon: 'thread',
          onClick: () => {
            void ctx.navigate('p02');
          },
        }),
      );
      ctx.root.append(createPage({ id: 'p04', top, body }));
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
    // 实际单边牙深：d₁ 来自 core ⇒ (d − d₁)/2；M30×3.5 = 1.894375 → P1894（非 H₁ 路径 1895）
    const threadDepthMM = (params.d - dims.d1) / 2;
    const program = fanucG76({
      minorDiameter: dims.d1,
      endZ: END_Z_MM,
      threadDepthMM,
      firstCutDepthMM: FIRST_CUT_MM,
      lead: params.p,
    });
    const depthUM = Math.round(threadDepthMM * 1000);
    const depthNote = `P = 牙深 (d − d₁)/2 = ${threadDepthMM.toFixed(3)} mm → ${depthUM} μm（非工作牙高 H₁）`;

    body.append(
      systems,
      metaRow(),
      ParamGrid({ items: buildParamItems(program), ariaLabel: 'G76 参数' }),
      CodeCard({
        lines: program.lines,
        comment: '系统不同，P/Q/R 含义不同 — 已按 FANUC 生成',
        ariaLabel: 'G76 两行式程序',
      }),
      SubText(`${P_BITS_NOTE}\n${depthNote}`, { className: 'rc-p04__pnote' }),
      Button({
        variant: 'ghost',
        icon: 'copy',
        label: '复制程序',
        onClick: () => {
          void navigator.clipboard?.writeText(program.lines.join('\n')).catch(() => undefined);
        },
      }),
      WarnCard({ text: G76_DISCLAIMER }),
    );

    ctx.root.append(createPage({ id: 'p04', top, body }));
  },
};

export default page;
