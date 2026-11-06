# V4.4-FIG · v0.5.0 参数化图形推广证据档（p06 余 10 案全量）

> 触发：v0.4.0 试点上线后用户裁决（2026-11-06）——「推广全部 10 案」。
> 计划：`docs/plan/WAVE-PLAN-V4.4.md`（G0 有条件通过，阻塞 AC09 z/r 互换已修）。
> 执行形态：标准波次——契约 Lead 预置（commit 759923f：kit 拆分 + 全 12 案分发桩 +
> refCircles 增量）→ worker-1（V44-A2：AC02/03/04/06）/ worker-2（V44-B：AC07–AC12）
> 双树并行 → G1 逐批 → Lead 集成（PARAMETRIC_CASES 翻全 12）→ A4 → G2。

## 实现结构（V4.4 终态回填区）

- `src/core/arc-figure-kit.ts`：共享几何工具（Lead 契约提交；solveFor 覆盖 a+b 组、
  arcView/circleArcs/circleExtremes、sampleArc 增跨度内四向极值——一般弧 bbox 必紧）。
- `src/core/arc-figure-a2.ts`（worker-1）/ `arc-figure-b.ts`（worker-2）：10 案生成器。
- `src/ui/pages/p05.ts`：refCircles 虚线整圆层 + 零长轴线跳过（无轴线案 AC02/03/04）。

## 工具与锚点（Lead 预置）

- `tools/anchors-v44.mjs`：G2 三路互证锚点脚本（零 import src，纯 §2/§3/§4 公式）；
  输出 `runs/anchors-v44.json`（AC04/AC09/AC10 三案抽锚，8 位小数机生成）。
- `tools/verify-v45.mjs`：12 案 × 两输入对拍 + p05 图库回归拍（沿革 verify-v43；
  标签排序集比较；path+circle 集变化断言）。

## 门禁（A1，回填区）

（待 worker 批次与集成终态回填）

## A4（回填区）

（待集成后两轮回填）

## 索引（回填区）

| 文件 | 内容 |
| --- | --- |
| `tools/anchors-v44.mjs` | G2 独立复算锚点脚本（计划公式直实现） |
| `tools/verify-v45.mjs` | 12 案×两输入 A4 对拍工装 |
| `runs/anchors-v44.json` | 机生成锚点（AC04/AC09/AC10） |
