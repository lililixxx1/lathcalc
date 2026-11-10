# V4.12-A 证据档 · p06 圆弧工况图标注防重叠

- 树：`LathCalc-trees_V412A`（基线 f504f3d 导出，树内无 .git 属物理隔离）
- 派工单：V4.12-A（目标：12 参数化工况全案标签两两不相交，净距 ≥1.5 view-unit，全部落 viewBox 64×34 内）
- 时间盒：90 分钟纯代码，未超盒

## 索引（runs/ 一命令一档）

| 档 | 命令 | REAL_EXIT | 说明 |
| --- | --- | --- | --- |
| `runs/01-sweep-before.log` | `npx vitest run test/label-sweep.test.ts`（修复前） | 1 | 首跑取证：32 组输入全判定行（含 [sweep] 行 32 条）；预注册预期核对 |
| `runs/02-sweep-after.log` | `npx vitest run test/label-sweep.test.ts`（resolver 接入后首跑） | 0 | 12/12 it 全绿 |
| `runs/03-tsc.log` | `npx tsc --noEmit`（中间态） | 0 | resolver 接入后、golden 更新前 |
| `runs/04-vitest-full.log` | `npx vitest run --maxWorkers=2`（中间态） | 1 | golden 更新前：恰 2 处失败（AC07 Z / AC08 dZ 标签钳位 33.5→33.2），与预判一致 |
| `runs/05-affected-tests.log` | `npx vitest run test/arc-figure.test.ts test/arc-figure-a2.test.ts test/arc-figure-b.test.ts test/label-sweep.test.ts test/ui-p06-param.test.ts test/ui-p06.test.ts` | 0 | 受影响面 110/110（含 4 条新增 resolver 契约断言） |
| `runs/06-tsc-final.log` | `npx tsc --noEmit` | 0 | 门禁 1 |
| `runs/07-vitest-full-final.log` | `npx vitest run --maxWorkers=2` | 0 | 门禁 2：59 文件 / 748 用例全绿 |
| `runs/08-build.log` | `npm run build` | 0 | 门禁 3：PWA precache 42 entries |
| `runs/09-sweep-final.log` | `npx vitest run test/label-sweep.test.ts` | 0 | 门禁 4（验收命令原文）：12/12 it 全绿 |

## 结论

12 案 × 默认值 + 既有边界输入组共 32 组扫查全部通过：两两 est. bbox 净距 ≥1.5 view-unit
且全部落 viewBox 64×34 内。四门禁（sweep / tsc / vitest 全量 / build）退出码全 0。
未动 `src/ui/**`、未动 arc-figure-a2.ts / arc-figure-b.ts（后处理足以消解，无案内锚手调）。

## 判定行（由 test/label-sweep.test.ts 计算输出，非手算）

修复前（runs/01）与修复后（runs/09）逐组 `[sweep]` 行对读；关键对摘录：

| 案 · 输入（来源） | 修复前最小净距 | 修复后最小净距 | 修复动作 |
| --- | --- | --- | --- |
| AC01 默认（p06.ts:106） | −0.44（R5~α45° 相交）+ Ø36 越界（y1=34.3） | 2.01 | α 上右 nudge 7 步；Ø 钳位 33.5→33.2 |
| AC01 例2（arc-cases-a.test.ts:79） | −0.61 + 越界 | 1.78 | 同上形态 |
| AC02 默认（p06.ts:107） | 0.14（R1=10~dZ=15）+ 越界 | 2.06 | dZ 上右 nudge 3 步 + 钳位 |
| AC03 第3组（arc-figure-a2.test.ts:804） | −0.05（R1=20~dZ=6）+ 越界 | 1.87 | dZ nudge + 钳位 |
| AC04 默认（p06.ts:109） | 0.66（R1=5~α45°） | 1.94 | α nudge（案内 V4.6-02 避让后仍不足 1.5） |
| AC04 例2（arc-cases-a.test.ts:215） | 1.10（R2=6~α30°） | 1.83 | α nudge |
| AC09–AC12 全部输入 | 天然合规（3.41–11.65） | 同前 | 无位移（未冲突仅钳位，本组均为无钳位） |
| 底部轴标签系统性越界 | 19 组 y1=34.3>34（基线 33.5+降部 0.8） | 0 组 | 出口钳位：基线 = min(axisY+3, 34−0.8)=33.2 |

修复后 32 组判定行最小净距域：[1.52, 25.51]，全部 ≥1.5；逐组原文见 runs/09。

## 预注册预期核对（派工单预登记，结果如实披露，禁止事后改口）

- 预登记：AC01 默认应报 ≥3 对相交（α/45°、α/R5、45°/R5）；AC05 默认应报 ≥2 对（Ø/Z、Ø/R）。
- 实测（按派工单判定口径）：**AC01 默认 1 对**（R5~α45°，净距 −0.44）；**AC05 默认 0 对**
  （最小净距 8.18u，三对全部远分离）。
- 偏离解读：vision「三标注完全叠印 / Ø36 紧贴 / Ø20 上下交叠压 R」在本仓代码几何
  （f504f3d）+ 派工单估宽口径下未复现；AC01 的 R5~α45° 相交为真实缺陷（已修），
  其余描述与代码几何不符。判读对象可能为 p05 静态 ANNOTATIONS（无值符号标注，坐标
  手工摆放，非本卡范围）或其它渲染帧。→ 上报 Lead 裁决（不擅改口径）。
- 其余 10 案默认值：AC02 1 对（0.14）、AC04 1 对（0.66）、AC03/AC06–AC12 0 对——
  「0 对或多对均正常，有相交即修」已执行。
- 边界输入集（不预注册，如实披露）：32 组中冲突组 9 组（AC01×4 / AC02×2 / AC03×1 /
  AC04×2），越界组 19 组（底部轴标签 y1=34.3>34 系统性 0.3u 裁切）。

## 修法摘要（Lead 定向修法，未改架构）

1. `src/core/arc-figure-kit.ts` 新增 `resolveLabelOverlaps(labels, opts)`：
   - 数组序 = 优先级，labels[0] 永不避让（仅钳位）；i>0 与前面已定标签判净距
     （axis-gap max，V4.6-02 先例式 arc-figure-a2.ts:59-63），<1.5u 即冲突；
   - 候选格 = 预设方向序列（右上/右/上/左上/左/下，首方向 = a2:315 对角右上先例）
     × 每方向 ≤8 步（a2:325 上限先例）× 0.64/步（a2:315 步长先例），偏移后**先钳位再判冲突**
     （对修法「nudge→钳位」次序的保守化：防钳回边界重新引入相交）；
   - 全候选耗尽 → 落钳位兜底位（本次 32 组未触发兜底）；
   - viewBox 钳位（先例 triangle-figure.ts:181-185 按字宽收钳的推广）。
   - 口径常量全部在源注附算式与来源：font=3.2（p05.ts:336 / a2:53）、西文 1.856 u/字符
     （0.58em，a2:50-58）、CJK 3.2 u（1em）、字高框 [y−2.56, y+0.8]、阈值 1.5u
     （1.5/1.856≈0.81 字符宽）。
2. `src/core/arc-figure.ts`：buildArcFigure 出口统一应用（保序保文、零 DOM；
   switch 拆为 figureOf 内部函数，行为不变）。
3. 硬约束达成：输出保序保文保锚（test/arc-figure.test.ts 契约面 4 条新断言：
   保序保文 / 避让生效+确定性 / end 上抛 / 12 案默认值出口校验）；
   anchor='end' 入口统一上抛（防静默错算）。

## golden 锚更新（受影响锚 + 算式注释）

- `test/arc-figure-b.test.ts` AC07 Z 标签、AC08 dZ 标签：y 期望 `axis.y1+3` →
  `min(axis.y1+3, 34−0.8)`（33.5→33.2，出口钳位；算式见锚注）。
- `test/arc-figure.test.ts` / `test/arc-figure-a2.test.ts`：既有锚零改动即绿
  （AC01/AC05 原锚只断文本与锚点界内；a2 V4.6 避让断言在 resolver 后仍成立）。

## 未决点（上报 Lead）

1. 预注册预期与实测偏离（AC01 1 对非 ≥3；AC05 0 对）——见上「预注册预期核对」，
   需 Lead 裁决 vision 判读对象与是否补拍。
2. 「每案 ≥2 组边界输入」在 test/arc-cases-a.test.ts / arc-cases-b.test.ts 两文件内
   每案仅 1 组非默认例题；AC02/AC04/AC07/AC09/AC10/AC11/AC12 全测试库亦仅 1 组非默认
   参数（AC01/03/05/06/08 已从 golden 图形测试既有用例参数补足第 2/3 组）。缺额案如实
   少报未造值（数值纪律），是否授权构造补充输入待 Lead 裁决。
3. 底部轴标签钳位（33.5→33.2）在 220×102 渲染下为 0.3u≈1px 上移，视觉影响极小；
   若 Lead 认为「轴下 3」锚法语义优先于 bbox 界内，可改为放行 y1≤34+0.3 容差——
   本卡按验收口径「全部落 viewBox 内」执行。
