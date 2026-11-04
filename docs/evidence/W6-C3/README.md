# W6-C3 证据档 · p02 自定义规格 + p09 进给 vf 实算 + speed core 化

> 卡：W6-C3 ｜ 执行者：worker-1 ｜ 隔离树：`LathCalc-trees_T-W6C3` ｜ 基线 commit：`cd99856`
> 写范围：`src/core/speed.ts`、`src/ui/pages/p02.ts`、`src/ui/pages/p09.ts`、
> `test/speed.test.ts`（追加）、`test/ui-p02.test.ts`（追加）、`test/ui-p09.test.ts`（追加）、
> 本证据目录（新建）。
> 本档自含：命令全文 + 原始输出 + `REAL_EXIT`；只看本目录即可独立复跑。
> 公开态清理：档内路径均为仓内相对路径；不记机器绝对路径。

## 索引

| 档 | 命令 / 内容 | 结果 |
| --- | --- | --- |
| `runs/gate1-tsc.txt` | `npx tsc --noEmit` | `REAL_EXIT=0`（无输出） |
| `runs/gate2-vitest.txt` | `NO_COLOR=1 npx vitest run --maxWorkers=2` | `Test Files 38 passed (38)` / `Tests 338 passed (338)`，`REAL_EXIT=0` |
| `runs/gate3-build.txt` | `NO_COLOR=1 npm run build` | `✓ built in 350ms`，PWA precache 39 entries，`REAL_EXIT=0` |
| `runs/golden-check.txt` | `node -e "…surfaceSpeed / feedRate 独立复算…"` | 金值与派工单逐位一致，`REAL_EXIT=0` |
| `runs/summary.txt` | `node docs/evidence/W6-C3/tools/summarize.mjs` | 判定行由脚本计算，`REAL_EXIT=0` |
| `tools/summarize.mjs` | 三门禁 REAL_EXIT + 测试计数行汇总脚本 | 见 `runs/summary.txt` |

## 交付物

| 路径 | 行数 | 说明 |
| --- | --- | --- |
| `src/core/speed.ts` | 31 | 填 `surfaceSpeed`（Vc = n·π·D/1000）与 `feedRate`（vf = f·n）契约桩；`spindleSpeed` 未动 |
| `src/ui/pages/p02.ts` | 367 | 自定义规格行激活：折叠行点击展开 `d / P` 两格 + 计算；校验后带 `family/spec/d/p` 跳 p03 |
| `src/ui/pages/p09.ts` | 372 | 新增进给 `f` 输入行与 `vf` 卡；反求 Vc 改调 `surfaceSpeed`（删除页内同式实现） |
| `test/speed.test.ts` | 73 | 追加 4 例（surfaceSpeed ×2 / feedRate ×2），原 4 例零改动 |
| `test/ui-p02.test.ts` | 320 | 追加 5 例（激活 / 普通 M 跳转 / 族随页签 / d=0 / P=0），原 9 例零改动 |
| `test/ui-p09.test.ts` | 224 | 追加 6 例（默认无 vf 卡 / f=0.2 / f=0 / 反求走 core / URL f / 键盘写 f），原 7 例零改动 |

测试计数：基线 323 → 338（新增 15 例；`38 files` 与基线一致，未新增测试文件）。

## 金测结果摘要（页面断言 ↔ core 双路径）

### core/speed.ts（DEFERRED #13 收账，WAVE-PLAN-V2 §1）

- `surfaceSpeed({ d: 50, n: 1000 })`：`(1000×π)×50/1000 = 157.07963267948963` → `toFixed(1) = 157.1`；
  `toBeCloseTo(157.079633, 6)` 通过（与 `test/ui-p09.test.ts` 既有反求金值互证）。
- `spindleSpeed` 互逆：`n = 1000×150/(π×50) = 954.929658551372`，回代 `surfaceSpeed` = 150（`toBeCloseTo(150, 9)`）。
- `feedRate(0.2, 955)`：`0.2×955 = 191` → `toFixed(1) = 191.0`（WAVE-PLAN-V2 §4 锚点）。
- `feedRate(0.2, 954.929658551372)`：`190.9859317102744` → `toFixed(0) = 191`（v0.1 金值同源）。

### p09 进给 f / vf（F6 / DEFERRED #11）

- 默认 `Ø50 / Vc=150`：`n = 955 r/min`；`f` 默认为空 → **不渲染** `.rc-p09__vfcard`（诚实不伪造）。
- 输入 `f = 0.2`：vf 卡文本 `vf = f·n = 0.2×955` + `191.0 mm/min`；值来自 core `feedRate(f, n)`。
- `f = 0`：不渲染 vf 卡，主结果仍 `955`。
- 反求 Vc：`D=50 / n=1000` → `surfaceSpeed` = `157.07963267948963` → 显示 `157.1 m/min`（页内同式实现已删除）。
- 传参 `#/p09?d=50&vc=150&f=0.2`：`f` 预填 `0.2`，vf 卡 `191.0`。
- 自绘键盘点击 `f` 行后可写入 `0.2`，vf 卡同步 `191.0`。

### p02 自定义规格（F3 / DEFERRED #10，V2-5 / V2-8）

- 折叠态：`aria-disabled` 已移除；行 `aria-expanded=false`，显示设计稿静态 `P = 2.0`（视觉保真）。
- 展开态：两个数字输入（`customD` / `customP`，mm）+「计算」按钮；仅两格，**无 tpi 输入**（V2-5）。
- 普通 M：`d=30 / P=3.5` → `#/p03?family=metric&d=30&p=3.5&spec=自定义 Ø30×3.5`
  （`spec` 键 UTF-8 百分号编码按 `URLSearchParams` 解码后逐字符一致）；p03 正常渲染该规格名。
- 族随页签：梯形 Tr 页签 `d=40 / P=7` → `family=trapezoid`。
- 非法输入：`d=0` 与 `P=0` 均出现行内提示 `.rc-p02__customerr`（「请输入大于 0 的大径 d 与螺距 P。」），
  `router.current()` 保持 `p02`，hash 不变。

## 双盲复核

`runs/golden-check.txt` 用独立 node 表达式重算（不经 core / 页面代码）：
`surfaceSpeed(50,1000)=157.07963267948963→157.1`、`feedRate(0.2,955)=191→191.0`、
`feedRate(0.2,n)=190.9859317102744→191.0`，与派工单黄金用例一致；页面测试对拍到 core 返回值。

## 链路键登记（WAVE-PLAN-V2 §1；`src/ui/README.md §5.2` 由 Lead 波末合并）

| 链路 | 键 | 含义 | 示例 |
| --- | --- | --- | --- |
| p01 → p09 | `d` `vc` `f` | 工件直径 mm / 线速度 m·min⁻¹ / 每转进给 mm·r⁻¹（`f` 本卡新增，可选） | `#/p09?d=50&vc=150&f=0.2` |
| p02 自定义 → p03 | `family` `spec` `d` `p` | 复用既有四键；自定义 `spec` 形如 `自定义 Ø30×3.5`，`family` 随当前页签 | `#/p03?family=metric&spec=自定义+Ø30×3.5&d=30&p=3.5` |

## 设计与契约说明（小偏差登记）

1. **p09 新增 f 输入行 + 独立 vf 卡**：设计稿 pSpeed 仅在结果卡脚注写静态 `f 0.20 → vf 191`，无独立 f 输入；
   按派工单新增 InputRow（`每转进给 f / mm/r`）与 `.rc-p09__vfcard`（单行 ResultCard，`.la-card.tight`）。
   不把设计稿静态 `0.20` 当默认值，默认 f 为空。
2. **p09 vf 卡承载方式**：选用紧凑 ResultCard 而非第二个 StatBlock，避免两个 38px 大数字争夺主结果层级；
   仍满足「vf 卡」的可定位性（`.rc-p09__vfcard`）与不伪造语义（f 空/0 不渲染）。
3. **p02 折叠态保留 `P = 2.0`**：设计稿静态占位值在折叠态原样保留以维持 390×844 对拍；展开后隐藏该静态值，
   避免与用户输入冲突。展开面板为新增元素（V2-8 允许「两格 d/P + 计算按钮」，不新增页面元素类型）。
   折叠点击由整行 button 承担，`aria-expanded` 同步。
4. **p01 未改**：`p01.ts` 在禁改清单内；`f` 为 p09 可接收的入站链路键，本档登记，待 Lead 波末并入 README §5.2。
5. 页面局部 CSS 仅新增 `.rc-p02__*` / `.rc-p09__*` 类，颜色全部走既有 `--la-*` token；
   未改组件 / tokens / 路由 / store / 其他页面 / `package.json` / 冻结参考件。

## 判定行

`gate1 tsc REAL_EXIT=0 ｜ gate2 vitest REAL_EXIT=0：38 files / 338 tests passed ｜ gate3 build REAL_EXIT=0`
（原文见 `runs/summary.txt`，由 `tools/summarize.mjs` 从三份原始档计算生成）。
**待 Lead G1 复验；本档不自称过审。**
