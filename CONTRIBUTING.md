# 贡献指南（一页）

## 门禁 = CI，绿了才算过

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint（0 error 0 warning）
npm test            # vitest（787 项，~17s）
npm run build       # 生产构建
PERF_BUDGET=1 npx vitest run test/perf-budget.test.ts   # 体积预算（build 后）
```

以上即 GitHub Actions `.github/workflows/ci.yml` 的全部内容。CI 日志就是证据，
**不要**把门禁输出以 txt 形式提交进仓库。

## 变更分级

| 档 | 范围 | 要求 |
| --- | --- | --- |
| **L0 常规** | 样式、文案、重构、删死码、工具脚本、文档 | CI 绿即可合并；不写计划、不留证据档 |
| **L1 功能** | 新页面、新图形、新交互 | 先开 issue 写清「做什么 / 验收标准」，PR 过 CI + 一位 reviewer；视觉改动附前后截图 |
| **L2 正确性红线** | `src/data/` 标准表、`src/core/` 计算公式、G 代码方言输出 | 双源取证（两个独立出处）+ `src/data/PROVENANCE.md` 登记 + 例题对拍测试 + 第二人独立复算。**严谨只花在这里** |

## 数值纪律（L1/L2 通用）

- 禁裸值：测试期望值、坐标、常量一律附**算式 + 来源**（标准号 / `docs/车工计算App-调研报告.md`:行 / 手册页）。
- 锚点金值不漂移：重构不许改数值断言；要改数 = L2 走双源。
- 新数据表必须同步 PROVENANCE.md（来源、版本、双源对照）；单源数据须显式披露「单源」。

## 注释与提交

- 注释只写「为什么这么算」和「来源标准号」，不写波次号 / 审查编号 / 裁决史——查历史用 `git blame`。
- 用户可见文案（页面、notes、source 字段）不得出现开发过程编号。
- 提交用 Conventional Commits，标题 ≤ 72 字符：`fix(p04): 口径注补「以机床手册为准」`；细节写 PR 描述。
- 版本：用户可感知的变化 bump patch/minor，并同步 `CHANGELOG.md`（用用户的语言写）。

## 架构速览

`src/core/`（计算内核，纯函数，含 `*-figure.ts` 图形生成）→ `src/data/`（标准表 + PROVENANCE）→
`src/ui/`（组件 + hash 路由 16 页）。`test/` 与 core 一一对应；UI 测试跑真实 DOM（jsdom）。
