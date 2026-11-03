# W3-C5 证据档 · 莫氏锥度 + 材料密度 + 切削参数示例库

> 卡：W3-C5 ｜ 执行者：worker-1 ｜ 基线：c3eede2 ｜ 收获：0d60c04 ｜ 本 README 为 G2-W3 收尾补齐（I-1，2026-11-03，判定素材取自 runs/ 原始输出）

## 索引

| 档 | 命令 | 结果 |
| --- | --- | --- |
| runs/gate1-tsc.txt | `npx tsc --noEmit` | REAL_EXIT=0 |
| runs/gate2-vitest.txt | `npx vitest run --maxWorkers=2` | Tests 95 passed (95)（77 既有 + 18 新增），REAL_EXIT=0 |
| runs/gate3-build.txt | `npm run build` | ✓ built in 90ms，REAL_EXIT=0 |

## 结论

- 交付：`data/morse.json`（7 行 MT0–MT6）、`data/densities.json`（13 行）、`data/materials.json`（14 行示例库）、三 provenance 片段、三测试文件（W3 波末迁移后均位于 `src/data/`）。
- 双源：morse = GB/T 1443-2016（付费未取回，LittleMachineShop + Newman Tools 两独立参考表互证，降级已批）；densities = 机械设计手册（无公开 URL 披露）+ Engineering Toolbox，±1.5% 预注册容差内 0 分歧；materials = 示例库单源（裁决 3 性质，每行 source 标"示例·待复核，以试切为准"）。
- 五项上报 U1–U5 全裁决选项 A（含莫氏主源正名 GB/T 1443-2016——派工单曾误写 GB/T 157；MT4 半角取公式值 1°29′15″）。

## 判定行

G1 通过（2026-11-03，树内三门禁复跑 + morse/densities/materials 锚点直读 + 14 行 source 全标示例断言）；G2-W3 通过（零阻塞，MT4 半角独立重推 atan(1/38.508)=1°29′15.21″→'1°29′15″' 一致、莫氏 7 行 DMS 全表重推全中）。
