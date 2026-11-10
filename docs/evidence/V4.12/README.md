# V4.12 · 用户反馈三问题修复波（v0.7.3）

> 用户反馈 2026-11-10 三条：① 螺纹还是没有图形展示；② 圆弧切点图形上标注字母
> 重叠，并检查其他图形；③ 数字键盘有的页面有有的没有，统一。标准波次（V4.4/V4.9
> 双树先例）：Lead 计划 → G0 → worker-1 树 A + worker-2 树 B → G1 → Lead 卡 C →
> 收获集成 → Lead 补位（A4 视觉 FAIL 整改）→ G2 → tag v0.7.3 → 重部署。

## 一、三问题根因与修复

### 问题① 螺纹无图形（SW 陈旧缓存，非内容缺陷）

取证：线上 DOM 实测 `svg viewBox="0 0 262 140"`（v0.7.0 起在案，curl no-cache 头
对拍确认站点为新包）；根因 = v0.7.1 已登记的 SW 回访陈旧缓存——`dist/sw.js` 有
skipWaiting/clientsClaim 但页面侧无 controllerchange 监听，旧 SW 控制的设备首开
必见旧 precache、二次访问才更新。修复（卡 C，Lead 直改）：

- `src/ui/sw-update.ts` installUpdateReload：受控页遇新 SW 接管当次 reload 恰一次
  （首装不刷防循环 / done 标志防重复 / 无 SW 环境空操作），依赖全注入，+4 单测；
- `vite.config.ts` define 注入 `__APP_VERSION__`（package.json version）+ 声明
  `src/vite-env.d.ts`（G0-B2）；p01 页脚 / p14 分享长图 `v0.1` 陈旧硬编码 → 动态
  版本（G0 遗漏点）；测试对拍 import package.json 同源。

**诚实边界（已向用户披露）**：已卡旧 SW 的设备（含本反馈用户）v0.7.3 上线后仍需
**二次访问**（旧 bundle 无监听器，物理不可救）；此后更新首开即新。

### 问题② 标签压线/重叠（两层修复：扫查 + 实拍重锚）

**第一层（树 A，worker-1）**：est 模型全量扫查 label-label 重叠 + kit 通用
resolveLabelOverlaps 避让（数组序优先级 / 候选方向×步进 / 钳位先行）+ 12 案×
默认+边界组机检（label-sweep.test.ts）。AC01 原 R5~α45° −0.44u 等 label-label
重叠消除。

**第二层（Lead 补位，A4-R 实拍 FAIL 重锚）**：vision 复判暴露 label-压几何线类
缺陷（est 扫查范围外——只测了 label-label）：AC01 R5 压 45° 切线斜线、AC02 R1/dZ
压小圆弧线、AC03 R2 圆心点叠字、AC04 R2 压过渡弧下凸 + α 压虚线整圆、AC10 R5 压
轴线 + lead 压虚线圆/实弧。逐案几何重锚（全部公式化推导，禁裸值，注释含算式）：

| 案 | 重锚 | 关键净距（默认案 est 实算） |
| --- | --- | --- |
| AC01 | R5 → 弧心正右侧距；α → 切线法向上侧 d=5（角距推导） | R5 盒缘距弧 0.61；α 最近角距线 0.57 |
| AC02 | R1/R2 → 两圆外侧中高侧距；dZ → 底行对齐 C2 正下 | 盒缘距弧恒 0.6；dZ 盒顶距 C1 弧 2.03 |
| AC03 | R1 → 大圆左侧中高；R2 → 圆内门限收紧（DOT_CLEAR=3.36 圆心点净距）默认落 V4.6 圆外右侧+引线支路；dZ → 底行右移出大圆底弧带 | R2 盒距大弧 0.82、距小弧 3.28；dZ √((R1s)²−…) 推移 |
| AC04 | R2 → 圆2 右侧侧距；α → 斜线中点法向下侧 d=5.5 | R2 盒缘距圆 0.6；α 最近角距线 1.07（G2 C-01 勘正：初笔 0.41 误代 5 字半宽） |
| AC10 | R5 → 轴线下 2.86（0.3+2.56 推导）；lead → R 同排左移（净距 1.6） | R5/lead 盒顶距轴 0.3；lead 全盒在虚线圆横界外 |

连带：label-sweep 补 Lead 机检（5 案重锚标签 vs 线/圆/圆心点：圆采样净距 ≥0.3
漆半宽、线段 128 点密采样穿越判定——AC03 引线止于标签左缘等贴线设计与 vision
口径一致不误杀、圆心点 ≥0.9），label-压线缺陷类从此有机检网。既有金样锚同步
更新（arc-figure-a2 AC03 两测、arc-figure-b AC10 一测——旧锚即本轮 FAIL 实现）。

### 问题③ 键盘全站统一（树 B + Lead 补位槽位）

**树 B（worker-2）**：Keypad 组件 13 键（九宫 + ± . 0 ⌫ 底行 4 等宽，± 系负值
字段输入需求）+ createKeypadController（active 行高亮 / signed 字段 ± 启停 /
编辑规则同 p09 口径）接入 p06/p07/p08/p09(重构)/p11/p12/p16 七页；p16 齿数白名单
排除。设计 token 偏离（冻结稿仅 p09 有键盘、底行 3 键）系用户指令背书，登记
DEVIATIONS V4.12-01。+24 测（p09 旧测零改动过）。

**Lead 补位（A4-R FAIL：4 拍键盘在首屏视口外）**：键盘自 .la-body 末尾移至
createPage footer 槽——.la-body 是滚动容器（p09/p16 既有 overflow-y:auto 覆盖，
p06/p07/p08/p11/p12 本轮补齐），footer 槽渲染于滚动区之外，键盘常显（计算器 app
标准形态，7 页统一）；Keypad 根自带侧垫 + 顶分隔线（原侧垫靠 body padding）。
vision 复判 7 拍全 PASS（键盘首屏完整、内容区可滚、无重叠）。

## 二、A4 视觉终验（verify-v412.mjs，CDP 390×844@2x + SW 预清理）

20 拍 = p06 十二案（真 getBBox 两两净距 + viewBox 界内 + 截图）+ 键盘七拍（存在 +
13 键序全等 + sign 态两验）+ p03 回归一拍。终态：**机检 20/20 PASS、WARN=0**（全
部两两净距 ≥2.21；bundle 对拍 index-BxeiV-3d.js）。vision（原生多模态）判读：
首轮 16 PASS/4 FAIL → ac03 像素复核改判 PASS（灰楔系误读）→ 三案重锚重拍终判
**3/3 PASS**。p05 hero 静态标注（冻结手调坐标）明确排除于本波范围。

**观察项登记（非标签类，不计 FAIL，移交下波裁决）**：
1. ac12 工况图卡内孤立短基准线（约 35 CSS px 横线，与轮廓脱离、无标注——SVG
   孤线段，疑孔壁段渲染残留）；
2. ac03 两圆边缘凹角内灰色楔形小块（约 8×10px@2x，线-线贴邻，成因未明）。

## 三、测试与门禁

- 732 → **781**（+49：树 A 16 / 树 B 24 / 卡 C 4 / Lead 补位机检 3+扩至 5 案），
  60 文件全过；
- 四门禁 4×0（runs/tsc|vitest|build|eslint.txt，REAL_EXIT 留证；build 于 bump
  0.7.3 之后跑，V4.7-M2 时序教训）；
- 分卡证据：V4.12-A/（树 A）、V4.12-B/（树 B）、V4.12-C/（卡 C）、V4.12/runs/
  （集成终态四门禁）、V4.12/tools + runs/a4/（A4 工装与 20 拍 + a4-report.json）。

## 四、改动清单（集成终态）

| 域 | 文件 |
| --- | --- |
| SW 即刷 + 版本 | sw-update.ts(新)/vite-env.d.ts(新)/main.ts/vite.config.ts/p01/p14 + 3 测试文件 |
| 键盘统一 | components/Keypad.ts + p06/p07/p08/p09/p11/p12/p16 + 6 测试文件（footer 槽 + overflow 规则 + 根样式） |
| 标签防重叠 | core/arc-figure-kit.ts(resolveLabelOverlaps)/arc-figure.ts(AC01)/arc-figure-a2.ts(AC02/03/04)/arc-figure-b.ts(AC10) + label-sweep/arc-figure×3 测试 |
| 版本 | package.json 0.7.2 → 0.7.3 |

## 五、执行链

> 流程披露（DEVIATIONS V4.12-02）：本波**未落 docs/plan/ 冻结计划件**——G0 审的
> 是 Lead 内联计划草案，波次规格随派工单 + 三分卡证据档存证；收口期 grep 坐实
> 台账初笔计划路径悬空（G2 与 Lead 双方漏检）已勘正，波后不补写计划（禁伪造
> 冻结时点）。

G0 有条件通过（B1 sweep 工装改 vitest / B2 __APP_VERSION__ 声明 / B3 est 口径
预置，均并入派工单）→ 双树返回 G1 全过（A 748/748、B 756/756，四门禁双树 4×0）
→ 卡 C 完成（736/736）→ 收获集成 776/776 → A4 首轮 20 拍（vision 16/4 + 键盘
7 拍过）→ Lead 补位（键盘 footer 槽 + AC02/03 锚）→ A4 二轮（AC02/03 过，新
FAIL ac01/04/10 压线）→ 二次补位（三案重锚 + 机检扩展 5 案 + 金样锚更新）→
四门禁 4×0（781/781）→ A4 终轮 **20/20 PASS WARN=0 + vision 3/3 PASS** → G2
（见 g2-review 归档）→ tag v0.7.3 → 重部署。

## 六、G2 完整轮（plan-code-reviewer，2026-11-10）

**有条件通过 → C-01 注释级整改后关账**（全文归档 `g2-review/README.md` +
整改回执 `g2-review/c01-rectify.txt`）。十项验收全过：四门禁证据 REAL_EXIT=0 +
reviewer 独立复跑 vitest 60 文件 781/781 与 tsc 0（留痕仓外
`q-novel/G2-V4.12-review-runs/`）；A4 20/20 独立读 a4-report.json 复现（gap 最小
2.21 恰为 AC10 R5~lead 对）；数值纪律逐式复算——AC01 0.57/4.73、AC10 1.60、
AC03 3.36/2.072/1.3 全对，唯 AC04 α 注释 `5.5−5.09=0.41` 不可复算（5.09 误代 5
字半宽 4.64，正确 4 字半 3.71 → `5.5−4.43=1.07`），方向保守无功能影响，列 C-01；
Lead 当场两处勘正（a2.ts:318-322 + 本 README §一）+ 门禁终态重捕 4×0/781/781、
包哈希不变（纯注释级零产物影响）。p09 旧测零改动经核机制属实（键序对拍活常量 +
编辑语义逐条一致）；越权检查净（冻结三件全净、worker 双树物理隔离登记在案）。

7 条 Minor 不设条件登记（Keypad 等宽注释失实 / unknown|null 冗余 / p07 嵌套三元 /
register 重复叠加监听 / '-0''-.' 暂态 / AC03 R1 重复口径 / 弦心假圆只严不松）；
reviewer 独立 vision 复判 ac10 报「压线」与四路确定性证据全矛盾，判幻觉不采信
——0.3u 贴线净距视觉判读天然易误报，下波收 vision 反馈先跑机检复判（已入
g2-review 疑点披露）。
