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

// ===== 螺纹（W2-C2 实现） =====
export type ThreadFamily = 'metric' | 'trapezoid' | 'pipe55' | 'unified' | 'sealpipe' | 'npt' | 'worm';
export type FlankAngle = 60 | 55 | 30 | 40;

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
  /**
   * 锥螺纹锥度位（WAVE-PLAN-V4 §1，W10-C 实现）：起点与终点 X 轴半径差 mm；
   * 缺省/0 = 直螺纹（现状不变，向后兼容）。
   * 方向约定（V4 §2 W10-C 冻结）：终点=基准平面 Z=−L、X=基面小径、起点=小端 Z0，
   * 锥度位 = 起点半径−终点半径 = −L/32（GB/T 7306.1/12716 锥比 1:16=直径:长度 → 半径差=L×(1/16)/2）。
   * 位名随系统（docs/research/g76-dialects.md §1）：两行式/G92 = R(i)、HNC = I（「常规锥螺纹 i 为负」）。
   */
  taperRadiusMM?: number;
}

export interface G76Program {
  /** 两行式 G76 程序行 */
  lines: string[];
  /** 固定免责文案（报告 §7.4 原句，禁止改写） */
  disclaimer: string;
}

// ===== 方言与 G92（WAVE-PLAN-V2 §1，W6-C2 实现；DEFERRED #1/#2b） =====
export type CncSystem = 'fanuc' | 'gsk' | 'knd' | 'hnc';

// ===== GSK 型号细分（WAVE-PLAN-V3 §1，W8-B 实现；DEFERRED #16） =====
/** 988TA=P/Q/R 均 mm（半径，小数）；980TDc=P/Q/Δdmin 为 0.0001mm 增量（№.182.7）、R 保持 mm */
export type GskModel = '988ta' | '980tdc';

// ===== 蜗杆几何（WAVE-PLAN-V3 §1，W8-A 实现；模数制 GB/T 10088/10087） =====
/** px=π·m（活算单一真源）；全齿高 h₁=2.2·m；ZA 牙型角 40°。蜗杆不走 threadDimensions/threeWireM */
export interface WormGeometry {
  axialPitch: number;
  wholeDepth: number;
  flankAngle: 40;
}
export type WormGeometryFn = (moduleMM: number) => WormGeometry;

// ===== 常用配合实算（WAVE-PLAN-V3 §1，W8-C 实现；DEFERRED #12） =====
/** 孔恒 H7（基孔制）；shaftBand 的基本偏差端别：g=es（负）/ k,p=ei（GB/T 1800.1：a–h=es，k–zc=ei） */
export interface FitInput {
  nominal: number;
  shaftBand: 'g6' | 'k6' | 'p6';
}
export interface FitResult {
  /** H7：EI=0，ES=+IT7（μm） */
  hole: { lowerUM: number; upperUM: number };
  /** g6：es=表值、ei=es−IT6；k6/p6：ei=表值、es=ei+IT6（μm，未舍入路径） */
  shaft: { upperUM: number; lowerUM: number };
  fitType: 'clearance' | 'transition' | 'interference';
  /** 间隙为正/过盈为负：Xmin=EI−es，Xmax=ES−ei */
  minUM: number;
  maxUM: number;
}

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

// ===== 宏程序库（WAVE-PLAN-V4 §3 / V4.1 §1a，W11-A 实现）=====
export type MacroTemplateId = 'ellipse' | 'knurl' | 'oilslot' | 'groove';

export interface MacroParamSpec {
  /** 参数键（宏行内 #变量名映射由实现定） */
  key: string;
  /** 中文显示名 */
  label: string;
  /** 单位（mm / °） */
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
}

/** 自研参数化宏（FANUC B 类宏变量语义，#1–#33 局部变量）；无外部数据依赖（PROVENANCE 披露口径：自研参数化模板） */
export interface MacroTemplateSpec {
  id: MacroTemplateId;
  /** 中文名 */
  name: string;
  params: readonly MacroParamSpec[];
  /** 参数说明+算式（可验，每条一句） */
  notes: readonly string[];
}

/** lines = 宏程序行（WHILE/END 循环体，非展开点列）；disclaimer 复用 G76_DISCLAIMER（报告 §7.4 原句） */
export type MacroBuildFn = (id: MacroTemplateId, input: Record<string, number>) => G76Program;

// ===== 挂轮（WAVE-PLAN-V4 §3 / V4.1 §1a，W11-B 实现）=====
export interface GearTrainInput {
  /** 工件螺距/导程 mm */
  workpiecePitch: number;
  /** 机床丝杠导程 mm */
  leadscrewPitch: number;
  /** 可用齿轮齿数集合（升序去重，≥4 个） */
  availableTeeth: number[];
}

export interface GearTrainSolution {
  /** i = (a/b)×(c/d)，a/b 与 c/d 为两级齿轮副（同值齿数需两件齿轮，结果表下注说明） */
  a: number;
  b: number;
  c: number;
  d: number;
  /** 实际传动比 = (a/b)×(c/d) */
  ratio: number;
  /** e = |i_target − ratio| / i_target × 10⁶（ppm） */
  errorPpm: number;
}

/**
 * 目标比 i_target = workpiecePitch / leadscrewPitch（工件转一转走 P，丝杠转一转走 T）。
 * 返回按 (errorPpm 升序, a+b+c+d 升序, (a,b,c,d) 字典序) 排序的前 8 组；
 * workpiecePitch/leadscrewPitch ≤ 0、齿数 <4 个、含 ≤0 齿数 → throw（不臆造）。
 */
export type GearTrainFn = (input: GearTrainInput) => GearTrainSolution[];
