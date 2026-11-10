# G2-V4.12 完整轮审核报告（plan-code-reviewer 归档）

> 2026-11-10 · 审核对象：主仓工作树 V4.12 集成终态（v0.7.3 待提交）· reviewer
> agent_e15e4aa5 · 全文照录（Lead 仅作归档排版，零删改）。
> **裁决：有条件通过 → C-01 注释级整改后关账（Lead 当场整改 + 门禁终态重捕，
> 见本目录 c01-rectify.txt）。**

## 裁决一句话

三卡实现与证据链整体过硬——四门禁、781/60、A4 20/20 独立复现，五案重锚公式四路
证据互证；唯 AC04 α 注释一处算式代入错误（5.09 不可复算）连带 README §一 汇报值
0.41 失真，违反本波自设的数值纪律验收项，列 C-01 一行注释级整改，修后即可合并。

## 验收标准核对（10 项）

| # | 验收项 | 通过情况 | 退出码 |
|---|---|---|---|
| 1 | `npx tsc --noEmit` | 独立复跑通过，留痕 `G2-V4.12-review-runs/tsc.txt` | REAL_EXIT=0（复跑）＝证据档 0 |
| 2 | `npx vitest run --maxWorkers=2` | 独立复跑 60 文件 / 781 测全过，与 README 及 runs/vitest.txt 逐位一致（732+49=A16/B24/C4/Lead5 加和核算正确） | REAL_EXIT=0（复跑） |
| 3 | `npm run build`（bump 0.7.3 之后） | 证据档 0；独立核验：dist/index.html 引 index-BxeiV-3d.js 与 a4-report bundle 对拍一致，p01/p14 分包实含 0.7.3（版本注入产物在位，时序教训未重犯） | 证据 REAL_EXIT=0 |
| 4 | `npx eslint .` | 证据档空输出 + REAL_EXIT=0 | 0 |
| 5 | A4 机检 20/20 PASS、WARN=0 | a4-report.json 实数：20×PASS、warn 0、gap 最小 2.21（恰为 AC10 R5~lead=3.5 对，与 README ≥2.21 一致）；20 拍 PNG 在档（12 工况+7 键盘+1 p03） | 报告内嵌判定 |
| 6 | 数值纪律（重锚注释算式可复算） | AC01 0.707×6.27=4.433→5−4.433=0.57 ✓ 下界 4.73 ✓；AC10 2.86=0.3+2.56 ✓ est 1.60 逐位一致 ✓；DOT_CLEAR=3.36 ✓；AC03 不等式 w/2≥1.298（注 1.3）✓ √(13.5²−13.34²)=2.072 ✓；AC04 5.5−5.09=0.41 不可复算 → C-01 | 见 C-01 |
| 7 | sw-update 生命周期边界 | 代码审+4 测试核：首装不刷（sw-update.ts:43,47）、done 单次（:44-50）、无 SW 空操作（:41）、dispose 摘除；main.ts 挂载于路由前 | vitest 内含 |
| 8 | p09 旧测零改动过 | test/ui-p09.test.ts 未改且全绿；机制属实非侥幸：键序断言对拍活的 KEYPAD_KEYS 常量（:86-89），编辑语义 del/'.'/'0'/maxLen=10 与原 onKeypad 逐条一致，sign 恒置灰（无 signed 字段） | vitest 内含 |
| 9 | 台账一致性 | DEVIATIONS V4.12-01 ✓；DEFERRED #21/#22 与 README §二逐字对应 ✓；TASK-LEDGER V4.12 G2 列占位待回写（合规） | — |
| 10 | 越权检查 | 冻结三件 git status 全净且被跟踪 ✓；worker 树出处登记在案（V4.12-A/B README：LathCalc-trees_V412A/B，基线 f504f3d，无 .git 物理隔离），工作树改动面与派工范围吻合 | — |

## 阻塞项

无。

## Important / 整改条件

**C-01（置信度 95）AC04 α 重锚注释算式代入错误，连带证据 README 汇报值失真**

- 位置：src/core/arc-figure-a2.ts:320；docs/evidence/V4.12/README.md:43
- 依据：注释自述模型 d − 0.707·(w/2+2.56) 且括注「α 盒 4 字宽半 3.71」，代入应得
  0.707×6.27=4.43、净距 5.5−4.43=1.07；实写 5.5−5.09=0.41，5.09 需 w/2=4.64
  （5 字宽，疑从 AC03「R2=10」9.28 宽串行）。README §一 AC04 行 0.41 继承同错。
  方向保守（实际净距按其模型 1.07、按精确角投影约 2.3，均 ≥0.3 漆半宽），机检/A4
  均过，无功能影响；但「重锚公式注释算式可复算」系本波声明验收项。
- 最小修复：a2.ts 改 `= 5.5 − 4.43 = 1.07 ≥ 0.3`；README 0.41→1.07。纯注释级。
- **Lead 整改回执（2026-11-10）**：两处已改（a2.ts:318-322 重写含勘正出处注记、
  README §一 AC04 行）；四门禁终态重捕 4×0、781/781、包哈希不变
  index-BxeiV-3d.js（纯注释级零产物影响，V4.11 剥注释哈希不变结论再证）。

## Minor / 登记（不设条件，7 条）

1. Keypad.ts:15「两行键等宽」注释不成立（span4 键宽 4c+21 vs span3 3c+14，跨行
   差 c+7）；行内等宽为真，A4 已拍过——注释失实非布局缺陷。
2. sw-update.ts:21 `controller: unknown | null` 中 `| null` 冗余（unknown 已含
   null）；建议收窄 `object | null`。
3. p07.ts:174-178 allowed 回调嵌套三元（风格规则禁嵌套三元；eslint 配置未拦）。
4. Keypad createKeypadController.register 同一元素重复 register 会叠加监听；现网
   页面重建即换元素、activate 幂等，无行为缺陷，登记防未来复用踩坑。
5. 键盘 '-0' 后续键入 '-05'、'-'+'.' 暂态 '-.'——数值解析正确/异常上抛保上一帧，
   原 p09 语义同源，登记边缘即可。
6. a2.ts:217-221 AC03 R1 锚内联 `R1=fmt` 两次且 0.6 未用 RIM_CLEAR 常量，重复口径。
7. label-sweep.test.ts:254-259 直径对重建对非直径弧产生「弦心假圆」；方向只严不松
   不会漏报，登记防未来误读。

## 疑点披露（审核侧独立发现，非缺陷）

- reviewer 对 ac10 拍做独立 vision 复判，模型称「R5 压轴线、lead=3.5 穿虚线圆」，
  与四路确定性证据全部矛盾：源码手算（R5 盒顶 17.3 距轴 y=17 为 0.3、lead 盒
  x∈[7.45,22.29] 全在虚线圆左缘 27.95 之左）、est 扫查 1.60 PASS、label-sweep
  128 点机检 PASS（本轮复跑）、A4 真 getBBox outside=0 且 pairs 2.21 恰证新锚位
  在渲染。同一模型在 ac03 拍上还漏看了确实渲染的引线（p05.ts:315 refDashes 有
  输出）。按裁决序「可复现证据 > 审核者判断」判为 vision 幻觉，不采信——佐证
  本波「vision 误判改判」流程（ac03 灰楔先例）的必要性；0.3u（≈1 CSS px）贴线
  净距在视觉判读中天然易误报，下波若再收 vision 反馈宜先跑机检复判。
- 0.3u 贴线注记（AC10 R5 盒顶距轴）系工程制图式刻意贴边，A4 口径
  （interior-crossing）与 vision 口径一致已充分披露（label-sweep.test.ts:194-198、
  228-233 注释 + README §一），披露充分性验收通过。

## 独立复跑留痕（仓外目录，未污染待提交工作树）

- `C:\Users\Administrator\Desktop\ccc\q-novel\G2-V4.12-review-runs\tsc.txt` + tsc.exit（REAL_EXIT=0）
- `C:\Users\Administrator\Desktop\ccc\q-novel\G2-V4.12-review-runs\vitest.txt` + vitest.exit（REAL_EXIT=0，60 文件/781 测；含 [sweep] 判定行 AC01 default minGap=7.44、AC10 1.60、AC04 10.42 等）

## 审核范围

代码 24 文件 diff 全审（src 15 + vite.config/package/.gitignore）+ PageShell/p05
装配层/arc-figure-kit 头部全文；测试 10 文件（sw-update、label-sweep 全文，
arc-figure×3、ui-components、ui-p01/p14/p16 diff，ui-p09 关键区）；证据 47 新文件
抽验（README×4、runs 四档 REAL_EXIT、a4-report、目验 2 拍）；台账三档。共 35 个
主对象文件 — 已审 33 / 跳过 2（ui-p06/p07/p08/p11/p12 五页测试 diff 抽样代替全审：
模式已经 p16+ui-components+全量复跑覆盖；ui-p06-param.test.ts 未改动仅被引用）/
覆盖率 94%。审查规则 review-protocol/rules/ts-js.md 已加载。

**最终裁决：有条件通过（C-01 一处注释级整改后可合并）→ Lead 当场整改关账。**
