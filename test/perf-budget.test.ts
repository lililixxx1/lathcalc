// perf-budget.test.ts · V4.14-B 性能预算回归网
// 出处：WAVE-PLAN-V4.14.md §1.2.2（预注册阈值）+ G0 I-01（重定基线+未压缩口径）
// + G0 C-03（门禁第 5 步）。
// 真跑条件：PERF_BUDGET=1 且存在 dist/（门禁序列第 5 步：npm run build 之后
//   PERF_BUDGET=1 npx vitest run test/perf-budget.test.ts --maxWorkers=2
// ）。全量门禁序列（未设 PERF_BUDGET）中本文件整体 skip——skip=未覆盖，
// 不得视为通过（G0 C-03）。
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const assetsDir = fileURLToPath(new URL('../dist/assets', import.meta.url));
const indexHtmlPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));

// ── 性能预算阈值（G0 I-01：未压缩字节口径）─────────────────────────────────
// 基线重定命令（Git Bash，树根执行，2026-11-11，dist 由本树 npm run build 产出）：
//   find dist/assets -name '*.js' -printf '%s\n' | awk '{s+=$1} END{print s}'
// 实测值 = 270371 字节（dist/assets/ 下 37 个 .js 文件的未压缩字节总和）
// 算式：THRESHOLD_B = ceil(270371 × 1.05) = ceil(283889.55) = 283890
// 口径：未压缩字节（V4.14 基线审计 334KB 数字无出处作废——G0 I-01，以本树实测为准）
const THRESHOLD_B = 283890;
// index 主包 ≤ 20KB = 20480B（WAVE-PLAN-V4.14.md §1.2.2 预注册；实测超限=偏离上报，禁放宽）
const INDEX_CHUNK_MAX_B = 20480;
// 路由分块数 ≥ 16（16 页路由懒分块；来源：V4.13 全站 16 页审计口径）
const ROUTE_CHUNK_MIN = 16;

const listJs = (): string[] =>
  readdirSync(assetsDir)
    .filter((f) => f.endsWith('.js'))
    .sort();

const sizeOf = (name: string): number => statSync(join(assetsDir, name)).size;

const perfOnly = process.env.PERF_BUDGET === '1';
const suite = perfOnly ? describe : describe.skip;

suite('perf-budget · 性能预算回归网（PERF_BUDGET=1 才真跑；skip=未覆盖）', () => {
  it('预算 a：dist/assets/*.js 未压缩总字节 ≤ THRESHOLD_B', () => {
    const files = listJs();
    const total = files.reduce((s, f) => s + sizeOf(f), 0);
    expect(
      total,
      `dist/assets 共 ${files.length} 个 .js，未压缩总字节 ${total}B，阈值 ${THRESHOLD_B}B（=ceil(实测 270371×1.05)）`,
    ).toBeLessThanOrEqual(THRESHOLD_B);
  });

  it('预算 b：index 主包字节 ≤ 20480B（=20KB）', () => {
    const chunks = listJs().filter((f) => /^index-[\w-]+\.js$/.test(f));
    const bytes = chunks.reduce((s, f) => s + sizeOf(f), 0);
    expect(
      chunks.length,
      `index-*.js 应恰 1 个，实测 ${chunks.length} 个：${chunks.join(', ') || '（无）'}`,
    ).toBe(1);
    expect(
      bytes,
      `index 主包实测 ${bytes}B，阈值 ${INDEX_CHUNK_MAX_B}B（§1.2.2 预注册）`,
    ).toBeLessThanOrEqual(INDEX_CHUNK_MAX_B);
  });

  it('预算 c：路由分块数 ≥ 16', () => {
    const chunks = listJs().filter((f) => /^p\d{2}-/.test(f));
    expect(
      chunks.length,
      `路由分块（/^p\\d{2}-/）实测 ${chunks.length} 个，下限 ${ROUTE_CHUNK_MIN}（16 页懒分块）`,
    ).toBeGreaterThanOrEqual(ROUTE_CHUNK_MIN);
  });

  it('预算 d：dist/index.html 已注入 modulepreload 且 p01 chunk 在盘', () => {
    const html = readFileSync(indexHtmlPath, 'utf8');
    expect(html.includes('rel="modulepreload"'), 'index.html 应含 rel="modulepreload"').toBe(true);
    const m = html.match(/href="(\/assets\/p01-[\w-]+\.js)"/);
    expect(m, 'index.html 应含 href="/assets/p01-*.js"').not.toBeNull();
    const href = m?.[1];
    const file = href?.replace('/assets/', '');
    const onDisk = file !== undefined && existsSync(join(assetsDir, file));
    expect(onDisk, `modulepreload 目标 ${file ?? '(未匹配)'} 应在盘存在`).toBe(true);
  });
});
