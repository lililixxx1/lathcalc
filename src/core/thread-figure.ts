/**
 * thread-figure.ts · 螺纹牙型剖面示意图视图模型（WAVE-PLAN-V4.9 §2 契约 + §1 V4.9-01/02 冻结）
 *
 * 用户反馈 #6（2026-11-07「螺母没有图形展示螺纹形状」）→ p03 螺纹页牙型轴向剖面图。
 * 形值同源（V4.9-01）：d₂/d₁ 调 core/thread.threadDimensions（PROFILE_CONSTANTS 唯一常数源），
 * 蜗杆 px/h₁/α 调 core/thread.wormGeometry——本模块只算布局几何（比例、坐标、标注位），
 * 禁止复写牙型常数（B.2「牙型角常数绑定」）。
 *
 * 布局（V4.9-02 冻结）：viewBox 220×140，牙型带 2 完整牙 + 两端半牙 = 2.5P 轴向跨度，
 * 等比 k = min(200/(2.5P), 96/(d−d₁))（宽度约束 vs 高度约束取小；高度约束生效时横向
 * 不满幅、居中 x0=(220−2.5P·k)/2 如实呈现，V4.8-02 cap 同规）；牙型带竖向居中 cy=64。
 * 蜗杆（模数制，无 d）：轴向周期 px=π·m 替代 P（wormGeometry 活算）、高度预算按
 * 全齿高 h₁=2.2m（=96/h₁）、分度线替代中径线且分度线在 cy=64（齿顶 +m / 齿根 −1.2m，
 * 齿根偏移 = wholeDepth − m 派生，零新常数）。
 *
 * 牙型构造（全部由冻结常数 + 中径定义推导，教科书精确，禁另立常数）：
 *   - 中径线处牙厚 = 槽宽 = P/2（中径定义，全族通用）→ 牙半宽 P/4 at d₂；
 *   - 牙侧自 (d₂, ±P/4) 与垂直线成 α/2 倾斜（α=flankAngle 全角）；
 *   - 牙顶宽 w_crest = P/2 − (d−d₂)·tan(α/2)、牙底宽 w_root = P/2 − (d₂−d₁)·tan(α/2)
 *     （(d−d₂)/(d₂−d₁) 为直径差，每侧水平收窄 = 半径差×tan(α/2)，双侧合计即直径差×tan(α/2)；
 *     60° 得 P/8 与 P/4、55° 得 P/6 与 P/6、30°Tr 得 0.366P 与 0.366P−0.536ac 方向，
 *     四位常数 0.6495/0.6403 的舍入差见 test/thread-figure.test.ts 构造代数组）；
 *   - 蜗杆：分度线处齿宽 px/2、齿顶宽 px/2−2m·tan20°、齿根宽 px/2−2.4m·tan20°
 *     （tan(α/2) 由 wormGeometry.flankAngle 活算）。
 *   轮廓折线 12 点：左缘 x0 起于根线（左端半槽），交替 牙顶平/根平，收于右缘 x0+2.5P·k
 *   的牙顶线（右端半牙）；四族 w_crest/w_root 均为 P 的正比例常数因子，无退化形态。
 *
 * 标注（V4.9-02 + V4.7/V4.8 教训清单）：
 *   - diameterLines：d/d₂/d₁（蜗杆 齿顶/分度/齿根）三条水平虚线由 UI 画贯穿 [10,210]，
 *     标签线上右侧（UI 右对齐 x=208、基线 = 线 y−3，p16 双 tspan 先例）——基线恒在
 *     [12,128] 内由构造保证（高度预算 96 ⇒ 线 y ∈ [16,112] ⇒ 基线 ∈ [13,109]）；
 *     标签值 toFixed(3) 与页面 ResultCard 同源（蜗杆 h₁ 同源 wormGeometry.wholeDepth，
 *     标于齿根线=全齿高处；齿顶/分度线标构造语义 +m/分度线）。
 *   - pitchMark：P/px 双箭头置牙型带顶部首两相邻牙顶间（跨距 = P·k），箭头线 y =
 *     max(牙顶线−7, 15)，UI 标签基线 = y−3 ≥ 12 由本下限保证；P 值与页面眉标同源
 *     （Math.round(P×1000)/1000 去尾零，p03 formatPitch 同式）。
 *   - flankMark：`α 60°` 文字置首牙左侧（sub 色由 UI 定），不画角弧；位置
 *     x = x0+0.1·轴期像素、y = 牙顶线+8，经半宽夹持（V4.8-03 G2-C-01 兜底同款）：
 *     y∈[12,128]、x∈[半宽+2, 218−半宽]（半宽 0.58em×8.5≈4.93/字符西文、8.5 CJK）。
 *   - gaugeLine：锥管族（sealpipe/npt）基面竖虚线 x=110（居中），剖面同 55°/60°
 *     构造不画锥度变形；y1/y2 = 牙型带上下各外延 8（夹持 [6,119]，UI 标签基线 y2+8 ≤ 127）。
 *     worm 族忽略该入参（模数制无基面语义）。
 *
 * 校验（V4.9-05 口径，UI 侧 p03 为 URL 参数页无保帧需求）：非有限/非正/缺 kind 必填
 * 字段/牙型角越界（非 30|55|60）抛错；d₂/d₁ 由 threadDimensions 派生，不在此复算。
 */
import { threadDimensions, wormGeometry } from './thread';

/** 输入（§2 契约冻结）：kind='thread' 必填 major/pitch/flankAngle；kind='worm' 必填 moduleMM。 */
export interface ThreadFigureInput {
  kind: 'thread' | 'worm';
  /** kind='thread' 必填：大径 mm */
  major?: number;
  /** kind='thread' 必填：螺距 mm（锥管族传基面轴向螺距，与页面 params.p 同源） */
  pitch?: number;
  /** kind='thread' 必填：牙型角全角（30=梯形 Tr / 55=管与密封管 / 60=普通·美制·锥管） */
  flankAngle?: 30 | 55 | 60;
  /** kind='worm' 必填：模数 mm（与页面 params.p 同源） */
  moduleMM?: number;
  /** 锥管族（sealpipe/npt）基面竖虚线开关；仅 kind='thread' 生效 */
  gaugeLine?: boolean;
}

/** 牙型外轮廓折线点（轴向剖面，屏幕坐标，y 向下）。 */
export interface ThreadFigurePoint {
  x: number;
  y: number;
}

export interface ThreadFigureView {
  /** 牙型外轮廓折线（轴向剖面，屏幕坐标，单条 polyline，12 点） */
  profile: ReadonlyArray<ThreadFigurePoint>;
  /** 径向标线（d/d₂/d₁ 或蜗杆 齿顶/分度/齿根），label 含值（UI 画贯穿 [10,210] 虚线 + 右侧标签） */
  diameterLines: ReadonlyArray<{ y: number; label: string }>;
  /** 螺距/轴向齿距双箭头标注（x1..x2 = 首两相邻牙顶中心，y = 箭头线） */
  pitchMark: { x1: number; x2: number; y: number; label: string };
  /** 牙型角文字标注（位置已夹持） */
  flankMark: { x: number; y: number; label: string };
  /** 基面竖虚线（锥管族，x=110）；非锥管 / worm 恒 null */
  gaugeLine: { x: number; y1: number; y2: number; label: string } | null;
}

export const THREAD_FIGURE_VIEW = { width: 220, height: 140 } as const;

/** 布局冻结常数（V4.9-02；来源标注于各行）。 */
const CY = 64; // 牙型带竖向居中基准（V4.9-02）
const BAND_WIDTH_PX = 200; // 宽度预算：x ∈ [10, 210]（V4.9-02 k 式分子）
const BAND_HEIGHT_PX = 96; // 高度预算：带高像素上限（V4.9-02 k 式分子）
const SPAN_PERIODS = 2.5; // 2 完整牙 + 两端半牙（V4.9-02）
const PITCH_ARROW_DY = 7; // P/px 箭头线在牙顶线上方 7
const PITCH_ARROW_MIN_Y = 15; // 箭头线 y 下限（UI 标签基线 = y−3 ≥ 12）
const ALPHA_DX_FACTOR = 0.1; // α 标签 x = x0 + 0.1·轴期像素（首牙左侧）
const ALPHA_DY = 8; // α 标签 y = 牙顶线 + 8
const GAUGE_X = 110; // 基面竖虚线 x（V4.9-02 居中）
const GAUGE_EXT = 8; // 基面线沿牙型带上下外延
const GAUGE_Y1_MIN = 6; // 基面线上端下限
const GAUGE_Y2_MAX = 119; // 基面线下端上限（UI 标签基线 = y2+8 ≤ 127 ≤ 128）
const LABEL_Y_MIN = 12; // 标签 y 硬夹持（V4.8-03 G2-C-01 同款）
const LABEL_Y_MAX = 128;
const CLAMP_PAD = 2; // x 夹持边距（x ∈ [半宽+2, 218−半宽]）
const LATIN_CHAR_W = 4.93; // 0.58em × font 8.5（V4.9-02 半宽估算）
const CJK_CHAR_W = 8.5; // CJK 每字符（V4.9-02）

/** 保守文字半宽：CJK 8.5/字符、其余 0.58em×8.5≈4.93/字符（font 8.5，V4.9-02 盒法）。 */
function halfWidth(text: string): number {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) > 0x2e7f ? CJK_CHAR_W : LATIN_CHAR_W;
  return units / 2;
}

/** x 夹持 [半宽+2, 218−半宽]，防贴缘标签出框。 */
function clampX(x: number, text: string): number {
  const half = halfWidth(text);
  return Math.min(Math.max(x, half + CLAMP_PAD), THREAD_FIGURE_VIEW.width - CLAMP_PAD - half);
}

/** y 夹持 [12,128]（字顶 12−8.8=3.2 ≥0 不出框，V4.8-03 口径）。 */
function clampY(y: number): number {
  return Math.min(Math.max(y, LABEL_Y_MIN), LABEL_Y_MAX);
}

/** 数值非有限或 ≤0 抛错（V4.9-05 校验口径）；通过则返回原值（类型收窄用）。 */
function positiveFinite(value: number | undefined, name: string): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`threadFigure: ${name} 必须为大于 0 的有限数，收到 ${String(value)}`);
  }
  return value;
}

/**
 * 牙型外轮廓 12 点折线：左缘起于根线（半槽根平）→ 3 段牙顶平交替 → 右缘收于牙顶线（半牙）。
 * 牙侧水平跨距 = 轴期/2 − 牙顶半宽 − 根半宽 = 带高×tan(α/2)/2（构造恒等式，牙侧自动 α/2 倾斜）。
 */
function buildProfile(
  x0: number,
  periodPx: number,
  yTop: number,
  yBot: number,
  halfCrestPx: number,
  halfRootPx: number,
): ThreadFigurePoint[] {
  const xRight = x0 + SPAN_PERIODS * periodPx;
  const points: ThreadFigurePoint[] = [
    { x: x0, y: yBot },
    { x: x0 + halfRootPx, y: yBot },
  ];
  for (let i = 0; i < 3; i += 1) {
    const crestCenter = x0 + (i + 0.5) * periodPx;
    points.push({ x: crestCenter - halfCrestPx, y: yTop });
    if (i < 2) {
      points.push({ x: crestCenter + halfCrestPx, y: yTop });
      const grooveCenter = x0 + (i + 1) * periodPx;
      points.push({ x: grooveCenter - halfRootPx, y: yBot });
      points.push({ x: grooveCenter + halfRootPx, y: yBot });
    }
  }
  points.push({ x: xRight, y: yTop });
  return points;
}

export function buildThreadFigure(input: ThreadFigureInput): ThreadFigureView {
  if (input.kind !== 'thread' && input.kind !== 'worm') {
    throw new Error(
      `threadFigure: kind 必须为 'thread' | 'worm'，收到 ${String(input.kind)}`,
    );
  }

  if (input.kind === 'worm') {
    const moduleMM = positiveFinite(input.moduleMM, 'moduleMM');
    // 形值同源（V4.9-01）：px=π·m、h₁=2.2m、α=40° 全部取自 wormGeometry，零复写。
    const worm = wormGeometry(moduleMM);
    const axialPitchMM = worm.axialPitch; // px = π·m（wormGeometry 活算）
    const topRadial = moduleMM; // 齿顶 +m（V4.9-02）
    const botRadial = worm.wholeDepth - moduleMM; // 齿根 −1.2m = 全齿高 − 齿顶高（派生）
    const k = Math.min(BAND_WIDTH_PX / (SPAN_PERIODS * axialPitchMM), BAND_HEIGHT_PX / worm.wholeDepth);
    const periodPx = axialPitchMM * k;
    const x0 = (THREAD_FIGURE_VIEW.width - SPAN_PERIODS * periodPx) / 2;
    const yTop = CY - topRadial * k; // 分度线在 cy（V4.9-02），带不居中、分度线居中
    const yBot = CY + botRadial * k;
    const halfFlank = Math.tan((worm.flankAngle / 2) * (Math.PI / 180));
    const halfCrestPx = ((axialPitchMM / 2 - 2 * topRadial * halfFlank) / 2) * k;
    const halfRootPx = ((axialPitchMM / 2 - 2 * botRadial * halfFlank) / 2) * k;

    const flankLabel = `α ${worm.flankAngle}°`;
    return {
      profile: buildProfile(x0, periodPx, yTop, yBot, halfCrestPx, halfRootPx),
      diameterLines: [
        { y: yTop, label: '齿顶 +m' },
        { y: CY, label: '分度线' },
        { y: yBot, label: `h₁ ${worm.wholeDepth.toFixed(3)}` },
      ],
      pitchMark: {
        x1: x0 + 0.5 * periodPx,
        x2: x0 + 1.5 * periodPx,
        y: Math.max(yTop - PITCH_ARROW_DY, PITCH_ARROW_MIN_Y),
        label: `px ${axialPitchMM.toFixed(3)}`,
      },
      flankMark: {
        x: clampX(x0 + ALPHA_DX_FACTOR * periodPx, flankLabel),
        y: clampY(yTop + ALPHA_DY),
        label: flankLabel,
      },
      gaugeLine: null,
    };
  }

  // kind === 'thread'
  const major = positiveFinite(input.major, 'major');
  const pitch = positiveFinite(input.pitch, 'pitch');
  const angle = input.flankAngle;
  if (angle !== 30 && angle !== 55 && angle !== 60) {
    throw new Error(`threadFigure: flankAngle 必须为 30 | 55 | 60，收到 ${String(angle)}`);
  }
  // d₂/d₁ 形值同源（V4.9-01）：threadDimensions 按牙型角路由 PROFILE_CONSTANTS；
  // family 只影响 tapDrill（本模块不使用），d₂/d₁ 仅由 (d, P, α) 决定。
  const family: 'metric' | 'pipe55' | 'trapezoid' =
    angle === 60 ? 'metric' : angle === 55 ? 'pipe55' : 'trapezoid';
  const dims = threadDimensions({
    family,
    designation: '',
    pitch,
    major,
    flankAngle: angle,
  });
  const topRadial = (major - dims.d2) / 2; // 牙顶到中径的半径差
  const botRadial = (dims.d2 - dims.d1) / 2; // 中径到牙底的半径差
  const bandRadial = topRadial + botRadial; // = (d−d₁)/2
  const k = Math.min(BAND_WIDTH_PX / (SPAN_PERIODS * pitch), BAND_HEIGHT_PX / (2 * bandRadial));
  const periodPx = pitch * k;
  const x0 = (THREAD_FIGURE_VIEW.width - SPAN_PERIODS * periodPx) / 2;
  // 牙型带竖向居中 cy=64（V4.9-02）：d 顶在上、d₁ 底在下，d₂ 线按构造链
  // y_d2 = y_d + (d−d₂)·k（与牙顶/牙根两点自洽；计划 §3 M10「38.02」/Tr「44.00」
  // 与其自身牙顶/牙根值矛盾，系半距误置，实现按构造链取值并已在证据档披露上报）。
  const yTop = CY - bandRadial * k;
  const yMid = yTop + 2 * topRadial * k;
  const yBot = CY + bandRadial * k;
  const halfFlank = Math.tan((angle / 2) * (Math.PI / 180));
  const halfCrestPx = ((pitch / 2 - 2 * topRadial * halfFlank) / 2) * k;
  const halfRootPx = ((pitch / 2 - 2 * botRadial * halfFlank) / 2) * k;

  const taperGauge = input.gaugeLine === true;
  return {
    profile: buildProfile(x0, periodPx, yTop, yBot, halfCrestPx, halfRootPx),
    diameterLines: [
      { y: yTop, label: `d ${major.toFixed(3)}` },
      { y: yMid, label: `d₂ ${dims.d2.toFixed(3)}` },
      { y: yBot, label: `d₁ ${dims.d1.toFixed(3)}` },
    ],
    pitchMark: {
      x1: x0 + 0.5 * periodPx,
      x2: x0 + 1.5 * periodPx,
      y: Math.max(yTop - PITCH_ARROW_DY, PITCH_ARROW_MIN_Y),
      // P 值与页面眉标同源（p03 formatPitch 同式：三位舍入去尾零）
      label: `P ${String(Math.round(pitch * 1000) / 1000)}`,
    },
    flankMark: {
      x: clampX(x0 + ALPHA_DX_FACTOR * periodPx, `α ${angle}°`),
      y: clampY(yTop + ALPHA_DY),
      label: `α ${angle}°`,
    },
    gaugeLine: taperGauge
      ? {
          x: GAUGE_X,
          y1: Math.max(yTop - GAUGE_EXT, GAUGE_Y1_MIN),
          y2: Math.min(yBot + GAUGE_EXT, GAUGE_Y2_MAX),
          label: '基面',
        }
      : null,
  };
}
