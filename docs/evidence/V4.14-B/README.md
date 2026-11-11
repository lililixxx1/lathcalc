# V4.14-B · 性能预算与预载 证据档

- 任务卡：V4.14-B（冻结计划 `docs/plan/WAVE-PLAN-V4.14.md` §1.2；G0 条款 I-01 / I-02 / C-03 已并入）
- 隔离树：`LathCalc-trees_V414B`（基线 commit 7e32b10；树内无 .git 属正常物理隔离）
- 执行日期：2026-11-11
- 写范围实况：`vite.config.ts`、`test/perf-budget.test.ts`（新）、`docs/evidence/V4.14-B/**`；`src/` 零改动；版本号 0.7.4 未动（集成期 Lead 统一 bump）

## 1. 交付物索引

| 文件 | 说明 |
| --- | --- |
| `vite.config.ts` | 新增插件 `v414-module-preload-p01`（closeBundle 扫 `dist/assets/` 的 `/^p01-[\w-]+\.js$/`，`</head>` 前注入 `<link rel="modulepreload" crossorigin href="/assets/<文件名">`；0 匹配 throw fail-fast；幂等：已含同 href 跳过；**排 VitePWA 之前**——G0 I-02） |
| `test/perf-budget.test.ts` | 性能预算回归网：环境闸门 `PERF_BUDGET===1` 才真跑，否则 `describe.skip`（skip=未覆盖）；四断言（总量 / index 主包 / 路由分块数 / modulepreload 注入+在盘），断言消息带实测数值 |
| `tools/verify-preload.mjs` | 纯 Node 工装（无浏览器）：① 注入断言 ② precache revision 对拍（md5/sha256 各试）③ 预算三数值 → 全部落 `runs/verify-preload.json` |
| `runs/` | `tsc.txt` / `vitest.txt` / `build.txt` / `eslint.txt` / `perf-budget.txt` / `build-impl.txt`（实现期基线测量用 build）/ `verify-preload.txt` / `verify-preload.json` |

## 2. 门禁判定行（命令原文 + 脚本捕获 REAL_EXIT，见各档）

| 步 | 命令（树根执行，串行不并行） | 档 | 判定行原文 |
| --- | --- | --- | --- |
| 1 | `npx tsc --noEmit` | `runs/tsc.txt` | `REAL_EXIT=0` |
| 2 | `npx vitest run --maxWorkers=2` | `runs/vitest.txt` | `REAL_EXIT=0`；`Tests 784 passed \| 4 skipped (788)` |
| 3 | `npm run build` | `runs/build.txt` | `REAL_EXIT=0`；precache 43 entries |
| 4 | `npx eslint .` | `runs/eslint.txt` | `REAL_EXIT=0` |
| 5（G0 C-03） | `PERF_BUDGET=1 npx vitest run test/perf-budget.test.ts --maxWorkers=2` | `runs/perf-budget.txt` | `REAL_EXIT=0`；`Tests 4 passed (4)` |
| 6 | `node docs/evidence/V4.14-B/tools/verify-preload.mjs` | `runs/verify-preload.txt` + `runs/verify-preload.json` | `REAL_EXIT=0`；`"pass": true`；`"result": "MATCH(md5)"` |

- 步 2 披露（G0 C-03）：全量序列中 `test/perf-budget.test.ts (4 tests | 4 skipped)`——**skip=未覆盖**，不得视为通过；真覆盖以步 5 为准。
- 证据档可公开态：`vitest.txt` / `perf-budget.txt` 中机器路径前缀已按附录 G「只改前缀」替换为 `<treeRoot>`，命中行内容原样。

## 3. 预算阈值推导表（G0 I-01：重定基线 + 未压缩字节口径）

| 项 | 值 | 算式 / 来源 |
| --- | --- | --- |
| 基线重定命令 | `find dist/assets -name '*.js' -printf '%s\n' \| awk '{s+=$1} END{print s}'` | Git Bash，树根执行，2026-11-11，dist 由本树 `npm run build` 产出（`runs/build-impl.txt`） |
| 实测值 | 270371 B | 上命令输出（37 个 .js 文件未压缩字节总和） |
| 口径 | **未压缩字节** | G0 I-01：V4.14 基线审计 334KB 数字无出处作废，以本树实测为准 |
| `THRESHOLD_B` | **283890 B** | `ceil(270371 × 1.05) = ceil(283889.55) = 283890`（测试常量旁注释同源） |
| index 主包阈值 | 20480 B（=20KB） | 计划 §1.2.2 预注册（实测 12177 B，未触限） |
| 路由分块下限 | ≥16 | 16 页路由懒分块（V4.13 全站 16 页审计口径；实测 16） |

## 4. 预注册预期 vs 实测对拍（派工单预期登记，禁改预期）

| 预期（预注册） | 实测 | 对拍 |
| --- | --- | --- |
| modulepreload 注入成功 | 注入 PASS，`dist/index.html` 含 `href="/assets/p01-DwgPbdlH.js"`，目标在盘 | 一致 |
| 总字节 ≈270KB 量级（来源：主仓基线审计实测 270,371B） | 270371 B（未压缩） | 一致（逐位同） |
| index 主包 ≤20480 B | 12177 B | 一致（余量 8303 B） |
| 路由块 ≥16 | 16 | 一致（恰在下限，无退化） |
| revision MATCH | `MATCH(md5)`：sw revision `b45d30a16c97b8b32d9de6da27322d20` = 注入后 index.html 的 md5 | 一致 |

## 5. verify-preload 关键判定（`runs/verify-preload.json`，脚本计算生成）

- ① 注入断言：`"pass": true`（hasPreloadLink / href 匹配 / p01 文件在盘三者全真）。
- ② revision 对拍：`"result": "MATCH(md5)"`——`dist/sw.js` 中 `{url:"index.html",revision:"b45d30a16c97b8b32d9de6da27322d20"}` 与注入后 `dist/index.html` 的 md5 hex 逐位相同（sha256 另存于 json，仅备查）。此结果同时实证 G0 I-02 插件序生效：注入发生在 generateSW 扫描之前。
- ③ 预算三数值：totalJsBytes=270371 / indexChunkBytes=12177 / routeChunkCount=16（caliber=uncompressed-bytes）。
- p01 chunk 匹配数 = 1（`p01-DwgPbdlH.js`，4502 B），无多匹配，无字典序取首披露项。

## 6. 工装复跑

```bash
npm run build   # 先构建
node docs/evidence/V4.14-B/tools/verify-preload.mjs   # 纯 Node；退出码 0=注入断言通过
```

退出码语义：0=注入断言通过（revision MISMATCH 不改退出码，只在 json 如实标注交裁决）；非 0=注入断言或文件读取失败。
