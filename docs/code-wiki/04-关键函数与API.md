# 04 · 关键函数与 API 参考

本章列出对外导出函数、服务端接口契约与关键数据结构。带 `(导出)` 标记的为模块对外导出。

---

## 4.1 服务端接口契约

### `GET /api/stock-quiz.recap`

由 [registerMarketReviewRoute](file:///c:/Users/spring/Documents/stock_study/dsh-stock-quiz/src/market-review.js#L489-L502) 注册。

| 项 | 说明 |
| --- | --- |
| 方法 | `GET`（`methods: ['GET']`） |
| 鉴权 | DSH 认证保护的同源接口（`requestBody: 'buffered'`） |
| 查询参数 | `date`（可选，`YYYY-MM-DD`，指定历史交易日）；`force`（`'1'` 时绕过 2 分钟缓存） |
| 响应头 | `cache-control: no-store` |
| 成功响应 | HTTP 200，`Response.json(buildMarketReview(...))` |
| 失败响应 | HTTP 502，`{ ok: false, error: <message> }` |

成功响应体结构（`schemaVersion: 3`）：

```jsonc
{
  "ok": true,
  "schemaVersion": 3,
  "reportId": "auto-recap:v1:20261009:cn-a",
  "status": "complete | partial",
  "tradeDate": "20261009",
  "generatedAt": "2026-10-09T08:00:00.000Z",
  "cached": false,

  // 交易数据看板（buildTradeData 产出）
  "tradeData": {
    "tradeDate": "2026-10-09",
    "generatedAt": "...",
    "provisional": true,
    "indices": [{ "ticker": "sh000001", "name": "上证指数", "price": 3813.79, "changePct": 0.05, "open": ..., "high": ..., "low": ... }],
    "trend": { "source": "东方财富指数分时", "tradeDate": "20261009", "preClose": ..., "points": [{ "time": "09:30", "price": ..., "changePct": ..., "volume": ..., "amount": ..., "average": ... }] },
    "turnover": { "amount": 18800, "previousAmount": 18000, "amountChangePct": 4.4 },
    "breadth": { "total": 5000, "upCount": 3000, "downCount": 1900, "flatCount": 100,
                 "distribution": { "up10": 60, "up5": 100, "up2": 800, "up0": 2040, "flat": 100, "down0": 1200, "down2": 500, "down5": 180, "down10": 20 } },
    "limitStats": { "upLimit": 58, "downLimit": 6, "brokenCount": 21, "sealRate": 73.4, "maxBoard": 7, "promotionRate": 42.5 },
    "ladder": [{ "board": 7, "label": "7板", "count": 1, "stocks": [{ "code": "600000", "name": "...", "theme": "机器人", "changePct": 10, "firstLimitTime": "...", "lastLimitTime": "..." }] }],
    "themes": [{ "name": "机器人", "count": 12, "maxBoard": 7, "leaders": [...] }],
    "industries": [...],
    "yesterdayPerformance": { "total": 20, "promoted": 9, "promotionRate": 45, "averageChangePct": 1.2, "upCount": ..., "downCount": ... },
    "pools": { "limitUp": [...], "broken": [...], "limitDown": [...] }   // 各截断 100
  },

  // 复盘结论快照（analyzeMarketReview.snapshot）
  "snapshot": {
    "date": "2026-10-09", "marketPhase": "主升", "marketRegime": "偏强/牛市策略",
    "cyclePosition": "通", "cycleDirection": "上升周期", "turningSignal": "...",
    "expectation": "分歧预期", "reality": "强现实", "moneyEffect": "强赚钱效应",
    "indexChange": 0.8, "amount": 18800, "upCount": 3000, "downCount": 1000,
    "upLimit": 60, "downLimit": 2, "maxBoard": 6, "promotionRate": 50, "brokenRate": 14.3,
    "mainline": "机器人（12 家涨停）", "sectorFlow": "...", "mainlineStage": "主升梯队",
    "coreRoles": "...", "dataSource": "a-stock-data 参考源：腾讯财经 + 东方财富",
    "sourceAt": "...", "provisional": false, "confidence": 0.85
  },

  // 知识规则报告（analyzeMarketReview.report）
  "report": {
    "ruleVersion": "market-review-rules.v2",
    "knowledgeVersion": "catalog-56.v1",
    "confidence": 0.85, "missingReasons": [], "provisional": false,
    "summary": "2026-10-09 市场环境为…",
    "marketEnvironment": { "label": "...", "needsConfirmation": true },
    "cycle": { "direction": "...", "position": "...", "emotionStage": "...", "needsConfirmation": true },
    "expectation": { "expectation": "...", "reality": "...", "key": "...", "action": "...", "needsConfirmation": true },
    "turningSignal": "...",
    "moneyEffect": { "score": 82, "label": "强赚钱效应", "components": [{ "key": "breadth", "score": 75, "weight": 25 }] },
    "suggestedPosition": "20–40%，聚焦主线核心，单票不得超过总仓位 50%",
    "nextPlan": "...", "risks": [...], "riskLights": [{ "level": "yellow", "code": "FISHTAIL", "title": "...", "action": "..." }],
    "ruleHits": [...], "scenarios": [{ "name": "超预期", "condition": "...", "action": "..." }],
    "mainlines": [{ "name": "机器人", "count": 12, "maxBoard": 6, "grade": "A", "stage": "主升梯队", ... }],
    "roles": { "spaceLeader": {...}, "coreCandidates": [...], "centerCandidate": null, "notes": [...] },
    "topIndustries": [...], "leaders": [...],
    "effectText": "...", "breadthText": "...",
    "knowledgeBasis": [{ "id": "w29", "title": "开仓三问与防腰斩五问" }]
  },

  // 各分区采集状态
  "sources": {
    "indices": { "name": "indices", "status": "ok", "source": "腾讯财经", "fetchedAt": "...", "data": {...} },
    "breadth": { "name": "breadth", "status": "unavailable", "source": "东方财富", "error": "...", "data": null }
  }
}
```

---

## 4.2 `market-review.js` 导出函数

### `parseTencentQuotes(source) → QuoteRow[]` (导出)
解析腾讯行情文本（`v_sh000001="…~…"`）。字段映射：`fields[1]=name`、`[2]=code`、`[3]=price`、`[4]=previousClose`、`[5]=open`、`[30]=updatedAt`、`[31]=change`、`[32]=changePct`、`[33]=high`、`[34]=low`、`[37]=amountWan`。空响应抛错。

### `buildTradeData(input, extra = {}) → TradeData` (导出)
`input` = `{ indices, breadth, limitUp, broken, limitDown, yesterday, industries }`；`extra` = `{ trend, marketHistory, provisional }`。
计算 `sealRate`（封板率 = 涨停 / (涨停+炸板)）、`promotionRate`（晋级率 = 昨日涨停今日仍涨停 / 昨日涨停总数）、涨停梯队、热门题材、昨日涨停表现。

### `analyzeMarketReview(input) → { snapshot, report }` (导出)
复盘核心分析。阶段（`marketPhase`）判定优先级：

```
数据不足 → 退潮 → 冰点 → 高潮 → 主升 → 启动 → 震荡
```

判定条件（摘录）：
- 退潮：`downLimit ≥ 20` 或 `breakRate ≥ 40` 或 `moneyEffect.score < 30` 或 (`indexChange ≤ -1.5` 且广度弱)。
- 冰点：`upLimit ≤ 20` 且 `downLimit ≥ 10`。
- 高潮：`upLimit ≥ 80` 且 `maxBoard ≥ 6` 且 `breakRate ≤ 20`。
- 主升：`upLimit ≥ 50` 且（广度强或赚钱效应 ≥ 60）且（晋级率缺失或 `≥ 25`）。
- 启动：`upLimit ≥ 35` 且 `indexChange ≥ 0`。

派生：
- `cyclePosition` 映射（冰点→穷、启动→变、主升→通、高潮→久、退潮→穷、震荡/数据不足→待确认）。
- `marketEnvironment`（偏强/牛市、震荡/结构市、偏弱/熊市、待确认）。
- `confidence` = `coverage*0.5 + freshness*0.2 + directionAgree*0.3`，`limitUp` 或 `indices` 缺失时封顶 0.49。
- `riskLights`（红/黄/灰/绿）、`scenarios`（超预期/符合预期/低于预期三套）。

### `buildMarketReview(options = {}) → Promise<Result>` (导出)
`options` = `{ date?: 'YYYY-MM-DD', force?: boolean }`。完整流程见 [02-整体架构.md](./02-整体架构.md) §4。命中缓存且未 `force` 时返回 `{ ...value, cached: true }`。

### `registerMarketReviewRoute(connection) → dispose` (导出)
```js
connection.fetch.register({
  path: '/api/stock-quiz.recap',
  methods: ['GET'],
  requestBody: 'buffered',
  fetch: async (request) => { /* 见上文接口契约 */ }
})
```
返回注销函数（`disposeRoute`），供 `host.effect` 绑定生命周期。

---

## 4.3 `research.js` 导出函数

| 函数 | 签名 | 说明 |
| --- | --- | --- |
| `normalizeTradeSnapshot` | `(item = {}, index = 0) → TradeSnapshot` | 归一化单条交易快照（裁剪分时点、去 `pools`） |
| `mergeTradeResultWithSnapshot` | `(result, previous) → Result` | 同日分区不可用时沿用上一条成功快照；输出 `preservedSections` |
| `upsertTradeSnapshot` | `(value, result, now = Date.now()) → TradeSnapshot[]` | 按 `tradeDate` 幂等 upsert，限 90 天，按 `dataFingerprint` 判重 |
| `normalizeReview` | `(item = {}, index = 0) → Review` | 补齐复盘记录默认值与数值字段 |
| `normalizeResearchData` | `(value) → { sentiments, candidates, reviews, tradeSnapshots }` | 顶层容器归一化 |
| `normalizeMarketSnapshot` | `(value = {}) → MarketSnapshot` | 兼容扁平/嵌套/中英文键的行情快照映射 |
| `analyzeSentiment` | `(record) → { breadth, breadthLabel, action }` | 由涨跌停数生成情绪提示 |
| `scoreCandidate` | `(checks = {}) → { total, label }` | 五维研究评分 |
| `summarizeReviews` | `(reviews) → { total, disciplined, rate, corrected, topError }` | 复盘统计 |
| `upsertAutoReview` | `(reviews, record, now = Date.now()) → Review[]` | 稳定 id 幂等写回，限 200 条 |
| `filterReviews` | `(reviews, filters = {}) → Review[]` | 多维过滤 + 按日期/创建时间排序 |

关键行为（被测试固化）：

- `analyzeSentiment({ phase: '退潮', upLimit: 5, downLimit: 20 })` → `{ breadth: -15, breadthLabel: '亏钱效应明显', action: '停止追高，优先空仓与复盘' }`。
- `scoreCandidate({ market:true, theme:true, trend:true, volume:true })` → `{ total: 4, label: '研究条件较完整' }`。
- `scoreCandidate` 阈值：`total ≥ 4` 较完整；`= 3` 继续观察；`< 3` 条件不足。
- `summarizeReviews([{disciplined:true,errorType:'无'},{disciplined:false,errorType:'节奏错'}])` → `{ total:2, disciplined:1, rate:50, corrected:1, topError:'节奏错' }`。
- `normalizeResearchData({ sentiments:null, candidates:[{id:'1'}], reviews:'bad' })` → `{ sentiments:[], candidates:[{id:'1'}], reviews:[], tradeSnapshots:[] }`。
- `mergeTradeResultWithSnapshot`：仅在**同一 `tradeDate`** 时保留；跨日（如 `20261010` vs `20261009`）不保留，`preservedSections` 为空。

---

## 4.4 `questions.js` 导出

| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `QUESTION_BANK` | `Question[]` | 27 基础题（补 `knowledgeIds`）+ 36 拓展题 = 63 题 |
| `KNOWLEDGE_CATALOG` | `KnowledgePoint[]` | re-export 自 `catalog.js`（56 条） |
| `CHAPTERS` | `Chapter[]` | re-export 自 `catalog.js` |
| `KNOWLEDGE_CARDS` | `Card[]` | 13 条精简卡片（供 `Qa`） |
| `ALL_KNOWLEDGE_CARDS` | `Card[]` | 由 `KNOWLEDGE_CATALOG` 映射（56 条） |

`Question` 结构：`{ id, source, chapter, type: 'single'|'multiple'|'boolean', difficulty, prompt, options[], answer[], explanation, keywords[], knowledgeIds[] }`。

---

## 4.5 `client.js` 导出与内部关键函数

| 名称 | 说明 |
| --- | --- |
| `inject` (导出) | `['slots', 'layout']` |
| `apply(ctx)` (导出) | 注册 `main` 与 `sidebar.panellist` 扩展点 |
| `loadProgress()` / `saveProgress(progress)` | 读写 `dsh-stock-quiz.progress.v1` |
| `loadResearch()` | 读写 `dsh-stock-quiz.research.v1`，损坏时备份并降级 |
| `makePaper(mode, count, progress)` | 组卷：`wrong` 取错题；`cycle` 取周期论；`practice` 取野人哥；`chapter:<key>` 取章节；按未测试/薄弱加权随机排序取前 `count` 题 |
| `sameAnswer(left, right)` | 集合相等（排序后逐项比较），用于判分 |
| `coverageOf(progress)` | `{ tested, mastered, total, percent }` |
| `selectedLabel(question, answer)` | 选项 A/B/C… 文本化 |
| `App` / `QuizHub` / `Quiz` / `Result` / `Coverage` / `Qa` / `AppDrawer` / `ModeCard` / `Icon` / `PanelIcon` | UI 组件 |

`App` 提交逻辑（`submit`）：
- 逐题比对 → `score`、`label`；`wrongIds` 去重累加；`knowledgeStats[id]` 累计 `correct/wrong`。
- `testedKnowledgeIds` 累加；`masteredIds` = 答对多于答错的知识点；`attempts` 保留最近 20 条。

---

## 4.6 `research-components.js` 导出与内部关键函数

| 名称 | 说明 |
| --- | --- |
| `SentimentApp` (导出) | 情绪分析界面 |
| `ScreenerApp` (导出) | 选股研究界面 |
| `ReviewApp` (导出) | 复盘界面（三页签） |
| `ReportDashboard({ report })` | 知识规则复盘台（四轴、赚钱效应、风险红灯、三套剧本、规则证据） |
| `TradeDataDashboard({ ... })` | 今日交易数据看板 |
| `IntradayLine({ trend })` | 上证分时 SVG 图 |
| `storedTradeResult(record)` | 本地快照 → 接口同构结果 |
| `requestReview(dateValue, force)` | `fetch('/api/stock-quiz.recap?...')` |
| `loadTradeData(force, dateValue)` | 采集 → 合并 → 幂等写入 |
| `startAutoReview()` / `save(event)` / `remove(id)` / `applySnapshot()` | 草稿生成 / 保存 / 删除 / 快照导入 |

---

## 4.7 枚举常量参考

| 常量 | 取值 |
| --- | --- |
| `REVIEW_PHASES` | 冰点、启动、主升、高潮、退潮、震荡、数据不足、未标注 |
| `MARKET_REGIMES` | 偏强/牛市策略、震荡/结构市策略、偏弱/熊市策略、待确认 |
| `CYCLE_DIRECTIONS` | 上升周期、下降周期、下降周期末端候选、待确认 |
| `CYCLE_POSITIONS` | 穷、变、通、久、待确认 |
| `EXPECTATION_LEVELS` | 低预期、分歧预期、高预期、待确认 |
| `REALITY_LEVELS` | 强现实、结构现实、弱现实、待确认 |
| `MAINLINE_STAGES` | 首日异动/待验证、启动发酵、主升梯队、高位一致/鱼尾观察、待验证 |
| `REVIEW_ERROR_TYPES` | 无、买错、卖错、节奏错、系统错、模式外 |
| `TRADE_SNAPSHOT_LIMIT` | 90 |
| `REVIEW_STEPS` | market/主线/持仓/纠错（四步） |
| `SAFETY_CHECKS` | inMode、cycleAllows、anchorClear、notFishTail、positionProgressive、acceptStop |
