# W3-C4 证据档 · GB/T 1800.1 IT 标准公差全表（IT5–IT12）

- 日期：2026-11-03 ｜ 执行者：worker-2 ｜ 隔离树：LathCalc-trees_T-W3C4 ｜ 基线：c3eede2
- 写范围：`data/tolerance-it.json`、`data/provenance/tolerance-it.md`、`test/data-it.test.ts`
- 说明：派工单「20 段 / 160 值」经 Lead 核对为结构断言错误，按**派工单修正 1（13 段 / 104 值）**交付；主源 2009 全文不可得，按**降级批准**用 2020 版同值表 + 多副源互证（详见 provenance §0）。

## 门禁结果（原始输出见 runs/，一命令一档）

| # | 命令 | 证据档 | REAL_EXIT |
| --- | --- | --- | --- |
| 1 | `npx tsc --noEmit` | `runs/gate1-tsc.txt` | 0 |
| 2 | `npx vitest run --maxWorkers=2` | `runs/gate2-vitest.txt` | 0 |
| 3 | `npm run build` | `runs/gate3-build.txt` | 0 |

vitest：12 个测试文件、85 个测试全部通过（既有 77 + 本卡新增 8）。

## 关键断言

- 全表：13 段 × IT5–IT12 = 104 个值全部非空；段界 `(lo,hi]` 连续覆盖 `(0,500]`。
- 金测段 `(30,50]`：IT7=25、IT6=16、IT8=39 μm；`itToleranceMM(rows, 40, 7)=0.025` mm。
- C-03 锚点：`>10–18` IT7=18 μm；`>50–80` IT7=30 μm。
- 边界：Ø18→0.018、Ø30→0.021、Ø50→0.025 mm（经 `itToleranceMM`，lookup.ts 未改）。
- 三段独立交叉复验：`(30,50]`、`(10,18]`、`(400,500]` 逐值一致（provenance §3）。
- 唯一分歧格 IT9 `(400,500]`：采用 155 μm（Lead 裁决 2，2026-11-03；MechBox 孤值 160 判转抄错误）。

## 证据档说明

- `runs/gate2-vitest.txt` 的 RUN 行仅将机器绝对路径前缀替换为 `<TREE_ROOT>`，命令、输出内容与退出码原样保留（附录 G 可公开态）。
- 双源对拍与 3 段交叉复验的逐值结论见 `data/provenance/tolerance-it.md`（6 副源、483 个可比单元格、1 格分歧已裁决）。
