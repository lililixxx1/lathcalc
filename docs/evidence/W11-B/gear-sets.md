# W11-B · 预置齿轮组检索日志与出口判定

- 卡：W11-B（p16 挂轮计算）
- 判定规则（WAVE-PLAN-V4.1 §3 / W10-B 先例）：**组名 + 齿数清单**须**双源逐位一致**才可预置；
  不一致 / 单源 → B 出口（只留自定义齿数输入，零数据依赖；V4 §3 已预授权，B 不算失败）。
- 检索日期：2026-11-05
- 检索工具：WebFetch（本机 Bash 直连网络不可用：`curl` 20s 连接超时 `HTTP=000`，仅 WebFetch
  出网；GitHub / 部分中文站点存在 403 / 超时）。

## 1. 结论（B 出口）

**判定：B 出口。未预置任何机床齿轮组；不新增 `src/data/gear-sets.json`；PROVENANCE.md 无增量。**

理由（逐条对应判定规则）：

1. 未取得任何一个「组名 + 完整齿数清单」的**双源逐位一致**证据；检索到的两个真实清单均为
   **单源**，且机型不是 CA6140 / C6132 / C616（见 §3）。
2. 调研报告:182 的线索 `63/64/66/72/80/90/100…` 是**需求描述**（带省略号，非完整清单），
   且报告本身不给出齿数表与出处，不能作为 A 出口的「源 1」。
3. 两个单源清单互相不一致：Reishauer 清单含 `63/64/72/80/90/100` 但**无 66**；
   `gears`（WM210/WM180）缺省清单为 `20,24,30,40,40,50,60,60,70,72,80,80`，与 63/64/66 系列
   完全不同——不满足「双源逐位一致」。
4. 因此 p16 采用**自定义齿数输入**兜底（默认预填五倍组 `20 25 … 100` 仅为 V4.1 §3 锚点示例，
   不冠任何机床型号/组名，不构成数据预置）。

## 2. 检索尝试原始记录（查询 → 结果）

> 说明：WebFetch 的页面摘要模型对单条引用有 125 字符上限，下列引文为**逐字节选**（标注「节选」处）；
> 未取得内容的条目标注为「空 / 超时 / 403」，不臆造结果。

| # | 查询 / URL | 结果摘要 | 是否含齿数清单 |
| --- | --- | --- | --- |
| 1 | `https://cn.bing.com/search?q=CA6140+lathe+change+gears+list&format=rss` | 10 条 CA6140 通用介绍（百度百科 / 知乎 / 厂商页），无挂轮齿数 | 否 |
| 2 | `https://cn.bing.com/search?q=CA6140+change+gear&format=rss` | 同上 10 条通用介绍 | 否 |
| 3 | `https://cn.bing.com/search?q=%E8%BD%A6%E5%BA%8A+%E6%8C%82%E8%BD%AE+%E6%A0%87%E5%87%86+%E9%BD%BF%E6%95%B0+20+25+30+35+40+45+50+55+60+65+70+75+80+85+90+95+100&format=rss` | 返回 10 条「车床」通用结果；齿数序列只出现在查询标题本身，无来源页 | 否 |
| 4 | `https://cn.bing.com/search?q=%E8%BD%A6%E5%BA%8A%E6%8C%82%E8%BD%AE%E9%BD%BF%E6%95%B0%E8%A1%A8&format=rss` | 10 条车床通用介绍，无挂轮表 | 否 |
| 5 | `https://cn.bing.com/search?q=%E6%8C%82%E8%BD%AE+%E8%BD%A6%E5%BA%8A+%E9%BD%BF%E8%BD%AE+%E9%BD%BF%E6%95%B0+%E9%85%8D%E6%8D%A2&format=rss` | 搜索引擎把「挂」拆成单字，返回「挂」字典释义 10 条 | 否 |
| 6 | `https://cn.bing.com/search?q=%E4%BA%A4%E6%8D%A2%E9%BD%BF%E8%BD%AE+%E9%BD%BF%E6%95%B0+%E8%BD%A6%E5%BA%8A&format=rss` | 返回「交换」词义 / 影视 / 词典 10 条 | 否 |
| 7 | `https://cn.bing.com/search?q=%E6%8C%82%E8%BD%AE%E8%AE%A1%E7%AE%97&format=rss` | 空（无 RSS 项） | 否 |
| 8 | `https://cn.bing.com/search?q=%E8%BD%A6%E5%BA%8A%E6%8C%82%E8%BD%AE%E8%AE%A1%E7%AE%97&format=rss` | 10 条车床通用介绍（百度百科车床 / 知乎 / 厂商） | 否 |
| 9 | `https://cn.bing.com/search?q=Chinese+lathe+change+gear+chart+63+64+66+72+80+90+100&format=rss` | 9 条「Chinese」语言类结果 | 否 |
| 10 | `https://cn.bing.com/search?q=lathe+change+gears+%2263%22+%2264%22+%2266%22+%2272%22+%2280%22+%2290%22+%22100%22&format=rss` | 空 | 否 |
| 11 | `https://b2bwiki.baidu.com/article/aw_495b275979b35b4619b3b85c6712caec`（CA6140 参数文章） | 有「交换齿轮」表述、无齿数：节选「进给箱内有多组交换齿轮和滑移齿轮」「需要更换交换齿轮才能实现」「确认是否提供交换齿轮组」 | 否 |
| 12 | `https://baike.baidu.com/item/CA6140%E8%BD%A6%E5%BA%8A/9459100` | HTTP 403 Forbidden | — |
| 13 | `https://www.zhihu.com/search?type=content&q=CA6140%E6%8C%82%E8%BD%AE%E9%BD%BF%E6%95%B0` | HTTP 403 Forbidden | — |
| 14 | `https://so.csdn.net/api/v3/search?q=CA6140%E6%8C%82%E8%BD%AE&t=all&p=1` | 空内容 | 否 |
| 15 | `https://html.duckduckgo.com/html/?q=CA6140+%E6%8C%82%E8%BD%AE+%E9%BD%BF%E6%95%B0` | 连接超时（443, 10s） | — |
| 16 | `https://www.mojeek.com/search?q=CA6140+%E6%8C%82%E8%BD%AE+%E9%BD%BF%E6%95%B0` | HTTP 403 Forbidden | — |
| 17 | `https://search.brave.com/search?q=CA6140+%E6%8C%82%E8%BD%AE+%E9%BD%BF%E6%95%B0` / `https://www.qwant.com/?q=CA6140%20%E6%8C%82%E8%BD%AE%20%E9%BD%BF%E6%95%B0&t=web` | 连接超时（443, 10s） | — |
| 18 | `https://archive.org/advancedsearch.php?q=%E6%8C%82%E8%BD%AE...` / `https://zh.wikipedia.org/wiki/%E8%BD%A6%E5%BA%8A` | 连接超时（443, 10s） | — |
| 19 | `https://api.github.com/search/repositories?q=C6132+lathe` | `total_count: 0`，`items: []` | 否 |
| 20 | `https://gitee.com/api/v5/search/repositories?q=%E6%8C%82%E8%BD%AE` | `[]` | 否 |
| 21 | `https://github.com/kachurovskiy/gears`（README） | 仅机型说明；节选「180V and 210V models such as WM210V, MX-210V, WM180V, MX-180V, MX-180D and simillar lathes」「2 gear axes each fitting 2 gears」 | 否（README 无齿数） |
| 22 | `https://raw.githubusercontent.com/kachurovskiy/gears/master/index.html` | 缺省输入值（单源，WM210/WM180）：`20, 24, 30, 40, 40, 50, 60, 60, 70, 72, 80, 80` | 是（非目标机型） |
| 23 | `https://raw.githubusercontent.com/kachurovskiy/gears/master/reishauer.html` | 齿数串（单源，Reishauer）：`28 28 32 36 39 40 40 41 42 42 45 45 47 48 48 49 50 50 50 51 52 56 56 57 60 60 61 62 63 63 64 64 65 70 72 72 74 75 76 76 77 80` / `80 84 90 96 105 112 127` | 是（非目标机型） |
| 24 | `https://api.github.com/search/repositories?q=lathe+change+gear&sort=stars&per_page=20` | HTTP 403 rate limit exceeded | — |

## 3. 两个真实清单的逐位核对（为何不能进 A 出口）

### 3.1 `gears`（kachurovskiy/gears）· index.html 缺省值

- 来源 URL：`https://raw.githubusercontent.com/kachurovskiy/gears/master/index.html`
- 原文（逐字节选）：`20, 24, 30, 40, 40, 50, 60, 60, 70, 72, 80, 80`
- 机型：WM210 / WM180（报告:125 同源项目；非 CA6140/C6132/C616）
- 不满足 A 出口：① 单源；② 无「组名 + 完整清单」表；③ 与报告:182 线索 63/64/66 不重合；
  ④ 含重复齿数（40×2、60×2、80×2）说明它更像「手上现有齿轮」示例而非标准组清单。

### 3.2 Reishauer · reishauer.html

- 来源 URL：`https://raw.githubusercontent.com/kachurovskiy/gears/master/reishauer.html`
- 原文（逐字节选）：`28 28 32 36 39 40 40 41 42 42 45 45 47 48 48 49 50 50 50 51 52 56 56
  57 60 60 61 62 63 63 64 64 65 70 72 72 74 75 76 76 77 80` 与 `80 84 90 96 105 112 127`
- 机型：Reishauer（齿轮磨床，非国产普通车床）
- 不满足 A 出口：① 单源；② 与报告:182 线索只部分重合（有 63/64/72/80/90/100，**无 66**）；
  ③ 与 3.1 清单完全不同，无法互证；④ 无「CA6140/C6132/C616 标准挂轮组」组名。

### 3.3 报告:182 线索

- 原文（`docs/车工计算App-调研报告.md:182`）：「适配常见国产车床齿轮配置（63/64/66/72/80/90/100…）」
- 带省略号 = 非完整清单；且无齿轮组名称、无标准号、无外部出处 → 只能作检索起点，
  不能作为 A 出口的逐位来源（数值纪律：期望值须附来源，不能拿需求描述当数据表）。

## 4. 出口落地

- UI：`src/ui/pages/p16.ts` 只有「齿轮组（自定义）」一个入口，无 SegChip 预置组。
- 数据：**不创建** `src/data/gear-sets.json`；`src/data/PROVENANCE.md` **零改动**（本卡无数据增量节；收获时该文件因 W11-A 披露节由 Lead 合并改动，B 仅在节末被声明「无数据录入」——G2-W11 Minor-4 措辞精确化）。
- 页面默认预填 `20 25 30 35 40 45 50 55 60 65 70 75 80 85 90 95 100`：仅为 V4.1 §3 锚点
  算例集合（数学示例），UI 文案不称其为任何机床标准组，不进入数据层。
