# W4-C2 证据档 · p02 螺纹选型 / p03 螺纹结果 / p04 G76 参考程序

> 卡：W4-C2 ｜ 执行者：worker-2 ｜ 隔离树：`LathCalc-trees_T-W4C2` ｜ 基线 commit：`47c9ca1`
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT`，只看本目录即可独立复跑。
> 公开态清理：`runs/gate2-vitest.txt` 的 RUN banner 中树绝对路径前缀替换为 `<TREE>`
> （仅前缀，行号、其余输出与 `REAL_EXIT` 原样保留）。
> Lead 裁决（2026-11-03）：既有 `test/ui-router.test.ts` 的「p02–p14 占位」用例按卡拆分；
> 本卡按 B.2 删除 `test/placeholder-w4c2.test.ts`（可删可改），其余 placeholder-c3/c4/c5 未动。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2` | `Test Files 30 passed (30)` / `Tests 226 passed (226)`，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `npm run build` | `49 modules transformed` / `✓ built in 260ms` / precache 26 entries，`REAL_EXIT=0` |
| `runs/measure-390.txt` | 390×844 量测命令（`serve-dist.mjs` 服务 dist + CDP 工具）+ 判定行（由 JSON 经 `tools/summarize-measure.mjs` 生成） | `REAL_EXIT=0`；10/10 目标 `horizontalOverflow=false` |
| `runs/measure-390.json` | 上述命令原始 stdout（逐目标宽度 / 行数 / 代码行 / 异常） | 10 目标；`noHorizontalOverflow=true` |
| `runs/measure-390.stderr.txt` | 上述命令 stderr | 空（0 字节） |
| `runs/serve-dist.log` | dist 静态服务启动输出 | `serving dist at http://127.0.0.1:4173/` |
| `runs/p02-390x844.png` | p02 普通 M 列表截图 | 390×844，列表卡内滚动 |
| `runs/p03-390x844.png` | p03 M30×3.5 结果截图 | 390×844，结果卡 + 公式 + 按钮 |
| `runs/p04-390x844.png` | p04 M30×3.5 程序截图 | 390×844，六格参数 + 两行 G76 + 免责 |
| `tools/measure-w4c2.mjs` | 390×844 自验工具（Chrome headless + CDP，零第三方依赖） | 见 `measure-390.txt` |
| `tools/summarize-measure.mjs` | JSON → 判定行生成器（脚本计算，人工不填） | 见 `measure-390.txt` |
| `tools/serve-dist.mjs` | dist 静态服务（零第三方依赖，量测期间由脚本启动） | `runs/serve-dist.log` |

## 交付物

| 路径 | 行数 | 说明 |
| --- | --- | --- |
| `src/ui/pages/p02.ts` | 270 | 四族页签 + 族内搜索/筛选 + 全量列表 + p03 传参 |
| `src/ui/pages/p03.ts` | 295 | 族路由尺寸/三针卡 + Tr ac + 公式 + 收藏事件 + p04 传参 |
| `src/ui/pages/p04.ts` | 216 | fanucG76 两行输出 + 参数反解 + P 位正名 + 系统页签 + 免责 |
| `test/ui-p02.test.ts` | 210 | 9 例：结构 / 四族 149·41·13·20 / 搜索 / 筛选 / 传参 |
| `test/ui-p03.test.ts` | 214 | 10 例：M30 金测 / 四族路由 / 收藏事件 / 空参数 |
| `test/ui-p04.test.ts` | 217 | 9 例：两行逐字符 / 参数六格 / P1894 / 免责 / 系统页签 / 空参数 / 金测链 |
| `test/placeholder-w4c2.test.ts` | — | **已删除**（Lead 裁决：转红测试随卡拆分） |
| `docs/evidence/W4-C2/tools/measure-w4c2.mjs` | 322 | 390×844 量测工具 |
| `docs/evidence/W4-C2/tools/summarize-measure.mjs` | 37 | 判定行生成器 |
| `docs/evidence/W4-C2/tools/serve-dist.mjs` | 52 | dist 静态服务 |

## 覆盖与结论

### p02 选型

- 四族页签：普通 M / 梯形 Tr / 55° 管 / 美制 UN，路由族键 `metric` / `trapezoid` / `pipe` /
  `unified`；管族数据口径 `pipe55` 只在页面内部映射，URL 仍用 `pipe`（README §5.2）。
- 族内全量列表（数据全部经 `core/lookup.listThreads`）：metric 149 / trapezoid 41 / pipe 13 /
  unified 20 行；行右侧中径预览由 `core/thread.threadDimensions` 实时计算（M30 粗牙 27.727）。
- 族内搜索：规格名或螺距子串；「按螺距筛选」模式只匹配螺距（P=3.5 → M30、M33）。
- 粗牙/细牙 chip 仅 metric 可用（39 / 110 行）；非 metric 族禁用。
- 点击行 → p03，携带 `family/spec/d/p` 四键（M30 → `spec=M30 × 3.5`）。

### p03 结果

- 按 `family` 自动选择牙型角喂 `threadDimensions`（60° / 55° / 30°Tr）；所有尺寸与三针 M
  均来自 `src/core/thread.ts`，UI 不重算常数。
- 基本尺寸卡：d / d₂ / d₁ / H₁ / 底孔；三针卡：d₀ / M；Tr 追加 `ac`，由 core 输出
  `d₁ = d − P − 2ac` 反解（Tr40×7 → 0.50）。
- 「怎么算的」默认展开，公式含代入值与标准号；M30×3.5 断言
  `d₂ = d − 0.6495P = 30 − 2.273 = 27.727`、`d₁ = ... = 26.211`、`M = ... = 30.758`。
- 星标派发跨卡契约 `lathcalc:save`，`detail = {kind:'thread', title, params:{family,spec,d,p}, ts}`。
- 空参数直达 → 提示先选型 + 回 p02，不渲染结果卡。

### p04 G76

- 两行一律来自 `src/core/gcode.fanucG76()`，UI 不拼程序字符串；参数卡六格从该输出反解，
  保证与代码行逐字符一致。
- M30×3.5：`G76 P021060 Q100 R0.05` / `G76 X26.211 Z-30. P1894 Q400 F3.5`；
  P = 牙深 `(30 − 26.21125)/2 = 1.894375 mm → 1894 μm`，页面全文无 `1895`。
- P 位正名（W2-C5 裁决 2）：`P021060 = 02 精车次数 · 10 退尾量（倒角量）· 60 刀尖角`，
  代码卡下方另注牙深来源（非工作牙高 H₁）。
- 免责文案原样使用 `G76_DISCLAIMER`；GSK / KND / 华中页签 disabled + `待补` 灰徽标。
- 空参数直达（`#/p04`）→ 提示先选型 + 回 p02，不输出程序。

### 390×844 量测（10 目标）

- p02 四族：行数 149/41/13/20；列表容器 `scrollWidth=clientWidth=328`，纵向滚动。
- p03 M30×3.5 / Tr40×7 / G1/2；p04 M30×3.5 / G1/2 / 空参数：
  全部 `documentElement.scrollWidth=clientWidth=390`、`horizontalOverflow=false`、
  `documentFitsHeight=true`。
- 汇总由 `tools/summarize-measure.mjs` 从 JSON 计算：`noHorizontalOverflow=true`、
  `allDocumentsFitHeight=true`。

## 已知观察 / 偏差披露

1. **`src/main.ts` 在本卡执行期间由 Lead 树内更新为 router 接线**（文件 mtime 23:23:20；
   本卡未改该文件，`index.html` 亦未改）。最终三门禁与 390 量测均在该更新后重跑：
   `npm run build` 现为 49 modules / 26 precache entries，dist 含 p01–p14 独立 chunk；
   `runs/measure-390.*` 量测对象为 `tools/serve-dist.mjs` 服务的 dist 构建产物
   （`http://127.0.0.1:4173/`），非 dev/harness。
2. **p02 视觉增项**：按派工单「族内列表/搜索」在页签与 chips 之间增加搜索行；
   chips 默认全部未选中以保证族内全量行数验收（设计稿 mock 默认「粗牙」高亮，属于示例态）。
   顶栏标准徽标随族切换（设计稿静态 GB/T 193，mock 值替换为对应标准）。
3. **p02 自定义规格行**：按设计稿保留静态视觉行（`P = 2.0` 为设计稿示例），v0.1 无自定义输入页，
   行标记 `aria-disabled` 且不可点击；不伪装可交互。
4. **p03 公式增项**：设计稿公式仅 d₂/d₁/底孔/依据；本卡补充 d₀ 与三针 M 两行，便于核对
   `threeWireM` 输出（M 值本身来自 core）。Tr 公式含 ac 反解与 H₁。
5. **p04 文案**：免责条使用 `G76_DISCLAIMER`（报告 §7.4 原句），设计稿 p04 的警示句不同，
   按派工单以 core 常量为准；代码卡下方新增 P 位正名与牙深来源说明（派工单要求）。
6. `favicon.ico` 404：`index.html` 未声明 favicon，量测 console 有 1 条 404，无运行时异常
   （`exceptions=[]`）；`index.html` 不在本卡写范围。

## 判定行

`gate1 tsc REAL_EXIT=0` ｜ `gate2 vitest REAL_EXIT=0：30 files / 226 tests passed（本卡新增 28 例；删除占位 1 例）`
｜ `gate3 build REAL_EXIT=0` ｜ `measure REAL_EXIT=0：10/10 目标 scrollWidth=clientWidth=390，
noHorizontalOverflow=true，allDocumentsFitHeight=true；p02 行数 149/41/13/20`。
**待 Lead G1 复验；本档不自称过审。**
