# AGENTS.md · 车工算 LathCalc

开源免费、完全离线的中文车工计算器 PWA（Vite + TypeScript + vitest）。

## 团队协议常驻指针（每次波次起 / 上下文压缩后续跑，先执行）

Read `C:\Users\Administrator\.zcode\skills\team-lead\references\TEAM_PROMPT.md` 全文。

项目态纪律（环境 / 门禁 / 误报 / 台账）见
`C:\Users\Administrator\Desktop\ccc\q-novel\CNC Machinist Calculator\team-prompt\PROJECT-APPENDIX.md`，
按派工单「环境条款引用」的节号只读该节。

## 冻结参考件（只读）

- `docs/车工计算App-调研报告.md` — 需求 / 公式 / 验收基线
- `docs/车工计算App-无限画布.html` — 14 页 UI 与设计 token 唯一视觉依据
- `docs/plan/WAVE-PLAN.md` — 冻结波次计划

## 硬约束（与协议一致，此处为提醒）

- worker 禁止直写主仓，产出只落自己的隔离树。
- 冻结参考件缺陷只登记不修复（格式见附录 C）。
- 数值纪律禁裸值：期望值 / 常量必须附算式 + 来源（报告:行 / 标准号）。
- 本仓绝对路径含空格，shell 引用一律加引号。
