# W2-C5 证据档 · 工况 07–12 求解器 + FANUC G76 模板

- 日期：2026-11-03 ｜ 执行者：worker-1 ｜ 隔离树：LathCalc-trees_T-W2C5 ｜ 基线：d56b18b
- 写范围：`src/core/arc-cases-b.ts`、`src/core/gcode.ts`、`test/arc-cases-b.test.ts`、`test/gcode.test.ts`、删除 `test/panic-w2c5.test.ts`

## 门禁结果（原始输出见 runs/，一命令一档）

| # | 命令 | 证据档 | REAL_EXIT |
| --- | --- | --- | --- |
| 1 | `npx tsc --noEmit` | `runs/gate1-tsc.txt` | 0 |
| 2 | `npx vitest run --maxWorkers=2` | `runs/gate2-vitest.txt` | 0 |
| 3 | `npm run build` | `runs/gate3-build.txt` | 0 |

vitest：8 个测试文件、37 个测试全部通过（arc-cases-b 15、gcode 6、其余既有 16）。

## 关键断言

- 工况 07–12 各 2 例；每例断言 |圆心−切点|=R（物理 r-z 平面）与半径·切线 dot≈0，容差 1e-9。
- 判向：G02/G03 均覆盖；每例用 arc.ts `judgeArcDirection` 独立复判，后刀架逐例翻转。
- G76 M30×3.5：行1 `G76 P021060 Q100 R0.05`、行2 `G76 X26.211 Z-30. P1894 Q400 F3.5`；牙高 1894.375→1894（禁 1895）。
- 免责常量逐字取自 `docs/车工计算App-调研报告.md` §7.4（报告:330）。

## 说明

1. 桩输入键集只给尺度未给逐键锚点；工况几何锚点按标准车削构造确定，详见 `src/core/arc-cases-b.ts` 文件头与 `test/arc-cases-b.test.ts` 各例注释（已上报 Lead 确认）。
2. G76 首行 P 的 10/60 位命名与通行 FANUC 口径存在疑点，输出串按派工单冻结原样输出（已上报 Lead 裁决，不影响门禁）。
