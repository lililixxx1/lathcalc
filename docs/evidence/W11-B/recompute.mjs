#!/usr/bin/env node
/**
 * W11-B 锚点独立复算（不 import src/**，按 WAVE-PLAN-V4.1 §3 算式重实现四重穷举）。
 *
 * 两算例（V4.1 §3 / 派工单金值）：
 *   1) 五倍组 {20,25,…,100}、T=6、P=1.5 → i=1.5/6=0.25；断言 top1.errorPpm === 0
 *      （精确解存在，如 30/60×40/80=0.5×0.5=0.25），并核对 (errorPpm, a+b+c+d, 字典序)
 *      排序键单调。
 *   2) T=12、P=3.175（=25.4/8，8 tpi）→ i=3.175/12=0.264583333…
 *      穷举最优 a20/b55 × c40/d55：ratio=(20/55)×(40/55)=800/3025=0.264462809917…，
 *      e=|i−ratio|/i×10⁶=455.5215722…；次优同值并列 40/55×20/55（字典序）。
 *
 * 用法：node docs/evidence/W11-B/recompute.mjs
 * 退出码：0 = 全部断言 PASS；1 = 有 FAIL。
 */

const TEETH = Array.from({ length: 17 }, (_, index) => 20 + index * 5); // 五倍组 17 枚
const MAX_RESULTS = 8;

function solve(workpiecePitch, leadscrewPitch) {
  const target = workpiecePitch / leadscrewPitch;
  const all = [];
  for (const a of TEETH) {
    for (const b of TEETH) {
      const firstPair = a / b;
      for (const c of TEETH) {
        for (const d of TEETH) {
          const ratio = firstPair * (c / d);
          const errorPpm = (Math.abs(target - ratio) / target) * 1e6;
          all.push({ a, b, c, d, ratio, errorPpm });
        }
      }
    }
  }
  all.sort(
    (left, right) =>
      left.errorPpm - right.errorPpm ||
      left.a + left.b + left.c + left.d - (right.a + right.b + right.c + right.d) ||
      left.a - right.a ||
      left.b - right.b ||
      left.c - right.c ||
      left.d - right.d,
  );
  return all.slice(0, MAX_RESULTS);
}

const results = [];
function check(name, passed, detail) {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  | ${detail}` : ''}`);
}

function tuple(solution) {
  return `${solution.a}/${solution.b} × ${solution.c}/${solution.d}`;
}

console.log('== 算例 1：五倍组 {20,25,…,100}，T=6，P=1.5 ==');
console.log('i_target = P / T = 1.5 / 6 = ' + 1.5 / 6);
const case1 = solve(1.5, 6);
console.log(`top1 = ${tuple(case1[0])}，ratio = ${case1[0].ratio}，e = ${case1[0].errorPpm} ppm`);
console.log(`算式复核：30/60×40/80 = ${(30 / 60) * (40 / 80)}（= 0.25 → e = |0.25−0.25|/0.25×10⁶ = 0）`);
check('case1 top1.errorPpm === 0', case1[0].errorPpm === 0);
check('case1 top1.ratio === 0.25', case1[0].ratio === 0.25);
check('case1 30/60×40/80 === 0.25', (30 / 60) * (40 / 80) === 0.25);

let monotonic = true;
for (let index = 1; index < case1.length; index += 1) {
  const left = case1[index - 1];
  const right = case1[index];
  const key =
    left.errorPpm - right.errorPpm ||
    left.a + left.b + left.c + left.d - (right.a + right.b + right.c + right.d) ||
    left.a - right.a ||
    left.b - right.b ||
    left.c - right.c ||
    left.d - right.d;
  if (key > 0) monotonic = false;
}
check('case1 排序键 (errorPpm, 齿数和, 字典序) 单调不减', monotonic);

console.log('');
console.log('== 算例 2：T=12，P=3.175（=25.4/8，8 tpi） ==');
const target2 = 3.175 / 12;
console.log('i_target = P / T = 3.175 / 12 = ' + target2);
const case2 = solve(3.175, 12);
const top1 = case2[0];
const top2 = case2[1];
console.log(`top1 = ${tuple(top1)}`);
console.log(`ratio = (20/55)×(40/55) = 800/3025 = ${800 / 3025}`);
console.log(
  `e = |${target2} − ${800 / 3025}| / ${target2} × 10⁶ = ${top1.errorPpm} ppm`,
);
check(`case2 top1 = 20/55 × 40/55`, top1.a === 20 && top1.b === 55 && top1.c === 40 && top1.d === 55);
check(
  'case2 top1.ratio = 800/3025',
  Math.abs(top1.ratio - 800 / 3025) < 1e-12,
  `ratio=${top1.ratio}`,
);
check(
  'case2 top1.errorPpm ≈ 455.52（全精度 455.5215722）',
  Math.abs(top1.errorPpm - 455.5215722) < 1e-4,
  `errorPpm=${top1.errorPpm}`,
);
check(
  'case2 top2 = 40/55 × 20/55（同值并列，字典序）',
  top2.a === 40 && top2.b === 55 && top2.c === 20 && top2.d === 55 && top2.errorPpm === top1.errorPpm,
  `top2=${tuple(top2)} e=${top2.errorPpm}`,
);

const passed = results.filter((item) => item.passed).length;
const total = results.length;
console.log('');
console.log(`VERDICT=${passed === total ? 'PASS' : 'FAIL'} (${passed}/${total} 断言)`);
process.exit(passed === total ? 0 : 1);
