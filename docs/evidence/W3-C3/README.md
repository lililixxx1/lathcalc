# W3-C3 证据档 · UNC/UNF + G 代码速查

> 卡：W3-C3 ｜ 执行者：worker-1 ｜ 基线：c3eede2 ｜ 收获：c29d8fb ｜ 本 README 为 G2-W3 收尾补齐（I-1，2026-11-03，判定素材取自 runs/ 原始输出）

## 索引

| 档 | 命令 | 结果 |
| --- | --- | --- |
| runs/gate1-tsc.txt | `npx tsc --noEmit` | REAL_EXIT=0 |
| runs/gate2-vitest.txt | `npx vitest run --maxWorkers=2` | Tests 93 passed (93)（77 既有 + 16 新增），REAL_EXIT=0 |
| runs/gate3-build.txt | `npm run build` | ✓ built in 72ms，REAL_EXIT=0 |

## 结论

- 交付：`data/threads-unified.json`（20 行：UNC 10 + UNF 10，1/4″–1″；W3 波末迁移后位于 `src/data/threads-unified.json`）、`data/gcode-ref.json`（10 行 = 设计稿 p13 行集）、两 provenance 片段、`test/data-unified.test.ts`、`test/data-gcode-ref.test.ts`。
- 双源：ASME B1.1 付费原文未取回 → gewinde-normen.de + eFunda 两独立公开表逐行互证（降级已批）；gcode 语义 = 设计稿 p13 + FANUC 语义字典（官方 403 降级）。
- G1 复验（Lead）：`1/4-20 UNC {pitch:1.27, major:6.35, tpi:20}` 双精度直读、tpi 锚点 8/13/20/28 全中、G76 desc 含"仅 FANUC"、G02 desc 含判向契约。

## 判定行

G1 通过（2026-11-03，树内三门禁复跑 + 20 行/10 行直读 + desc 契约核验）；G2-W3 通过（零阻塞，1/4-20 独立重推 25.4/20=1.27 一致、URL 验活 gewinde-normen.de HTTP 200、恒真排查过）。
