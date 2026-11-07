/**
 * stock-figure.ts · p11 料型截面 + 侧视示意图视图模型（WAVE-PLAN-V4.9 §1 V4.9-03）
 *
 * 单卡双视图（工程制图局部放大惯例：两视图各自等比、视图间允许不同比例，图内不标比例）：
 *   上视图 = 横截面（cy=42，包围盒预算 68 宽 × 70 高 → x∈[76,144]、y∈[7,77]）；
 *   下视图 = 侧视长条（L×截面高，条区 y 96..140，长 ≤200、高 ≤40，顶对齐 y=96）。
 * 截面比例 ka = min(68/截面宽, 70/截面高)；侧视比例 kb = min(200/L, 40/截面高)。
 * 四形状截面：圆钢 ⌀D / 平顶六方（对边 S，外接半径 R=S/√3，顶点 (±R,0)、(±R/2,±S/2)）/
 * 钢管同心双圆 ⌀D + ⌀(D−2t) / 平板 W×T 矩形；截面高 = D（圆/管）、S（六方，平顶方向）、T（平板）。
 *
 * 几何事实（金锚推演用）：圆/管的宽度约束恒生效 → ka=68/D → r=34 常量；六方
 * ka=34√3/S → 半宽 R·ka=34、半高 S/2·ka=17√3=29.4449 常量（68/(2S/√3)=58.889/S < 70/S
 * 恒成立）；平板 ka=min(68/W, 70/T) 随输入缩放，极端比例不抛错、按 kb 如实呈现。
 * 标注（V4.6-AC03 引线先例）：D/S/t/W/T 贴缘或 45° 引线（leader），L 条下双箭头
 * （linear，箭头造型由装配渲染）；截面中心线十字的 dash-dot 造型由装配渲染。
 *
 * 校验（V4.9-05）：尺寸缺项 / 非有限 / 非正抛错（UI catch 保帧）；钢管 t ≥ D/2
 * （内径 ≤ 0，物理无效）抛错——与 p11 页面层 currentDims（t*2>=D 拒算）同口径
 * （weight.ts 本身无此校验，G0 勘正口径）。业务值（重量/体积）不在图内重算，
 * 本模块只算布局几何（V4.9-01 形值同源）。
 */

export type StockShape = 'round' | 'hex' | 'pipe' | 'plate';

export interface StockFigureInput {
  shape: StockShape;
  /** 尺寸键随形状：round D,L；hex S,L；pipe D,t,L；plate W,T,L（mm，正有限数） */
  dims: Record<string, number>;
}

export interface StockSectionCircle {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface StockSectionRing {
  kind: 'ring';
  cx: number;
  cy: number;
  rOuter: number;
  rInner: number;
}

export interface StockSectionPolygon {
  kind: 'polygon';
  points: ReadonlyArray<{ x: number; y: number }>;
}

export type StockSection = StockSectionCircle | StockSectionRing | StockSectionPolygon;

/** 截面中心线十字（水平 + 竖直；平板无 → null）。dash-dot 造型由装配渲染。 */
export interface StockCenterlines {
  horizontal: { x1: number; y1: number; x2: number; y2: number };
  vertical: { x1: number; y1: number; x2: number; y2: number };
}

/**
 * 尺寸标注：linear = 双箭头尺寸线（x1..x2 为箭跨，标签居中其下）；
 * leader = 自轮廓出发的引线（x1,y1 轮廓点 → x2,y2 引出端），标签随 anchor 放在引出端侧。
 * labelX/labelY/anchor 为契约派生字段（V4.9 §2 允许增删派生字段，证据 README 披露）。
 */
export interface StockMark {
  kind: 'linear' | 'leader';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  labelX: number;
  labelY: number;
  anchor: 'start' | 'middle' | 'end';
}

export interface StockFigureView {
  section: StockSection;
  /** 侧视长条（左上角 + 宽高，顶对齐条区 y=96、水平居中 x=110） */
  sideView: { x: number; y: number; width: number; height: number };
  centerlines: StockCenterlines | null;
  marks: ReadonlyArray<StockMark>;
}

export const STOCK_FIGURE_VIEW = { width: 220, height: 150 } as const;

/** 截面圆心 x 与上视图中心 y（V4.9-03 冻结布局）。 */
const CX = 110;
const SECTION_CY = 42;
/** 截面包围盒预算：68 宽 × 70 高。 */
const SECTION_BUDGET_W = 68;
const SECTION_BUDGET_H = 70;
/** 侧视条区：y 96..140，长 ≤200、高 ≤40。 */
const STRIP_TOP = 96;
const STRIP_MAX_W = 200;
const STRIP_MAX_H = 40;
/** 中心线超出轮廓的延伸量（gear-figure CENTERLINE_EXT 同款惯例）。 */
const CENTERLINE_EXT = 5;
/** 引线 45° 段长度（六方 S 引线用长档 10，避开底缘）。 */
const LEADER_LEN = 8;
const LEADER_LEN_LONG = 10;
/** 引线端到标签锚点的间隙。 */
const LABEL_GAP = 2;
/** 标签基线相对引出端的下移（字形垂直居中于引出端）。 */
const LABEL_BASELINE_DY = 2.5;
/** L 双箭头线距条底的间隙与其下标签基线间隙。 */
const L_ARROW_DY = 3;
const L_LABEL_DY = 8;
/** 保守文字半宽：CJK 8.5/字符、其余 5.5/字符（gear-figure 同款估算，font 8.5 下偏保守）。 */
const LATIN_CHAR_W = 5.5;
const CJK_CHAR_W = 8.5;
const CLAMP_PAD = 2;

function halfWidth(text: string): number {
  let units = 0;
  for (const char of text) units += char.charCodeAt(0) > 0x2e7f ? CJK_CHAR_W : LATIN_CHAR_W;
  return units / 2;
}

/** 标签 x 夹持 [半宽+2, W−半宽−2]，防贴缘标签出框（anchor 决定夹持侧）。 */
function clampX(x: number, text: string, anchor: 'start' | 'middle' | 'end'): number {
  const half = halfWidth(text);
  const min = anchor === 'end' ? half + CLAMP_PAD : anchor === 'middle' ? half + CLAMP_PAD : x;
  const max = anchor === 'start' ? STOCK_FIGURE_VIEW.width - half - CLAMP_PAD
    : anchor === 'middle' ? STOCK_FIGURE_VIEW.width - half - CLAMP_PAD
      : x;
  return Math.min(Math.max(x, min), max);
}

/** 尺寸显示：整数不带小数，非整数最多 3 位小数（与 p11 formatDimension 同口径）。 */
function fmtDim(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

function requireDim(dims: Record<string, number>, key: string, shape: StockShape): number {
  const value = dims[key];
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    throw new Error(`stock-figure: 形状 ${shape} 尺寸 ${key} 必须为正有限数`);
  }
  return value;
}

/** 引线标注：45° 外引 + 引出端侧标签（anchor 由方向决定，V4.6-AC03 引线先例）。 */
function leaderMark(
  from: { x: number; y: number },
  dir: { x: number; y: number },
  len: number,
  label: string,
): StockMark {
  const to = { x: from.x + dir.x * len, y: from.y + dir.y * len };
  const anchor = dir.x > 0 ? 'start' : dir.x < 0 ? 'end' : 'start';
  return {
    kind: 'leader',
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    label,
    labelX: clampX(to.x + Math.sign(dir.x || 1) * LABEL_GAP, label, anchor),
    labelY: to.y + LABEL_BASELINE_DY,
    anchor,
  };
}

/** L 双箭头尺寸线（条下，标签居中其下）。 */
function lengthMark(side: { x: number; y: number; width: number; height: number }, label: string): StockMark {
  const y = side.y + side.height + L_ARROW_DY;
  return {
    kind: 'linear',
    x1: side.x,
    y1: y,
    x2: side.x + side.width,
    y2: y,
    label,
    labelX: CX,
    labelY: y + L_LABEL_DY,
    anchor: 'middle',
  };
}

export function buildStockFigure(input: StockFigureInput): StockFigureView {
  const { shape, dims } = input;
  let section: StockSection;
  let centerlines: StockCenterlines | null;
  let sideHeightSource: number;
  const marks: StockMark[] = [];

  switch (shape) {
    case 'round': {
      const D = requireDim(dims, 'D', shape);
      const ka = Math.min(SECTION_BUDGET_W / D, SECTION_BUDGET_H / D);
      const r = (D / 2) * ka;
      section = { kind: 'circle', cx: CX, cy: SECTION_CY, r };
      centerlines = {
        horizontal: { x1: CX - r - CENTERLINE_EXT, y1: SECTION_CY, x2: CX + r + CENTERLINE_EXT, y2: SECTION_CY },
        vertical: { x1: CX, y1: SECTION_CY - r - CENTERLINE_EXT, x2: CX, y2: SECTION_CY + r + CENTERLINE_EXT },
      };
      const diag = r * Math.SQRT1_2;
      marks.push(
        leaderMark(
          { x: CX + diag, y: SECTION_CY - diag },
          { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
          LEADER_LEN,
          `D ${fmtDim(D)}`,
        ),
      );
      sideHeightSource = D;
      break;
    }
    case 'hex': {
      const S = requireDim(dims, 'S', shape);
      // 平顶正六边形：R=S/√3，顶点 (±R,0)、(±R/2,±S/2)（V4.9-03 冻结构造）
      const R = S / Math.sqrt(3);
      const ka = Math.min(SECTION_BUDGET_W / (2 * R), SECTION_BUDGET_H / S);
      const halfW = R * ka;
      const halfH = (S / 2) * ka;
      section = {
        kind: 'polygon',
        points: [
          { x: CX + halfW, y: SECTION_CY },
          { x: CX + halfW / 2, y: SECTION_CY + halfH },
          { x: CX - halfW / 2, y: SECTION_CY + halfH },
          { x: CX - halfW, y: SECTION_CY },
          { x: CX - halfW / 2, y: SECTION_CY - halfH },
          { x: CX + halfW / 2, y: SECTION_CY - halfH },
        ],
      };
      centerlines = {
        horizontal: { x1: CX - halfW - CENTERLINE_EXT, y1: SECTION_CY, x2: CX + halfW + CENTERLINE_EXT, y2: SECTION_CY },
        vertical: { x1: CX, y1: SECTION_CY - halfH - CENTERLINE_EXT, x2: CX, y2: SECTION_CY + halfH + CENTERLINE_EXT },
      };
      // S 引线自底平贴缘右段外引（右下 45°，避开竖直中心线与条区）
      marks.push(
        leaderMark(
          { x: CX + halfW / 4, y: SECTION_CY + halfH },
          { x: Math.SQRT1_2, y: Math.SQRT1_2 },
          LEADER_LEN_LONG,
          `S ${fmtDim(S)}`,
        ),
      );
      sideHeightSource = S;
      break;
    }
    case 'pipe': {
      const D = requireDim(dims, 'D', shape);
      const t = requireDim(dims, 't', shape);
      if (t * 2 >= D) {
        throw new Error('stock-figure: 钢管壁厚 t ≥ D/2（内径 ≤ 0，物理无效）');
      }
      const ka = Math.min(SECTION_BUDGET_W / D, SECTION_BUDGET_H / D);
      const rOuter = (D / 2) * ka;
      const rInner = ((D - 2 * t) / 2) * ka;
      section = { kind: 'ring', cx: CX, cy: SECTION_CY, rOuter, rInner };
      centerlines = {
        horizontal: { x1: CX - rOuter - CENTERLINE_EXT, y1: SECTION_CY, x2: CX + rOuter + CENTERLINE_EXT, y2: SECTION_CY },
        vertical: { x1: CX, y1: SECTION_CY - rOuter - CENTERLINE_EXT, x2: CX, y2: SECTION_CY + rOuter + CENTERLINE_EXT },
      };
      const diag = rOuter * Math.SQRT1_2;
      marks.push(
        leaderMark(
          { x: CX + diag, y: SECTION_CY - diag },
          { x: Math.SQRT1_2, y: -Math.SQRT1_2 },
          LEADER_LEN,
          `D ${fmtDim(D)}`,
        ),
      );
      // t 引线指向管壁（内外半径中点处，左上 45° 外引）
      const wallR = (rOuter + rInner) / 2;
      const wallDiag = wallR * Math.SQRT1_2;
      marks.push(
        leaderMark(
          { x: CX - wallDiag, y: SECTION_CY - wallDiag },
          { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
          LEADER_LEN,
          `t ${fmtDim(t)}`,
        ),
      );
      sideHeightSource = D;
      break;
    }
    case 'plate': {
      const W = requireDim(dims, 'W', shape);
      const T = requireDim(dims, 'T', shape);
      const ka = Math.min(SECTION_BUDGET_W / W, SECTION_BUDGET_H / T);
      const secW = W * ka;
      const secH = T * ka;
      section = {
        kind: 'polygon',
        points: [
          { x: CX - secW / 2, y: SECTION_CY - secH / 2 },
          { x: CX + secW / 2, y: SECTION_CY - secH / 2 },
          { x: CX + secW / 2, y: SECTION_CY + secH / 2 },
          { x: CX - secW / 2, y: SECTION_CY + secH / 2 },
        ],
      };
      centerlines = null;
      // W 引线自右缘中点水平外引；T 引线自底缘中点竖直下引（平板无中心线，引线净空）
      marks.push(
        leaderMark(
          { x: CX + secW / 2, y: SECTION_CY },
          { x: 1, y: 0 },
          LEADER_LEN,
          `W ${fmtDim(W)}`,
        ),
      );
      marks.push(
        leaderMark(
          { x: CX, y: SECTION_CY + secH / 2 },
          { x: 0, y: 1 },
          LEADER_LEN,
          `T ${fmtDim(T)}`,
        ),
      );
      sideHeightSource = T;
      break;
    }
    default: {
      const unreachable: never = shape;
      throw new Error(`stock-figure: 不支持的形状 ${String(unreachable)}`);
    }
  }

  const L = requireDim(dims, 'L', shape);
  const kb = Math.min(STRIP_MAX_W / L, STRIP_MAX_H / sideHeightSource);
  const sideView = {
    x: CX - (L * kb) / 2,
    y: STRIP_TOP,
    width: L * kb,
    height: sideHeightSource * kb,
  };
  marks.push(lengthMark(sideView, `L ${fmtDim(L)}`));

  return { section, sideView, centerlines, marks };
}
