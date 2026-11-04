/**
 * 车工算 LathCalc · 共享类型契约（Lead 预置，worker 只填实现，不得改本文件）
 *
 * 坐标约定：X = 直径值（车床惯例），Z = 线性值，单位 mm；角度单位度（°）。
 * 常数集：见 WAVE-PLAN §4 头部（60°：0.6495/1.0825/0.5413/0.866/0.57735；
 *         55°：0.6403/1.2806/3.1657/0.9605；Tr 30°、牙高 0.5P）。改常数集 = 改验收语义，走 L2。
 */

// ===== 通用 =====
export interface Vec2 {
  /** X 轴坐标（直径制） */
  x: number;
  /** Z 轴坐标 */
  z: number;
}

/** 度 → 度分秒字符串（如 2.862405 → "2°51′45″"，秒四舍五入） */
export type DegToDMS = (deg: number) => string;

// ===== 螺纹（W2-C2 实现） =====
export type ThreadFamily = 'metric' | 'trapezoid' | 'pipe55' | 'unified';
export type FlankAngle = 60 | 55 | 30;

export interface ThreadSpec {
  family: ThreadFamily;
  /** 规格名，如 'M30×3.5' / 'Tr40×7' / 'G1 1/2' / '1"-8 UNC' */
  designation: string;
  /** 螺距 mm（管/UN 螺纹按 tpi 换算：P = 25.4/tpi） */
  pitch: number;
  /** 大径 mm */
  major: number;
  flankAngle: FlankAngle;
}

export interface ThreadDimensions {
  /** 中径 */
  d2: number;
  /** 小径（外螺纹） */
  d1: number;
  /** 牙型工作高度 */
  h1: number;
  /** 切削丝锥底孔（近似 d−P，材料修正由 UI 注记） */
  tapDrill: number;
  /** 三针最佳针径 d0（60°/55°：0.57735P / 0.56371P≈P/√3 按牙型角） */
  bestWire: number;
}

/** 螺纹尺寸计算（含 60°/55°/30°Tr 三族） */
export type ThreadDimensionsFn = (spec: ThreadSpec) => ThreadDimensions;

/** 三针测量跨距 M = d2 + k1·d0 − k2·P（k1/k2 按牙型角：60° 3/0.866；55° 3.1657/0.9605；30°Tr 另表） */
export type ThreeWireMFn = (spec: ThreadSpec, wireDiameter: number) => number;

/** 螺纹数据表行（W3 录入，schema 冻结） */
export interface ThreadRow {
  family: ThreadFamily;
  designation: string;
  /** 螺距 mm */
  pitch: number;
  /** 大径 mm */
  major: number;
  /** 粗牙标记（仅 metric 有意义） */
  coarse?: boolean;
  /** 每英寸牙数（pipe55/unified 原始口径） */
  tpi?: number;
  /** PROVENANCE 来源键（标准号+手册页） */
  source: string;
}

// ===== 转速（W2-C1 实现） =====
export interface SpeedInput {
  /** 工件直径 mm */
  diameter: number;
  /** 切削速度 m/min */
  vc: number;
  /** 每转进给 mm/r（可选，给了才算 vf 与 Ra） */
  feed?: number;
  /** 刀尖圆弧半径 mm（可选，给了才算理论 Ra） */
  tipRadius?: number;
}

export interface SpeedResult {
  /** 主轴转速 r/min = 1000·Vc/(π·D) */
  rpm: number;
  /** 每分钟进给 mm/min = f·n（未给 f 时为 0） */
  feedPerMin: number;
  /** 理论粗糙度 μm ≈ 1000·f²/(8·r)（未给 f/r 时为 undefined） */
  ra?: number;
}

export type SpindleSpeedFn = (input: SpeedInput) => SpeedResult;

// ===== 转速反向（WAVE-PLAN-V2 §1，W6-C3 实现；DEFERRED #13 收账） =====
/** Vc = n·π·D/1000 [m/min]，返回标量（G0-B1：不滥用 SpeedResult） */
export type SurfaceSpeedFn = (input: { d: number; n: number }) => number;
/** vf = f·n [mm/min]（WAVE-PLAN-V2 F6） */
export type FeedRateFn = (f: number, n: number) => number;

// ===== 锥度（W2-C3 实现） =====
/** 三值互算：big/small/length 任给其三（缺项传 undefined），求缺项 + 锥度 C + 半角 */
export interface TaperInput {
  big?: number;
  small?: number;
  length?: number;
}

export interface TaperResult {
  /** 补全后的第四值 */
  missing: number;
  /** 锥度 C = (D−d)/L，以 "1:x" 或数值返回由实现定——契约：返回数值 C，显示层排版 */
  taperC: number;
  /** 半角 α/2，度 */
  halfAngleDeg: number;
  /** 半角度分秒串（如 "2°51′45″"） */
  halfAngleDMS: string;
}

export type TaperCalcFn = (input: TaperInput) => TaperResult;

// ===== 锥度反推（WAVE-PLAN-V2 §1，W6-C4 实现；DEFERRED #8） =====
export interface TaperReverseInput extends TaperInput {
  /** 外部给定锥比 C（莫氏预设如 1/19.254 或自定义值）；必须 > 0 */
  taperC: number;
}

export interface TaperReverseResult extends TaperResult {
  /** 反推出的第三值字段名 */
  solved: 'big' | 'small' | 'length';
  /** (D − d)/2 [mm]，由未舍入值计算（G0-I4 钉路径） */
  halfDiffMM: number;
}

/**
 * taperC(>0) + big/small/length 恰两值 → 解第三值；缺/多值或 taperC≤0 抛错（不臆造）。
 * missing = 反推所得第三值的数值。
 */
export type TaperReverseFn = (input: TaperReverseInput) => TaperReverseResult;

// ===== 公差（W2-C3 合成 / W3-C4 录表） =====
export interface ToleranceInput {
  /** 基本尺寸 mm */
  nominal: number;
  /** IT 等级（5–12 常用） */
  grade: number;
  /** 基本偏差代号（孔大写：H/G/K/P…；轴小写：h/g/k/p…） */
  fundamental: string;
}

export interface ToleranceResult {
  /** 上偏差 mm（带符号） */
  upper: number;
  /** 下偏差 mm（带符号） */
  lower: number;
  /** 公差带宽度 mm（= IT 值） */
  tolerance: number;
}

/** 偏差合成：给定 IT 公差值与基本偏差（表值由 lookup 提供，本函数做合成） */
export type ToleranceComposeFn = (input: ToleranceInput, itValueMM: number, fundamentalOffsetMM: number) => ToleranceResult;

/** IT 公差表行（GB/T 1800.1，W3-C4 录入） */
export interface ITTableRow {
  /** 尺寸分段（左开右闭，mm）：(30,50]——与 GB/T 1800.1"大于 30 至 50"分段一致（C-03） */
  segment: [number, number];
  /** IT 等级 → 公差 μm */
  values: Partial<Record<number, number>>;
  source: string;
}

// ===== 三角（W2-C1 实现） =====
export interface TriangleInput {
  a?: number;
  b?: number;
  c?: number;
  A?: number;
  B?: number;
  C?: number;
}

export interface TriangleResult {
  a: number;
  b: number;
  c: number;
  /** 角，度 */
  A: number;
  B: number;
  C: number;
  area: number;
  /** 是否直角三角形（任一角 ±0.01° 内为 90°） */
  right: boolean;
}

export type SolveTriangleFn = (input: TriangleInput) => TriangleResult;

// ===== 三角多模式（WAVE-PLAN-V2 §1，W6-C4 实现；DEFERRED #7） =====
/** SSA 双解时两解并列、锐角解在前（V2-3） */
export interface TriangleSolveOutput {
  mode: 'SSS' | 'SAS' | 'ASA' | 'SSA';
  solutions: TriangleResult[];
}

/**
 * 模式判定（G0-I2 冻结）：恰三边=SSS；恰两边+其夹角=SAS；恰两边+对角=SSA；
 * 恰两角+其夹边=ASA；其余组合（AAS/AAA/缺值/多值/零值负值）一律抛错，
 * 文案「无法判定解算模式或输入非法」。
 */
export type SolveTriangleByFn = (input: TriangleInput) => TriangleSolveOutput;

// ===== 重量（W2-C1 实现） =====
export type WeightShape = 'round' | 'hex' | 'pipe' | 'plate';

export interface WeightInput {
  shape: WeightShape;
  /** round: {D,L}；hex: {S,L}（S 对边距）；pipe: {D,t,L}；plate: {W,T,L}，mm */
  dims: Record<string, number>;
  /** 密度 g/cm³ */
  density: number;
}

export interface WeightResult {
  /** 体积 mm³ */
  volumeMM3: number;
  /** 单件重量 kg */
  massKg: number;
}

export type BarWeightFn = (input: WeightInput) => WeightResult;

/** 密度表行（W3-C5 录入） */
export interface DensityRow {
  key: string;
  name: string;
  /** g/cm³ */
  density: number;
  source: string;
}

// ===== 圆弧切点（W2-C4/C5 实现，12 工况） =====
export type ArcCaseId =
  | 'AC01' | 'AC02' | 'AC03' | 'AC04' | 'AC05' | 'AC06'
  | 'AC07' | 'AC08' | 'AC09' | 'AC10' | 'AC11' | 'AC12';

/** 工况求解器契约：input 键集由各工况定义（见 arc-cases-a/b），输出恒为 ArcSolution */
export interface ArcCaseSolver {
  id: ArcCaseId;
  /** 工况中文名（与设计稿 p05 图库一致） */
  name: string;
  /** 本工况接受的输入键说明（文档用） */
  inputs: readonly string[];
  solve: (input: Record<string, number>) => ArcSolution;
}

export interface ArcSolution {
  /** 切点（直径制 X） */
  tangent: Vec2;
  /** 圆心（直径制 X） */
  center: Vec2;
  /** 顺/逆圆（已按刀架方位与刀补约定判向） */
  direction: 'G02' | 'G03';
  /** 可复制程序行。坐标格式（I-1 冻结，2026-11-03 W2-G2）：≤3 位小数、去尾零、整数不带点；R 至少 1 位小数。例（AC01 例1 真值）：'G02 X36 Z0 R5.0' */
  gcodeLine: string;
}

// ===== G76 程序生成（W2-C5 实现，仅 FANUC） =====
export interface G76Params {
  /** 牙底 X 终点（= 小径 d1，直径制） */
  minorDiameter: number;
  /** Z 终点（负值为常见车削方向） */
  endZ: number;
  /** 牙深（单边，mm）→ P 参数 μm（取整） */
  threadDepthMM: number;
  /** 首刀切深（单边，mm）→ Q 参数 μm（取整） */
  firstCutDepthMM: number;
  /** 导程 mm → F */
  lead: number;
  /** 精修余量 mm → R（默认 0.05） */
  finishAllowanceMM?: number;
}

export interface G76Program {
  /** 两行式 G76 程序行 */
  lines: string[];
  /** 固定免责文案（报告 §7.4 原句，禁止改写） */
  disclaimer: string;
}

export type FanucG76Fn = (p: G76Params) => G76Program;

// ===== 方言与 G92（WAVE-PLAN-V2 §1，W6-C2 实现；DEFERRED #1/#2b） =====
export type CncSystem = 'fanuc' | 'gsk' | 'knd' | 'hnc';
/** 语义待 W6-C1 双源调研冻结（docs/research/g76-dialects.md）；恒等式 g76Dialect(p,'fanuc') ≡ fanucG76(p) */
export type G76DialectFn = (p: G76Params, system: CncSystem) => G76Program;
/** FANUC 车螺纹单行程循环，单行输出（G0-B2 冻结行数） */
export type G92CycleFn = (p: G76Params) => G76Program;

// ===== 材料 / 莫氏 / 速查（W3-C5 录入） =====
/** 切削参数区间 [min,max] */
export type Range = readonly [number, number];

export interface MaterialRow {
  key: string;
  /** 如 '45 钢' / '40Cr' / 'HT200' */
  name: string;
  group: string;
  /** 硬质合金刀 Vc m/min */
  carbideVc: Range;
  /** 高速钢刀 Vc m/min */
  hssVc: Range;
  /** 硬质合金刀 f mm/r */
  carbideFeed: Range;
  /** 高速钢刀 f mm/r */
  hssFeed: Range;
  /** 恒为示例数据标注 */
  note?: string;
  source: string;
}

export interface MorseRow {
  /** 0–6 号 */
  number: number;
  /** 锥度，如 '1:19.254' */
  taper: string;
  halfAngleDMS: string;
  source: string;
}

export interface GcodeRefRow {
  code: string;
  desc: string;
}
