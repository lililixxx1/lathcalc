/**
 * p04 · G76 / G92 参考程序（W4-C2 实现；W6-C2 三系统解灰 + 循环形式切换；
 * W8-B GSK 型号细分 + HNC G82，WAVE-PLAN-V3 G3/G4）
 *
 * 设计稿区块（自上而下，docs/车工计算App-无限画布.html:1206-1225）：
 *   状态栏 → 顶栏（参考程序 + 当前系统徽标）→ 系统页签 →（GSK 型号页签）
 *   → 循环形式页签 → 带入参数眉标 → 参数卡 → 暗色代码卡（两行/单行 + 注释）
 *   → P 位/牙深说明 → 复制程序 → 免责警示条 → Home 指示条
 *
 * P 位正名（W2-C5 裁决 2 冻结，禁写错）：
 *   P(m)(r)(a) 三位 = 02 精车次数 / 10 退尾量（倒角量）/ 60 刀尖角。
 * 程序输出一律经 core/gcode.g76Dialect() / g92Cycle()，UI 不另拼字符串；
 * 参数卡数值同样从程序输出反解，保证与代码行逐字符一致。
 * 牙高 P 位（行 2 的 P 字）取实际单边牙深 (d − d₁)/2，M30×3.5 → 1894 μm（禁 1895）。
 *
 * 方言 enable 矩阵（WAVE-PLAN-V3 V3-3/V3-4 起解除 W6 置灰）：
 *   G76 形式：四系统全可用；GSK 下增「型号」Segmented 选择两端口径——
 *     988TA（P/Q/R 均 mm 半径小数）/ 980TDc（P/Q 为 0.0001mm 增量 №.182.7，R=mm）。
 *   G92 直进形式：四系统全可用；HNC 生成 G82 单循环（G92 在 HNC 是工件坐标系设定）。
 * 原「GSK 暂不生成」「华中请用 G82」两态置灰提示及回落 FANUC 逻辑随解灰整体移除。
 * W10-C（WAVE-PLAN-V4 §2）：锥管族 sealpipe/npt 解禁——锥管模式显示「螺纹长度 L」输入行
 *   （URL 键 l），taperRadiusMM = −L/32（1:16 直径锥比 → 半径差 = L×(1/16)/2）；
 *   终点 = 基准平面 Z−L / 基面小径 X，起点 = 小端 Z0（V4 §2 方向约定）。
 *   蜗杆仍不出程序（p03 不显示按钮；p04 遇 family=worm 落「请先选型」降级）。
 * URL 键：system=fanuc|gsk|knd|hnc（默认 fanuc）、cycle=g76|g92（默认 g76）、
 *   gskmodel=988ta|980tdc（默认 988ta，非法值同缺省回落——防死状态）、
 *   l=锥管螺纹长度 mm（仅 sealpipe/npt 生效；缺省/非法回落 9.6）。
 */
import type { PageContext, PageModule } from '../router';
import {
  Button,
  CodeCard,
  Eyebrow,
  InputRow,
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
  GskModel,
  ThreadFamily,
  ThreadSpec,
} from '../../core/types';

type RouteFamily = 'metric' | 'trapezoid' | 'pipe' | 'unified' | 'sealpipe' | 'npt';
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
  // W10-C：锥管族与 p03/p02 同源（p02 页签 value 逐字一致）
  sealpipe: { dataFamily: 'sealpipe', flankAngle: 55 },
  npt: { dataFamily: 'npt', flankAngle: 60 },
};

/** 锥管族：程序需输出锥度位（R/I）并显示「螺纹长度 L」输入行 */
function isTaperFamily(family: RouteFamily): boolean {
  return family === 'sealpipe' || family === 'npt';
}

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

/** GSK 型号页签（仅 GSK + G76 形式出现；values 与 types.ts GskModel 对齐） */
const GSK_MODELS: readonly { value: GskModel; label: string }[] = [
  { value: '988ta', label: '988TA mm' },
  { value: '980tdc', label: '980TDc 增量' },
];

/** GSK 代码卡口径注（逐字：P/Q 单位两型号不同，防 10⁴ 倍静默误解） */
const GSK_MODEL_COMMENT: Record<GskModel, string> = {
  '988ta': '按 GSK988TA 口径（P/Q=mm 半径）',
  '980tdc': '按 GSK980TDc 口径（P/Q=0.0001mm 增量 №.182.7，R=mm）',
};

/** W6-C1-04 裁决文案：G92 单行只是循环首行 */
const G92_ROW_NOTE = 'G92 为循环首行，完整螺纹需后续 X 递减分刀';

/** V3-4 文案：HNC 直进循环 = G82 单循环，同样只是首行 */
const G82_ROW_NOTE = 'G82 为单循环行，完整螺纹需后续 X 递减分刀';

/** 设计稿 p04 冻结示例参数（非标准表值）：Z 终点 −30 mm、首刀 0.4 mm（Q400 μm） */
const END_Z_MM = -30;
const FIRST_CUT_MM = 0.4;

/**
 * 锥管族冻结示例参数（WAVE-PLAN-V4 §2 W10-C 数字纪律注）：
 * L = 9.6 mm 为冻结测试输入（非推导值；使 −L/32 = −0.3 落三位小数内无舍入，
 * 且避开 KND 0.001mm 半值边界 −312.5）；首刀 0.2 mm → Q200，与四锚点行同源。
 * 用户可在「螺纹长度 L」输入行改写（URL 键 l）。
 */
const DEFAULT_TAPER_LENGTH_MM = 9.6;
const TAPER_FIRST_CUT_MM = 0.2;

const P_BITS_NOTE = 'P021060 = 02 精车次数 · 10 退尾量（倒角量）· 60 刀尖角';

const CSS = `
.rc-p04__body { padding-top: 2px; }
.rc-p04__meta { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
.rc-p04__pnote { white-space: pre-line; }
/* 程序区挂载点：display:contents 让子节点继续参与 .la-body 的 flex 布局（L 输入时只刷新区块） */
.rc-p04__program { display: contents; }
.rc-p04__tapernote { line-height: 1.55; overflow-wrap: anywhere; }
/* 系统页签 +（GSK 型号页签）+ 循环形式页签纵向排布 */
.rc-p04__controls { display: flex; flex-direction: column; gap: 9px; flex: 0 0 auto; }
/* 六格参数在 390px 下保持单行（设计稿 3 列紧凑排布） */
.rc-p04__body .rc-param { padding: 7px 8px; gap: 4px; }

/* V4.13：滚动 opt-in（全站滚动审计坐实：长程序态 sealpipe G76 在 390x680 裁 +36px
   且无滚动通道（CLIP-NOSCROLL）；默认态 -128px 装得下故此前未暴露。同 p01/p03
   取证与先例。证据：docs/evidence/V4.13/runs/scroll-audit.json） */
.la-page[data-page="p04"] .la-body { overflow-y: auto; }
/* W12 A4-W6（G2-V4.13 C-01 恢复——V4.13 初笔插入脚本误删此 3 行，git 对照 HEAD 复原）：
   组件值格 overflow-wrap:anywhere 会在 KND 口径注（0.001mm）内部断词，
   p04 域内回落标准折行（全角括号前后可断、0.001mm 整词不断） */
.rc-p04__body .rc-param__value { overflow-wrap: normal; }
`;

function readFamily(value: string | null): RouteFamily | null {
  if (
    value === 'metric' ||
    value === 'trapezoid' ||
    value === 'pipe' ||
    value === 'unified' ||
    value === 'sealpipe' ||
    value === 'npt'
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

/** URL system 键（默认 fanuc；非法值回落默认） */
function readSystem(value: string | null): CncSystem {
  return value === 'gsk' || value === 'knd' || value === 'hnc' ? value : 'fanuc';
}

/** URL cycle 键（默认 g76；非法值回落默认） */
function readCycle(value: string | null): CycleForm {
  return value === 'g92' ? 'g92' : 'g76';
}

/** URL gskmodel 键（默认 988ta；非法值回落默认——防死状态，同 W6-C2-04 先例） */
function readGskModel(value: string | null): GskModel {
  return value === '980tdc' ? '980tdc' : '988ta';
}

/** URL l 键（锥管螺纹长度 mm）：缺省 / 非正 / 非数字回落 9.6（V4 §2 W10-C 冻结算例输入） */
function readTaperLength(value: string | null): number {
  const length = Number(value);
  if (!Number.isFinite(length) || length <= 0) return DEFAULT_TAPER_LENGTH_MM;
  return length;
}

/** 显示数值：最多 3 位小数、去尾零（与 core/gcode 的 formatNumber 同口径） */
function formatMM(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = text.slice(0, -1);
  return text;
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
function buildG76ParamItems(
  program: G76Program,
  system: CncSystem,
  gskModel: GskModel,
): ParamItem[] {
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

  if (system === 'gsk') {
    // GSK 两行式：988TA 的 P/Q 为 mm 半径小数；980TDc 为 0.0001mm 增量（№.182.7）；
    // 两型号 R(d) 均保持 mm（g76-dialects.md §1 行1 单位注）。
    const unit = gskModel === '980tdc' ? '（0.0001mm）' : ' mm';
    return [
      { key: '牙底 X', value: token(line2, 'X') },
      { key: '终点 Z', value: displayZ(token(line2, 'Z')) },
      { key: '牙高 P', value: `${token(line2, 'P')}${unit}` },
      { key: '首切 Q', value: `${token(line2, 'Q')}${unit}` },
      { key: '导程 F', value: token(line2, 'F') },
      { key: '精修 R', value: `${token(line1, 'R')} mm` },
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

/** 代码卡注释：按系统生成；KND / GSK + G76 追加口径注（R2 裁决条件 / V3-3 / W10-C 锥度） */
function codeComment(
  system: CncSystem,
  cycle: CycleForm,
  gskModel: GskModel,
  taper: boolean,
): string {
  const base = `系统不同，P/Q/R 含义不同 — ${SYSTEM_COMMENT[system]}`;
  const parts = [base];
  if (cycle === 'g76' && system === 'knd') {
    parts.push('按 KND-1000T 口径（P/Q/R=0.001mm）');
    // 上报留痕（W10-C 上报条件①）：R(i) 单位无手册逐字单位句，按全 P/Q/R 口径推定
    if (taper) parts.push('R(i) 按 KND 全 P/Q/R 0.001mm 口径推定');
  }
  if (cycle === 'g76' && system === 'gsk') {
    parts.push(GSK_MODEL_COMMENT[gskModel]);
  }
  // G0-v0.3 复核观察 1（G2-W10 Minor-3 作用域精确化）：仅 FANUC 的 G92 R 位系三系统
  // 同串先例外推；GSK/KND 的 G92 R 格式系手册明载（g76-dialects.md §1 行2/行6，非外推）
  if (taper && cycle === 'g92' && system === 'fanuc') {
    parts.push('FANUC R 位系 W6 三系统同串先例外推');
  }
  return parts.join(' · ');
}

/**
 * 锥度位与推导式（程序卡下方展示；WAVE-PLAN-V4 §2 W10-C 方向约定）：
 * 锥度位 = 起点半径 − 终点半径 = −L/32；HNC 位名 I，其余 R。
 * KND G76 按 0.001mm 整数 μ 输出（推定口径，代码卡注释同步披露）。
 */
function taperNoteText(system: CncSystem, cycle: CycleForm, lengthMM: number): string {
  const taper = -lengthMM / 32;
  const word = system === 'hnc' ? 'I' : 'R';
  const shown =
    system === 'knd' && cycle === 'g76'
      ? `${word}${Math.round(taper * 1000)}（0.001mm 口径）`
      : `${word}${formatMM(taper)}`;
  // 推导式用排版负号（−）与「−L/32」一致；程序行仍为 ASCII 减号（逐字符锚点）
  const derived = formatMM(taper).replace(/^-/, '−');
  return [
    `锥度位 ${word} = −L/32 = −${formatMM(lengthMM)}/32 = ${derived} mm`,
    `（程序写作 ${shown}；1:16 锥比 = 直径:长度 → 半径差 = L×(1/16)/2 = L/32`,
    `；终点 = 基准平面 Z−${formatMM(lengthMM)} / 基面小径 X，起点 = 小端 Z0）`,
  ].join('');
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
      gskModel: readGskModel(ctx.params.get('gskmodel')),
    };

    const body = createBody({ className: 'rc-p04__body', ariaLabel: 'G76 参考程序' });
    const top = TopBar({ title: 'G76 参考程序', badge: SYSTEM_BADGE[state.system] });
    const controls = document.createElement('div');
    controls.className = 'rc-p04__controls';
    body.append(controls);

    // V3-3 起四系统全可用（G76 / G92 两形式），系统页签不再有 disabled 项。
    const systemsRow = (): HTMLElement =>
      Segmented({
        options: SYSTEMS,
        value: state.system,
        ariaLabel: '数控系统',
        onChange: (value) => {
          state.system = readSystem(value);
          render();
        },
      });

    /** GSK 型号页签：仅 GSK + G76（两代手册的 P/Q 口径差异只存在于 G76） */
    const modelRow = (): HTMLElement | null => {
      if (state.system !== 'gsk' || state.cycle !== 'g76') return null;
      return Segmented({
        options: GSK_MODELS,
        value: state.gskModel,
        ariaLabel: 'GSK 型号',
        onChange: (value) => {
          state.gskModel = readGskModel(value);
          render();
        },
      });
    };

    const cycleRow = (): HTMLElement =>
      Segmented({
        options: CYCLE_OPTIONS,
        value: state.cycle,
        ariaLabel: '循环形式',
        onChange: (value) => {
          state.cycle = readCycle(value);
          render();
        },
      });

    // 锥管螺纹长度 L：state 常驻；输入时只刷新程序区，不重建输入行（避免丢焦点）
    let taperLengthMM = readTaperLength(ctx.params.get('l'));
    const programSlot = document.createElement('div');
    programSlot.className = 'rc-p04__program';

    /** 按当前 system / cycle / 长度重算程序区（坐标系与参数卡均从 core 输出反解） */
    const renderProgram = (): void => {
      if (!params) return;
      const taper = isTaperFamily(params.family);

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
      // 锥管族（V4 §2）：终点 = 基准平面 Z−L / 基面小径 X，起点 = 小端 Z0，
      // taperRadiusMM = 起点半径 − 终点半径 = −L/32；首刀取冻结算例 0.2 mm（Q200）。
      const g76Params: G76Params = {
        minorDiameter: dims.d1,
        endZ: taper ? -taperLengthMM : END_Z_MM,
        threadDepthMM,
        firstCutDepthMM: taper ? TAPER_FIRST_CUT_MM : FIRST_CUT_MM,
        lead: params.p,
        ...(taper ? { taperRadiusMM: -taperLengthMM / 32 } : {}),
      };

      if (state.cycle === 'g92') {
        // HNC 的直进循环是 G82（G92 在 HNC = 工件坐标系设定，§1 行4 负结论）；
        // 其余三系统仍为 G92 单行（§1 行2/行6）。锥管族 G92 的 R 为 mm（V4 锚点）。
        const program = g92Cycle(g76Params, state.system);
        const rowNote = state.system === 'hnc' ? G82_ROW_NOTE : G92_ROW_NOTE;
        programSlot.replaceChildren(
          ParamGrid({ items: buildG92ParamItems(program), ariaLabel: 'G92 参数' }),
          CodeCard({
            lines: program.lines,
            comment: codeComment(state.system, state.cycle, state.gskModel, taper),
            ariaLabel: state.system === 'hnc' ? 'G82 直进循环程序' : 'G92 直进循环程序',
          }),
          ...(taper
            ? [
                SubText(taperNoteText(state.system, state.cycle, taperLengthMM), {
                  className: 'rc-p04__tapernote',
                }),
              ]
            : []),
          SubText(rowNote, { className: 'rc-p04__pnote' }),
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

      const program = g76Dialect(g76Params, state.system, state.gskModel);
      const depthMM = threadDepthMM.toFixed(3);
      const depthNote =
        state.system === 'hnc'
          ? `K = 牙深 (d − d₁)/2 = ${depthMM} mm（mm 口径，非工作牙高 H₁）`
          : state.system === 'gsk' && state.gskModel === '980tdc'
            ? `P = 牙深 (d − d₁)/2 = ${depthMM} mm → ${Math.round(threadDepthMM * 10000)}（0.0001mm 增量，№.182.7；非工作牙高 H₁）`
            : state.system === 'gsk'
              ? `P = 牙深 (d − d₁)/2 = ${depthMM} mm（mm 口径三位，非工作牙高 H₁）`
              : `P = 牙深 (d − d₁)/2 = ${depthMM} mm → ${Math.round(threadDepthMM * 1000)} μm（非工作牙高 H₁）`;
      const pnote =
        state.system === 'hnc' ? depthNote : `${P_BITS_NOTE}\n${depthNote}`;

      programSlot.replaceChildren(
        ParamGrid({
          items: buildG76ParamItems(program, state.system, state.gskModel),
          ariaLabel: 'G76 参数',
        }),
        CodeCard({
          lines: program.lines,
          comment: codeComment(state.system, state.cycle, state.gskModel, taper),
          ariaLabel: state.system === 'hnc' ? 'G76 单行式程序' : 'G76 两行式程序',
        }),
        ...(taper
          ? [
              SubText(taperNoteText(state.system, state.cycle, taperLengthMM), {
                className: 'rc-p04__tapernote',
              }),
            ]
          : []),
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

    const render = (): void => {
      const badge = top.querySelector<HTMLElement>('.la-badge');
      if (badge) badge.textContent = SYSTEM_BADGE[state.system];

      const model = modelRow();
      controls.replaceChildren(systemsRow(), ...(model ? [model] : []), cycleRow());

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

      // 锥管族：螺纹长度 L 输入行（URL 键 l；缺省/非法回落 9.6）
      const lengthRow = isTaperFamily(params.family)
        ? InputRow({
            label: '螺纹长度 L',
            value: formatMM(taperLengthMM),
            unit: 'mm',
            name: 'taperLength',
            ariaLabel: '螺纹长度 L',
            onInput: (value) => {
              const next = Number(value);
              if (Number.isFinite(next) && next > 0) {
                taperLengthMM = next;
                renderProgram();
              }
            },
          })
        : null;

      body.replaceChildren(
        controls,
        metaRow(),
        ...(lengthRow ? [lengthRow] : []),
        programSlot,
      );
      renderProgram();
    };

    render();
    ctx.root.append(createPage({ id: 'p04', top, body }));
  },
};

export default page;
