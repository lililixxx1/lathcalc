# COVERAGE · 覆盖与待补清单（Lead 维护，W3 卡只读）

> 记录数据/功能覆盖现状与已披露裁剪项；"待补"= 用户共识裁决的 v0.2+ 范围（WAVE-PLAN §3 裁决 2）。

## 螺纹族覆盖（v0.1）

| 族 | 表 | 状态 |
| --- | --- | --- |
| M 普通螺纹（粗牙 M1–M64 + 常用细牙） | data/threads-metric.json | W3-C1 |
| Tr 梯形螺纹 | data/threads-trapezoid.json | W3-C2 |
| G 非密封管螺纹（55°） | data/threads-pipe.json | W3-C2 |
| UNC/UNF 统一螺纹 | data/threads-unified.json | W3-C3 |

## 已披露待补（v0.2+，非缺陷）

| 项 | 去向 |
| --- | --- |
| 蜗杆螺纹 | v0.2（DEFERRED #2） |
| NPT | v0.2（DEFERRED #2） |
| R/Rc/Rp 锥管螺纹（55°密封） | v0.2（DEFERRED #2；本族检索关键词与 G 非密封易混——W3-C2 录入时须确认源表为 GB/T 7307/ISO 228-1 非密封系） |
| G92 单循环程序生成 | v0.2（DEFERRED #2b） |
| GSK/KND/华中 G76 方言 | v0.2（DEFERRED #1；UI 页签置灰+"待补"徽标） |
| 宏程序库（椭圆/网纹/油槽/切槽） | v0.3（DEFERRED #4） |

## 数据性质披露

- `data/materials.json` 切削参数库为**示例数据**：页内固定警示 + 每行 source 标"示例·待复核，以试切为准"（WAVE-PLAN §3 裁决 3）。
- Tr 牙顶间隙 ac 表（src/core/thread.ts 内嵌，GB/T 5796.1）当前**单源**，W3-C2 双源互证后转正（B.2 规则，TASK-LEDGER W2-C2 裁决②）。

## 逐表溯源

见 data/PROVENANCE.md（Lead 自 provenance/ 片段串行合并，W3 收获时生成）。
