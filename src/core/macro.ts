/**
 * macro.ts · 宏程序库（WAVE-PLAN-V4 §3 / V4.1 §2，W11-A 实现）
 *
 * 四模板（调研报告:380）：ellipse 椭圆 / knurl 网纹 / oilslot 油槽 / groove 切槽。
 * FANUC B 类宏变量语义（#1–#33 局部变量，SIN/COS 角度单位=度）；
 * 输出 lines = WHILE/END 循环体（非展开点列），disclaimer 复用 G76_DISCLAIMER。
 * 无外部数据依赖——PROVENANCE 披露口径「自研参数化模板」（V4 §3 风险条款）。
 *
 * 变量分配（椭圆，V4.1 §2 冻结）：#1=a / #2=b / #3=Δt / #4=当前角 / #5=终止角 / #6=X 直径 / #7=Z。
 * 参数 min/max 为输入域防护（非标准表值）；所有缺省值均落在域内。
 * 其余三模板变量分配为本文件内自定（未跨模块共享，见各 builder 注释）。
 * 口径注：油槽为自研近似结构，非标准工艺文件（检索未达多源一致门槛，
 * 详见 docs/evidence/W11-A/oilslot-research.md）。
 */
import { G76_DISCLAIMER } from './gcode';
import type {
  G76Program,
  MacroBuildFn,
  MacroParamSpec,
  MacroTemplateId,
  MacroTemplateSpec,
} from './types';

/** 参数构造 helper（只用于本文件元数据，减少重复字段拼写） */
function param(
  key: string,
  label: string,
  unit: string,
  defaultValue: number,
  min: number,
  max: number,
): MacroParamSpec {
  return { key, label, unit, defaultValue, min, max };
}

/**
 * 四模板元数据。defaultValue 均为锚点/示例算例输入（非标准表值）：
 * - 椭圆 a=15 / b=25 / Δt=15°：V4.1 §2 锚点算例；
 * - 油槽/切槽/网纹：示例输入，用户按工况改写（零数据依赖）。
 * 进给 F 缺省为示例值（0.1–0.3 mm/r），notes 均注明「按工况调整」。
 */
export const MACRO_TEMPLATES: readonly MacroTemplateSpec[] = [
  {
    id: 'ellipse',
    name: '椭圆',
    params: [
      param('a', '长半轴 a', 'mm', 15, 1, 500),
      param('b', '短半轴 b', 'mm', 25, 1, 500),
      param('dt', '角度步进 Δt', '°', 15, 0.1, 90),
      param('t0', '起始角 t₀', '°', 0, -360, 360),
      param('t1', '终止角 t₁', '°', 360, -360, 360),
      param('f', '进给 F', 'mm/r', 0.2, 0.01, 2),
    ],
    notes: [
      '参数方程（直径制）：X = 2a·COS[t]，Z = b·SIN[t]；FANUC SIN/COS 角度单位=度。',
      '变量分配：#1=a，#2=b，#3=Δt，#4=当前角 t，#5=终止角 t₁，#6=X 直径，#7=Z。',
      '锚点算例 a=15、b=25、Δt=15°：t=15° → X=2×15×cos15°=30×0.96592583=28.9777748≈28.978 mm；Z=25×sin15°=25×0.25881905=6.4704761≈6.470 mm（算式复核，非程序输出）。',
      '循环条件 LT：终止角 t₁ 作为边界不重复切削；整周 t₁=360° 与 t₀=0° 重合。',
      'F#8 为模态进给（G01 行按 V4.1 §2 锚点保留裸 X/Z）；#8=f，按工况调整。',
      '缺省 a/b/Δt 为 V4.1 §2 锚点算例输入（非标准表值）；f=0.2 mm/r 为示例进给，按工况调整。',
    ],
  },
  {
    id: 'knurl',
    name: '网纹',
    params: [
      param('d', '工件外圆直径 D', 'mm', 50, 5, 1000),
      param('w', '滚花宽度 W', 'mm', 20, 1, 500),
      param('h', '总压深 H（直径）', 'mm', 0.6, 0.1, 5),
      param('dx', '每层压入 ΔX', 'mm', 0.2, 0.02, 1),
      param('f', '进给 F', 'mm/r', 0.3, 0.01, 2),
    ],
    notes: [
      '外层 X 逐层压入：当前直径 #5 从 D 递减 ΔX，直至 D−H（H 为直径方向总压深，用户输入）。',
      '内层 Z 往复：#11 从 Z0 走至 −W 再返回 Z0，每层一次往返（G01 两段）。',
      '层数 = ⌈H/ΔX⌉；缺省 H=0.6、ΔX=0.2 → ⌈0.6/0.2⌉ = 3 层（算式复核）。',
      '滚花模数按 GB/T 6403.3 选型（本模板不录标准表；总压深与 ΔX 由用户输入，零数据依赖）。',
      '缺省 D/W/H/ΔX 为示例输入，非标准表值；f=0.3 mm/r 为示例进给，按工况调整。',
    ],
  },
  {
    id: 'oilslot',
    name: '油槽',
    params: [
      param('x0', '基圆直径 X₀', 'mm', 40, 5, 1000),
      param('a', '摆幅 A', 'mm', 3, 0.1, 50),
      param('p', '槽距 P', 'mm', 20, 1, 500),
      param('dz', 'Z 步进 ΔZ', 'mm', 1, 0.05, 20),
      param('z0', 'Z 起点', 'mm', 0, -2000, 2000),
      param('z1', 'Z 终点', 'mm', -100, -2000, 2000),
      param('passes', '走刀遍数', '遍', 2, 1, 2),
      param('f', '进给 F', 'mm/r', 0.15, 0.01, 2),
    ],
    notes: [
      '正弦摆动：X = X₀ + A·SIN[360·(Z−Zφ)/P]（X 为直径坐标；FANUC SIN/COS 角度单位=度）。',
      '八字：走两遍，第二遍相位偏移 Zφ=P/2 → 相位差 360×(−P/2)/P = −180°（与 180° 同相）。',
      'Z 从 Z₀ 到 Z₁ 按 ΔZ 逐点 G01；建议 ΔZ 整除槽长（末点按步进落点，不自动补点）。',
      '口径注：自研近似结构，非标准工艺文件（八字油槽检索无多源一致的 FANUC 宏结构，按 V4.1 §2 自研结构实现）。',
      '缺省 X₀/A/P/ΔZ 为示例输入，非标准表值；f=0.15 mm/r 为示例进给，按工况调整。',
    ],
  },
  {
    id: 'groove',
    name: '切槽',
    params: [
      param('d', '工件外圆直径 D', 'mm', 50, 5, 1000),
      param('h', '槽深 H（径向）', 'mm', 2, 0.1, 50),
      param('dd', '分层深度 Δd', 'mm', 0.5, 0.05, 10),
      param('w', '槽宽 W', 'mm', 10, 1, 500),
      param('toolW', '刀宽 b', 'mm', 3, 0.5, 100),
      param('overlap', '搭接量 e', 'mm', 0.5, 0, 20),
      param('z0', '槽起点 Z', 'mm', 0, -2000, 2000),
      param('f', '进给 F', 'mm/r', 0.1, 0.01, 2),
    ],
    notes: [
      '层数 = ⌈H/Δd⌉；缺省 H=2 mm、Δd=0.5 mm → ⌈2/0.5⌉ = 4 层（V4.1 §2 算例复核）。',
      'X 层深：径向每层 Δd 对应直径坐标减少 2Δd（X = D − 2×层深，直径制）。',
      'Z 搭接：步距 = 刀宽 b − 搭接量 e；内层 WHILE 逐位下刀，循环后补一刀至槽宽 W 末端。',
      '域约束：2H < D、刀宽 b < 槽宽 W、搭接量 e < 刀宽 b（保证步距 > 0）。',
      '缺省 D/H/Δd/W/b/e 为示例输入，非标准表值；f=0.1 mm/r 为示例进给，按工况调整。',
    ],
  },
];

/** 数值 → G 代码文本：三位小数去尾零；负零归零（与 core/gcode 的 formatNumber 同口径） */
function fmt(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  let text = (Object.is(rounded, -0) ? 0 : rounded).toFixed(3).replace(/0+$/, '');
  if (text.endsWith('.')) text = text.slice(0, -1);
  return text;
}

function specOf(id: MacroTemplateId): MacroTemplateSpec {
  const spec = MACRO_TEMPLATES.find((item) => item.id === id);
  if (!spec) throw new Error(`参数错误：未知宏模板 ${String(id)}`);
  return spec;
}

/**
 * 参数域校验（V4.1 §2「每模板 ≥2 用例，含参数域校验：超 min/max → throw，文案含参数」）：
 * 缺键 / 非有限数 / 超 min–max 一律 throw，不静默回落默认值。
 */
function validate(
  spec: MacroTemplateSpec,
  input: Record<string, number>,
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const def of spec.params) {
    const raw = input[def.key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new Error(`参数「${def.label}」缺失或不是有效数值`);
    }
    if (raw < def.min || raw > def.max) {
      throw new Error(`参数「${def.label}」超出范围 ${def.min}–${def.max}${def.unit}`);
    }
    values[def.key] = raw;
  }
  return values;
}

/** 已校验值读取（validate 之后键必存在；保留运行时兜底以满足 noUncheckedIndexedAccess） */
function valueOf(values: Record<string, number>, key: string): number {
  const value = values[key];
  if (value === undefined) throw new Error(`参数「${key}」缺失`);
  return value;
}

/** 椭圆：X=2a·COS[t]（直径制）、Z=b·SIN[t]，WHILE [#4 LT #5] 循环体 */
function ellipseLines(values: Record<string, number>): string[] {
  const a = valueOf(values, 'a');
  const b = valueOf(values, 'b');
  const dt = valueOf(values, 'dt');
  const t0 = valueOf(values, 't0');
  const t1 = valueOf(values, 't1');
  const f = valueOf(values, 'f');
  if (t1 <= t0) throw new Error('参数「终止角 t₁」必须大于起始角 t₀');

  return [
    `#1=${fmt(a)}`,
    `#2=${fmt(b)}`,
    `#3=${fmt(dt)}`,
    `#4=${fmt(t0)}`,
    `#5=${fmt(t1)}`,
    '#6=0',
    '#7=0',
    `#8=${fmt(f)}`,
    'F#8',
    'WHILE [#4 LT #5] DO1',
    '#6=2*#1*COS[#4]',
    '#7=#2*SIN[#4]',
    'G01 X#6 Z#7',
    '#4=#4+#3',
    'END1',
  ];
}

/** 网纹：外层 X 逐层压入 + 内层 Z 往复（双 WHILE） */
function knurlLines(values: Record<string, number>): string[] {
  const d = valueOf(values, 'd');
  const w = valueOf(values, 'w');
  const h = valueOf(values, 'h');
  const dx = valueOf(values, 'dx');
  const f = valueOf(values, 'f');
  if (h >= d) throw new Error('参数「总压深 H」必须小于工件直径 D');

  return [
    `#1=${fmt(d)}`,
    `#2=${fmt(w)}`,
    `#3=${fmt(h)}`,
    `#4=${fmt(dx)}`,
    '#5=#1',
    '#6=0',
    '#7=-#2',
    `#8=${fmt(f)}`,
    '#9=#1-#3',
    '#10=-1',
    '#11=#6+#10*#2',
    'WHILE [#5 GT #9] DO1',
    '#5=#5-#4',
    'IF [#5 LT #9] THEN #5=#9',
    'G00 X#5',
    '#10=-1',
    '#11=#6+#10*#2',
    'WHILE [#10 NE 0] DO2',
    'G01 Z#11 F#8',
    'IF [#11 LE #7] THEN #10=1',
    'IF [#11 GE #6] THEN #10=0',
    '#11=#11+#10*#2',
    'END2',
    'END1',
  ];
}

/** 油槽：正弦摆动 X=X0+A·SIN[360·(Z−Zφ)/P]，两遍相位差 180°（Zφ=P/2） */
function oilslotLines(values: Record<string, number>): string[] {
  const x0 = valueOf(values, 'x0');
  const a = valueOf(values, 'a');
  const p = valueOf(values, 'p');
  const dz = valueOf(values, 'dz');
  const z0 = valueOf(values, 'z0');
  const z1 = valueOf(values, 'z1');
  const passes = valueOf(values, 'passes');
  const f = valueOf(values, 'f');
  if (a >= x0) throw new Error('参数「摆幅 A」必须小于基圆直径 X₀');
  if (z1 >= z0) throw new Error('参数「Z 终点」必须小于 Z 起点');
  if (!Number.isInteger(passes)) throw new Error('参数「走刀遍数」必须为整数 1 或 2');

  return [
    `#1=${fmt(x0)}`,
    `#2=${fmt(a)}`,
    `#3=${fmt(p)}`,
    `#4=${fmt(dz)}`,
    `#5=${fmt(z0)}`,
    `#6=${fmt(z1)}`,
    `#7=${fmt(passes)}`,
    `#8=${fmt(f)}`,
    '#9=0',
    '#10=1',
    'WHILE [#10 LE #7] DO1',
    '#11=#5',
    'WHILE [#11 GE #6] DO2',
    '#12=#1+#2*SIN[360*[#11-#9]/#3]',
    'G01 X#12 Z#11 F#8',
    '#11=#11-#4',
    'END2',
    '#9=#3/2',
    '#10=#10+1',
    'END1',
  ];
}

/** 切槽：外层分层（⌈H/Δd⌉）+ 内层 Z 搭接平移（步距=刀宽−搭接量），双 WHILE */
function grooveLines(values: Record<string, number>): string[] {
  const d = valueOf(values, 'd');
  const h = valueOf(values, 'h');
  const dd = valueOf(values, 'dd');
  const w = valueOf(values, 'w');
  const toolW = valueOf(values, 'toolW');
  const overlap = valueOf(values, 'overlap');
  const z0 = valueOf(values, 'z0');
  const f = valueOf(values, 'f');
  if (2 * h >= d) throw new Error('参数「槽深 H」必须满足 2H < 工件直径 D');
  if (toolW >= w) throw new Error('参数「刀宽 b」必须小于槽宽 W');
  if (overlap >= toolW) throw new Error('参数「搭接量 e」必须小于刀宽 b');

  return [
    `#1=${fmt(d)}`,
    `#2=${fmt(h)}`,
    `#3=${fmt(dd)}`,
    `#4=${fmt(w)}`,
    `#5=${fmt(toolW)}`,
    `#6=${fmt(overlap)}`,
    `#7=${fmt(z0)}`,
    `#8=${fmt(f)}`,
    '#9=#1-2*#2',
    '#10=#4-#5',
    '#11=#5-#6',
    '#12=#1',
    '#13=0',
    'WHILE [#12 GT #9] DO1',
    '#12=#12-2*#3',
    'IF [#12 LT #9] THEN #12=#9',
    '#13=0',
    'WHILE [#13*#11 LT #10] DO2',
    '#14=#7-#13*#11',
    'G00 X#1',
    'G00 Z#14',
    'G01 X#12 F#8',
    'G00 X#1',
    '#13=#13+1',
    'END2',
    '#14=#7-#10',
    'G00 X#1',
    'G00 Z#14',
    'G01 X#12 F#8',
    'G00 X#1',
    'END1',
  ];
}

/** 生成宏程序行（循环体，非展开点列）；disclaimer 统一复用 G76_DISCLAIMER */
export const buildMacro: MacroBuildFn = (id, input): G76Program => {
  const spec = specOf(id);
  const values = validate(spec, input);

  let lines: string[];
  switch (id) {
    case 'ellipse':
      lines = ellipseLines(values);
      break;
    case 'knurl':
      lines = knurlLines(values);
      break;
    case 'oilslot':
      lines = oilslotLines(values);
      break;
    case 'groove':
      lines = grooveLines(values);
      break;
  }

  return { lines, disclaimer: G76_DISCLAIMER };
};
