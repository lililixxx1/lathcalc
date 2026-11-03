# W3-C1 证据档 · M 螺纹全表（threads-metric.json）

> 卡：W3-C1 ｜ 执行者：worker-1 ｜ 基线：c3eede2 ｜ 收获：d1f43ed ｜ 本 README 为 G2-W3 收尾补齐（I-1，2026-11-03，判定素材取自 runs/ 原始输出）

## 索引

| 档 | 命令 | 结果 |
| --- | --- | --- |
| runs/gate1-tsc.txt | `npx tsc --noEmit` | REAL_EXIT=0 |
| runs/gate2-vitest.txt | `npx vitest run --maxWorkers=2` | Tests 82 passed (82)（77 既有 + 5 新增），REAL_EXIT=0 |
| runs/gate3-build.txt | `npm run build` | ✓ built in 74ms，REAL_EXIT=0 |

## 结论

- 交付：`data/threads-metric.json`（149 行 = 粗牙 39 + 细牙 110，53 个大径 M1–M64，W3 波末迁移后位于 `src/data/threads-metric.json`）、`data/provenance/threads-metric.md`、`test/data-metric.test.ts`。
- 双源：GB/T 193-2003 表1 + GB/T 196-2003（164580/finesz 转载 + openstd 元数据）主源，DIN 13（gewinde-normen.de）独立副源；149/149 双源命中 0 值冲突；GB/T 196-2003 废止→2025 现行未取回已披露（W3-C1 U1 裁决 A）。
- G1 复验（Lead）：node 直读 149 行、金测锚点 M6→1.0/M10→1.5/M12→1.75/M20→2.5/M30→3.5/M64→6.0 全中、M30×2 在表、family/tpi 纪律干净。

## 判定行

G1 通过（2026-11-03，Lead 复验树内三门禁 + JSON 直读锚点）；G2-W3 通过（零阻塞，金测 M30 独立重推一致、双源独立性核过、URL 验活 gewinde-normen.de HTTP 200）。
