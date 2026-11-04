/**
 * p04 · G76 / G92 参考程序（W4-C2 实现；W6-C2 三系统解灰 + 循环形式切换）
 *
 * 设计稿区块（自上而下，docs/车工计算App-无限画布.html:1206-1225）：
 *   状态栏 → 顶栏（参考程序 + 当前系统徽标）→ 系统页签 → 循环形式页签
 *   → 带入参数眉标 → 参数卡 → 暗色代码卡（两行/单行 + 注释）→ P 位/牙深说明
 *   → 复制程序 → 免责警示条 → Home 指示条
 *
 * P 位正名（W2-C5 裁决 2 冻结，禁写错）：
 *   P(m)(r)(a) 三位 = 02 精车次数 / 10 退尾量（倒角量）/ 60 刀尖角。
 * 程序输出一律经 core/gcode.g76Dialect() / g92Cycle()，UI 不另拼字符串；
 * 参数卡数值同样从程序输出反解，保证与代码行逐字符一致。
 * 牙高 P 位（行 2 的 P 字）取实际单边牙深 (d − d₁)/2，M30×3.5 → 1894 μm（禁 1895）。
 *
 * 方言 enable 矩阵（WAVE-PLAN-V2 V2-4，docs/research/g76-dialects.md §1）：
 *   G76 形式：GSK 禁用（两代系统 P/Q 口径冲突，R1 置灰）；FANUC/KND/HNC 可用。
 *   G92 形式：华中禁用（G92 为工件坐标系设定，负结论）；FANUC/GSK/KND 可用。
 * 切换形式后当前系统在新形式下禁用 → 回落 FANUC（防死状态）。
 * URL 键：system=fanuc|gsk|knd|hnc（默认 fanuc）、cycle=g76|g92（默认 g76）。
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
import { g76Dialect, g92Cycle, G76_DISCLAIMER } from '../../core/gcode';
import { threadDimensions } from '../../core/thread';
import type {
  CncSystem,
  FlankAngle,
  G76Params,
  G76Program,
  ThreadFamily,
  ThreadSpec,
} from '../../core/types';

type RouteFamily = 'metric' | 'trapezoid' | 'pipe' | 'unified';
type CycleForm = 'g76' | 'g92';

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

/** 系统页签（values 与 types.ts CncSystem 对齐，G0-Minor 冻结） */
const SYSTEMS: readonly { value: CncSystem; label: string }[] = [
  { value: 'fanuc', label: 'FANUC' },
  { value: 'gsk', label: '广数 GSK' },
  { value: 'knd', label: 'KND' },
  { value: 'hnc', label: '华中' },
];

const SYSTEM_BADGE: Record<CncSystem, string> = {
  fanuc: 'FANUC',
  gsk: '广数 GSK',
  knd: 'KND',
  hnc: '华中',
};

const SYSTEM_COMMENT: Record<CncSystem, string> = {
  fanuc: '已按 FANUC 生成',
  gsk: '已按 广数 GSK 生成',
  knd: '已按 KND 生成',
  hnc: '已按 华中 生成',
};

const CYCLE_OPTIONS: readonly { value: CycleForm; label: string }[] = [
  { value: 'g76', label: 'G76 复合循环' },
  { value: 'g92', label: 'G92 直进循环' },
];

/** 置灰提示（两态，逐字冻结）：G76 形式提示 GSK；G92 形式提示华中。 */
const CYCLE_NOTE: Record<CycleForm, string> = {
  g76: 'GSK · 两代系统单位口径不同，暂不生成（防静默错误）',
  g92: '华中 · G92 为工件坐标系设定，螺纹单循环请用 G82',
};

/** W6-C1-04 裁决文案：G92 单行只是循环首行 */
const G92_ROW_NOTE = 'G92 为循环首行，完整螺纹需后续 X 递减分刀';

/** 设计稿 p04 冻结示例参数（非标准表值）：Z 终点 −30 mm、首刀 0.4 mm（Q400 μm） */
const END_Z_MM = -30;
const FIRST_CUT_MM = 0.4;

const P_BITS_NOTE = 'P021060 = 02 精车次数 · 10 退尾量（倒角量）· 60 刀尖角';

const CSS = `
.rc-p04__body { padding-top: 2px; }
.rc-p04__meta { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
/* A4 修复+复审修正：待补/口径提示语义属系统页签；独立徽标挤爆页签行，改为行下右对齐小字注 */
.rc-p04__syswrap { flex: 0 0 auto; }
.rc-p04__sysnote { display: block; text-align: right; margin-top: 2px; }
.rc-p04__pnote { white-space: pre-line; }
/* 系统页签 + 循环形式页签两组 Segmented 纵向排布 */
.rc-p04__controls { display: flex; flex-direction: column; gap: 9px; flex: 0 0 auto; }
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

/** URL system 键（默认 fanuc；非法值回落默认） */
function readSystem(value: string | null): CncSystem {
  return value === 'gsk' || value === 'knd' || value === 'hnc' ? value : 'fanuc';
}

/** URL cycle 键（默认 g76；非法值回落默认） */
function readCycle(value: string | null): CycleForm {
  return value === 'g92' ? 'g92' : 'g76';
}

/** enable 矩阵（V2-4：粒度 = 系统 × 循环形式） */
function isEnabled(system: CncSystem, cycle: CycleForm): boolean {
  return cycle === 'g76' ? system !== 'gsk' : system !== 'hnc';
}

/** 从程序行反解参数（单一事实源；首 token 前缀匹配） */
function token(line: string, prefix: string): string {
  return (
    line
      .split(' ')
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? ''
  );
}

/** 轴坐标展示：整数保留一位小数（Z-30. → Z-30.0），与既有参数卡一致 */
function displayZ(value: string): string {
  return value.endsWith('.') ? `${value}0` : value;
}

/** G76 参数卡六格：值从当前系统 g76Dialect 输出反解，标签/单位按方言正确 */
function buildG76ParamItems(program: G76Program, system: CncSystem): ParamItem[] {
  const line1 = program.lines[0] ?? '';
  const line2 = program.lines[1] ?? '';

  if (system === 'hnc') {
    // HNC 单行式：K/U 为牙高/精修，Q 为首切（g76-dialects.md §1 行3）
    return [
      { key: '牙底 X', value: token(line1, 'X') },
      { key: '终点 Z', value: displayZ(token(line1, 'Z')) },
      { key: '牙高 K', value: `${token(line1, 'K')} mm` },
      { key: '首切 Q', value: `${token(line1, 'Q')} mm` },
      { key: '导程 F', value: token(line1, 'F') },
      { key: '精修 U', value: `${token(line1, 'U')} mm` },
    ];
  }

  // FANUC / KND 两行式：行2 同串，仅 P/Q/R 单位不同（μm vs 0.001mm）；
  // FANUC 的 R 为 mm 小数、旧参数卡无单位后缀（金值对照 R 0.05），KND 加口径注。
  const unit = system === 'knd' ? '（0.001mm）' : ' μm';
  const finishUnit = system === 'knd' ? '（0.001mm）' : '';
  return [
    { key: '牙底 X', value: token(line2, 'X') },
    { key: '终点 Z', value: displayZ(token(line2, 'Z')) },
    { key: '牙高 P', value: `${token(line2, 'P')}${unit}` },
    { key: '首切 Q', value: `${token(line2, 'Q')}${unit}` },
    { key: '导程 F', value: token(line2, 'F') },
    { key: '精修 R', value: `${token(line1, 'R')}${finishUnit}` },
  ];
}

/** G92 参数卡三格：值从 g92Cycle 输出反解（G92 单行无 P/Q/R） */
function buildG92ParamItems(program: G76Program): ParamItem[] {
  const line = program.lines[0] ?? '';
  return [
    { key: '牙底 X', value: token(line, 'X') },
    { key: '终点 Z', value: displayZ(token(line, 'Z')) },
    { key: '导程 F', value: token(line, 'F') },
  ];
}

function metaRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'rc-p04__meta';
  row.append(Eyebrow('带入参数（来自上一步）'));
  return row;
}

/** 代码卡注释：按系统生成；KND + G76 追加口径注（R2 裁决条件） */
function codeComment(system: CncSystem, cycle: CycleForm): string {
  const base = `系统不同，P/Q/R 含义不同 — ${SYSTEM_COMMENT[system]}`;
  if (cycle === 'g76' && system === 'knd') {
    return `${base} · 按 KND-1000T 口径（P/Q/R=0.001mm）`;
  }
  return base;
}

export const title = 'G76 参考程序';

const page: PageModule = {
  title,
  render(ctx: PageContext): void {
    injectStyle('rc-p04-styles', CSS);

    const params = readParams(ctx.params);
    const state = {
      system: readSystem(ctx.params.get('system')),
      cycle: readCycle(ctx.params.get('cycle')),
    };
    // 初始 URL 组合落在禁用格（如 system=hnc&cycle=g92）时同样回落 FANUC，防死状态
    if (!isEnabled(state.system, state.cycle)) state.system = 'fanuc';

    const body = createBody({ className: 'rc-p04__body', ariaLabel: 'G76 参考程序' });
    const top = TopBar({ title: 'G76 参考程序', badge: SYSTEM_BADGE[state.system] });
    const controls = document.createElement('div');
    controls.className = 'rc-p04__controls';
    body.append(controls);

    const systemsRow = (): HTMLElement =>
      Segmented({
        options: SYSTEMS.map((system) => ({
          value: system.value,
          label: system.label,
          ...(isEnabled(system.value, state.cycle) ? {} : { disabled: true }),
        })),
        value: state.system,
        ariaLabel: '数控系统',
        onChange: (value) => {
          state.system = readSystem(value);
          render();
        },
      });

    /** 系统页签行 + 当前形式的置灰提示（两态小字注） */
    const systemsRowWithNote = (systems: HTMLElement): HTMLElement => {
      const wrap = document.createElement('div');
      wrap.className = 'rc-p04__syswrap';
      const noteText = CYCLE_NOTE[state.cycle];
      const note = SubText(noteText);
      note.classList.add('rc-p04__sysnote');
      note.setAttribute('title', noteText);
      note.setAttribute('aria-label', noteText);
      wrap.append(systems, note);
      return wrap;
    };

    const cycleRow = (): HTMLElement =>
      Segmented({
        options: CYCLE_OPTIONS,
        value: state.cycle,
        ariaLabel: '循环形式',
        onChange: (value) => {
          state.cycle = readCycle(value);
          // 切换形式后当前系统在新形式下禁用 → 自动回落 FANUC（钉死，防死状态）
          if (!isEnabled(state.system, state.cycle)) state.system = 'fanuc';
          render();
        },
      });

    const render = (): void => {
      const badge = top.querySelector<HTMLElement>('.la-badge');
      if (badge) badge.textContent = SYSTEM_BADGE[state.system];

      controls.replaceChildren(systemsRowWithNote(systemsRow()), cycleRow());

      if (!params) {
        // 首页 G76 直达（#/p04，无参数）：容忍空参数并提示先选型（README §5.2）
        body.replaceChildren(
          controls,
          WarnCard({
            text: '未选择螺纹规格。请先在「螺纹 · 选型」中选择规格，再生成 G76 程序。',
          }),
          Button({
            label: '去螺纹选型',
            icon: 'thread',
            onClick: () => {
              void ctx.navigate('p02');
            },
          }),
        );
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
      const g76Params: G76Params = {
        minorDiameter: dims.d1,
        endZ: END_Z_MM,
        threadDepthMM,
        firstCutDepthMM: FIRST_CUT_MM,
        lead: params.p,
      };

      if (state.cycle === 'g92') {
        const program = g92Cycle(g76Params);
        body.replaceChildren(
          controls,
          metaRow(),
          ParamGrid({ items: buildG92ParamItems(program), ariaLabel: 'G92 参数' }),
          CodeCard({
            lines: program.lines,
            comment: codeComment(state.system, state.cycle),
            ariaLabel: 'G92 直进循环程序',
          }),
          SubText(G92_ROW_NOTE, { className: 'rc-p04__pnote' }),
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
        return;
      }

      const program = g76Dialect(g76Params, state.system);
      const depthUM = Math.round(threadDepthMM * 1000);
      const depthNote =
        state.system === 'hnc'
          ? `K = 牙深 (d − d₁)/2 = ${threadDepthMM.toFixed(3)} mm（mm 口径，非工作牙高 H₁）`
          : `P = 牙深 (d − d₁)/2 = ${threadDepthMM.toFixed(3)} mm → ${depthUM} μm（非工作牙高 H₁）`;
      const pnote =
        state.system === 'hnc' ? depthNote : `${P_BITS_NOTE}\n${depthNote}`;

      body.replaceChildren(
        controls,
        metaRow(),
        ParamGrid({ items: buildG76ParamItems(program, state.system), ariaLabel: 'G76 参数' }),
        CodeCard({
          lines: program.lines,
          comment: codeComment(state.system, state.cycle),
          ariaLabel: state.system === 'hnc' ? 'G76 单行式程序' : 'G76 两行式程序',
        }),
        SubText(pnote, { className: 'rc-p04__pnote' }),
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
    };

    render();
    ctx.root.append(createPage({ id: 'p04', top, body }));
  },
};

export default page;
