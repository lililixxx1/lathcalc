# COVERAGE · 覆盖与待补清单（Lead 维护）

> 记录数据/功能覆盖现状与已披露裁剪项；"待补"= 用户共识裁决的 v0.2+ 范围（WAVE-PLAN §3 裁决 2）。
> 位置口径（W3 波末迁移，2026-11-03）：数据表统一在 `src/data/`（WAVE-PLAN §1 冻结架构）；W3 期间 C1/C3/C4/C5 曾按派工单口径交付根 `data/`，波末已由 Lead 统一迁移归位。

## 螺纹族覆盖（v0.1）

| 族 | 表 | 状态 |
| --- | --- | --- |
| M 普通螺纹（粗牙 39 行 M1–M64 全系列 + 常用细牙 110 行，共 149 行） | src/data/threads-metric.json | 已入库（W3-C1） |
| Tr 梯形螺纹（41 行，Tr8–Tr44 GB/DIN 交集） | src/data/threads-trapezoid.json | 已入库（W3-C2） |
| G 非密封管螺纹（55°，13 行 G1/8–G2） | src/data/threads-pipe.json | 已入库（W3-C2） |
| UNC/UNF 统一螺纹（20 行，1/4″–1″） | src/data/threads-unified.json | 已入库（W3-C3） |

## 已披露待补（v0.2+，非缺陷）

| 项 | 去向 |
| --- | --- |
| 蜗杆螺纹 | v0.2.1（DEFERRED #2；V2-1 用户裁决：功能包先行） |
| NPT | v0.2.1（DEFERRED #2） |
| R/Rc/Rp 锥管螺纹（55°密封） | v0.2.1（DEFERRED #2；W3-C2 已甄别零混入） |
| Tr 最大螺距 12 行（Tr22×8…Tr44×12，GB/T 5796.3 表1 每直径最大螺距档） | v0.2.1（W3-C2 U1 裁决 A：无独立第二源不入库，待双源后补；标签随 V2 基线改判） |
| G92 单循环程序生成 | v0.2.0 W6-C2（WAVE-PLAN-V2 F2；V2-7 落 p04 切换） |
| GSK/KND/华中 G76 方言 | v0.2.0 W6-C2（WAVE-PLAN-V2 F1；语义先 C1 双源调研，单源/冲突维持置灰 V2-4） |
| 宏程序库（椭圆/网纹/油槽/切槽） | v0.3（DEFERRED #4） |

## 数据性质披露

- `src/data/materials.json` 切削参数库为**示例数据**：页内固定警示 + 每行 source 标"示例·待复核，以试切为准"（WAVE-PLAN §3 裁决 3）。
- Tr 牙顶间隙 ac 表（src/core/thread.ts 内嵌，GB/T 5796.1）**已双源转正**（W3-C2，W2-C2 裁决②关账）：GB/T 5796.1-2005 主源 + DIN 103 反推互证（覆盖 P1.5–24）+ ISO 2901 抽查；P28–44 段为同档常量延伸（主源单源），provenance/threads-trapezoid.md §5.5 披露。
- GB/T 196-2003 现行替代版为 GB/T 196-2025（全文未取得）；本表按 2003 口径录入并经 DIN 13 全量对拍 0 值冲突（W3-C1 U1 裁决 A），provenance/threads-metric.md 披露。

## 逐表溯源

见 src/data/PROVENANCE.md（Lead 自 provenance/ 片段串行合并，W3 收获时生成）。
