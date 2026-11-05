#!/usr/bin/env node
/**
 * W8-C · fundamental-deviations.json 双源核对（自含脚本）
 *
 * 校验对象：<TREE>/src/data/fundamental-deviations.json
 * 来源 A：GB/T 1800.3-1998《轴的基本偏差数值》公开转写（mechtool.cn），g=es、k=ei（IT4–IT7 列）、p=ei。
 * 来源 B：ISO 286-1:2010 表值实现 thefhiter/tolerance-handbook js/engine/iso286.js（ES.g / EI.k / EI.p）。
 * 旁证 C–G：见下方 CORROBORATION 注释；覆盖范围不同，按段合并后逐值比较。
 *
 * 输出：逐段 A/B/入库值三列 + 差异计数；任一差异退出码 1。
 * 无机器绝对路径；只看本脚本 + 输出即可复核 21 段 × 3 列。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const treeRoot = path.resolve(here, '../../../..');
const dataPath = path.join(treeRoot, 'src/data/fundamental-deviations.json');
const table = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

/** 21 个 GB 主段的上界（左开右闭）。 */
const MAIN = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150];
const BANDS = ['≤3', '>3–6', '>6–10', '>10–18', '>18–30', '>30–50', '>50–80', '>80–120',
  '>120–180', '>180–250', '>250–315', '>315–400', '>400–500', '>500–630', '>630–800',
  '>800–1000', '>1000–1250', '>1250–1600', '>1600–2000', '>2000–2500', '>2500–3150'];

/** 来源 A：GB/T 1800.3-1998 轴的基本偏差数值表（μm，按 GB 主段合并）。 */
const SOURCE_A = {
  g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20, -22, -24, -26, -28, -30, -32, -34, -38],
  k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68, 78, 88, 100, 120, 140, 170, 195, 240],
};

/** 来源 B：ISO 286-1:2010 表值（thefhiter/tolerance-handbook，21 主段）。 */
const SOURCE_B = {
  g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20, -22, -24, -26, -28, -30, -32, -34, -38],
  k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68, 78, 88, 100, 120, 140, 170, 195, 240],
};

/**
 * 旁证（≤500 为 13 主段；E 为 23 细分段；F 为 8 细分段；G 为 41 细分段且仅 g）。
 * C = dooosp/freecad-automation scripts/_tolerance_db.py
 * D = chenzefeng09/iso-286-fits fits.json
 * E = cenmir/MechanicsKit mechanicskit/fits.py（Shigley 表 A-11/A-12）
 * F = BI7KHI 数据表_孔轴基本偏差.csv（10–80 细分段）
 * G = saucecode/ISO286 iso286.py（孔 G 取镜像 g=−G）
 */
const SPLIT_E = [3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400];
const SPLIT_F = [14, 18, 24, 30, 40, 50, 65, 80];
const SPLIT_G = [3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600, 1800, 2000, 2240, 2500, 2800, 3150];

const CORROBORATION = [
  {
    id: 'C+D (≤500 全列)',
    split: [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500],
    g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
    k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],
    p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68],
    repeat: 2,
  },
  {
    id: 'E (Shigley ≤400)',
    split: SPLIT_E,
    g: [-2, -4, -5, -6, -6, -7, -7, -9, -9, -10, -10, -12, -12, -14, -14, -14, -15, -15, -15, -17, -17, -18, -18],
    k: [0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
    p: [6, 12, 15, 18, 18, 22, 22, 26, 26, 32, 32, 37, 37, 43, 43, 43, 50, 50, 50, 56, 56, 62, 62],
  },
  {
    id: 'F (BI7KHI 10–80)',
    split: SPLIT_F,
    g: [-6, -6, -7, -7, -9, -9, -10, -10],
    k: [1, 1, 2, 2, 2, 2, 2, 2],
    p: [18, 18, 22, 22, 26, 26, 32, 32],
  },
  {
    id: 'G (saucecode g 全段)',
    split: SPLIT_G,
    g: [-2, -4, -5, -6, -6, -7, -7, -9, -9, -10, -10, -12, -12, -14, -14, -14, -15, -15, -15, -17, -17, -18, -18, -20, -20, -22, -22, -24, -24, -26, -26, -28, -28, -30, -30, -32, -32, -34, -34, -38, -38],
  },
];

const mainIndex = (upper) => MAIN.findIndex((m) => upper <= m);
const pad = (v) => (v === undefined ? '—' : String(v));
let failures = 0;

console.log('W8-C dual-source check · fundamental-deviations.json');
console.log(`data: ${path.relative(treeRoot, dataPath)}`);
console.log(`bands in data: ${table.bands.length}`);
console.log('');
console.log('segment        g(A) g(B) g(df) | k(A) k(B) k(df) | p(A) p(B) p(df) | diff');
for (let i = 0; i < MAIN.length; i += 1) {
  const row = table.bands[i] || {};
  const cells = [];
  for (const key of ['g', 'k', 'p']) {
    const a = SOURCE_A[key][i];
    const b = SOURCE_B[key][i];
    const d = row[key];
    if (a !== b || b !== d) failures += 1;
    cells.push(`${pad(a).padStart(4)} ${pad(b).padStart(4)} ${pad(d).padStart(4)}`);
  }
  const diff = ['g', 'k', 'p'].some((key) => SOURCE_A[key][i] !== SOURCE_B[key][i] || SOURCE_B[key][i] !== row[key]);
  console.log(`${(BANDS[i] || '?').padEnd(14)} ${cells.join(' | ')} | ${diff ? 'DIFF' : 'ok'}`);
}
console.log('');
console.log(`A vs B vs data: ${MAIN.length * 3} cells, ${failures} diffs`);

let corroborationCells = 0;
let corroborationDiffs = 0;
for (const source of CORROBORATION) {
  const repeat = source.repeat || 1;
  for (let j = 0; j < source.split.length; j += 1) {
    const i = mainIndex(source.split[j]);
    if (i < 0) continue;
    for (const key of ['g', 'k', 'p']) {
      if (source[key] === undefined) continue;
      corroborationCells += repeat;
      if (source[key][j] !== SOURCE_A[key][i]) {
        corroborationDiffs += 1;
        console.log(`CORROBORATION DIFF ${source.id} ${BANDS[i]} ${key}: ${source[key][j]} != ${SOURCE_A[key][i]}`);
      }
    }
  }
}
console.log(`corroboration C–G: ${corroborationCells} cells, ${corroborationDiffs} diffs`);
console.log(`RESULT: ${failures + corroborationDiffs === 0 ? 'PASS' : 'FAIL'}`);
process.exit(failures + corroborationDiffs === 0 ? 0 : 1);
