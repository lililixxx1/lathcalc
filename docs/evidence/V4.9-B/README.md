# V4.9-B 证据档 · 料型截面图 + 切速图模块与 p11/p09 装配

- 树：`LathCalc-trees_V49-B`（基线 commit 5d7a253 = v0.6.3 终态 + 冻结计划
  `docs/plan/WAVE-PLAN-V4.9.md`）；执行：worker-2；日期：2026-11-07。
- 依据：WAVE-PLAN-V4.9 §0 B 卡 / §1 V4.9-01/03/04/05/06 / §2 stock·speed 契约 /
  §3 B 卡金锚 / §5 树 B 写范围。

## 1. 交付物与改动清单

| 文件 | 类型 | 内容 |
| --- | --- | --- |
| `src/core/stock-figure.ts` | 新建 | p11 四料型双视图视图模型（截面 ka / 侧视 kb / 四形状 / 标注） |
| `src/core/speed-figure.ts` | 新建 | p09 切速图视图模型（r=min(40, 36·50/D) / D 双箭头 / Vc 切向箭头 / n 标签位） |
| `src/ui/pages/p11.ts` | 增量 | 图卡装配 `stockFigureSVG`（零几何）+ 保帧 paint；插在密度 chips 后、结果卡前 |
| `src/ui/pages/p09.ts` | 增量 | 图卡装配 `speedFigureSVG`（零几何）+ 保帧 paint；插在输入区后、标尺/结果前 |
| `test/stock-figure.test.ts` | 新建 | 7 测试（校验 8 断言 + 四形状金锚 + 极端比例 + 标注不变量） |
| `test/speed-figure.test.ts` | 新建 | 6 测试（校验 + D=50/80 金锚 + 封顶缩放 + 几何恒等 + 切向不变量） |
| `test/ui-p11.test.ts` | 增组 | 文末新增 describe「p11 料型示意图（V4.9-B）」3 测试；既有 3 组未动 |
| `test/ui-p09.test.ts` | 增组 | 文末新增 describe「p09 切速示意图（V4.9-B）」4 测试；既有 2 组未动 |
| `docs/evidence/V4.9-B/` | 新建 | 本 README + `anchors-recompute.mjs` + `runs/`（5 档） |

写范围核查：以上即全部改动，未触写范围外任何文件（core/weight.ts、core/speed.ts、
package.json、其它页面零改动）。

## 2. 门禁判定（四档全绿；命令全文与原始输出见 `runs/`，均在树根单独整句执行）

| 门禁 | 命令 | REAL_EXIT | 档 |
| --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | 0 | `runs/gate-tsc.txt` |
| 测试 | `npx vitest run --maxWorkers=2` | 0 | `runs/gate-vitest.txt` |
| 构建 | `npm run build` | 0 | `runs/gate-build.txt` |
| lint | `npm run lint` | 0 | `runs/gate-lint.txt` |

**判定行（脚本生成，非手算）**：
- 门禁行：`tsc=0 vitest=0 build=0 lint=0`（四档 REAL_EXIT 全 0）。
- 测试数行：`TOTAL=706 = 基线 686 + 新增 20`；57 文件 = 基线 55 + 新建 2。
- 锚复算行（`node docs/evidence/V4.9-B/anchors-recompute.mjs`，REAL_EXIT=0）：
  `TOTAL=40 MATCH=40 FAIL=0 → 全部一致，锚可作验收依据`。

## 3. 测试数增量（逐文件归属，取自 `runs/gate-vitest.txt`）

| 文件 | 基线 | 现 | 增量 |
| --- | --- | --- | --- |
| `test/stock-figure.test.ts` | —（新建） | 7 | +7 |
| `test/speed-figure.test.ts` | —（新建） | 6 | +6 |
| `test/ui-p11.test.ts` | 10 | 13 | +3 |
| `test/ui-p09.test.ts` | 13 | 17 | +4 |
| 其余 53 个既有文件 | 686−10−13=663 | 663 | 0（零回归） |
| **合计** | **686** | **706** | **+20**（派工预期登记 20~30，达标） |

## 4. 金锚双盲复算留痕

- 复算脚本：`docs/evidence/V4.9-B/anchors-recompute.mjs`（独立路径：按计划 §1 冻结
  公式从零代入，不 import 实现模块、不读实现常量；期望值为计划 §3 登记值）。
- 输出档：`runs/anchors-recompute.txt`（REAL_EXIT=0，40/40 MATCH，判定行在档尾）。
- 执行期手工复核：§3 B 卡全部锚（圆钢 ka=68/50=1.36→r=34、kb=0.8→80×40 y 96..136；
  六方 R=20/√3=11.547、ka=2.9445→68×58.89、kb=2→200×40；钢管 ka=34/30→rO=34、
  rI=(25/30)×34=28.33、kb=2/3→66.67×40；平板 ka=0.68→68×6.8、kb=1→200×10；
  p09 r=min(40,36)=36、Vc 起点 (110+36·cos45°, 56−36·sin45°)=(135.46, 30.54)、
  n=1000×150/(π×50)=954.93→'955'、D=80→r=22.5）与计划登记值逐项一致，无上报事项。
- 容差注记：`hex.secH` 金锚 58.9 系计划按 1 位小数登记（实算 58.8897…），脚本容差
  按登记精度 0.05 取；期望值未改。首跑因容差误设 0.005 出 1 例 FAIL（REAL_EXIT=1），
  属校验工装容差标定问题——两条推导路径数值一致（58.889727… 按计划登记精度舍入即
  58.9）。**留痕瑕疵如实披露**：首跑输出档被修正后的重跑同路径覆盖，未双档留痕；
  FAIL 行原文照录如下，根因与修正已注释于脚本内：
  `[FAIL] hex.secH  S·ka（金锚 58.9） = 58.88972745734182  期望 58.9  (±0.005)`。

## 5. 契约微调披露（计划 §2 允许：字段名/派生字段微调，语义与入参冻结）

1. **派生字段新增**（均为装配渲染所需，几何语义不变）：
   - `StockFigureView.centerlines: { horizontal, vertical } | null` —— §1 V4.9-03 的
     截面中心线十字坐标（圆/六方/管有、平板 null），契约正文未列，按计划允许增删
     派生字段补入；dash-dot 造型由页面装配渲染（p16 同款）。
   - `StockMark.labelX/labelY/anchor` —— 标注标签锚点位（契约 marks 只有线段与
     label 文本）；装配按 anchor 渲染双 tspan 标签。
   - `SpeedFigureView.centerlines` —— §1 V4.9-04 的中心线十字坐标，同上。
   - `SpeedFigureView.diameterMark.labelX/labelY/anchor`、`vcArrow.labelX/labelY` ——
     ⌀ 标签（圆外左上 anchor=end，避让竖直中心线与右上 Vc 箭头）与 Vc 标签
     （箭头端右侧 anchor=start）的锚点位。
2. **箭头造型**：linear 双箭头与 Vc 单箭头的三角形（5×1.8）为装配层固定造型装饰，
   由 core 提供的线段端点派生（p16/p08 无箭头先例，本波新增的呈现层约定）。
3. **标签文本构成**：`⌀${fmtDim(D)}`（⌀ = U+2300，计划 `⌀50` 式）；D/S/t/W/T/L 标签
   `代号 + 空格 + 值` 式（p16 `a 20` 同款）；fmtDim = 整数不带小数、非整数最多 3 位
   小数（与 p11 formatDimension 同口径）——属几何驱动值的显示格式化，非业务值重算。
4. **Vc/n 标签文本来源**（形值同源）：页面按模式传入——rpm 模式 `Vc ${trimFixed(vc,6)}`
   （与算式卡 Vc 展示同源）、vc 模式 `Vc ${vc.toFixed(1)}`（与结果卡同源）；
   `n ${rpm.toFixed(0)} r/min`（与结果卡 rpm 同源）。默认帧产出 `Vc 150` / `n 955 r/min`
   （计划 §1 V4.9-04 `Vc 150`/`n 955 r/min` 锚）。
5. **图卡插入位**（派工单授权择一并披露）：
   - p11：密度 chips（末组输入）之后、单件重量结果卡之前——满足「输入后、结果前」；
   - p09：输入区之后、标尺/结果卡之前（标尺属结果显示区）。
6. **SVG 视口高度**：stock `height="130"`（viewBox 220×150）、speed `height="104"`
   （viewBox 220×120），均 ≈0.867 缩放（p16 130/152 同比例惯例）；宽度 100%。
7. **六方引线取位**：S 引线自底平贴缘右段（x=中心+半宽/4）右下 45° 外引长 10u——
   顶平贴缘上方仅余 ~5u 放不下 8.5 号字（包围盒顶 y=12.56），故取底部空域。

## 6. 实现口径与计划对照（关键点自查）

- 形值同源（V4.9-01）：图模块只算布局几何；重量/体积不在图内重算；p09 标签值全部
  由页面计算真值传入。
- 保帧（V4.9-05）：两页均 try/catch 包 paint，非法输入（≤0/NaN/解析失败/t≥D/2）
  时不动图卡 DOM（ui 测试以 outerHTML 恒等断言）；钢管 t≥D/2 抛错与 p11 页面层
  `t*2>=D` 拒算同口径。
- 极端比例不抛错：round D=200 L=5 → 条 1×40、plate W=10 T=100 → 截面 7×70 如实
  呈现（单测覆盖）。
- 视觉纪律：只拼既有组件与 tokens.css 变量（`--la-sub`/`--la-ink-body`），零新 CSS
  变量、零内联色值（ui-source.test.ts 全量扫描通过，含于 706）。
- 不做项（V4.9-06）未越界：未做 p09 进给 f 箭头、未做平板侧视立体化。

## 7. 上报项

无。（锚复算 40/40 一致；计划口径与既有源码无冲突；四门禁一次过；未发现
core/weight.ts / core/speed.ts 疑似源缺陷。）
