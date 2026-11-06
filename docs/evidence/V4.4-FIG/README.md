# V4.4-FIG · v0.5.0 参数化图形推广证据档（p06 余 10 案全量）

> 触发：v0.4.0 试点上线后用户裁决（2026-11-06）——「推广全部 10 案」。
> 计划：`docs/plan/WAVE-PLAN-V4.4.md`（G0 有条件通过，阻塞 AC09 z/r 互换已修）。
> 执行形态：标准波次——契约 Lead 预置（commit 759923f：kit 拆分 + 全 12 案分发桩 +
> refCircles 增量）→ worker-1（V44-A2：AC02/03/04/06）/ worker-2（V44-B：AC07–AC12）
> 双树并行 → G1 逐批（批次证据 `docs/evidence/V44-A2/`、`docs/evidence/V44-B/`）
> → 收获 d516940（572→628）→ Lead 集成 7735f03（V4.4-05 翻全 12 + v0.5.0）→ A4 → G2。

## 实现结构（V4.4 终态）

- `src/core/arc-figure-kit.ts`：共享几何工具（Lead 契约提交；solveFor 覆盖 a+b 组、
  arcView/circleArcs/circleExtremes、sampleArc 增跨度内四向极值——一般弧 bbox 必紧）。
- `src/core/arc-figure-a2.ts`（worker-1）/ `arc-figure-b.ts`（worker-2）：10 案生成器；
  `arc-figure.ts` PARAMETRIC_CASES 翻全 12（V4.4-05，集成提交 7735f03）。
- `src/ui/pages/p05.ts`：refCircles 虚线整圆层 + 零长轴线跳过（无轴线案 AC02/03/04）。

## 工具与锚点（Lead 预置）

- `tools/anchors-v44.mjs`：G2 三路互证锚点脚本（零 import src，纯 §2/§3/§4 公式）；
  输出 `runs/anchors-v44.json`（AC04/AC09/AC10 三案抽锚，8 位小数机生成）。
  三路对拍结果：anchors 脚本 / worker 实现 / worker vitest 金锚全部逐位一致
  （AC04 T=(46.68,14.79)、AC09 T=(29.85,24.06)、AC10 (41.45,3.50)）。
- `tools/verify-v45.mjs`：12 案 × 两输入对拍 + p05 图库回归拍（沿革 verify-v43；
  标签排序集比较；path+circle 集变化断言；AC11 自相似案按登记裁决跳过 path 断言）。

## 门禁（A1）

- 双批收获后主仓四门禁：typecheck 0 / vitest **628/628**（572+56）/ lint 0 / build 0
  （收获 d516940 + 集成 7735f03 各跑一轮，均 4×0）。
- 集成提交 7735f03 含两处计划内断言修订（计划 §5 预登记）：AC02 静态回归例翻参数化
  语义（ui-p06-param.test.ts）、PARAMETRIC_CASES 契约面断言翻全 12（arc-figure.test.ts）。

## A4（两轮）

- **ROUND1（vision，25 拍）**：A 随值变化 12/12（AC11 按自相似裁决核过：标签 R10→R6）
  / B 标签真值 24 拍全对 / C 图面质量过（四仲裁点：AC03 R2 圆内不顶边、AC10 lead 标签
  压虚线不压实线可读、AC02/03/04 无轴线自洽、AC08 半圆无错位）/ D p05 图库 12 卡零回归
  → **PASS**，但报 1 真缺陷：**AC07 Ø 标签裁切**（顶部对比度极低浅色文字）。
- **R1 修复（V4.4-06）**：根因=计划 §4 原文「Ø at 圆柱中点上方−3」未考虑限高映射
  （默认 5/30/−30 下顶线已居 y≈3.5，−3 溢出 viewBox 顶）。改圆柱线下+3（AC05/AC12
  线下同规）：`arc-figure-b.ts` + 单测锚 + 计划行三处同步勘正。修复后四门禁 4×0
  （628/628）、重建、verify-v45 全量复拍 ok。
- **ROUND2（AC07 两拍复核）**：**PASS**——Ø30/Ø40 线下清晰逐字可读、无新增遮挡
  （b 拍 Ø40 与 R4 紧邻不叠压，登记观察项）、顶部裁切残留清除、其余沿用 ROUND1。
- 登记不阻塞打磨项（后续波次候选）：AC04 R1/α 标签互叠连排、AC03 b 拍 R2=5 压弧、
  AC06 dX 压线、AC12 轴线远离孔壁主体（内孔案几何必然，读作孤立短线）。

## 索引

| 文件 | 内容 |
| --- | --- |
| `tools/anchors-v44.mjs` | G2 独立复算锚点脚本（计划公式直实现） |
| `tools/verify-v45.mjs` | 12 案×两输入 A4 对拍工装 |
| `runs/anchors-v44.json` | 机生成锚点（AC04/AC09/AC10） |
| `runs/verify-v45.json` | A4 对拍机报告（ok/shots/labelChecks） |
| `runs/p06-ac*-param-a/b-390x844.png` | 12 案 × 两输入实拍（R1 修复后终版） |
| `runs/p05-gallery-regression-390x844.png` | p05 图库回归拍（thumb 不动） |
