# V44-B · p06 参数化图形 b 组六案（AC07–AC12）

> 任务：`[V44-B] p06 参数化图形 b 组六案（AC07–AC12）实现 + 测试`
> 隔离树：`LathCalc-trees_V44-B`（基线 commit `759923f`；树非 git 仓，树内产出为唯一载体）
> 规格：`docs/plan/WAVE-PLAN-V4.4.md` §0/§1/§2/§4（唯一规格来源）；solver 公式源
> `src/core/arc-cases-b.ts:71-163`；工具与冻结约定 `src/core/arc-figure-kit.ts`。
> 写范围外零改动：kit / `arc-figure.ts` / `arc-figure-a2.ts` / `p05.ts` / `p06.ts` /
> 既有 `test/` / `docs/plan/` / 冻结参考件均未动。

## 交付物

| 路径 | 内容 |
| --- | --- |
| `src/core/arc-figure-b.ts` | 桩→实；六案导出签名不变；共用 `assemble`/`render`（裁线→轴线→bbox→映射） |
| `test/arc-figure-b.test.ts` | 新增 32 例（6 案 ×5 + AC08 半圆边界 + AC10 lead→R⁻ 极限） |
| `docs/evidence/V44-B/` | 本 README + `runs/` 四门禁原始输出（一命令一档） |

## 实现口径（V4.4 §1/§2/§4）

- **起点构造**：solver 只输出 center/tangent（`ArcSolution` 无 start 字段）——AC07 `T1`、
  AC08 `E`、AC09 `F`、AC10 `E`、AC11 `P`、AC12 `T1` 按 §4 算式构造；center/tangent 取
  `solveFor`（单源，不传 rearToolPost）。
- **方向**：`cw = solution.direction === 'G02'`（`arc-cases-b.ts` 头注「图面顺时针 = 前刀架
  G02」；`solveFor` 只择 `solver.inputs` 键 → 图形与刀架方位无关）。
- **显示段**：全部经 `clipSegAtAxis` 裁至 r≥0（b 组构造即 r≥0，裁线为口径守卫）；
  弧=求解实体不裁。
- **轴线**：`segs+arcs` 的 z 范围（V4.4-04④：标注类点/虚线不计入）。AC07/08/09/10/11
  与 §4 表显式值一致；AC12 按同一条通则取 `[R−2.8R, R]`（表未单列轴线，见「备注」）。
- **bbox**：轮廓段端点 + 弧采样 + 虚半径端点 + 圆心点 + 轴线 + `refCircles` 四极值
  （V4.3 §2 + V4.4 §2 增量）；标签锚点不计。注意 AC08 圆心 `C.z=sign(dZ)·R` 可越出
  轮廓 z 范围：默认输入 dZ=−4 时 `C.z=−6`，bbox z=[−6,0]，而轴线仍按轮廓 z=[−4,0]
  （两套点集不同源，V4.4-04④ 与 V4.3 §2 各自口径）。
- **refCircles**：仅 AC10/AC11 各 1 个虚线整圆；b 组六案均无 refDashes。
- **标签**：§4 表逐行；多字符键等号（`dZ={v}` / `lead={v}`，V4.4-02），AC07 的 `Z{dZ}`
  为绝对位置；AC10 的 R 标签锚法为 `Cv−(R·s+2.2,0)`。

## 六案实体（§4 表逐行）

| 案 | 默认输入 | 实线实体 | 参照 | 标签 |
| --- | --- | --- | --- | --- |
| AC07 凸圆弧收尾 | R5, dX30, dZ−30 | 圆柱 `(dZ−2.8R,dX/2)→T1`、弧 `T1→T2`、端面 `T2→(dZ,0)` | 点C；线C↔T2 | `R5` / `Ø30` / `Z-30` |
| AC08 端面切弧 | R6, dZ−4 | 端面 `(0,0)→(0,r_t+1.9R)`、弧 `E→T` | 点C；线C↔T | `R6` / `dZ=-4` |
| AC09 锥面切弧 | R5, α30° | 端面 `(0,0)→(0,d+1.9R)`、弧 `F→T`、锥面 `T→T+2.4R·u` | 点C；线C↔T | `R5` / `α30°` |
| AC10 圆弧螺纹入口 | R5, lead3.5 | 圆柱 `(−2.4R,R)→T`、弧 `E→T` | refCircle(C,R)；点C；线C↔T | `R5` / `lead=3.5` |
| AC11 球面收尾 | R10 | 弧 `P→T`、圆柱 `(0,R)→(2.4R,R)` | refCircle(C,R)；点C；线C↔T | `R10` |
| AC12 内孔圆弧过渡 | R3, boreD20 | 孔壁 `(R−2.8R,boreD/2)→T1`、弧 `T1→T2`、底面 `(0,boreD/2+R)→(0,boreD/2+R+1.9R)` | 点C；线C↔T2 | `R3` / `Ø20` |

## 默认输入关键坐标（viewBox 64×34，2 位小数）

| 案 | 切点（橙点 = map(tangent)） | 圆心（灰点） | scale | 标签集 |
| --- | --- | --- | --- | --- |
| AC07 | (40.10, 12.50) | (49.10, 12.50) | 1.80 | R5 / Ø30 / Z-30 |
| AC08 | (36.75, 21.55) | (27.25, 21.55) | 1.58 | R6 / dZ=-4 |
| AC09 | (29.85, 24.06) | (26.13, 17.62) | 1.49 | R5 / α30° |
| AC10 | (41.45, 3.50) | (41.45, 17.00) | 2.70 | R5 / lead=3.5 |
| AC11 | (22.55, 3.50) | (22.55, 17.00) | 1.35 | R10 |
| AC12 | (33.73, 11.73) | (38.06, 11.73) | 1.44 | R3 / Ø20 |

> 表中数值为实现探针输出；`test/arc-figure-b.test.ts` 以测试内自实现 `mapSpec`（V4.3 §2
> 映射式）+ §4 算式独立复算，逐点 `toBeCloseTo(…, 6)` 对拍（禁止 import src 的
> makeMap/segView 算期望）。

## 门禁判定（四门禁各命令单独整句执行，退出码机械提取）

| 门禁 | 命令 | 原始输出档 | REAL_EXIT |
| --- | --- | --- | --- |
| 静态检查 | `npx tsc --noEmit` | `runs/tsc.txt` | 0 |
| lint | `npm run lint` | `runs/lint.txt` | 0 |
| 测试 | `npx vitest run --maxWorkers=2` | `runs/vitest.txt` | 0 |
| 构建 | `npm run build` | `runs/build.txt` | 0 |

判定行提取命令与输出（树根执行）：

```bash
grep -H '^REAL_EXIT=' docs/evidence/V44-B/runs/*.txt
```

```text
docs/evidence/V44-B/runs/build.txt:REAL_EXIT=0
docs/evidence/V44-B/runs/lint.txt:REAL_EXIT=0
docs/evidence/V44-B/runs/vitest.txt:REAL_EXIT=0
docs/evidence/V44-B/runs/tsc.txt:REAL_EXIT=0
```

`runs/vitest.txt` 摘要（去 ANSI 后原样）：

```text
 Test Files  51 passed (51)
      Tests  604 passed (604)
```

**判定：四门禁 4×0；新增 32 例全绿；604 − 32 = 572 既有测试零改动（文件数 51 = 50 既有 + 1 新增）。**

## 测试构成（32 例）

- 每案 5 例 ×6 = 30：①金锚式独立代入（默认 + 第二组输入，测试内 `mapSpec` 复算）
  ②守恒 ③值标签集逐字 ④参数响应（第二组输入 path/arcs/labels 变化）⑤异常上抛原文。
- 另 2 例：AC08 `|dZ|→2R⁻` 半圆边界（弦≈直径、跨角→180°⁻、不抛）；AC10 `lead→R⁻`
  极限（`lead=R` 被 solver 拒绝，中文原文断言）。
- 守恒断言：每案 `|T−C|=R·s`、`|start−C|=R·s`；四分之一弧（AC07/11/12）另
  `|start−T|=R√2·s` 且两端半径向量正交；一般弧（AC08/09/10）按图面逆时针方向由
  两端极角差算得的跨角严格 ∈ (0°, 180°)，并与 `atan2(cross,dot)` 主值互证
  （另断言弦 < 直径）。
- 例外说明：AC07 第二组输入取 `R6/Ø40/Z−24`（非等比缩放）——冻结第二例 `R4/Ø24/Z−12`
  与默认例同为 `dX=6R` 的自相似组合，归一化后 path 完全相同，无法承载「参数响应」；
  AC11 为单参数案，归一化视图自相似，参数响应断言落在 `scale`/标签/物理弦长
  （`chord/scale=R√2`，测试内已注明）。

## 索引

| 文件 | 内容 |
| --- | --- |
| `runs/tsc.txt` | `npx tsc --noEmit` 原始输出 + REAL_EXIT=0（空输出=干净） |
| `runs/lint.txt` | `npm run lint` 原始输出 + REAL_EXIT=0 |
| `runs/vitest.txt` | `npx vitest run --maxWorkers=2` 原始输出 + REAL_EXIT=0（51 files / 604 tests） |
| `runs/build.txt` | `npm run build` 原始输出 + REAL_EXIT=0 |
| `src/core/arc-figure-b.ts` | 六案实现（本卡写范围） |
| `test/arc-figure-b.test.ts` | 32 例双盲对拍（本卡写范围） |

## 结论

- §4 六案实体表逐行实现；导出签名与文件头约定不变；b 组六案无 refDashes、AC10/11
  各 1 个 refCircle，与表一致。
- 四门禁 4×0（见 `runs/`）；新增 32 例全绿（预期登记 24–34）；既有 572 例零改动。
- 未发现 kit 缺陷；写范围外零改动；无 SOURCE-DEVIATION-NOTE。

## 备注（口径说明）

- **AC12 轴线**：§4 表的 AC12 行未重复单列轴线，但 §4 表前导句「轴线跨度=轮廓实体 z 范围
  （V4.4-04④）」适用于 b 组全部六案；V4.4-03 的「无轴线案」也只列 AC02/03/04。故本侧按
  通则以 `(R−2.8R,0)→(R,0)` 绘制（与 AC05/AC07 的面/壁语境一致），测试同步断言该范围。
