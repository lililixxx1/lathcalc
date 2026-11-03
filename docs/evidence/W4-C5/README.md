# W4-C5 证据档 · p11 重量 / p12 三角 / p13 速查 / p14 收藏·历史·分享长图 + ui/store.ts

> 卡：W4-C5 ｜ 执行者：worker-1 ｜ 隔离树：`LathCalc-trees_T-W4C5` ｜ 基线 commit：`47c9ca1`
> 写范围：`src/ui/pages/p11.ts`、`p12.ts`、`p13.ts`、`p14.ts`、`src/ui/store.ts`、
> `test/ui-p1[1234].test.ts`、`test/ui-store.test.ts`、`docs/evidence/W4-C5/`。
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT`；只看本目录即可独立复跑。
> 公开态清理：`runs/gate2-vitest.txt` 的 banner 树路径前缀已替换为 `<TREE>`，
> 行号、其余输出与 `REAL_EXIT` 原样保留（附录 G）。
>
> **树内 Lead 侧变更（非本卡改动）**：`src/main.ts` 已由 Lead 接通 hash 路由；
> `test/ui-router.test.ts` 的 p02–p14 占位用例已移除并拆成 `placeholder-w4c2/c3/c4.test.ts`
> （保留）。本卡按补正删除自己的 `test/placeholder-w4c5.test.ts`。

## 索引（runs/）

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2` | `Test Files 32 passed (32)` / `Tests 252 passed (252)`，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `npm run build` | `✓ built`，PWA precache 25 entries（含 p11–p14 独立 chunk），`REAL_EXIT=0` |
| `runs/measure-390.txt` | 生产 preview + `tools/measure-c5-390.mjs` + `tools/summarize-c5.mjs` | `REAL_EXIT=0`；`ALL_PAGES_NO_HORIZONTAL_OVERFLOW=true` |
| `runs/measure-390.json` | 上述量测工具原始 stdout | p11–p14 逐页视口 / 文档宽 / body 宽高 / 区块计数 / 分享图长度 |
| `runs/measure-390.summary.txt` | 汇总脚本输出（判定行由脚本计算） | 见下「判定行」 |
| `runs/measure-390.stderr.txt` | 上述命令 stderr | 0 字节 |
| `runs/measure-14pages.txt` | W4-C1 既有工具 14 页交叉复核（命令 + 退出码 + 汇总） | `REAL_EXIT=0`；14 页 `horizontalOverflow=false` |
| `runs/measure-14pages.json` | 上述交叉复核原始 stdout | `allPagesNoHorizontalOverflow=true` |
| `runs/measure-14pages.stderr.txt` | 上述命令 stderr | 0 字节 |
| `runs/p11-390x844.png` … `p14-390x844.png` | 四页 390×844 截图 | 逐区块可见；无横向滚动 |
| `runs/p14-detail-390x844.png` | p14 条目详情展开截图 | 参数 3 项、记录时间、分享/星标/删除动作 |
| `runs/p14-share-390x844.png` | p14 分享长图预览 + 下载入口截图 | 真实 canvas 生成 |
| `runs/p14-share-image.png` | canvas dataURL 落盘的分享长图本体 | 600×760 PNG，dataURL 长度 68170 |
| `tools/measure-c5-390.mjs` | 390×844 量测工具（Chrome headless + CDP，零第三方依赖） | 见 measure-390.txt |
| `tools/summarize-c5.mjs` | 量测 JSON → 判定行汇总脚本 | 见 measure-390.summary.txt |

## 交付物

| 路径 | 行数 | 说明 |
| --- | --- | --- |
| `src/ui/store.ts` | 312 | 收藏/历史 localStorage + `lathcalc:save` 监听 |
| `src/ui/pages/p11.ts` | 300 | 重量：圆钢/六方/钢管/平板 × 13 密度 |
| `src/ui/pages/p12.ts` | 202 | 三角：SSS-only（余弦定理 + 海伦） |
| `src/ui/pages/p13.ts` | 135 | 速查：gcode-ref 10 行 + 复制 + 分类空态 |
| `src/ui/pages/p14.ts` | 690 | 收藏/历史列表 + 详情 + canvas 2D 分享长图 |
| `test/ui-store.test.ts` | 198 | store：15 例 |
| `test/ui-p11.test.ts` | 184 | p11：10 例 |
| `test/ui-p12.test.ts` | 158 | p12：8 例 |
| `test/ui-p13.test.ts` | 117 | p13：6 例 |
| `test/ui-p14.test.ts` | 334 | p14：15 例（含 canvas 桩） |
| `docs/evidence/W4-C5/tools/measure-c5-390.mjs` | 384 | 390×844 量测工具 |
| `docs/evidence/W4-C5/tools/summarize-c5.mjs` | 58 | 判定行汇总脚本 |

新增测试合计 **54 例**（15 + 10 + 8 + 6 + 15）；全量套件 **252 例 / 32 文件**，
等于基线 199 − 本卡占位 1 + 新增 54（与 Lead 补正口径一致）。

## 判定行（由 `tools/summarize-c5.mjs` 从 JSON 计算）

```text
ALL_PAGES_NO_HORIZONTAL_OVERFLOW=true
p11 docScrollWidth=390 docClientWidth=390 pageHOverflow=false bodyHOverflow=false bodyVOverflow=false
p12 docScrollWidth=390 docClientWidth=390 pageHOverflow=false bodyHOverflow=false bodyVOverflow=false
p13 docScrollWidth=390 docClientWidth=390 pageHOverflow=false bodyHOverflow=false bodyVOverflow=false
p14 docScrollWidth=390 docClientWidth=390 pageHOverflow=false bodyHOverflow=false bodyVOverflow=false
P14_DETAIL_PARAMS=3 DETAIL_BODY_H_OVERFLOW=false DETAIL_BODY_V_OVERFLOW=false
SHARE_DATA_URL_LENGTH=68170
SHARE_DOWNLOAD_NAME=lathcalc-thread-demo-1.png
SHARE_PROBE={"click":"clicked","hasImage":true,"message":null,"itemCount":3,"storedFavoritesCount":3}
EXCEPTIONS=0
CONSOLE_ERRORS=1
CONSOLE_ERROR=http://localhost:4175/favicon.ico :: Failed to load resource: the server responded with a status of 404 (Not Found)
```

`favicon.ico` 404 为工程既有问题（`index.html` 未声明 favicon），与页面代码无关；
其余异常 0。

## 逐项验收对照

### 1. 三门禁（REAL_EXIT）

- `npx tsc --noEmit` → `REAL_EXIT=0`。
- `npx vitest run --maxWorkers=2` → `REAL_EXIT=0`，252/252。
- `npm run build` → `REAL_EXIT=0`，产出包含 `p11-*.js` / `p12-*.js` / `p13-*.js` / `p14-*.js` 独立 chunk。

### 2. 金测

- 密度锚点过 UI：`findDensity(densities,'carbon-steel').density === 7.85`、
  `findDensity(densities,'aluminum').density === 2.7`；UI 圆钢 Ø50×100 显示 **1.54 kg**，
  切铝后 **0.53 kg**，均与 `barWeight` 实时结果 `toFixed(2)` 逐位相等（`test/ui-p11.test.ts`）。
- 四形状：六方 S20×100 → 0.27 kg；钢管 D60/t5/L100 → 0.68 kg；
  平板 W100/T10/L200 铝 → 0.54 kg（与 core 重算逐位相等）。
- SSS：30/40/50 → ∠A 36.87°、∠B 53.13°、∠C 90.00°、`right=true`；
  3/4/5 同样直角判定，UI 显示与 `solveTriangle` 输出逐位相等；13/14/15 → 非直角
  53.13° / 59.49° / 67.38°（`test/ui-p12.test.ts`）。
- p13：10 行逐行断言 code 与 desc；G76 注记逐字可见
  `螺纹切削复合循环（两行式模板，仅 FANUC；GSK/KND/华中待补）`（`test/ui-p13.test.ts`）。

### 3. store

- 写入 / 列表 / 删除 / 清空：15 例覆盖 favorites 与 history 两列表。
- localStorage 往返：直接断言 `lathcalc.favorites` / `lathcalc.history` 原始 JSON。
- 事件路径：`document.dispatchEvent(new CustomEvent('lathcalc:save',{detail}))`
  → 写历史、保留 kind/title/params/ts、同签名去重置顶、非法 detail 忽略。
- p14 端到端：历史页 dispatch 后条目即时出现。

### 4. 390×844

- 生产 preview（`npm run build` + `vite preview`）× Chrome headless 390×844：
  p11–p14 文档宽 390/390，`.la-page` / `.la-body` 均无横向溢出；body 纵向也无溢出。
- 14 页交叉复核（W4-C1 既有工具，未改）：`allPagesNoHorizontalOverflow=true`。
- 分享长图真机 canvas：`dataURL` 长度 68170，`<a download="lathcalc-thread-demo-1.png">` 就位；
  `p14-share-image.png` 为 dataURL 落盘本体。

### 5. 字面量断言

- 新增 54 例全部断言到文本 / 计数 / 属性 / 回调载荷 / 数值；
  无 `expect(true)`、`toBeTruthy()` 类恒真断言（`grep` 自查为空）。
- 数值期望由 core 函数或算式生成；固定常量附注释来源（W2 冻结用例 / 设计稿行号）。

## store API 摘要

```ts
interface StoredEntry { id: string; kind: string; title: string; params: Record<string,string|number>; ts: number }

listFavorites(): StoredEntry[]          listHistory(): StoredEntry[]
addFavorite(input): StoredEntry|null    addHistory(input): StoredEntry|null
removeFavorite(id): boolean             removeHistory(id): boolean
clearFavorites(): void                  clearHistory(): void
isFavorited(entry): boolean             toggleFavorite(input): {favorite, entry}|null
recordSave(detail): StoredEntry|null    installSaveListener(target?): () => void
```

- key：`lathcalc.favorites` / `lathcalc.history`（前缀 `lathcalc.`）。
- `lathcalc:save` detail 冻结为 `{kind,title,params,ts}`；**事件路径写历史**
  （detail 无收藏标志位，收藏由显式 API / p14 星标完成；见「偏离与未决」）。
- 监听器为应用级单例：store 模块首次在含 DOM 环境加载时自动安装，p14 再调用为幂等。
- 去重签名 = `kind + title + params`（params 键排序）；历史上限 50、收藏上限 100。

## 设计稿区块对照

| 页 | 设计稿区块 | 实现 |
| --- | --- | --- |
| p11 | 形状分段 / 2 列输入 / 密度 chips / 单件重量大数字卡 /「怎么算的」 | 一致；密度 chips 从设计稿示例 4 项扩展为 `densities.json` 全 13 行 |
| p12 | 示意图卡 / a·b·c 三列 / 三角结果卡 / 直角 chips /「怎么算的」 | 一致；SSS-only，无 SAS/ASA/SSA 入口 |
| p13 | 5 项分类分段 / 10 行 G 代码列表 / 底部说明 | 一致；非 G 分类显示诚实空态（v0.1 无数据） |
| p14 | 收藏 N/历史分段 / 条目卡（标题+参数+时间+分享/星标）/ ghost 生成长图 / 说明 | 一致；新增详情卡、空态文案、长图预览+下载（派工单要求） |

## 复跑配方

```bash
cd <TREE>
npx tsc --noEmit
FORCE_COLOR=0 CI=1 npx vitest run --maxWorkers=2
npm run build
npx vite preview --port 4175 --strictPort &   # 另开终端保持
CHROME="<chrome>" node docs/evidence/W4-C5/tools/measure-c5-390.mjs "http://localhost:4175/" "docs/evidence/W4-C5/runs"
node docs/evidence/W4-C5/tools/summarize-c5.mjs docs/evidence/W4-C5/runs/measure-390.json
CHROME="<chrome>" node docs/evidence/W4-C1/tools/measure-390.mjs "http://localhost:4175/"
```

## 偏离与未决（供 Lead 裁决，不自行放行）

1. **事件写历史、收藏显式化**：冻结 detail 只有 `kind/title/params/ts`，无收藏标志位；
   若事件既写历史又写收藏，则每次计算都会进收藏夹，语义不成立。本卡取「事件写历史；
   收藏走 `addFavorite`/`toggleFavorite`（p14 星标）」。若 Lead 期望事件可收藏，需要
   追加 detail 键或约定 `kind` 取值（改跨卡契约，本卡不擅改）。
2. **监听器加载时机**：store 是应用级单例，但只有模块被加载后才监听。当前仅 p14 静态
   import store；若用户在从未访问 p14 的情况下直接从 p03 等页 dispatch，事件不会被记录。
   W5 集成若要求「全程可记录」，需在 `src/main.ts` 或各卡 import store（主入口/他人页面
   不在本卡写范围）。
3. **p12 输入形态**：设计稿三列参数是只读展示块；本卡将其实现为同视觉的三列输入
   （`.rc-p12__param` 局部类），否则 SSS 无可输入入口。未新增 Segmented 页签。
4. **p11 密度项数量**：设计稿示例 4 项；派工单要求接 `densities.json`（13 行），
   故页面展示 13 个 chips（换行，390 宽无横向滚动）。
5. **p13 非 G 分类**：设计稿 5 个页签但只给 G 代码内容；v0.1 无钻头/硬度数据，
   切换后显示「暂无数据 · 内容持续补充」，不伪造数据。
6. **p14 分享预览/下载/详情为派工单要求**：设计稿只有 ghost 按钮；预览、下载链接、
   条目详情卡属本卡新增交互，默认态（未点分享/未点条目）与设计稿一致。
7. **p03 结果页收藏星标归属（待 W5/G2 核对）**：设计稿
   `docs/车工计算App-无限画布.html:1186` 的 p03 顶栏带 star（收藏）动作，
   p03 属 W4-C2 写范围；本卡未改任何他人页面。请 Lead 在 W5 集成时核对 C2 是否已把
   star 接到 `lathcalc:save` / `addFavorite`；若未覆盖，由 W5 统一接线。

## 证据档自检

- [x] `README.md` + `runs/` 齐套（B.2）。
- [x] 命令全文 + 原始输出 + `REAL_EXIT` 同档。
- [x] 判定行由 `summarize-c5.mjs` 计算生成，未手算填表。
- [x] 无 `C:/Users/...` 机器用户路径；仅 `gate2-vitest.txt` banner 前缀替换为 `<TREE>`。
- [x] 截图 / 长图 / JSON / stderr 全部随档。
