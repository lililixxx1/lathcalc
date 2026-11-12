# V4.15 · 代码可维护性（v0.8.1）

> 用户指令 2026-11-12：「优化一下代码可维护性」。Lead 直改第十案（V4.13/V4.10
> 先例），跳 G1 直入 G2 完整轮（Lead 接管卡分级）。计划
> docs/plan/WAVE-PLAN-V4.15.md（G0 有条件通过三条件闭后冻结 b6e1e5c，裁决记录见
> 计划 §七）。DEVIATIONS V4.15-01（近终局重构豁免=用户指令背书）/ V4.15-02
> （types.ts 契约文件修订披露）。

## 一、审计基线（tools/ + runs/audit-pre.txt）

六探针（计划 §一）：类型逃逸 **0**（首轮 12 命中全为 CSS `overflow-wrap:
anywhere` 假阳性，已披露）；真实债务标记 0（6 命中全为描述性注释）；死导出
**全死 17 / 仅 export 关键字死 54**（audit-dead-exports.cjs 符号级，语料
src+test 全量 .ts，可复跑：`node docs/evidence/V4.15/tools/audit-dead-exports.cjs`）；
p14.ts 692 行引擎/装配混装；页面 scoped CSS 5–42 行无重复；ctx.params 27 处语义
各异不构成抽象理由。§6 非目标七条冻结（Props export 保留 / 测试不拆 /
LATIN_CHAR_W 随 V4.9 Imp-1 / eslint 不动 / CSS 不并 / JSON 不懒载）。

## 二、交付（fa0518f）

| 卡 | 内容 | 量化 |
| --- | --- | --- |
| W1 | 全死 17 符号删：arc.ts `perpendicularFoot`、icons.ts `ICON_NAMES`、types.ts 15 别名（`DegToDMS`+14 个 `*Fn`，W2 契约期预置的实现签名注册表从未被消费；G0 C-03 勘正计数） | 三文件 −47 行净（numstat 0/6+0/2+0/39；行数 59→53、38→36、426→387） |
| W2 | 占位脚手架退役：`renderPlaceholder` + 独占接口 `PlaceholderOptions`（G0 C-01 连带）+ 4 个孤儿 import（Card/Eyebrow/SubText/TopBar）+ 3 行死 CSS（.rc-placeholder*）+ 头注释改已完成时态 | PageShell 129→76 行（numstat +2/−55） |
| W3 | p14 引擎抽取 `src/core/share-image.ts`（对齐 core/*-figure 惯例）：接口 6 + 常量 2 + 纯函数 8 原样搬移；**新增仅 ShareEntry 结构接口**（引擎实读 5 字段 id/kind/title/params/ts，grep 全集）+ buildShareLayout/shareFileName 签名 StoredEntry→ShareEntry；`resolveSharePalette`（读 DOM）留 p14 转私有；`paramsMeta` 留装配层（G0 C-02 钉死）；`__APP_VERSION__` 经 src/vite-env.d.ts 项目级 ambient 在 core 可用（vite define 全模块替换） | p14 692→**400 行**；share-image 319 行 |

## 三、验收（runs/，退出码逐档）

- **五步门禁 5×0**（bump 0.8.1 先于 build）：tsc 0 / vitest **787 passed + 4
  skipped 与 v0.8.0 逐位同（零漂移实证——test 侧唯一改动=ui-p14.test.ts import
  路径 10 符号整块改自 core/share-image，期望值零改动）** / build 0（终包
  index-JWvOMOJ3.js，模块图变动哈希必变=预期内）/ eslint 0 / PERF_BUDGET 4
  passed（阈值 283890B 未压缩口径不变）。
- **verify-stage FAIL=0/30**（V4.14-A/tools 工具复跑，五尺寸含 844×390 横屏 ×
  6 路由；L1 口径版）：纯重构「DOM 输出零变化」主张的几何机检背书。视觉轮免做
  推理：W1–W3 均为删除零引用符号/纯函数原样搬移，渲染与 CSS 路径不动——计划
  §三.2 明示该推理且 G2 有权否决。
- **死导出复扫**（runs/audit-post.txt）：全死 **0** ✓；仅 export 死 54→52。
- **残留 grep**：W1/W2 清单符号 src+test 零命中（退出码 1）。

## 四、对账与披露（G2 关键数值）

**死导出差集精确对账**（pre 71=17+54 → post 52）：
- 消失 23 = W1×17 + W2×2（renderPlaceholder/PlaceholderOptions）+
  resolveSharePalette×1（转私有）+ p14 三接口迁址×3；
- 新增 4 = 三接口迁址（ShareColorKey/ShareTextBlock/ShareRect 新地址
  core/share-image.ts，计划 §三.3 预测内）+ **ShareEntry×1（预测外，本节披露）**。

**ShareEntry 披露**：新晋「仅 export 关键字死」——p14 依赖结构兼容传入
StoredEntry 而不点名 ShareEntry，故其 export 无外部消费方。**保留裁定**：与
core 既有输入接口导出惯例同族（StockFigureInput/SpeedFigureInput/GearCircle
均在同一 52 清单，§6.1 已裁定保留），share-image 输入契约文档价值一致。冻结
计划 §三.3 差集表述未含此条，以本节披露为准（V4.14「冻结计划不动、README
勘正披露」先例）。

**G2 C-V415-01 勘正披露（2026-11-12）**：① §二两量化列原系手算错值，已按
G2 独立复算勘正（numstat 实测，旧值见 2b91a1b diff 留痕）；② 冻结计划 §五
L110 残留「删 16 个」系 C-03 漏勘正处（正确计数 15=
DegToDMS+14*Fn，台账 DEVIATIONS:225 实文已正确），冻结件不动，以本行披露
为准（V4.14 先例）。教训：汇总量化列一律粘贴命令输出，禁手算。

## 五、G2 完整轮（g2-review/）

Lead 接管卡 → 完整轮：全量证据核对 + 关键判定独立复算。待审。

## 六、登记

- DEVIATIONS V4.15-01 / V4.15-02（见台账）。
- 「审而不改」七项非目标入计划 §6 冻结，不开 DEFERRED（裁定=不改非遗留）。
- 真机横屏 overlay 侧留证缺（DEFERRED #23 第三条）不受本波影响，继续开放。
