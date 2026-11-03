# W5 证据档 · 终局集成与验收（Lead 自研波）

> 范围：favicon 补线、p01 最近使用动态化（DEFERRED #9）、验收基线 A1–A4 落地
> （三门禁 / 30 秒 M30 全链流 / 14 页 390×844 对拍 / SW 离线 + 零外联）。
> 本档由 Lead 产出，判定行均由工具生成或复审确认，不自称过审——G3 以 reviewer 报告为准。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/verify-w5.json` | W5 三段验收（14 页量测+截图 / M30 链流 / SW 离线），工具 `tools/verify-w5.mjs` | `ok_all=true`：14 页零溢出零异常、favicon404=0、m30 链流 **207ms**（预算 30s）、断网重载渲染成功 |
| `runs/verify-w5.stderr.txt` | 同上 stderr | 空（0 字节） |
| `runs/external-scan.txt` | dist 全量外联扫描 | 唯一命中为 workbox `console.warn` 文案中的文档链接 `bit.ly/wb-precache`（非网络请求）；实际外联 **0** |
| `runs/design-shots.json` | 设计稿侧基准截图（画布逐页平移+clip），工具 `tools/design-shots.mjs` | 14 张，标签序 01–14 全对 |
| `runs/p01..p14-390x844.png` | 实现侧 14 页截图（verify-w5 产出，A4 修复后已刷新） | A4 对拍用 |
| `runs/design-p01..p14-390x844.png` | 设计稿侧 14 页基准图 | A4 对拍用 |
| `runs/p07-calc-390x844.png` | p07 默认「计算」tab 补充截图 | A4 三页闭环复审用 |
| `runs/serve-dist.log` | dist 静态服务日志（4173 端口） | serving dist |
| `tools/verify-w5.mjs` | 三段验收工装（Chrome headless + CDP，零第三方依赖） | 见 verify-w5.json |
| `tools/design-shots.mjs` | 设计稿截图工装（world 平移法） | 见 design-shots.json |
| `tools/probe-canvas.mjs` | 画布诊断探针（首跑基准全黑的定位工具） | 见 README §诊断 |
| `tools/shot-one.mjs` | 单页一次性截图（p07-calc） | 已用 |

## 交付物（本波代码提交）

| 提交 | 内容 |
| --- | --- |
| 2215a40 | favicon link 补线（index.html）+ p01 最近使用接 store（DEFERRED #9 落实，+2 用例） |
| 57f823f | A4 修复：p10 选中行负 margin 越出 overflow-x 列表容器致「45 钢」左缘截字 |
| c09b6ae | A4 三告警修复①②：p04 待补徽标归位 + p06 AC01 标签「斜角 α」 |
| e0cca68 | A4 复审修正：p04 待补改页签行下小字注（独立徽标挤爆 390px 页签行） |

## 验收结论（对应 WAVE-PLAN 验收基线）

### A1 三门禁（每提交复跑）
tsc=0 / vitest 323 passed（321+W5 集成 2 例）/ vite build ✓（PWA precache 39 entries）。

### A3 · 30 秒 M30 全链流（实走 DOM 点击，非注入）
`p01 点「螺纹」→ p02 点 M30 × 3.5 行 → p03 断言 d2=27.727/d1=26.211 → 点「生成 G76 程序」→ p04 断言两行
『G76 P021060 Q100 R0.05』『G76 X26.211 Z-30. P1894 Q400 F3.5』（禁 1895）→ 返回点星标 →
收藏/历史 localStorage 1/1 → p01 最近使用动态显示 M30`——全程 **207–269ms**（三轮复测），预算 30s。
金值断言逐字写入工具，双盲：期望值来自 core 金测，非页面回读。

### A4 · 14 页 390×844 对拍（vision-reader 两轮 + 三页闭环 + p04 终验）
- 第一轮：基准图工装缺陷（clip 超出 overflow:hidden 视口不栅格化，14 张全黑）→ 修为
  world 平移法（诊断：`tools/probe-canvas.mjs`；修复：`design-shots.mjs`）。
- 第二轮（有效基准）：**通过 11 / 告警 3 / 失败 0**；p10 截字修复当场确认（「45 钢」完整）。
- 三页闭环复审：p06 斜角 α ✓；p07 计算 tab 内容五维一致（2 处卡片包裹差异 → W5-A4-08 登记）；
  p04 徽标归位但引入页签挤压 → 再修（e0cca68 改小字注）→ 终验单点确认（见下）。
- 差异登记：W5-A4-01..10 十条入 DEVIATIONS.md W5 段；未登记遗留 0。

### 离线验证
SW controller 接管后 `Network.emulateNetworkConditions(offline=true)` + 重载：p01 完整渲染
（textSample 含功能入口文案），异常 0。dist 外联扫描 0（详见索引 external-scan.txt）。

## 诊断留痕（防复踩）

1. **设计稿截图全黑**：无限画布 viewport `overflow:hidden` 无滚动，CDP clip 超视口内容不栅格化。
   修法 = 逐页 `world.style.transform` 平移到视口 (20,20) 再视口内 clip；标签查找须 x+y 双坐标锁定
   （同列邻页同 x）。首跑 14 张同 MD5（2742B 空帧）即此病。
2. **p10 截字**：同特异性后注入覆盖 `.sel` 的 `padding-left`，负 margin 使行框越出
   `overflow-x:hidden` 容器。组件负 margin 外扩样式 + 页面级 padding 覆盖 = 组合雷。
3. **p04 页签挤压**：390px 行宽是硬预算，「四页签+徽标」超宽即叠字；增强元素优先放行下注脚。

## 判定行

`verify-w5 ok_all=true`（三轮：269/219/207ms）｜ 外联 0 ｜ A4 第二轮 11/3/0 + 三页闭环 + p04 终验通过
｜ 三门禁 323 tests 绿 ｜ 差异登记 W5-A4-01..10。**G3 以 reviewer 终局报告为准。**
