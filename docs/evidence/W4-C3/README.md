# W4-C3 证据档 · p05 工况图库 + p06 切点计算

> 卡：W4-C3 ｜ 执行者：worker-1 ｜ 隔离树：`LathCalc-trees_T-W4C3` ｜ 基线 commit：`47c9ca1`
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT`，只看本目录即可独立复跑。
> 公开态清理：`runs/gate2-vitest.txt` 的机器绝对路径前缀替换为 `<TREE>`（附录 G），
> 行号、其余输出与 `REAL_EXIT` 原样保留。
> 状态：**待 Lead G1 复验；本档不自称过审。**

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2` | `Test Files 29 passed (29)` / `Tests 213 passed (213)`，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `FORCE_COLOR=0 npm run build` | `✓ built in 120ms`，PWA precache 7 entries，`REAL_EXIT=0` |
| `runs/measure-390.txt` | Chrome headless + CDP 390×844 量测（命令 + 判定行，判定行由 JSON 计算） | `REAL_EXIT=0`；14/14 页无横向溢出；p05/p06 明细见下 |
| `runs/measure-390.json` | 上述命令原始 stdout | 14 页逐页 + p05/p06 明细 + `judgmentLines` |
| `runs/measure-390.stderr.txt` | 上述命令 stderr | 空（0 字节） |
| `runs/p05-390x844.png` | p05 截图 | 390×844，12 卡图库 |
| `runs/p06-390x844.png` | p06 AC01 前刀架截图 | 390×844，结果 / CodeCard / 刀架开关 |
| `runs/p06-rear-390x844.png` | p06 AC01 后刀架截图 | 390×844，G02→G03 对调可见 |
| `runs/p06-picker-390x844.png` | p06 空参数选择器截图 | 390×844，12 工况兜底 |
| `tools/measure-390-c3.mjs` | 390×844 量测工具（Chrome headless + CDP，零第三方依赖） | 见 `measure-390.txt` |
| `tools/harness.html` / `tools/harness.ts` | 量测用最小挂载页（Vite dev server 加载真实 router） | 仅证据工具，非产品入口 |

## 交付物

| 路径 | 行数 | 说明 |
| --- | --- | --- |
| `src/ui/pages/p05.ts` | 180 | 12 工况图库：名称 / 锚点参数 / 设计稿缩略 SVG / → p06?case=ACxx |
| `src/ui/pages/p06.ts` | 393 | 参数表单 / core 求解 / 切点结果 / 判向依据 / CodeCard / 前后刀架 / 空参数选择器 |
| `test/ui-p05.test.ts` | 126 | p05 结构 / 12 卡顺序 / 点击传参 / 返回（5 例） |
| `test/ui-p06.test.ts` | 325 | AC01 金测 / 12 工况 core 对拍 / 判向对调 / 输入即算 / 错误 / 兜底（10 例） |
| `test/placeholder-w4c3.test.ts` | — | **已按 Lead 补正删除**（转红占位文件，B.2） |
| `docs/evidence/W4-C3/tools/measure-390-c3.mjs` | 436 | 量测工具 |
| `docs/evidence/W4-C3/tools/harness.html` | 13 | 量测挂载页 |
| `docs/evidence/W4-C3/tools/harness.ts` | 15 | 量测挂载脚本 |

写范围外文件未改：`src/ui/components/**`、`router.ts`、`README.md`、`tokens.css`、
`src/core/**`、`src/data/**`、p01–p04/p07–p14、既有 `test/**`（含 `ui-router.test.ts`）
均只读；`main.ts` / `index.html` / 配置 / 依赖未动。

## 覆盖与结论

### p05 图库

- 12 工况卡按 **AC01–AC12** 顺序（core `arcCasesA` + `arcCasesB` 串联），名称逐字取 core；
  每卡附锚点约定关键参数行：AC02/AC03/AC06 标 `X0基准`，AC04 标 `L=R1+R2`，其余标 core 输入键。
- 缩略示意图 1:1 取设计稿 p05 的 64×34 SVG path；十六进制色值已替换为
  `currentColor` / `var(--la-accent)`（`test/ui-source.test.ts` 通过）。
- 点击卡 → `ctx.navigate('p06', { case: id })`；空参数 / 非法工况号由 p06 选择器兜底。
- 传参键 `case` 已登记在 `p05.ts` 文件头（README §5.3 要求；同步 README §5.2 需 Lead 批准）。

### p06 计算

- 表单键集逐工况取 core `inputs`；默认值全部来自树内黄金用例（文件头逐条标注
  `test/arc-cases-a.test.ts` / `arc-cases-b.test.ts` 行号），非设计稿 mock。
- **AC01 金测**：切点 `X36 / Z0`、`G02`、`gcodeLine='G02 X36 Z0 R5.0'`；UI 断言与
  `arc-cases-a.test.ts:57` 及 core `solve()` 输出逐字一致（`test/ui-p06.test.ts`）。
- **12 工况全可达**：逐工况导航 p06?case=ACxx，默认参数求解零异常，程序行与
  core `solve()` 逐字一致（12 条断言，见 `test/ui-p06.test.ts`）。
- **前/后刀架**：AC01 `G02→G03`、AC05 `G03→G02` 双向对调断言；判向依据行显示
  「前刀架 T3 · 图面顺/逆时针 → Gxx」或「后刀架 · …（前后刀架对调）」。
  UI 不另判向、不重拼程序行：`direction`/`gcodeLine` 全部来自 core
  （core 内部统一走 `arc.ts judgeArcDirection`）。
- 输入即算：AC01 改 `R3/α30°/台阶Ø20` → `G02 X20 Z0 R3.0`（core 例 2）；
  无效参数以 `WarnCard` 呈现 core 错误，不抛页面异常。
- 空参数 / 非法 `case`：p06 渲染 12 工况选择器，选中后带 `case` 重挂载计算。
- 收藏事件：设计稿 p06 顶栏无收藏 / 保存交互，故未实现、未派发 `lathcalc:save`（按派工单条件）。

### 390×844 布局（脚本判定，非手填）

- 14/14 页 `documentElement.scrollWidth = clientWidth = 390`，无横向滚动。
- p05：网格两列 `174.5px 174.5px`，12 卡 `tileMaxRight=374`（<390），12 个橙色切点。
- p06 AC01：body `scrollHeight=727 = clientHeight=727`，最后子块 bottom=796.9（body
  bottom=824），无裁切；后刀架态与选择器态同样无横向溢出。
- 截图：`p05-390x844.png` / `p06-390x844.png` / `p06-rear-390x844.png` /
  `p06-picker-390x844.png`（390×844，DPR=1，mobile=true）。
- 浏览器 console 仅 1 条 `favicon.ico 404`（同 W4-C1 已知非阻塞；`index.html` 本卡禁改），
  页面异常 `exceptions=[]`。

### 样式契约

- `test/ui-source.test.ts` 通过：`src/ui/**/*.ts` 无十六进制色值、`font-family` 仅
  `var(--la-font*)` / `inherit`、`var(--la-*)` 引用均存在于 `tokens.css`、未重定义 token。
- 页面局部类仅新增 `.rc-p05__*` / `.rc-p06__*`；组件 / router / tokens 未改。

## 设计稿差异登记（待 Lead 裁决）

- `SOURCE-DEVIATION-NOTE W4-C3-01: docs/车工计算App-无限画布.html:1252 源=顶栏「圆弧—直线相切」 本侧=「直线—圆弧相切」（core 工况名） 理由=有意偏离（工况名唯一来源为 core，p05 图库同名） 裁决=待 Lead`
- `SOURCE-DEVIATION-NOTE W4-C3-02: docs/车工计算App-无限画布.html:1276 源=「怎么算的」展开态 本侧=默认收起 理由=有意偏离（结果区新增 R/判向依据/CodeCard 后，展开态超出 390×844；保持不整页滚动） 裁决=待 Lead`
- `SOURCE-DEVIATION-NOTE W4-C3-03: docs/车工计算App-无限画布.html:1255-1264 源=AC01 带「R5 / 台阶面 / 45°」标注的大图 本侧=12 工况共用的无标注放大示意图 理由=有意偏离（12 工况需通用图；mock 标注值不参与实时计算） 裁决=待 Lead`
- `SOURCE-DEVIATION-NOTE W4-C3-04: docs/车工计算App-无限画布.html:1233-1244 源=p05 卡片仅工况名 本侧=卡片追加锚点参数行 理由=有意偏离（派工单要求每卡标注锚点约定关键参数） 裁决=待 Lead`

## 已知限制 / 上报项

1. **arc-cases-b 未实现 rearToolPost**：`arc-cases-b.ts` 的 `makeSolution()` 只调
   `judgeArcDirection(center,start,tangent)`，`rearToolPost=1` 被忽略。p06 对 AC07–AC12
   选择后刀架时结果区显式显示「后刀架 · 当前工况暂未支持翻转（仍 Gxx）」，不伪造对调；
   `test/ui-p06.test.ts` 有对应回归断言。AC01–AC06 翻转正常。
   选项：A) Lead 在 core 修复 b 组后刀架（本卡自动生效，需同步改该回归断言）；
   B) v0.1 接受限制，UI 保留提示；C) 对 AC07–AC12 禁用后刀架开关。
2. **生产构建未包含页面**：树内 `src/main.ts` 仍是 W4-C1 骨架 stub（仅导入 tokens、
   渲染「骨架构建中」），未 import router；`npm run build` 产物只有 index chunk。
   本卡 `main.ts` 不在写范围，390×844 量测用 `tools/harness.*` 经 Vite dev server
   挂载真实 router。若验收要求 `dist/` 可打开 p05/p06，需 Lead 在 `main.ts` 接线。
3. **p05→p06 传参键 `case`** 已在 p05.ts 文件头登记；同步 `src/ui/README.md` §5.2
   需 Lead 批准（README 本卡禁改）。

## 判定行

`gate1 tsc REAL_EXIT=0` ｜ `gate2 vitest REAL_EXIT=0：29 files / 213 tests passed（本卡新增 15 例；199 基线 − 1 w4c3 占位）` ｜ `gate3 build REAL_EXIT=0` ｜ `measure-390 REAL_EXIT=0：14/14 页无横向溢出，p05 tileMaxRight=374，p06 body 727/727`。**待 Lead G1 复验。**
