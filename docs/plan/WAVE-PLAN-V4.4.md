# WAVE-PLAN-V4.4 · p06 参数化图形推广（余 10 案全量）

> 触发：v0.4.0 试点上线后用户裁决（2026-11-06）——「推广全部 10 案」。
> 版本：**0.5.0**（功能位）。执行形态：**标准波次**（契约 Lead 预置 + worker-1/worker-2
> 并行实现 + G1 逐批 + G2 完整轮）；试点先例 V4.3 的架构直接复用。
> 基线：v0.4.0（19e72f1）。上游计划：WAVE-PLAN-V4.3（契约 §2、R1 裁线、映射与
> bbox 规则**全文沿用不改**，本计划只写增量）。
> **G0（2026-11-06，plan-code-reviewer）**：有条件通过——阻塞 1（AC09 T 分量 z/r
> 互换，已按最小修复指令勘正 + Important-1..4 随修：b 组无 start 字段措辞、显示长度
> 三处统一（2.4R/2.8R/1.9R/轴线=轮廓 z 范围）、整圆半圆 cross 退化禁用与同 sweep 拼
> 圆、多字符键等号防误读）；条件编号 G0-V44-C1，关账闸门 = G2。sweep 判定式经
> reviewer 全链路复算 pinned 通过（AC01 cross=+16.89→1、AC05 −37.65→0）。

## 0. 范围与不变项

- 推广案：AC02/03/04/06（a 组）+ AC07–AC12（b 组），共 10 案；AC01/AC05 已试点不动。
- 全部 12 案参数化后：p05 缩略图（thumb）与静态 hero/ANNOTATIONS 层**保留不删**
  ——静态 hero 降级为初值解析失败/异常时的兜底帧（近终局不重构；删除登记移交）。
- 坐标/映射/裁线/格式化/前刀架契约（V4.3 §1·§2·§3.1）原样沿用：
  工件半径空间 (z,r)、内框 [4,60]×[3.5,30.5] 等比居中、显示段裁至 r≥0、
  弧=求解实体不裁、fmtv 同 fmtCoord 规则、求解不传 rearToolPost。

## 1. 裁决与显示约定（编号登记）

- **V4.4-01 伴弧约定（AC04）**：solver 只输出第二段弧（S2=C2−R2·u→P2，arc-cases-a.ts:193
  与 test:186-187 冻结）。第一段弧为显示伴弧：S1=C1−R1·u（与 S2 同构对侧），
  守恒 |S1−C1|=R1、|S1−P1|=R1√2、(P1−C1)·u=0。
- **V4.4-02 标签=输入回显**：单字符键直接拼接——`R5`/`Ø36`/`α45°`（V4.3 先例）；
  **多字符键加等号**防误读（`R1=10` 若写作 `R110` 会被读作半径 110）：
  `R1={v}`/`R2={v}`/`dX={v}`/`dZ={v}`/`lead={v}`；绝对 Z 坐标键用 `Z{v}` 前缀
  （AC05 `Z-10` 先例；AC07 dZ 为端面绝对位置 → `Z{dZ}`，AC02/03/06/08 的 dZ 为
  增量/跨度 → `dZ={v}`）。小数同 fmtFigureValue。
- **V4.4-03 无轴线案**：AC02/03（纯相切几何）与 AC04（相对几何）不画轴线（静态稿
  p05 GRAPHICS 同样无轴线，p05.ts:240-251）；AC08/09/10/11 画轴线（有面/圆柱语境）。
- **V4.4-04 显示长度约定**（同 V4.3 AC05 先例登记式冻结，非模型值）：
  ①延伸段一律 **2.4R**（AC06 入口/出口段、AC09 锥面段、AC10/AC11 圆柱段）；
  ②墙/壁起点左探 **2.8R**（AC07 圆柱墙 z_left=dZ−2.8R、AC12 孔壁 z_left=R−2.8R，
  AC05 z_left 先例同款）；③面顶 r_top = 切点半径 + **1.9R**（AC08 r_t+1.9R、
  AC09 d+1.9R、AC12 (boreD/2+R)+1.9R）；④**轴线 = 其余轮廓实体（segs+arcs）的
  z 范围**，无额外延伸（V4.3 AC01 规则原样沿用；标注类点/虚线不计入轴线跨度）。
- **V4.4-05 PARAMETRIC_CASES 翻转时机**：契约提交仍为 ['AC01','AC05']，
  Lead 集成提交一次翻为全 12 案（避免半参数化中间态在主仓可见）。

## 2. 契约增量（Lead 预置，src/core/arc-figure.ts + p05.ts）

```ts
export type ParametricCaseId = ArcCaseId;                 // 全 12 案
export interface FigureView {
  // …V4.3 全字段不变…
  refCircles: readonly { cx: number; cy: number; r: number }[]; // 新增：整圆虚线参照（la-sub）
}
```

- **整圆装配规则**：实线整圆（AC02/03 轮廓）= 2 条半圆 arcs：左极点→右极点、
  右极点→左极点，**两条 sweep 取同值（定 1）**——同旋转向 + 反向弦必拼互补整圆
  （形状正确性与取向选择无关）；⚠️ 180° 弦上 cross 判定式退化恒 0，**整圆半圆的
  sweep 禁用 cross 式**，直接取常量。虚线整圆参照 = refCircles（`<circle>`+dasharray）。
- **sweep 判定式（冻结，仅用于 <180° 工作弧）**：视图坐标
  cross = (x2−x1)(cy−y1) − (y2−y1)(cx−x1)；**sweep = cross > 0 ? 1 : 0**；
  以 AC01=1 / AC05=0 为 pinned 用例（V4.3 已上线行为）。
- **bbox 点集增量**：refCircles 计四极值点 (cx±r, cy) 与 (cx, cy±r)；实线整圆 2 半圆
  弧走 sampleArc(22.5°) 自含极值。标签锚点不计（V4.3 同）。
- p05.ts `arcCaseParametricSVG` 增 refCircles 层（色 var(--la-sub)，dasharray 同
  refDashes），层序置于 refDashes 同级。
- 桩文件：`src/core/arc-figure-a2.ts`（figureAC02/03/04/06，桩=throw 'V4.4 A2 not
  implemented'）、`src/core/arc-figure-b.ts`（figureAC07–12 同式）；dispatcher 注册桩。
  worker 只改各自桩文件与各自测试文件，**零同路径**。

## 3. a 组四案规格（worker-1；公式源 arc-cases-a.ts / test/arc-cases-a.test.ts）

通用：C1=C2 场景 e=unit(C2−C1)；quarter S=C1+R1·rot90ccw(e)（arc-cases-a.ts:154）。
橙点=solver.tangent 映射；圆心灰点=centerDots；标注偏移为视图单位（rotScreen(v)=(−v.y,v.x)）。

| 案 | 输入(默认) | 轮廓（实线） | 参照（虚线/灰点） | 标签（锚法同 V4.3） |
| --- | --- | --- | --- | --- |
| AC02 外切 | R1,R2,dZ (10,15,15) | 整圆1(C1,R1)=2半圆、整圆2(C2,R2)=2半圆；C2=(dZ,√((R1+R2)²−dZ²)) | 点C1,C2；线C1↔C2 | R1={v} at C1v−(R1·s+2.2)·unit(C2v−C1v)；R2={v} at C2v+(R2·s+2.2)·unit(C2v−C1v)；dZ={v} at (mid.x, maxY(C1,C2 圆底)+3) |
| AC03 内切 | R1,R2,dZ (25,10,9) | 整圆1(C1,R1)、整圆2(C2,R2)；C2=(dZ,√((R1−R2)²−dZ²))；圆2恒在圆1内（\|C1C2\|+R2=R1） | 点C1,C2；线C1↔C2 | R1={v} at C1v−(R1·s+2.2)·unit(C2v−C1v)；R2={v} at C2v+(0,2.8)（圆2内，A4 仲裁）；dZ={v} at (mid.x, C1v.y+R1·s+3) |
| AC04 弧线弧 | R1,R2,α (5,3,45) | 弧1 S1→P1（V4.4-01）、线 P1↔P2（L=R1+R2）、弧2 S2→P2（solver） | 整圆(C1,R1)+(C2,R2) 虚线 refCircles；点C1,C2；线C1↔P1、C2↔P2 | R1={v} at mid(C1v,P1v)+2.6·rotScreen(unit(P1v−C1v))；R2={v} 同构于 C2/P2；α{v}° at P1v−2.2·rotScreen(u_view)（V4.3 α 式） |
| AC06 凹弧切入 | R,dX,dZ (10,12,8) | 入口段 S−2.4R·tS→S（裁轴）、弧 S→E、出口段 E→E+2.4R·tE | 点C；线C↔E | R at mid(Ev,Cv)+3·rotScreen(unit(Ev−Cv))；dX={v} at 出口段末端+(0,3)；dZ={v} at (mid(Sv,Ev).x, y_axis+3) |

AC06 公式（arc-cases-a.ts:220-230 冻结）：c=(dZ, dX/2)，cL=|c|，u=unit(c)，
M=c/2，q=√(R²−cL²/4)，C=M+q·rot90ccw(u)，E=c；tS/tE=rot90ccw(S−C)/R、rot90ccw(E−C)/R
（G03 前刀架逆时针，test:339 例）。弧跨度 2·asin(cL/2R)<180°。
默认值入口段起点 r=−2.87<0，裁轴后近零长——裁线规则自然处置（弃段或退化），
测试的裁轴例用非默认参数覆盖。

AC04 各点（test:180-206 冻结算式）：u=(cosα,sinα)，n=rot90ccw(u)，P1=(0,0)，
P2=(R1+R2)·u，C1=R1·n，C2=P2+R2·n，S2=C2−R2·u，S1=C1−R1·u（V4.4-01）。

## 4. b 组六案规格（worker-2；solver 只输出 center/tangent——ArcSolution 无 start 字段，
arc-cases-b.ts:53-67——起点按下列算式自 solver 源码构造；源 arc-cases-b.ts:71-163）

坐标换算：solver x=直径 → r=x/2；z 不变。橙点=tangent 映射。轴线跨度=轮廓实体
z 范围（V4.4-04④）。

| 案 | 输入(默认) | 轮廓（实线） | 参照 | 标签 |
| --- | --- | --- | --- | --- |
| AC07 凸圆弧收尾 | R,dX,dZ (5,30,−30) | 圆柱 (z_left,dX/2)→T1，z_left=dZ−2.8R；弧 T1→T2；端面 T2→(dZ,0)；轴线=轮廓 z 范围 | 点C；线C↔T2 | R at mid(T2v,Cv)+3·rotScreen(unit(T2v−Cv))；Ø{dX} at 圆柱中点上方−3；Z{dZ} at (map(dZ), y_axis+3)（绝对 Z，V4.4-02） |
| AC08 端面切弧 | R,dZ (6,−4) | 端面 (0,0)→(0,r_t+1.9R)；弧 E→T；轴线=(dZ,0)→(0,0) | 点C；线C↔T | R at mid(Tv,Cv)+3·rotScreen(unit(Tv−Cv))；dZ={v} at (map(dZ), y_axis+3) |
| AC09 锥面切弧 | R,α (5,30) | 端面 (0,0)→(0,d+1.9R)；弧 F→T；锥面 T→T+2.4R·u，u=(cosα,sinα)；轴线=(0,0)→(锥面末端 z,0) | 点C；线C↔T | R at mid(Tv,Cv)+3·rotScreen(unit(Tv−Cv))；α{v}° at 锥面段中点−2.2·rotScreen(u_view) |
| AC10 螺纹入口 | R,lead (5,3.5) | 圆柱 (−2.4R,R)→T；弧 E→T；轴线=(−2.4R,0)→(lead,0) | refCircle(C,R) 虚线整圆；点C；线C↔T | R at Cv−(R·s+2.2)·(1,0)；lead={v} at mid(Tv,Ev)+(0,3.5) |
| AC11 球面收尾 | R (10) | 弧 P→T；圆柱 (0,R)→(2.4R,R)；轴线=(−R,0)→(2.4R,0) | refCircle(C,R)；点C；线C↔T | R at mid(Tv,Cv)+3·rotScreen(unit(Tv−Cv)) |
| AC12 内孔过渡 | R,boreD (3,20) | 孔壁 (R−2.8R, boreD/2)→T1；弧 T1→T2；底面 (0,boreD/2+R)→(0,boreD/2+R+1.9R) | 点C；线C↔T2 | R at mid(T2v,Cv)+3·rotScreen(unit(T2v−Cv))；Ø{boreD} at (map((z_left+R)/2), map(boreD/2)+3) |

b 组各点（arc-cases-b.ts 冻结，r=x/2）：
- AC07：C=(dZ+R, dX/2−R)，T1=(dZ+R, dX/2)，T2=(dZ, dX/2−R)（:71-85）。
- AC08：s=sign(dZ)，r_t=√(\|dZ\|(2R−\|dZ\|))，C=(s·R, r_t)，E=(dZ,0)，T=(0,r_t)（:89-104）。
- AC09：d=R(1+sinα)/cosα，C=(R,d)，F=(0,d)，**T=(d·cosα, d·sinα)**
  （:110-125：tangent x=2d·sinα → r=d·sinα，z=d·cosα；G0 复核修正——原稿 z/r 互换）。
- AC10：C=(0,0)，E=(lead, √(R²−lead²))，T=(0,R)（:129-142）。
- AC11：C=(0,0)，P=(−R,0)，T=(0,R)（:146-149）。
- AC12：C=(R, boreD/2+R)，T1=(R, boreD/2)，T2=(0, boreD/2+R)（:153-163）。

守恒（每案测试必断言）：\|切点−C\|=R、\|start−C\|=R；四分之一弧另断言
\|start−切点\|=R√2 与两端半径向量正交；一般弧断言跨角<180°。

## 5. 实现与测试

- worker-1：`src/core/arc-figure-a2.ts` 桩→实（§3 四案）+ `test/arc-figure-a2.test.ts`
  （每案 ≥4 例：金锚式独立代入（mapSpec 复算模式，V4.3 test/arc-figure.test.ts:20-40
  先例）+ 守恒 + 值标签集 + 参数响应改图 + 异常上抛；AC06 加裁轴例）。
- worker-2：`src/core/arc-figure-b.ts` 桩→实（§4 六案）+ `test/arc-figure-b.test.ts`
  （同构每案 ≥4 例；AC08 加 \|dZ\|→2R 半圆边界例；AC10 加 lead→R⁻ 异常）。
- 数值纪律：**计划不载手算金锚表**（V4.3 C-1 教训）——期望值全部由测试内公式独立
  代入复算；证据档 `docs/evidence/V4.4-FIG/` 新增 `tools/anchors-v44.mjs`（机生成抽锚）
  与 `tools/verify-v45.mjs`（沿革 verify-v43.mjs），供 G2 三路互证与 A4 对拍。
- Lead 集成（收获后）：PARAMETRIC_CASES 翻全 12（V4.4-05）；p06 头注 v0.5.0；
  package.json 0.5.0；`test/ui-p06-param.test.ts` AC02 静态回归例**语义翻转为参数化**
  （登记：随 V4.4-05 的计划内断言修订，改 AC02 标签=真值+改输入图变）；ui-p05 p06
  集成 AC02 键集同步；README 测试数与试点句更新为全量。
- 预估 572 → ~612（+40 上下浮动 10，终态以门禁实测为准，README 随终态）。

## 6. 验收

1. worker 批：附录 A 四门禁（lint/tsc/vitest --maxWorkers=2/build）树内全 0 + 新测试
   全绿，证据自含成档（附录 G）。
2. Lead 集成：主仓四门禁 0；A4 对拍（tools/verify-v45.mjs，沿革 verify-v43）：12 案
   ×2 组输入机器断言（标签集=输入真值 + path/整圆集随输入变化）+ 390×844@2x 截图；
   vision-reader 判定：图形随值可见变化 / 标签真值 / 无叠压越界裁切 / p05 缩略零回归
   （缩略图本波不动）；AC03 R2 圆内标签与 AC10 lead 标签为已知仲裁点。两轮内通过。
3. G2 完整轮（reviewer）：diff 全量 + 每组 ≥1 案独立复算（anchors-v44.mjs 三路互证：
   reviewer 脚本 / esbuild 直取实现 / vitest）+ 抽查复跑。
4. 通过后：package.json 0.5.0 → 提交 → tag v0.5.0 → 重部署 hash 验证 → 向用户汇报
   （推广后效果 + 观察项：AC05 比例尺参照弱是否随全量推广升级为固定比例尺，另行裁决）。
