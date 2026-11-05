/** tolerance.ts · 偏差合成（W2-C3 实现纯公式段；IT 表值由 lookup.itToleranceMM 提供） */
import type { FitInput, FitResult, ITTableRow, ToleranceInput, ToleranceResult } from './types';
import { itToleranceMM } from './lookup';
import fundamentalJson from '../data/fundamental-deviations.json';
import toleranceJson from '../data/tolerance-it.json';

interface FundamentalBand {
  /** GB/T 1800.1 分段（左开右闭），如 ">18–30" / "≤3" */
  band: string;
  /** 轴 g 基本偏差 = 上偏差 es（μm，负值） */
  g: number;
  /** 轴 k 基本偏差（IT4–IT7）= 下偏差 ei（μm） */
  k: number;
  /** 轴 p 基本偏差 = 下偏差 ei（μm） */
  p: number;
}

interface FundamentalTable {
  source: string;
  bands: FundamentalBand[];
}

const FUNDAMENTAL_TABLE = fundamentalJson as unknown as FundamentalTable;
const IT_ROWS = toleranceJson as unknown as ITTableRow[];
const SHAFT_FUNDAMENTAL: Record<FitInput['shaftBand'], 'g' | 'k' | 'p'> = {
  g6: 'g',
  k6: 'k',
  p6: 'p',
};

/** 解析数据文件的段字符串为 (lo,hi]；首段 "≤3" 记为 (0,3]。 */
function parseBand(band: string): [number, number] {
  const first = /^≤(\d+(?:\.\d+)?)$/.exec(band);
  if (first) return [0, Number(first[1])];
  const range = /^>(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?)$/.exec(band);
  if (range) return [Number(range[1]), Number(range[2])];
  throw new Error(`PANIC: invalid fundamental-deviation band "${band}"`);
}

/** 按 (lo,hi] 查轴基本偏差表值（μm）；缺段/越界抛错（不臆造）。 */
function fundamentalUM(nominal: number, code: 'g' | 'k' | 'p'): number {
  for (const row of FUNDAMENTAL_TABLE.bands) {
    const [lo, hi] = parseBand(row.band);
    if (nominal > lo && nominal <= hi) return row[code];
  }
  throw new Error(`PANIC: fundamental deviation not found for ${nominal}mm (${code})`);
}

/**
 * 偏差合成（GB/T 1800.1 基本偏差朝向）：
 *   孔（大写）：A–H → 基本偏差为下偏差 EI；K–ZC → 基本偏差为上偏差 ES。
 *   轴（小写）：a–h → 基本偏差为上偏差 es；j–zc → 基本偏差为下偏差 ei。
 * 给定 IT 公差 T（mm，正值）与基本偏差 δ（mm，带符号）：
 *   孔 A–H：EI=δ，ES=δ+T；孔 K–ZC：ES=δ，EI=δ−T
 *   轴 a–h：es=δ，ei=δ−T；轴 j–zc：ei=δ，es=δ+T
 * 公差带宽度 tolerance = T（= itValueMM）。本函数只做算术合成，不查任何表：
 * IT 表值与基本偏差均由调用方传入（表值段归 W3-C4）。
 */
export function toleranceCompose(
  input: ToleranceInput,
  itValueMM: number,
  fundamentalOffsetMM: number,
): ToleranceResult {
  const code = input.fundamental;
  if (typeof code !== 'string' || !/^[A-Za-z]$/.test(code)) {
    throw new Error(`PANIC: unsupported fundamental deviation code "${String(code)}"`);
  }
  if (!Number.isFinite(itValueMM) || itValueMM <= 0) {
    throw new Error(`PANIC: IT value must be a positive finite number (got ${itValueMM})`);
  }
  if (!Number.isFinite(fundamentalOffsetMM)) {
    throw new Error(`PANIC: fundamental deviation must be finite (got ${fundamentalOffsetMM})`);
  }
  const isHole = code === code.toUpperCase();
  // 基本偏差所指的界限：孔 A–H / 轴 a–h 为靠近零线的一侧（下/上）；其余代号为另一侧
  const offsetIsLower = isHole ? code <= 'H' : code > 'h';
  const lower = offsetIsLower ? fundamentalOffsetMM : fundamentalOffsetMM - itValueMM;
  const upper = offsetIsLower ? fundamentalOffsetMM + itValueMM : fundamentalOffsetMM;
  return { upper, lower, tolerance: itValueMM };
}

/**
 * 常用配合实算（WAVE-PLAN-V3 §1/V3-5，W8-C 实现；契约冻结于 types.ts，卡内禁改签名）：
 * 孔恒 H7（EI=0、ES=+IT7）；轴 g6/k6/p6 基本偏差取 fundamental-deviations.json 表值
 * （端别按 GB/T 1800.1：g=es、k/p=ei，另一端 ±IT6），Xmin=EI−es、Xmax=ES−ei。
 * 数据缺段/尺寸越界抛错。结果单位为 μm 整数（IT 表值本身以 μm 存储，
 * lookup.itToleranceMM 只做 mm 换算；此处乘回 1000 后取整，消除浮点尾差）。
 */
export function fitTolerance(input: FitInput): FitResult {
  const { nominal, shaftBand } = input;
  if (!Number.isFinite(nominal) || nominal <= 0) {
    throw new Error(`PANIC: nominal must be a positive finite number (got ${nominal})`);
  }
  const code = SHAFT_FUNDAMENTAL[shaftBand];
  if (!code) {
    throw new Error(`PANIC: unsupported shaft band "${String(shaftBand)}"`);
  }

  // IT 表值（mm）：H7 用 IT7，轴 6 级用 IT6；缺段/越界由 itToleranceMM 抛错。
  const it7MM = itToleranceMM(IT_ROWS, nominal, 7);
  const it6MM = itToleranceMM(IT_ROWS, nominal, 6);
  // 基本偏差表值（μm）：g=es（负）、k/p=ei（正）。
  const fundamental = fundamentalUM(nominal, code);

  // 复用 toleranceCompose 的端别逻辑（g：offsetIsLower=false → es=δ、ei=δ−T；
  // k/p：offsetIsLower=true → ei=δ、es=δ+T；H：EI=δ、ES=δ+T）。
  const hole = toleranceCompose({ nominal, grade: 7, fundamental: 'H' }, it7MM, 0);
  const shaft = toleranceCompose(
    { nominal, grade: 6, fundamental: code },
    it6MM,
    fundamental / 1000,
  );

  const holeLowerUM = Math.round(hole.lower * 1000);
  const holeUpperUM = Math.round(hole.upper * 1000);
  const shaftLowerUM = Math.round(shaft.lower * 1000);
  const shaftUpperUM = Math.round(shaft.upper * 1000);

  // 间隙为正、过盈为负：Xmin=EI−es，Xmax=ES−ei。
  const minUM = holeLowerUM - shaftUpperUM;
  const maxUM = holeUpperUM - shaftLowerUM;
  const fitType: FitResult['fitType'] =
    minUM >= 0 && maxUM >= 0 ? 'clearance' : maxUM <= 0 ? 'interference' : 'transition';

  return {
    hole: { lowerUM: holeLowerUM, upperUM: holeUpperUM },
    shaft: { upperUM: shaftUpperUM, lowerUM: shaftLowerUM },
    fitType,
    minUM,
    maxUM,
  };
}
