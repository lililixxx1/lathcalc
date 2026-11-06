# V44-A2 · p06 参数化图形 a 组四案（AC02/03/04/06）实现 + 测试

> 任务：V44-A2（worker-1）｜基线 commit：759923f（隔离树，非 git 仓）
> 规格唯一来源：`docs/plan/WAVE-PLAN-V4.4.md` §0–§3（含 V4.4-01/02/03/04 裁决）
> 运行目录：隔离树根（下文一切路径均树相对）；门禁命令逐条单独整句执行，无管道取码。

## 1. 交付物索引

| 路径 | 类型 | 说明 |
| --- | --- | --- |
| `src/core/arc-figure-a2.ts` | 实现（替换桩体） | figureAC02 / figureAC03 / figureAC04 / figureAC06；导出签名不变 |
| `test/arc-figure-a2.test.ts` | 新建测试 | 24 条（每案 6 条）；金锚独立复算 + 守恒 + 标签 + 参数响应 + 专项 + 异常 |
| `docs/evidence/V44-A2/README.md` | 证据索引 | 本文件 |
| `docs/evidence/V44-A2/runs/01-tsc.txt` | 原始输出 | `npx tsc --noEmit` |
| `docs/evidence/V44-A2/runs/02-lint.txt` | 原始输出 | `npm run lint` |
| `docs/evidence/V44-A2/runs/03-vitest.txt` | 原始输出 | `npx vitest run --maxWorkers=2` |
| `docs/evidence/V44-A2/runs/04-build.txt` | 原始输出 | `npm run build` |

未改动：`arc-figure-kit.ts` / `arc-figure.ts` / `arc-figure-b.ts` / `p05.ts` / `p06.ts` /
既有 `test/` 全部 / `docs/plan/` / 冻结参考件（零改动）。

## 2. 实现要点（逐条对应 §3 实体表）

- **AC02 外切**：整圆1(C1,R1) + 整圆2(C2,R2)，各由 2 条互补半圆 WArc 组成（kit
  `circleArcs`，cw 同取 true → sweep=1，规避 180° 弦 cross 退化）；圆心灰点 ×2、
  连心虚线、橙点切点；无轴线（axis 零长段，V4.4-03）；标签 `R1=`/`R2=`/`dZ=`。
- **AC03 内切**：同构双整圆；圆2 恒在圆1 内；R2 标签置圆2 内 `(0,+2.8)`（A4 仲裁）。
- **AC04 弧线弧**：弧1 S1→P1（V4.4-01 伴弧，逆时针 90° → sweep=0）+ 线 P1↔P2 +
  弧2 S2→P2（solver 冻结逆时针 90° → sweep=0）；refCircles 虚线整圆 ×2、圆心点 ×2、
  C↔P 虚半径 ×2；无轴线；标签 `R1=`/`R2=`/`α{v}°`。
- **AC06 凹弧切入**：入口段（S−2.4R·tS→S，裁轴；裁后零长段弃段）、弧 S→E（solver
  冻结，不裁）、出口段（E→E+2.4R·tE）；圆心点、C↔E 虚半径；轴线 = 轮廓实体
  （segs+arcs）z 范围（V4.4-04④）；标签 `R{v}`/`dX=`/`dZ=`。

## 3. 测试覆盖（24 条 = 4 案 × 6）

| 案 | 测试条目 | 覆盖 |
| --- | --- | --- |
| AC02 | 6 | 金锚（默认 + 第二组 6/10/8）·守恒（R1√2 + 正交）·标签集 · 参数响应 · 整圆拼圆/四极值 · 异常 |
| AC03 | 6 | 金锚（默认 + 第二组 20/8/6）·守恒 · 标签集 · 参数响应 · 整圆拼圆/四极值 · 异常 |
| AC04 | 6 | 金锚（默认 + 第二组 4/6/30°）·两弧守恒 · 标签集 · 参数响应 · 参照层/方向 · 异常 |
| AC06 | 6 | 金锚（默认 + 第二组 13/10/12）·守恒 + 跨角<180° · 标签集 · 参数响应 · 裁轴例 · 异常 |

- 期望值由测试内自实现 `mapSpec` + 冻结公式独立复算，未 import kit 的
  `makeMap`/`segView` 等实现计算期望；AC04/AC06 另用 SVG 端点参数化反解圆心
  （F.6.5）交叉校验 sweep 旗标方向，sweep 反了会落到镜像侧而失败。
- 第二组输入均为 `test/arc-cases-a.test.ts` 冻结例题（AC02 :118、AC03 :161、AC04 :209、
  AC06 :303）。
- 全量 51 files / 596 tests passed（572 既有 + 24 新增）；其中
  `test/arc-figure-a2.test.ts` 24 passed。

## 4. 默认输入关键锚点（viewBox 64×34，2 位小数）

| 案 | 默认输入 | 切点（橙点） | 圆心灰点 | scale | 标签集 |
| --- | --- | --- | --- | --- | --- |
| AC02 | R1=10, R2=15, dZ=15 | (29.60, 19.70) | C1=(26.00, 24.50)；C2=(35.00, 12.50) | 0.60 | R1=10 / R2=15 / dZ=15 |
| AC03 | R1=25, R2=10, dZ=9 | (40.10, 6.20) | C1=(32.00, 17.00)；C2=(36.86, 10.52) | 0.54 | R1=25 / R2=10 / dZ=9 |
| AC04 | R1=5, R2=3, α=45° | (46.68, 14.79) | C1=(26.41, 19.47)；C2=(42.00, 10.12) | 2.21 | R1=5 / R2=3 / α45° |
| AC06 | R=10, dX=12, dZ=8 | (31.89, 24.73) | C=(23.04, 20.95) | 0.96 | R10 / dX=12 / dZ=8 |

结构计数：AC02/03 = 4 arcs（2 整圆 × 2 半圆）；AC04 = 2 arcs + 1 seg + 2 refCircles +
2 radiusDashes；AC06 = 1 arc + 1 seg（默认入口段裁后零长弃段）+ 1 radiusDash；
AC02/03/04 axis = `{x1:0,y1:0,x2:0,y2:0}`（V4.4-03）。

## 5. 四门禁结果

| # | 命令（树根执行） | 原始输出档 | REAL_EXIT |
| --- | --- | --- | --- |
| 1 | `npx tsc --noEmit` | `runs/01-tsc.txt` | 0 |
| 2 | `npm run lint` | `runs/02-lint.txt` | 0 |
| 3 | `npx vitest run --maxWorkers=2` | `runs/03-vitest.txt` | 0（51 files / 596 tests） |
| 4 | `npm run build` | `runs/04-build.txt` | 0 |

判定行（由下列命令读取四档 REAL_EXIT 计算，非手填）：

```bash
fails=0; total=0; for f in docs/evidence/V44-A2/runs/*.txt; do total=$((total+1)); if grep -q '^REAL_EXIT=0$' "$f"; then :; else fails=$((fails+1)); fi; done; pass=$((total-fails)); if [ "$fails" -eq 0 ]; then verdict=PASS; else verdict=FAIL; fi; echo "VERDICT: gates=$total pass=$pass fail=$fails result=$verdict"
```

```text
VERDICT: gates=4 pass=4 fail=0 result=PASS
```

## 6. 结论

- 四案按 §3 实体表逐行实现；守恒断言（|切点−C|=R、四分之一弧 R√2 + 正交、AC06
  跨角 <180°）全部进测试并通过。
- 四门禁 4×0；既有 572 条零改动全绿，新增 24 条全绿。
- 写范围核验：树内 622 个基线跟踪文件与基线 759923f 逐文件 blob 哈希比对，
  `COMPARED=622 DIFFS=0`（本卡 `src/core/arc-figure-a2.ts` 与新增测试/证据路径除外）
  —— 即禁改文件零改动。
- 未发现需登记 `SOURCE-DEVIATION-NOTE` 的源缺陷；无范围外改动。

## 7. 证据说明

- 每档首行为命令全文，末尾为 `REAL_EXIT=<code>`；中间为原始输出（保留 vitest ANSI
  控制序列）。
- 可公开态：原始输出中的隔离树机器绝对路径前缀已仅替换为 `<TREE>`，其余行号与内容
  原样保留；档内路径一律树相对。
