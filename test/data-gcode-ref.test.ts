/**
 * test/data-gcode-ref.test.ts · G 代码速查表（W3-C3）
 *
 * 数据：data/gcode-ref.json
 * 行集来源：设计稿 p13 速查页——docs/车工计算App-无限画布.html 第 1411–1433 行
 *           `pRef` 区块，代码行 1418–1427，共 10 行（行数以设计稿为准，不扩不缩）。
 * 语义双源：设计稿原文 + FANUC 手册口径（详见 data/provenance/gcode-ref.md §2；
 *           官方手册站点检索失败已在该片段 §2 降级披露）。
 * 判向口径：G02/G03 必须与 src/core/arc.ts `judgeArcDirection` 契约一致——
 *           图面 X 上、Z 右，自 +Y 视；前刀架顺时针 = G02，后刀架翻转。
 */
import { describe, it, expect } from 'vitest';
import gcodeJson from '../data/gcode-ref.json';
import { gcodeRef } from '../src/core/lookup';
import { judgeArcDirection } from '../src/core/arc';
import type { GcodeRefRow } from '../src/core/types';

const rows = gcodeJson as GcodeRefRow[];

/**
 * 设计稿 p13 行集（逐行抄自 docs/车工计算App-无限画布.html:1418–1427）：
 *   G01 直线插补 / G02 顺时针圆弧插补 / G03 逆时针圆弧插补 / G04 暂停延时 /
 *   G20/21 英制 / 公制输入 / G76 螺纹切削复合循环 / G92 螺纹切削单循环 /
 *   M03 主轴正转 / M05 主轴停止 / M30 程序结束并返回
 * 数出 10 行，故断言 10 行。
 */
const P13_ROWS: ReadonlyArray<readonly [code: string, designDesc: string]> = [
  ['G01', '直线插补'], // 设计稿:1418
  ['G02', '顺时针圆弧插补'], // 设计稿:1419
  ['G03', '逆时针圆弧插补'], // 设计稿:1420
  ['G04', '暂停延时'], // 设计稿:1421
  ['G20/21', '英制 / 公制输入'], // 设计稿:1422（设计稿为一行合并，非 G20、G21 两行）
  ['G76', '螺纹切削复合循环'], // 设计稿:1423
  ['G92', '螺纹切削单循环'], // 设计稿:1424
  ['M03', '主轴正转'], // 设计稿:1425
  ['M05', '主轴停止'], // 设计稿:1426
  ['M30', '程序结束并返回'], // 设计稿:1427
];

function findRow(code: string): GcodeRefRow {
  const hit = rows.find((r) => r.code === code);
  if (!hit) throw new Error(`gcode-ref 缺行：${code}`);
  return hit;
}

describe('W3-C3 · gcode-ref.json 行集（以设计稿 p13 为准）', () => {
  it('行数 = p13 行集：设计稿 1418–1427 共 10 行，数据 10 行', () => {
    // p13 逐行清单：1418..1427 = 10 行（首尾含），无增删
    expect(P13_ROWS).toHaveLength(10);
    expect(rows).toHaveLength(P13_ROWS.length);
    expect(rows).toHaveLength(10);
  });

  it('code 逐行与 p13 一致（顺序与集合）；gcodeRef(rows) 行数一致', () => {
    expect(rows.map((r) => r.code)).toEqual(P13_ROWS.map(([code]) => code));
    expect(new Set(rows.map((r) => r.code)).size).toBe(rows.length);
    // 契约：gcodeRef 返回按 code 排序的副本，行数不变
    expect(gcodeRef(rows)).toHaveLength(rows.length);
    expect(gcodeRef(rows).map((r) => r.code).sort()).toEqual(
      rows.map((r) => r.code).sort(),
    );
  });

  it('每行 desc 以设计稿原文开头（必要注记只追加在原文之后）且非空', () => {
    for (const [code, designDesc] of P13_ROWS) {
      const row = findRow(code);
      expect(row.desc.length, code).toBeGreaterThan(0);
      // 例：G02 desc =「顺时针圆弧插补（图面顺时针＝前刀架 G02；…）」，保留设计稿原文
      expect(row.desc.startsWith(designDesc), `${code}: ${row.desc}`).toBe(true);
    }
  });
});

describe('W3-C3 · 语义双源与验收注记', () => {
  it('G76 desc 含「仅 FANUC」注记（WAVE-PLAN §3 裁决 1；GSK/KND/华中 v0.2 待补）', () => {
    const g76 = findRow('G76');
    expect(g76.desc).toContain('螺纹切削复合循环'); // 设计稿 p13 原文
    expect(g76.desc).toContain('仅 FANUC');
    expect(g76.desc).toContain('两行式'); // FANUC Two Line Format G76（provenance §2）
  });

  it('G92 desc 标注「仅速查数据行、v0.1 不生成程序」（COVERAGE 待补 2b）', () => {
    const g92 = findRow('G92');
    expect(g92.desc).toContain('螺纹切削单循环'); // 设计稿 p13 原文
    expect(g92.desc).toContain('仅速查');
    expect(g92.desc).toContain('不生成程序');
  });

  it('G20/21 / M03 / M05 / M30 语义与设计稿及 FANUC 口径一致', () => {
    expect(findRow('G01').desc).toBe('直线插补'); // FANUC: Linear interpolation
    expect(findRow('G04').desc).toBe('暂停延时'); // FANUC: Dwell
    expect(findRow('G20/21').desc).toContain('英制');
    expect(findRow('G20/21').desc).toContain('公制'); // FANUC: G20 inch / G21 mm
    expect(findRow('M03').desc).toContain('主轴正转');
    expect(findRow('M03').desc).toContain('CW'); // FANUC: Spindle start forward CW
    expect(findRow('M05').desc).toBe('主轴停止'); // FANUC: Spindle stop
    expect(findRow('M30').desc).toBe('程序结束并返回'); // FANUC: End of program (Reset)
  });
});

describe('W3-C3 · G02/G03 判向口径与 src/core/arc.ts 对齐', () => {
  it('desc 字符串含 arc.ts 契约要素：图面说明、前刀架判定、后刀架翻转', () => {
    const g02 = findRow('G02');
    expect(g02.desc).toContain('顺时针');
    expect(g02.desc).toContain('前刀架 G02');
    expect(g02.desc).toContain('X 上 Z 右');
    expect(g02.desc).toContain('自 +Y 视');
    expect(g02.desc).toContain('后刀架翻转');

    const g03 = findRow('G03');
    expect(g03.desc).toContain('逆时针');
    expect(g03.desc).toContain('前刀架 G03');
    expect(g03.desc).toContain('X 上 Z 右');
    expect(g03.desc).toContain('自 +Y 视');
    expect(g03.desc).toContain('后刀架翻转');
  });

  it('judgeArcDirection 金测：12 点→3 点前刀架 = G02，反向 = G03，后刀架翻转', () => {
    // 视图：X 朝上（直径制）= 图面 12 点方向，Z 朝右 = 图面 3 点方向。
    const center = { x: 0, z: 0 };
    const at12 = { x: 1, z: 0 }; // X+（图面 12 点）
    const at3 = { x: 0, z: 1 }; // Z+（图面 3 点）

    // 12 点 → 3 点在图面为顺时针；arc.ts 契约：前刀架顺时针 = G02
    expect(judgeArcDirection(center, at12, at3)).toBe('G02');
    // 3 点 → 12 点为逆时针；前刀架 = G03
    expect(judgeArcDirection(center, at3, at12)).toBe('G03');
    // 后刀架（rearToolPost=true）翻转 G02↔G03
    expect(judgeArcDirection(center, at12, at3, true)).toBe('G03');
    expect(judgeArcDirection(center, at3, at12, true)).toBe('G02');
  });
});
