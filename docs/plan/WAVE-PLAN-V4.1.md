# WAVE-PLAN-V4.1 · W11 功能波细化增补（p15 宏程序库 / p16 挂轮）

> 冻结于 2026-11-05（W10 收尾后细拟，G0-v0.3 通过条件 V4 §3 方向性条款的落地文件）。
> 依据：WAVE-PLAN-V4 §3（冻结方向）+ 调研报告:380（宏程序库 椭圆/网纹/油槽/切槽）
> + 调研报告:182（挂轮「适配常见国产车床齿轮配置 63/64/66/72/80/90/100…」）。
> 基线：aa2a68d（W10 三卡收获终态，507 tests）。

## §0 范围

| 卡 | 项 | worker | 类型 |
| --- | --- | --- | --- |
| W11-A | p15 宏程序库四模板（椭圆/网纹/油槽/切槽）+ core/macro.ts | worker-2 | 功能卡 |
| W11-B | p16 挂轮计算 + core/gear.ts | worker-1 | 算法+检索卡 |

两卡写范围互斥（§1 预置后各卡只动自己的页面/core/测试）；p01 磁贴与路由由 Lead 预置一次到位（§1）。

## §1 契约预置（Lead commit，派工前）

### 1a. types.ts 增量（追加节，既有接口零改）

```ts
// ===== 宏程序库（WAVE-PLAN-V4 §3，W11-A 实现）=====
export type MacroTemplateId = 'ellipse' | 'knurl' | 'oilslot' | 'groove';

export interface MacroParamSpec {
  /** 参数键（宏行内 #变量名映射由实现定） */
  key: string;
  /** 中文显示名 */
  label: string;
  /** 单位（mm / °） */
  unit: string;
  defaultValue: number;
  min: number;
  max: number;
}

/** 自研参数化宏（FANUC B 类宏变量语义，#1–#33 局部变量）；无外部数据依赖（PROVENANCE 披露口径：自研参数化模板） */
export interface MacroTemplateSpec {
  id: MacroTemplateId;
  /** 中文名 */
  name: string;
  params: readonly MacroParamSpec[];
  /** 参数说明+算式（可验，每条一句） */
  notes: readonly string[];
}

/** lines = 宏程序行（WHILE/END 循环体，非展开点列）；disclaimer 复用 G76_DISCLAIMER（报告 §7.4 原句） */
export type MacroBuildFn = (id: MacroTemplateId, input: Record<string, number>) => G76Program;

// ===== 挂轮（WAVE-PLAN-V4 §3，W11-B 实现）=====
export interface GearTrainInput {
  /** 工件螺距/导程 mm */
  workpiecePitch: number;
  /** 机床丝杠导程 mm */
  leadscrewPitch: number;
  /** 可用齿轮齿数集合（升序去重，≥4 个） */
  availableTeeth: number[];
}

export interface GearTrainSolution {
  /** i = (a/b)×(c/d)，a/b 与 c/d 为两级齿轮副 */
  a: number;
  b: number;
  c: number;
  d: number;
  /** 实际传动比 = (a/b)×(c/d) */
  ratio: number;
  /** e = |i_target − ratio| / i_target × 10⁶（ppm） */
  errorPpm: number;
}

/**
 * 目标比 i_target = workpiecePitch / leadscrewPitch（工件转一转走 P，丝杠转一转走 T）。
 * 返回按 (errorPpm 升序, a+b+c+d 升序, (a,b,c,d) 字典序) 排序的前 8 组；
 * workpiecePitch/leadscrewPitch ≤ 0、齿数 <4 个、含 ≤0 齿数 → throw（不臆造）。
 */
export type GearTrainFn = (input: GearTrainInput) => GearTrainSolution[];
```

### 1b. 路由/磁贴/stub（Lead 一次预置）

- `router.ts`：PAGE_IDS 增 `p15`/`p16`（尾插，p14 之后）；LOADERS 增两行动态 import。
- `p01.ts`：HOME_ENTRIES 尾插两磁贴——`{ icon: 'gcode', name: '宏程序库', sub: '椭圆 · 网纹 · 油槽 · 切槽', page: 'p15' }`、`{ icon: 'cutting', name: '挂轮计算', sub: '英制螺纹 · 误差 ppm', page: 'p16' }`（icon 复用既有 IconName，不新增图形）。
- `pages/p15.ts`/`pages/p16.ts`：stub 页（标题+「W11 派工中」占位卡，token 拼装）。
- `core/macro.ts`/`core/gear.ts`：函数桩 `throw new Error('PANIC: W11 待实现')`。
- 测试：`test/ui-p01.test.ts` 磁贴逐项断言同步 +2（既有断言改，不删）；`test/macro.test.ts`/`test/gear.test.ts` 桩红测试各 1（W11-A/B 填绿）。
- `src/ui/README.md` §5.2：p15/p16 路由行预登记。

预置后主仓四门禁须绿（桩红测试以 `it.fails` 或 `expect(() => …).toThrow('PANIC')` 形式表达——桩抛错即绿，实现后改真断言）。

## §2 W11-A · p15 宏程序库（worker-2，功能卡，盒 90min）

- 写范围：`src/core/macro.ts`（四模板实现）、`src/ui/pages/p15.ts`（模板选择+参数表单+程序卡）、`src/ui/README.md` §5.2 p15 行细化、`test/macro.test.ts`、`test/ui-p15.test.ts`、`docs/evidence/W11-A/`
- 四模板结构冻结（FANUC B 类宏，宏行锚点逐字符断言）：
  - **椭圆**：参数方程 X=2a·COS[t]（直径制）、Z=b·SIN[t]，t∈[t0, t1] 步进 Δt；宏行含 `WHILE [#4 LT #5] DO1`、`#6=2*#1*COS[#4]`、`G01 X#6 Z#7`、`END1`（#1=a/#2=b/#3=Δt/#4=当前角/#5=终止角；SIN/COS 角度单位=度）
  - **网纹**：外圆滚压往复——外层 X 逐层压入（每层 ΔX）、内层 Z 往复 G01（宽度 W）；注释提示滚花模数按 GB/T 6403.3 选型（不录标准表，用户输入总压深）
  - **油槽**：正弦摆动结构 X=X0+A·SIN[360·Z/P]（P=摆动周期即槽距，Z 步进 ΔZ 逐点 G01）；八字=两条相位差 180°（起点偏 P/2）走两遍。**先检索**（上报条件：多源一致按通用结构；检索不足→按本自研结构+口径注披露「自研近似，非标准工艺文件」）
  - **切槽**：矩形槽分层——层数=⌈深度/Δd⌉、每层 Z 向搭接平移（步距=刀宽−搭接量）；WHILE 双层循环
- 锚点（算例 a=15、b=25、Δt=15°，附算式禁裸值）：
  - 点抽验：t=15° → X=30×cos15°=30×0.96592583=28.9777748→**28.978**；Z=25×sin15°=25×0.25881905=6.4704761→**6.470**（测试注释内附算式，非程序输出断言——宏输出是循环体）
  - 宏行锚点（椭圆模板缺省参）：`#6=2*#1*COS[#4]`、`WHILE [#4 LT #5] DO1`、`END1` 逐字符在 lines 内
  - 切槽层数算例：深 2 / Δd 0.5 → 4 层（⌈2/0.5⌉，测试断言 notes 或注释算式）
- 验收：附录 A 四门禁绿 + 上述锚点断言 + 每模板 ≥2 用例（含参数域校验 throw）+ p15 页组件契约（§4 口径）

## §3 W11-B · p16 挂轮计算（worker-1，算法+检索卡，盒 75min）

- 写范围：`src/core/gear.ts`（穷举实现）、`src/ui/pages/p16.ts`（输入+预置组选择+结果表）、`src/ui/README.md` §5.2 p16 行细化、`test/gear.test.ts`、`test/ui-p16.test.ts`、`docs/evidence/W11-B/`
- 算法冻结：四重穷举 a/b/c/d ∈ availableTeeth（i=(a/b)×(c/d)），排序键 **(errorPpm, a+b+c+d, 字典序)** 取前 8；无「同齿数禁用」约束（同值齿轮需两件——结果表下注说明）；复杂度 |S|⁴，五倍组 17⁴≈83k 组合毫秒级，不用连分数
- **预置齿轮组检索**（判定规则同 W10-B）：检索常见国产车床（CA6140/C6132/C616 等）标准挂轮组——**双源逐位一致才预置**（组名+齿数清单+双 URL+摘录留档 evidence）；不一致/单源 → 只留「自定义齿数输入」入口（零数据依赖兜底，V4 §3 已预授权）。报告:182 线索组（63/64/66/72/80/90/100…）与「五倍组 20–100」均作检索起点
- 锚点（自定义集合算例，与预置组解耦）：
  - 集合={20,25,…,100 step5}（17 枚）、**T=6、P=1.5 → i=1.5/6=0.25**：断言 top1.errorPpm===0（精确解存在，如 30/60×40/80=0.25——并列多组，只断 e 与排序键稳定，不断并列组唯一性）
  - **T=12、P=3.175（=25.4/8，8 tpi）→ i=3.175/12=0.26458333…**：穷举最优 top1=**a20/b55×c40/d55**，ratio=(20/55)×(40/55)=800/3025=0.2644628099，errorPpm=|0.2645833333−0.2644628099|/0.2645833333×10⁶=**455.52**（Lead 已独立穷举复算，与 worker 实现对拍；次优并列 40/55×20/55 同值——排序键字典序 20… 在前）
  - 域校验：P≤0 / 齿数<4 / 含非正齿数 → throw 各 1 用例
- 验收：附录 A 四门禁绿 + 上述锚点 + 预置组按判定规则处置（A 预置/B 兜底均可接受，B 不算失败）+ p16 页组件契约（§4 口径）

## §4 验收口径（p15/p16 视觉，G0-v0.3 复核观察 3 确认的 C-03 补充式条款）

- A4 画布对拍范围**仍=设计稿 14 页**（p15/p16 不在无限画布 HTML 内，不入对拍）
- p15/p16 视觉验收 = **组件契约清单 + token 引用**：页面只用既有组件（createPage/Field/SegChip/ListRow 等）与 `tokens.css` 变量，零新 CSS 变量、零内联硬编码色值——测试断言 + Lead G1 抽查
- W12 A3 链流扩 p15/p16 两跳（磁贴→页面渲染）

## §5 G2-W11 与后续

- G2-W11 审：锚点复算（Lead 金值对拍）、检索判定合规、组件契约清单、四门禁
- 之后 W12 收口（A1–A4 扩锚点：锥度位程序行已在 W10-C 入测、IT>500 配合、p15/p16 页）→ G3-v0.3
