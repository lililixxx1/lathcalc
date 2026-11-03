# WAVE-PLAN · 车工算 LathCalc v0.1（M1 里程碑）

> 状态：v2.1 **已冻结**（2026-11-03，G0 复审通过、C-01 关账；冻结 commit 见本行所在提交）
> 修正留痕：v1→v2 按 G0 修复指令 1–6 + 重要 7–10 修订：#8 移出锚点表；期望值补未舍入值与断言精度；待补清单补 R/Rc/Rp、G92、宏程序并披露 M30/M20 口径差；arc 与 PROVENANCE 消除同路径写；lookup/store 落归属；断言归属拆分；A2/A4 措辞与裁决清单收紧。
> 冻结参考件：`docs/车工计算App-调研报告.md`（=报告）、`docs/车工计算App-无限画布.html`（=设计稿）
> 共识基线：全量 14 页 PWA ｜ Vite+TS+vitest ｜ 螺纹四族 ｜ G76 仅 FANUC ｜ MIT

## 0. 交付物与验收基线（M1 完成定义）

**交付物**：`dist/` 可部署的纯静态 PWA——14 页全部可用、完全离线（断网可开）、无登录无广告无埋点。

**验收基线（全部满足才算 M1 完成）**：

| # | 基线 | 证据 |
| --- | --- | --- |
| A1 | 三门禁全绿：`npx tsc --noEmit`、`npx vitest run --maxWorkers=2`、`npm run build` | G3 证据档 |
| A2 | §4 黄金用例（含修订后 #7/#8 处置）全绿 + 每模块 ≥3 组独立例题 | vitest 输出 |
| A3 | 30 秒链路：首页 → 查 M30 粗牙 → 底孔/三针 → 生成 G76，断网状态下走通（计时以录屏时间戳为准）。**口径披露**：规格取设计稿 M30（设计稿:1513）；报告 §9 验收原文为 M20（报告:365）——差异登记 SOURCE-DEVIATION-NOTE 3 | Lead 浏览器留证 |
| A4 | 14 页逐页与设计稿对拍（390×844），逐页裁决清单：① DOM 结构树与设计稿布局块一一对应；② token 色 hex 逐项对照（la- CSS 变量表）；③ 组件形态（Seg/Chip/Input/ResultCard/Keypad/暗色代码卡/警示条）一致；④ 数值区以**实时计算值**对拍，示例 mock 值列入忽略区（忽略区仅限设计稿静态示例数字） | 截图对比档 |

## 1. 架构冻结

```
src/
  core/            纯函数，零 UI 依赖，零 DOM 导入
    types.ts         共享类型（ThreadSpec / TaperInput / ArcCase / TableRow …）   [Lead 预置]
    speed.ts         转速/进给/Ra
    thread.ts        螺纹公式族（60°/55°/30°Tr：d2/d1/H1/底孔/三针）
    taper.ts         锥度三值互算/半角
    arc.ts           切点共享类型 + 几何助手（距离/公垂足/判向）                 [Lead 预置]
    arc-cases-a.ts   工况 01–06 求解器                                          [W2-C4]
    arc-cases-b.ts   工况 07–12 求解器                                          [W2-C5]
    tolerance.ts     偏差合成（给定 T 与基准偏差 → 上下偏差）
    triangle.ts      解三角形
    weight.ts        重量（圆/六方/管/板 × 密度）
    gcode.ts         G76 FANUC 两行式模板 + 免责常量                             [W2-C5]
    lookup.ts        数据表查询（选型/分段查表，基于 types.ts 冻结的行类型 + Lead 测试夹具）[Lead W1-b]
  data/            纯 JSON + 溯源
    threads-metric.json / threads-trapezoid.json / threads-pipe.json / threads-unified.json
    tolerance-it.json / morse.json / densities.json / materials.json / gcode-ref.json
    provenance/<表名>.md   逐表溯源片段（各 W3 卡交片段，**Lead 收获时串行合并**成 data/PROVENANCE.md）
    COVERAGE.md            覆盖/待补清单（Lead 维护，W3 卡不写）
  ui/              页面与组件（la- token 1:1 移植自设计稿）
    tokens.css / components/（ResultCard/Keypad/SegChip/InputRow/Accordion/…）
    router.ts / pages/×14 / store.ts（收藏+历史，localStorage）               [W4-C5]
  sw/              vite-plugin-pwa 配置（service worker + manifest）
test/              黄金用例 + 例题（数值锚点，零漂移）；arc 测试按卡分文件
  fixtures/        Lead 预置最小数据夹具（schema 与 types.ts 一致，供 lookup 测试）
```

**契约预置（Lead，W1-b）**：`types.ts` 全量 + 各 core 模块签名 + `throw new Error('PANIC: not implemented')` 桩 + `arc.ts` 几何助手 + `lookup.ts` 实现（薄查询层）+ `tokens.css` + `test/fixtures/` + `data/COVERAGE.md` 骨架 + 门禁三命令全绿。worker 只填实现，不定义接口。

## 2. 波次与卡

### W1（Lead 自研，产出直接进 G2）
| 卡 | 内容 |
| --- | --- |
| W1-a | 主仓基线 `8d74951` + 附录 + AGENTS.md（完成）+ 本计划 G0 冻结 |
| W1-b | 骨架：npm 初始化、vite/vitest/tsconfig、契约桩（含 arc.ts 助手、lookup.ts、fixtures）、tokens.css、三门禁全绿 |

### W2（core 纯函数 + 用例，5 卡并行；基线 = W1-b commit；写范围互斥已核对）
| 卡 | 写范围 | 关键验收（断言打到数值位） |
| --- | --- | --- |
| W2-C1 | speed.ts / triangle.ts / weight.ts + 对应 test | §4 #5/#6 + 各 ≥3 例题 |
| W2-C2 | thread.ts + test | §4 #1/#2 与 **#7 螺纹值段（d2/d1/底孔/d0/M）**；60°/55°/Tr 三族常数独立复算；**常数集=§4 头部冻结集** |
| W2-C3 | taper.ts / tolerance.ts + test | §4 #3；**#4 前半**：给定 T=0.025 + H 基准 → EI=0/ES=+0.025（纯公式段）；半角弧度→度分秒转换用例 |
| W2-C4 | arc-cases-a.ts + test/arc-cases-a.test.ts | 工况 01–06 每工况 ≥2 例题：切点满足几何不变量（\|圆心−切点\|=R、公垂足 dot=0）；**G02/G03 判向例题（含 T3 刀尖方位与后刀架用例）** |
| W2-C5 | arc-cases-b.ts + test/arc-cases-b.test.ts + gcode.ts + test | 工况 07–12 同上标准（含判向例题）；G76 模板参数逐位断言（§4 #7 G76 段） |

### W3（数据表 + 溯源，5 卡并行；基线 = W2 收获后 commit）
| 卡 | 写范围（JSON + provenance 片段 + 各自 test/data/ 文件） | 双源要求 |
| --- | --- | --- |
| W3-C1 | threads-metric.json + provenance/threads-metric.md | GB/T 196 与独立手册互证，片段逐条来源 |
| W3-C2 | threads-trapezoid.json + threads-pipe.json + 对应片段 | GB/T 5796 / ISO 228-1 互证 |
| W3-C3 | threads-unified.json + gcode-ref.json + 对应片段 | ASME B1.1 互证 |
| W3-C4 | tolerance-it.json + 片段 | **#4 后半**：30–50 段 IT7 查表=0.025（IT6=0.016/IT8=0.039 同断言）；抽 3 段交叉对拍 |
| W3-C5 | morse.json / densities.json / materials.json + 片段 | 莫氏锥度双源；参数库逐条标"示例·待复核，以试切为准" |

> `data/PROVENANCE.md` 由 Lead 收获时从 provenance/ 片段**串行合并**（消除同路径写）；各卡 test 断言打到具体行值（如 M30 行 d2=27.727）。

### W4（UI，1 前置卡 + 4 并行卡；基线 = W3 收获后 commit）
| 卡 | 页 / 写范围 | 依赖 |
| --- | --- | --- |
| W4-C1 | tokens + 基础组件 + router + p01 首页 | W3 |
| W4-C2 | p02 选型 / p03 结果 / p04 G76（参数带出：一处输入多处复用） | W4-C1 契约 |
| W4-C3 | p05 图库（12 工况缩略图）/ p06 切点计算 | W4-C1 |
| W4-C4 | p07 锥度 / p08 公差 / p09 转速（自绘键盘）/ p10 切削参数 | W4-C1 |
| W4-C5 | p11 重量 / p12 三角 / p13 速查 / p14 收藏+历史+分享长图 + **ui/store.ts** | W4-C1 |

### W5（集成 + 终局，Lead 主导）
- SW/manifest 离线验证、30 秒链路留证、14 页截图对拍（按 §0 A4 裁决清单）、G3 全量审、遗留项登记 DEFERRED。

## 3. 关键裁决（已定，不再议）

1. G76 仅 FANUC；GSK/KND/华中页签置灰 + "待补"徽标；免责文案固定。
2. v0.1 待补清单（进 `data/COVERAGE.md`，**全部为已披露裁剪**）：蜗杆、NPT、**R/Rc/Rp 锥管螺纹**（螺纹四族裁剪，报告 P0 #2 原列，v0.2）；**G92 单循环程序生成**（报告 P0 #3 原列，设计稿 14 页无生成页，速查仅数据行，v0.2）；**宏程序库（椭圆/网纹/油槽/切槽）**（报告 P0 #3/§9 原列，v0.3）。
3. 切削参数库为示例数据（页内固定警示 + 每条 PROVENANCE 标"示例·待复核"）。
4. 字体走系统栈，不打包 webfont。
5. 分享长图用 canvas 2D 绘制（本机生成，不联网）。
6. UI 还原基准 = 390×844 对拍 + 布局自适应；la- token 1:1。
7. A3 规格口径取设计稿 M30，报告 §9 的 M20 差异登记 SOURCE-DEVIATION-NOTE 3。

## 4. 黄金用例（数值锚点；双路径复算后冻结；断言=显示值逐位相等 + 原始值附注）

> **常数集冻结（W2-C2 验收依据）**：60° 牙族用报告附录 B 实用常数 d2=d−0.6495P、d1=d−1.0825P、H1=0.5413P、三针 M=d2+3d0−0.866P、最佳针径 d0=0.57735P（四位/五位常数，与手册排版一致，便于双源对拍）；55° 族 0.6403/1.2806/3.1657/0.9605；Tr 按 GB/T 5796（30°、牙高 0.5P）。**不使用无理数精确式**——若日后切换精确式属改验收语义，走 L2。

| # | 用例 | 期望（未舍入值 → 显示值/断言） | 来源 |
| --- | --- | --- | --- |
| 1 | M30×2 普通螺纹 | d2=28.701000→**28.701**；d1=27.835000→**27.835**；底孔 28.0→**28.0** | 报告 §6.4 + G0 复算 |
| 2 | 三针 M30×2, d0=1.1547 | M=28.701+3.4641−1.732=30.433100→**30.433**（报告原文 30.434 为舍入误，DEVIATIONS #1；G0 复算 30.433011 裁决冻结 30.433） | 报告 §6.4 + G0 复算裁决 |
| 3 | 锥度 1:10 | α/2=2.862405°→**2°51′45″**（44.66″ 四舍五入；断言 DMS 秒位 ±0.5″） | 报告 §6.4 + G0 复算 |
| 4 | Ø40 IT7 H 孔 | 纯公式段（W2-C3）：EI=0, ES=EI+0.025=+0.025；查表段（W3-C4）：30–50 段 IT7=**0.025**（IT6=0.016、IT8=0.039 同断言） | 报告 §6.4 + GB/T 1800.1 |
| 5 | 转速 Ø50, Vc=150 | n=954.929659→**955**（toFixed(0)）；vf=0.2×954.929659=190.985932→**191**（toFixed(0)，原始值断言 ≤1e-3） | 报告 §6.4 + G0 复算 |
| 6 | 重量 Ø50×100 钢 | V=196349.54→**196350** mm³（取整）；m=1.541344→**1.54** kg（toFixed(2)，原始值断言 ≤1e-3） | 报告 §6.4 + G0 复算 |
| 7 | M30×3.5（设计稿 p03/p04 全串） | d2=27.726750→**27.727**；d1=26.211250→**26.211**；底孔 **26.5**；d0=2.020725→**2.021**；M=27.72675+3×2.020725−0.866×3.5=30.757925→**30.758**；G76：X26.211、牙高 P=1894.375→**1894** μm（取整；设计稿 p04 原文 1895 出自工作牙高路径 H1=0.5413×3.5→1894.55→1895，公式路径差非 mock 错，DEVIATIONS #4）、Q400、F3.5 | 设计稿 p03/p04 + G0 复算 |
| 8 | （移出锚点表）切点工况 01 显示值 X18.536/Z−21.464、圆心 X28.536 Z−5.0 | **非数值锚点**——G0 复算证明该组值几何不可能（\|圆心−切点\|=17.21≠R5，DEVIATIONS #5），仅作 UI 显示层对拍参考；切点真值锚点由 W2-C4 各工况例题按几何不变量现场冻结 | 设计稿 p06（mock）+ G0 复算 |

## 5. 风险与缓解（继承报告 §8，新增执行层）

| 风险 | 缓解 |
| --- | --- |
| 数据表录错 | 双源 + provenance 片段 + 抽查交叉对拍（W3 各卡验收） |
| 切点工况公式推导错 | 几何不变量断言（\|圆心−切点\|=R、公垂足 dot=0）+ 判向例题（G0 重要 9 已补） |
| UI 还原度争议 | la- token 1:1 + 逐页截图对拍档 + §0 A4 四条裁决清单（含忽略区规则） |
| worker 配额中断 | worker-1/2 互为异池候选（附录 E 先例表）；Lead 补位走完整轮 G2 |
| 报告/设计稿静态值不可作锚点 | G0 已证两处（#2、#8）+ P1895；一律复算冻结 + DEVIATIONS 登记 |

## 6. 闸门序列

W1-b（Lead 产出）→ **G2**（reviewer 审骨架契约）→ W2 派工 → G1 批次复验 → **G2** → 收获 → W3 → … → W4 → W5 → **G3** 终局。
**G0 复审（关账 C-01）通过后** WAVE-PLAN 冻结，W1-b 方可开工。
每波 G2 通过后在本文档 §7 回填验收记录。

## 7. 验收记录回填（闸门后填写）

| 闸门 | 日期 | 裁决 | 条件项 | 备注 |
| --- | --- | --- | --- | --- |
| G0 | 2026-11-03 | 有条件通过 | C-01（六项阻塞 + 四项重要，修复于 v2） | 复审关账后冻结 |
| G0-复审 | 2026-11-03 | **通过**（C-01 关账） | 无 | 计划冻结；3 条非阻塞建议已顺手清；W1-b 开工 |
