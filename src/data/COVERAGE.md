# COVERAGE · 覆盖与待补清单（Lead 维护）

> 记录数据/功能覆盖现状与已披露裁剪项；"待补"= 用户共识裁决的 v0.2+ 范围（WAVE-PLAN §3 裁决 2）。
> 位置口径（W3 波末迁移，2026-11-03）：数据表统一在 `src/data/`（WAVE-PLAN §1 冻结架构）；W3 期间 C1/C3/C4/C5 曾按派工单口径交付根 `data/`，波末已由 Lead 统一迁移归位。

## 螺纹族覆盖（v0.1 + W8-A v0.2.1 数据扩张）

| 族 | 表 | 状态 |
| --- | --- | --- |
| M 普通螺纹（粗牙 39 行 M1–M64 全系列 + 常用细牙 110 行，共 149 行） | src/data/threads-metric.json | 已入库（W3-C1） |
| Tr 梯形螺纹（**53 行**，Tr8–Tr44 GB/DIN 交集 41 行 + W8-A 最大螺距 12 行） | src/data/threads-trapezoid.json | 已入库（W3-C2；W8-A 补 12 行） |
| G 非密封管螺纹（55°，13 行 G1/8–G2） | src/data/threads-pipe.json | 已入库（W3-C2） |
| UNC/UNF 统一螺纹（20 行，1/4″–1″） | src/data/threads-unified.json | 已入库（W3-C3） |
| **R/Rc/Rp 密封管螺纹**（55° 1:16 锥，15 行 R1/16–R6，基面口径） | src/data/threads-sealpipe.json | **已入库（W8-A）** |
| **NPT 锥管螺纹**（60° 1:16 锥，14 行 NPT1/16–NPT4，基面口径） | src/data/threads-npt.json | **已入库（W8-A；5/6 行双源冲突未入，见 §待补）** |
| **蜗杆**（GB/T 10088 模数制，ZA 40°，15 个标准模数 m1–m25） | src/data/threads-worm.json | **已入库（W8-A；px/h 由 wormGeometry 活算）** |

## 已披露待补（v0.2+，非缺陷）

| 项 | 去向 |
| --- | --- |
| NPT 5/6 尺寸代号（GB/T 12716 系列） | v0.2.1 数据扩张未入（W8-A：第二源 gewinde-normen.de 的 5/6 行为管外径口径，双源冲突；P1 值留痕 PROVENANCE，待裁决） |
| 蜗杆分度圆 / 导程角 / 三针测量 | 不在 v0.2.1（V3-2：q 值由设计给定，非查表事务；40° 量针常数无已核双源，宁缺毋滥） |
| G92 单循环程序生成 | v0.2.0 W6-C2（WAVE-PLAN-V2 F2；V2-7 落 p04 切换） |
| GSK/KND/华中 G76 方言 | v0.2.0 W6-C2（WAVE-PLAN-V2 F1；语义先 C1 双源调研，单源/冲突维持置灰 V2-4） |
| 宏程序库（椭圆/网纹/油槽/切槽） | v0.3（DEFERRED #4） |

> W8-A 已将原「蜗杆螺纹 / NPT / R·Rc·Rp 锥管 / Tr 最大螺距 12 行」四项从待补清单转为已入库
> （DEFERRED #2 + V2 遗留 Tr 12 行）。NPT 5/6 与蜗杆三针为本包显式裁剪，保留在上表。

## 数据性质披露

- `src/data/materials.json` 切削参数库为**示例数据**：页内固定警示 + 每行 source 标"示例·待复核，以试切为准"（WAVE-PLAN §3 裁决 3）。
- Tr 牙顶间隙 ac 表（src/core/thread.ts 内嵌，GB/T 5796.1）**已双源转正**（W3-C2，W2-C2 裁决②关账）：GB/T 5796.1-2005 主源 + DIN 103 反推互证（覆盖 P1.5–24）+ ISO 2901 抽查；P28–44 段为同档常量延伸（主源单源），provenance/threads-trapezoid.md §5.5 披露。
- GB/T 196-2003 现行替代版为 GB/T 196-2025（全文未取得）；本表按 2003 口径录入并经 DIN 13 全量对拍 0 值冲突（W3-C1 U1 裁决 A），provenance/threads-metric.md 披露。
- **锥管口径（W8-A，V3-1）**：`threads-sealpipe.json` / `threads-npt.json` 的 `major` 为**基准平面处大径**，
  `d₂/d₁` 由 `threadDimensions` 按 55°/60° 常数活算，底孔取基面小径（非 d−P）。p03 展示「基准平面处直径」标注行。
- **蜗杆表结构（W8-A，V3-2）**：`threads-worm.json` 的 `pitch` 字段承载模数 m，`major` 为契约占位镜像；
  px=π·m / h₁=2.2·m 由 `core/thread.wormGeometry` 活算，数据表不存 px/h；蜗杆不显示三针卡。
- **副源降级（W8-A）**：GB/T 7306.1-2000 / GB/T 12716-2011 / GB/T 10088-2018 全文均为采标不可在线取回，
  主值取公开转载表 + 独立第二源逐行互证（详见 PROVENANCE W8-A 四节）；R3/4 第二源 26.411 按排版笔误登记。

## 逐表溯源

见 src/data/PROVENANCE.md（Lead 自 provenance/ 片段串行合并，W3 收获时生成）。
