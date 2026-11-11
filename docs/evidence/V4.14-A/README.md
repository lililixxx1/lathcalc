# V4.14-A · 宽窗舞台列（冻结计划 §1.1）证据档

基线 commit 7e32b10（主仓）· 隔离树 LathCalc-trees_V414A · 版本 0.7.4 未动（集成期 Lead 统一 bump 0.8.0）。

## 索引

| 文件 | 内容 |
| --- | --- |
| `tools/verify-stage.mjs` | 几何断言工装（改自 V4.14/baseline/tools/baseline-audit.mjs CDP 骨架；性能量测段整体移除——量测独占窗口归 Lead 集成期） |
| `runs/tsc.txt` / `runs/vitest.txt` / `runs/build.txt` / `runs/eslint.txt` | 四门禁原始输出 + REAL_EXIT |
| `runs/preview.txt` | vite preview 服务日志（4183 端口） |
| `runs/verify-run.txt` | 机检逐行输出（25 格判定 + 断言明细） |
| `runs/verify-stage.json` | 机检落盘（脚本计算生成，含逐格断言数组） |
| `runs/stage-p01-{768,1280,1920,844x390}.png` | ≥560 四档首页截图留证 |
| `runs/stage-p09-{768,1280,1920,844x390}.png` | ≥560 四档键盘页截图留证（验收风险项） |

改动源文件：`src/ui/components/base.ts`（BASE_CSS 末尾追加舞台列 @media 块）、`src/ui/pages/p01.ts`（HOME_CSS 末尾追加 scoped 网格规则）、`test/ui-stage.test.ts`（新建三断言）。

## 结论

- 四门禁 **4×0**：tsc / vitest(787=784 既有+3 新增，全绿) / build / eslint，REAL_EXIT 均为 0。
- 机检 **24/25 PASS，FAIL=1**：唯一失败格 `844x390 p01 tileCols==2`（预期 3），根因已量化取证，**命中派工单上报条件 ③，待主会话裁决**（见下「唯一 FAIL」节）。该格按原始口径落盘，未改断言、未粉饰。
- <560（390 档）与基线逐位对拍**零漂移**（tileW/inputW 全部差 0px）。
- ≥560 三档（768/1280/1920）pageW=540、#app 总宽 542（content-box：540+border 2）、居中 appLeft 与 (winW−542)/2 逐位相等、tileCols=3。
- bundle 对拍：页面实跑 `script[src]` = `index-BAVOYmx7.js` == `dist/assets` 实际文件名，25 次导航全部一致（SW 预清理已保留，V4.10 教训）。

## 判定行（脚本计算生成，runs/verify-run.txt 原文摘录）

```
FAIL=1 / 25
PASS  390x844  p01  ... tileCols=2 ...（tileW≈基线175±1 ok）
PASS  390x844  p02/p06/p09/p12（inputW≈基线 358/—/358/82 ±1 全 ok）
PASS  768x1024  全 5 路由（pageW=540 appLeft=113 tileCols p01=3）
PASS  1280x800  全 5 路由（pageW=540 appLeft=369 tileCols p01=3）
PASS  1920x1080 全 5 路由（pageW=540 appLeft=689）
FAIL  844x390  p01  pageW=540 appW=542 appLeft=151 tileW=242 tileCols=2  ← 唯一 FAIL
PASS  844x390  p02/p06/p09/p12（pageW=540 appLeft=151）
```

完整逐格断言数组见 `runs/verify-stage.json`。

## 列数算式复述（G0 C-01 双路径）

- **3 列（≥560，无内滚动条前提）**：540 列内容宽 = 540 − `.la-body` padding 16×2（PageShell.ts:23）= 508px；3 列需 (508 − gap 9×2)/3 = 163.33 → `minmax` 下限取 163。auto-fill 计数 floor((508+9)/(163+9)) = floor(517/172) = 3。实测 768/1280 档 tileW=163（(508−18)/3=163.33）✓。
- **2 列（390 视口）**：内容宽 = 390 − 32 = 358px；floor((358+9)/(163+9)) = floor(367/172) = 2 列；实宽 (358−9)/2 = 174.5 ≈ 基线 175（零回归）✓。
- **844×390 例外（FAIL 格）**：内容宽 508 不成立——p01 `.la-body` 滚动 opt-in（V4.13，基线已验收行为）在 390 高横窗溢出（scrollH 638 > clientH 155），桌面仿真（mobile=false）经典滚动条占 15px（实测 offsetW 540 / clientW 525），grid 实宽 = 525 − 32 = 493px；floor((493+9)/(163+9)) = floor(502/172) = **2 列**（tileW=242）。163 算式前提（内容宽 508）在该「宽而矮」档不成立。

## 与 baseline.json 对拍表（390 档，±1px 口径）

| 尺寸×路由 | 指标 | 基线值 | 本轮实测 | 差 |
| --- | --- | --- | --- | --- |
| 390x844 p01 | tileW | 175 | 175 | 0 |
| 390x844 p02 | inputW | 358 | 358 | 0 |
| 390x844 p09 | inputW | 358 | 358 | 0 |
| 390x844 p12 | inputW | 82 | 82 | 0 |
| 390x844 p06 | — | 无匹配 | 无匹配 | — |

≥560 居中对拍（542 = 540 内容 + border-inline 1px×2，content-box）：

| winW | 期望 appLeft (winW−542)/2 | 实测 | 差 |
| --- | --- | --- | --- |
| 768 | 113 | 113 | 0 |
| 1280 | 369 | 369 | 0 |
| 1920 | 689 | 689 | 0 |
| 844（横屏） | 151 | 151 | 0 |

## 唯一 FAIL · 根因与待裁选项（上报条件 ③，只登记不修复）

- **事实**：`844x390 p01 tileCols==2`（预期 3）。取证（一次性 CDP 探针，未入仓）：`.la-body` offsetW 540 / clientW 525 → 滚动条 15px；同探针 768×1024 无溢出 scrollbar=0 → 3 列；390×844 移动仿真滚动条为 overlay（0px）→ 2 列零回归。即：**非本卡 CSS 改动缺陷，而是 V4.13 p01 `overflow-y:auto` 滚动 opt-in 与桌面经典滚动条在高度 390 横窗的既有交互**。
- **选项 A（口径修订）**：验收断言对「≥560 且高 <500」横窗档接受 tileCols==2（高度感知或该档豁免），163 冻结值不动。代价：横屏矮窗 p01 仅 2 列（tile 242px，仍在组件已验证宽度带内——基线 768 全宽档 tileW 曾 364px）。零代码改动。
- **选项 B（改常数）**：minmax 下限 163→≤158 才能让 493px 装 3 列；但真实 Windows 桌面 Chrome 滚动条 ≈17px（491px → 需 ≤157），常数追滚动条宽度属脆解，且破 G0 C-01 冻结值 163，需重走算式裁决。
- **选项 C（overlay 滚动条 / scrollbar-gutter）**：需改共享层（PageShell/base），在禁改范围，且改变全局滚动观感——不建议本波做。

### L1 裁决（Lead，2026-11-11 G1 期）：选项 A 口径修订，采纳

- **裁定**：tileCols 断言口径 = 冻结 163 算式按**网格实宽**判定——实宽 ≥508 → 3 列；实宽 <508（桌面经典滚动条占宽类）→ 按同式自然降列。844×390 桌面仿真（滚动条 15px → 实宽 493 → 2 列）与真机横屏（overlay 滚动条 0px → 实宽 508 → 3 列）**同一公式自洽**，非缺陷。163 冻结值不动、零代码改动；选项 B 破 G0 C-01 冻结值且常数追滚动条宽度属脆解、选项 C 越共享层，均不采。
- **G1 独立复跑佐证**（Lead，g1-verify-run.txt）：25 格复现 worker 报告逐格一致，FAIL=1 同格；四门禁 g1-* 全 REAL_EXIT=0、787 passed。
- **披露**（附录 C 口径修正须披露）：原始断言口径（≥560 一律 3 列）系派工单笔误级过断言——冻结计划 §3.2 原文只写「tile 列数 390→2 / 540 列→3」（540 列条件 = 实宽 508）；本裁决不改计划冻结文本，验收口径以本节 + TASK-LEDGER V4.14 行为准。原始 FAIL 档原样保留未重写。

## 复跑方式（自含）

```bash
# 四门禁（树根目录，串行）：
npx tsc --noEmit
npx vitest run --maxWorkers=2
npm run build
npx eslint .
# 机检（树根目录；先起 preview）：
npx vite preview --port 4183 --strictPort &
CHROME="<chrome.exe 绝对路径>" CDP_PORT=9383 node docs/evidence/V4.14-A/tools/verify-stage.mjs http://localhost:4183/ docs/evidence/V4.14-A/runs
```

## 偏离登记

1. 派工单 CSS 片段中 `var(--la-line)`：实读 `src/ui/tokens.css` **无 `--la-line`**，按派工单授权取语义最贴近的既有边框 token **`--la-border`**（tokens.css:10「边线」；`--la-border-soft`:11 为行分隔线，语义不合）。已在 base.ts 注释留痕。禁新色值字面量、禁自创 token 均未违反。
2. 预注册预期偏离披露：`≥560 四档 tileCols=3` 实际 768/1280/1920 =3、844×390 =2（唯一 FAIL，见上节）；其余预注册项（390 tileCols=2、pageW=540、hScroll 全 false、390 tileW≈175/inputW≈358）全部命中。
