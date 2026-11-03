# W1-b 证据档 · 工程骨架与契约预置（Lead 自研，直进 G2）

- 日期：2026-11-03 ｜ 执行者：Lead ｜ 基线：bc5e69b 之上
- 结论：三门禁全绿（tsc / vitest 15 tests / vite build 含 SW 预缓存 7 项）

## 交付清单

- 工程：`package.json`（MIT、type:module）、`tsconfig.json`（strict + noUncheckedIndexedAccess + @core/@data 别名）、`vite.config.ts`（vitest maxWorkers=2 + vite-plugin-pwa manifest zh-CN）
- 契约：`src/core/types.ts`（全模块类型 + 常数集指针）、9 个 panic 桩（speed/thread/taper/tolerance/triangle/weight/gcode/arc-cases-a/b）
- Lead 实现：`src/core/arc.ts`（dist/perpendicularFoot/unit/judgeArcDirection/degToDMS）、`src/core/lookup.ts`（6 个查询函数，依赖注入行数据）、`test/fixtures/`（4 夹具）、`test/lookup.test.ts`
- UI 底座：`src/ui/tokens.css`（la- token 1:1 移植）、`index.html`、`src/main.ts`、`public/icon.svg`
- 数据桩：`src/data/*.json`（9 个 schema 合法桩，W3 替换）+ `src/data/COVERAGE.md` + `src/data/provenance/`
- 测试：`test/skeleton.test.ts`（12 桩 PANIC 接线 + degToDMS 黄金断言 2°51′45″ + 判向翻转断言）

## 门禁原始输出

见 `runs/gate1-tsc.txt`（REAL_EXIT=0）、`runs/gate2-vitest.txt`（15 passed，REAL_EXIT=0）、`runs/gate3-build.txt`（built + sw.js 生成，REAL_EXIT=0）。

## 偏离与说明

1. npm install-scripts 默认拦截 esbuild postinstall——已 `npm install-scripts approve esbuild` 并手动跑 install.js（版本 0.28.2 验证通过）。该先例已登记 TASK-LEDGER。
2. `test/lookup.test.ts` 夹具转型用 `as unknown as ITTableRow[]`（JSON 推断 number[] vs 元组），契约类型本身不变。
3. vitest 配置直接写入 vite.config.ts（test 字段），未单列 vitest.config.ts。
