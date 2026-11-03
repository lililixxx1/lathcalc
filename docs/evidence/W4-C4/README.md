# W4-C4 证据档 · p07 锥度 / p08 公差 / p09 转速 / p10 切削参数

> 卡：W4-C4 ｜ 执行者：worker-2 ｜ 隔离树：`LathCalc-trees_T-W4C4` ｜ 基线 commit：`47c9ca1`
> 写范围：`src/ui/pages/p07.ts` / `p08.ts` / `p09.ts` / `p10.ts`、`test/ui-p07..p10.test.ts`、本证据目录。
> 派工单补正（Lead，2026-11-03）：实现 p07–p10 后删除 `test/placeholder-w4c4.test.ts`（转红占位测试按卡归属）；已删除，其余三个 placeholder 文件未动。
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT`；只看本目录即可独立复跑。
> 公开态清理：`runs/gate2-vitest.txt` 第 3 行 RUN banner 的树路径前缀替换为 `<TREE>`（按附录 G 只改前缀，行号与其余内容原样）。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2` | `Test Files 31 passed (31)` / `Tests 225 passed (225)`，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `npm run build` | `✓ built in 288ms`，50 modules transformed，PWA precache 28 entries，`REAL_EXIT=0` |
| `runs/measure-390.json` | `npm run preview -- --host 127.0.0.1 --port 4173` + `node docs/evidence/W4-C4/tools/measure-390.mjs "http://127.0.0.1:4173/"`（Chrome headless + CDP 强制 390×844） | `REAL_EXIT=0`；p07–p10 `scrollWidth=390=clientWidth`；14 页 `allPagesNoHorizontalOverflow=true` |
| `runs/measure-390.stderr.txt` | 上述命令 stderr | 空（0 字节） |
| `runs/screenshot-pages.json` | `node docs/evidence/W4-C4/tools/screenshot-pages.mjs "http://127.0.0.1:4173/" docs/evidence/W4-C4/runs` | `REAL_EXIT=0`；p01/p07–p10 逐页 390×844 截图 |
| `runs/screenshot-pages.stderr.txt` | 上述命令 stderr | 空（0 字节） |
| `runs/p07-390x844.png` … `p10-390x844.png` | p07–p10 设计稿对拍截图（CDP `Emulation.setDeviceMetricsOverride` 390×844 / DPR=1 / mobile） | 4 张 |
| `runs/p01-390x844.png` | 同一工具顺带截取的 p01 对照图 | 1 张 |
| `runs/summary.txt` | `node docs/evidence/W4-C4/tools/summarize.mjs`（判定行由脚本计算） | `REAL_EXIT=0` |
| `runs/summary.stderr.txt` | 上述命令 stderr | 空（0 字节） |
| `tools/measure-390.mjs` | 390×844 量测工具（自 W4-C1 原样复制，未改） | 见 measure-390.json |
| `tools/screenshot-pages.mjs` | 390×844 逐页截图 + 量测（CDP 强制视口，规避 Chrome CLI 最小窗口宽度） | 见 screenshot-pages.json |
| `tools/summarize.mjs` | 证据汇总脚本（门禁计数 / 溢出判定 / 交付物行数） | 见 summary.txt |

## 交付物

| 路径 | 行数 | 说明 |
| --- | --- | --- |
| `src/ui/pages/p07.ts` | 319 | 锥度三值推 C + 大小端单边差 + 莫氏查表（mode/morse 传参） |
| `src/ui/pages/p08.ts` | 221 | 基本尺寸 + 孔 H/轴 h + IT5–IT12；IT 值经 `itToleranceMM`，偏差经 `toleranceCompose` |
| `src/ui/pages/p09.ts` | 310 | n/Vc 双向换算；Keypad 主输入（可切换写入目标）；Scale/StatBlock |
| `src/ui/pages/p10.ts` | 236 | 14 行示例库列表 + 分组筛选 + 硬质合金/高速钢 + 固定警示 |
| `test/ui-p07.test.ts` | 191 | 8 例（默认 / 三值 / 二值提示 / L=0 / 莫氏 MT4 / MT3 / 视图往返） |
| `test/ui-p08.test.ts` | 159 | 7 例（Ø40 / Ø18 / 分段边界 / IT6·IT8 / 轴 h / URL 传参 / 超范围） |
| `test/ui-p09.test.ts` | 165 | 7 例（默认 955 / 键盘改 Vc / 键盘改 D / 反求 Vc / 模式连续 / D=0 / URL 传参） |
| `test/ui-p10.test.ts` | 133 | 5 例（14 行+警示+source / 默认区间 / 高速钢 / 分组筛选 / 行选中） |
| `test/placeholder-w4c4.test.ts` | 已删除 | 按 Lead 补正删除（本卡实现后转红） |

新增测试 27 例；全量套件 31 files / 225 tests（Lead 基线 199 − 1 占位例 + 27）。

## 金测结果摘要（页面断言 ↔ core 双路径）

### p07 锥度 · 莫氏

- 默认设计稿值 D=32 / d=27 / L=50：`taperCalc` → `taperC=0.1`、`halfAngleDMS=2°51′45″`；页面结果行 `1 : 10` / `2°51′45″` / `(D−d)/2=2.5 mm`。
- 三值推 C（派工单金测）：D=30 / d=28 / L=50 → `C=(30−28)/50=0.04`（core `toBeCloseTo(0.04,12)`）；页面显示 `1 : 25`、`1°8′45″`、单边差 `1`；公式区含 `0.04`。
- 二值输入（清空 L）：输入区出现「锥度需 D、d、L 三值齐全：只给二值数学不可解」提示，结果卡不渲染，页面无 `NaN`。
- L=0：提示「锥长 L 需大于 0」，不假算。
- 莫氏（`findMorse` + `src/data/morse.json`）：MT4 → `1:19.254` + `1°29′15″`；MT3 → `1:19.922` + `1°26′16″`；source 含 `GB/T 1443-2016`。
- `mode=morse&morse=4` 传参生效；计算 ↔ 莫氏对照往返切换。

### p08 公差配合

- Ø40 IT7 H：落 `(30,50]`，`itToleranceMM=25 μm→0.025 mm`；页面 `+0.025` / `0.000` / `0.025`（`toleranceCompose` 同值）。
- Ø18 IT7：落 `(10,18]`（左开右闭，18 为闭端点），`18 μm→0.018`；页面 `+0.018` / `0.000` / `0.018`。
- 分段边界：Ø50 → `(30,50]` `0.025`；Ø50.001 → `(50,80]` `0.030`。
- IT6/IT8（Ø40）：`0.016` / `0.039`；轴 h：`es=0`、`ei=−0.025`，标签切为 `es/ei`。
- 超出表范围（Ø600）：输入区提示，不渲染三联卡，无 `NaN`。

### p09 转速 · 线速度

- Ø50 / Vc=150：`spindleSpeed` → `954.929659 → 955 r/min`（WAVE-PLAN §4 #5）；页面 `955`。
- 自绘键盘改 Vc：150 → 退格 3 次 → 90 → `n=572.957795 → 573`。
- 自绘键盘改 D：D→80（Vc 仍 150）→ `n=596.831 → 597`。
- 反求 Vc：D=50 / n=1000 → `Vc=157.079633 → 157.1 m/min`。
- 模式切换连续值：求转速 → 求线速度时 n 取当前值 `954.93`，反算 Vc = `150.0`。
- URL 传参 d=40 / vc=100 → `n=795.7747 → 796`。
- 键盘 12 键顺序与 `KEYPAD_KEYS` 完全一致；默认高亮输入行为 Vc。

### p10 切削参数（示例库）

- 默认渲染 `materials.json` 全部 **14 行**（测试自指计数：`MATERIALS.length`），每行 description 含 `示例·待复核，以试切为准`；页内固定 `.rc-warn` 含「示例数据 / 以试切为准」。
- 45 钢 / 硬质合金：Vc `120 – 180`、f `0.2 – 0.4`、Ø50 转速 `764 – 1146`（core 两端点 `763.943769/1145.915654`）。
- 45 钢 / 高速钢：Vc `25 – 35`、f `0.1 – 0.3`、转速 `159 – 223`。
- 分组筛选「不锈钢」→ 2 行（304 / 316），结果 `60 – 100` / `0.1 – 0.25` / `382 – 637`；「全部」→ 14 行。
- 点选 40Cr → `100 – 160` / `0.2 – 0.35` / `637 – 1019`，选中态保留。

## 390×844 量测口径与结果

- **量测对象**：最终 `npm run build` 产物经 `vite preview` 提供（`http://127.0.0.1:4173/`），不是源码 dev 挂载。
- **量测口径**：CDP `Emulation.setDeviceMetricsOverride` 强制 `width=390 height=844 dpr=1 mobile=true`；不是 Chrome CLI `--window-size`（实测 CLI 受最小窗口宽度限制，布局约 500px 后被裁切，不能作为 390 证据，已弃用该批截图）。
- p07–p10：`documentElement.scrollWidth=390=clientWidth`、`scrollHeight=844=clientHeight`、`horizontalOverflow=false`。
- 14/14 页 `allPagesNoHorizontalOverflow=true`；`exceptions=0`；唯一 console error 为 `favicon.ico 404`（开发服务器未配置 favicon，与 W4-C1 已知观察一致，不影响页面）。
- 截图：`runs/p07-390x844.png` … `runs/p10-390x844.png`（4 张，均 390 宽）。

## 设计与契约说明（非偏离项 / 待 Lead 知悉）

1. **p07/p08/p09 区块顺序**按设计稿 pTaper/pTol/pSpeed 还原；p07 示意图标签随输入实时更新（D/d/L），结果与 core 实时计算一致。
2. **p08 IT 等级**：设计稿仅画 IT6–IT9 四项，派工单要求 IT5–IT12 → 按派工单取 data 全量 8 级（`Segmented small` 一行可容纳）。
3. **p08「常用配合」chips**：设计稿为静态展示；内置数据只有 IT 表、无基本偏差表，故按设计稿渲染为**静态 chip**（`span.la-chip`，无点击行为），不伪造 g6/k6/p6 偏差计算。
4. **p10 材料选择**：设计稿为 9 个材料 chips；派工单要求「materials.json 14 行列表/筛选」→ 改为分组筛选 chips（全部 + 6 组）+ 14 行列表，行内如实展示 `source` 原文（含 `WAVE-PLAN §3 裁决 3` 内部溯源串）。
5. **p09 未计算 vf**：设计稿 mock 有 `f 0.20 → vf 191`，但设计稿无进给 f 输入、派工单亦未要求；结果卡脚注如实写「vf = f·n（未输入进给 f，暂不计算）」，不伪造 0.2。
6. **p09 反求 Vc**：`src/core/speed.ts` 仅导出正向 `spindleSpeed`；反解 `Vc=n·π·D/1000` 在页面内按同一关系实现，公式区如实标注。
7. **收藏事件**：设计稿 p07–p10 顶栏均无收藏 / 保存交互，按派工单「无此交互则不加」未派发 `lathcalc:save`。
8. **传参**：p09 沿用冻结键 `d`/`vc`；p07 沿用 `mode`/`morse`；p08 在页面头注释登记 `d`/`grade` 供下一版 README 表增补（本版未改 README）。

## 已知观察（上报 Lead）

- **`src/main.ts` 为外部补正，不在本卡写范围**：任务期间该文件被外部同步为 W4-C1 接线版（mtime `2026-11-03 23:23:20`，非本卡改动）；构建由此从骨架期 4 modules / 7 precache entries 变为 50 modules / 28 entries，14 页各自成 chunk。本档最终 390×844 量测已改用最终 dist（`vite preview`）复跑，不再依赖临时 harness。该外部改动的来源与归属请 Lead 在台账确认。
- `p10` 行内 `source` 原文含内部计划串 `WAVE-PLAN §3 裁决 3`；为「如实展示」保留。若用户界面需去掉内部串，需 Lead 裁决展示口径（改 `data/materials.json` 或 UI 截断，均超出本卡写范围）。

## 判定行

`gate1 tsc REAL_EXIT=0` ｜ `gate2 vitest REAL_EXIT=0：31 files / 225 tests passed（本卡新增 27 例）` ｜ `gate3 build REAL_EXIT=0` ｜ `measure-390 REAL_EXIT=0：p07–p10 scrollWidth=390=clientWidth，14/14 页无横向溢出` ｜ `screenshot-pages REAL_EXIT=0：p07–p10 各 1 张 390×844 截图`。**待 Lead G1 复验；本档不自称过审。**
