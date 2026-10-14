const list = (value, limit = 50) => Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').slice(0, limit) : []
const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback
const number = (value) => {
  if (value === '' || value === null || value === undefined) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
const optionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key)
const picked = (value, keys) => {
  for (const key of keys) if (own(value, key) && value[key] !== undefined && value[key] !== null && value[key] !== '') return { found: true, value: value[key] }
  return { found: false, value: undefined }
}

export const REVIEW_PHASES = ['冰点', '启动', '主升', '高潮', '退潮', '震荡', '数据不足', '未标注']
export const MARKET_REGIMES = ['偏强/牛市策略', '震荡/结构市策略', '偏弱/熊市策略', '待确认']
export const CYCLE_DIRECTIONS = ['上升周期', '下降周期', '下降周期末端候选', '待确认']
export const CYCLE_POSITIONS = ['穷', '变', '通', '久', '待确认']
export const EXPECTATION_LEVELS = ['低预期', '分歧预期', '高预期', '待确认']
export const REALITY_LEVELS = ['强现实', '结构现实', '弱现实', '待确认']
export const MAINLINE_STAGES = ['首日异动/待验证', '启动发酵', '主升梯队', '高位一致/鱼尾观察', '待验证']
export const REVIEW_ERROR_TYPES = ['无', '买错', '卖错', '节奏错', '系统错', '模式外']
export const TRADE_SNAPSHOT_LIMIT = 90

const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}

function compactTradeData(value = {}) {
  const source = object(value)
  const trend = object(source.trend)
  return {
    ...source,
    trend: source.trend ? { ...trend, points: list(trend.points, 500).map((point) => ({ time: text(point.time), price: optionalNumber(point.price), changePct: optionalNumber(point.changePct) })) } : null,
    pools: undefined
  }
}

export function normalizeTradeSnapshot(item = {}, index = 0) {
  const tradeData = compactTradeData(item.tradeData)
  const tradeDate = text(item.tradeDate || tradeData.tradeDate)
  return {
    id: text(item.id, `trade-data:${tradeDate || index}`), tradeDate,
    savedAt: optionalNumber(item.savedAt), updatedAt: optionalNumber(item.updatedAt), generatedAt: text(item.generatedAt),
    status: text(item.status, 'partial'), schemaVersion: optionalNumber(item.schemaVersion), dataFingerprint: text(item.dataFingerprint),
    preservedSections: Array.isArray(item.preservedSections) ? [...new Set(item.preservedSections.map((value) => text(value)).filter(Boolean))] : [],
    tradeData, snapshot: { ...object(item.snapshot) }, report: { ...object(item.report) }, sources: { ...object(item.sources) }
  }
}

const usable = (value) => value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : typeof value === 'object' ? Object.keys(value).length > 0 : true)

export function mergeTradeResultWithSnapshot(result, previous) {
  if (!result?.tradeData || !previous?.tradeData || text(result.tradeData.tradeDate) !== text(previous.tradeData.tradeDate)) return { ...result, preservedSections: [] }
  const nextData = { ...result.tradeData }
  const previousData = previous.tradeData
  const sources = { ...object(result.sources) }
  const preservedSections = []
  const unavailable = (key) => sources[key]?.status !== 'ok'
  const mark = (sourceKey, label) => {
    if (!preservedSections.includes(label)) preservedSections.push(label)
    sources[sourceKey] = { ...object(sources[sourceKey]), preserved: true, preservedAt: previous.updatedAt || previous.generatedAt || '' }
  }
  const preserve = (field, sourceKey, label) => {
    if (unavailable(sourceKey) && usable(previousData[field])) {
      nextData[field] = previousData[field]
      mark(sourceKey, label)
    }
  }
  preserve('breadth', 'breadth', '涨跌分布')
  preserve('trend', 'trend', '上证分时')
  preserve('industries', 'industries', '行业排名')
  preserve('turnover', 'marketHistory', '成交额对比')
  preserve('yesterdayPerformance', 'yesterday', '昨日涨停表现')
  if (unavailable('limitUp')) {
    if (usable(previousData.ladder)) nextData.ladder = previousData.ladder
    if (usable(previousData.themes)) nextData.themes = previousData.themes
    if (usable(previousData.ladder) || usable(previousData.themes)) mark('limitUp', '涨停梯队与题材')
  }
  const previousStats = object(previousData.limitStats)
  const nextStats = { ...object(nextData.limitStats) }
  const preserveMetric = (sourceKey, label, keys) => {
    if (!unavailable(sourceKey)) return
    let changed = false
    for (const key of keys) if (previousStats[key] !== null && previousStats[key] !== undefined) { nextStats[key] = previousStats[key]; changed = true }
    if (changed) mark(sourceKey, label)
  }
  preserveMetric('limitUp', '涨停统计', ['upLimit', 'maxBoard'])
  preserveMetric('broken', '炸板与封板率', ['brokenCount', 'sealRate'])
  preserveMetric('limitDown', '跌停统计', ['downLimit'])
  preserveMetric('yesterday', '晋级率', ['promotionRate'])
  nextData.limitStats = nextStats
  return { ...result, tradeData: nextData, sources, preservedSections }
}

function normalizeTradeSnapshots(value) {
  const seen = new Set()
  return list(value, TRADE_SNAPSHOT_LIMIT).map(normalizeTradeSnapshot).filter((item) => {
    if (!item.tradeDate || seen.has(item.tradeDate)) return false
    seen.add(item.tradeDate)
    return true
  }).sort((left, right) => right.tradeDate.localeCompare(left.tradeDate))
}

export function upsertTradeSnapshot(value, result, now = Date.now()) {
  const current = normalizeTradeSnapshots(value)
  const tradeDate = text(result?.tradeData?.tradeDate || result?.tradeDate || result?.snapshot?.date)
  if (!tradeDate || !result?.tradeData) return current
  const existing = current.find((item) => item.tradeDate === tradeDate)
  const mergedResult = mergeTradeResultWithSnapshot(result, existing)
  const dataFingerprint = `${text(mergedResult.generatedAt)}|${text(mergedResult.status)}|${optionalNumber(mergedResult.schemaVersion) ?? ''}`
  if (existing?.dataFingerprint === dataFingerprint) return value
  const sources = Object.fromEntries(Object.entries(object(mergedResult.sources)).map(([key, source]) => [key, { status: text(source?.status, 'unavailable'), source: text(source?.source), error: text(source?.error), fetchedAt: text(source?.fetchedAt), preserved: source?.preserved === true, preservedAt: source?.preservedAt || '' }]))
  const record = normalizeTradeSnapshot({
    id: `trade-data:${tradeDate}`, tradeDate, savedAt: existing?.savedAt || now, updatedAt: now,
    generatedAt: mergedResult.generatedAt, status: mergedResult.status, schemaVersion: mergedResult.schemaVersion, dataFingerprint,
    preservedSections: mergedResult.preservedSections,
    tradeData: mergedResult.tradeData, snapshot: mergedResult.snapshot, report: mergedResult.report, sources
  })
  return [record, ...current.filter((item) => item.tradeDate !== tradeDate)].slice(0, TRADE_SNAPSHOT_LIMIT)
}

export function normalizeReview(item = {}, index = 0) {
  const date = text(item.date)
  const symbol = text(item.symbol || item.title, '全市场')
  return {
    ...item,
    id: String(item.id || `${date || 'review'}-${symbol}-${index}`),
    date,
    symbol,
    marketPhase: text(item.marketPhase || item.phase, '未标注'),
    marketRegime: text(item.marketRegime, '待确认'),
    cyclePosition: text(item.cyclePosition, '待确认'),
    cycleDirection: text(item.cycleDirection, '待确认'),
    turningSignal: text(item.turningSignal, '待确认'),
    expectation: text(item.expectation, '待确认'),
    reality: text(item.reality, '待确认'),
    moneyEffect: text(item.moneyEffect, '待确认'),
    indexChange: optionalNumber(item.indexChange),
    amount: optionalNumber(item.amount),
    upCount: optionalNumber(item.upCount),
    downCount: optionalNumber(item.downCount),
    upLimit: optionalNumber(item.upLimit),
    downLimit: optionalNumber(item.downLimit),
    maxBoard: optionalNumber(item.maxBoard),
    promotionRate: optionalNumber(item.promotionRate),
    brokenRate: optionalNumber(item.brokenRate),
    mainline: text(item.mainline),
    mainlineStage: text(item.mainlineStage, '待验证'),
    coreRoles: text(item.coreRoles),
    sectorFlow: text(item.sectorFlow),
    anomalyScan: text(item.anomalyScan),
    holdingsReview: text(item.holdingsReview),
    plan: text(item.plan),
    execution: text(item.execution),
    position: text(item.position),
    anchor: text(item.anchor),
    errorType: text(item.errorType, '无'),
    lesson: text(item.lesson),
    nextPlan: text(item.nextPlan),
    disciplined: item.disciplined === true || item.disciplined === 1 || item.disciplined === 'true' ? true : item.disciplined === false || item.disciplined === 0 || item.disciplined === 'false' ? false : null,
    safetyChecks: item.safetyChecks && typeof item.safetyChecks === 'object' && !Array.isArray(item.safetyChecks) ? { ...item.safetyChecks } : {},
    dataSource: text(item.dataSource, '手工记录'),
    sourceAt: text(item.sourceAt),
    createdAt: optionalNumber(item.createdAt)
  }
}

function normalizeReviews(value) {
  const seen = new Map()
  return list(value, 200).map((item, index) => {
    const record = normalizeReview(item, index)
    const count = (seen.get(record.id) || 0) + 1
    seen.set(record.id, count)
    return count === 1 ? record : { ...record, id: `${record.id}-${count}` }
  })
}

export function normalizeResearchData(value) {
  return {
    sentiments: list(value?.sentiments),
    candidates: list(value?.candidates),
    reviews: normalizeReviews(value?.reviews),
    tradeSnapshots: normalizeTradeSnapshots(value?.tradeSnapshots)
  }
}

export function normalizeMarketSnapshot(value = {}) {
  const market = value.market && typeof value.market === 'object' ? { ...value, ...value.market } : value
  const result = {}
  const mappings = [
    ['date', ['date', 'tradeDate', '交易日期'], false],
    ['marketPhase', ['marketPhase', 'phase', 'emotionStage', '情绪阶段'], false],
    ['marketRegime', ['marketRegime', 'marketEnvironment', '市场环境'], false],
    ['cyclePosition', ['cyclePosition', 'cycle', '周期位置'], false],
    ['cycleDirection', ['cycleDirection', '周期方向'], false],
    ['turningSignal', ['turningSignal', '拐点信号'], false],
    ['expectation', ['expectation', '预期'], false],
    ['reality', ['reality', '现实'], false],
    ['moneyEffect', ['moneyEffect', '赚钱效应'], false],
    ['indexChange', ['indexChange', 'indexPct', '上证涨跌幅'], true],
    ['amount', ['amount', 'turnover', 'marketAmount', '成交额'], true],
    ['upCount', ['upCount', 'advanceCount', '上涨家数'], true],
    ['downCount', ['downCount', 'declineCount', '下跌家数'], true],
    ['upLimit', ['upLimit', 'limitUpCount', '涨停家数'], true],
    ['downLimit', ['downLimit', 'limitDownCount', '跌停家数'], true],
    ['maxBoard', ['maxBoard', 'maxStreak', '最高连板'], true],
    ['promotionRate', ['promotionRate', 'advanceRate', '晋级率'], true],
    ['brokenRate', ['brokenRate', 'breakRate', '炸板率'], true],
    ['mainline', ['mainline', 'theme', '主线题材'], false],
    ['mainlineStage', ['mainlineStage', '主线阶段'], false],
    ['coreRoles', ['coreRoles', '核心角色'], false],
    ['sectorFlow', ['sectorFlow', 'leadingSector', '领涨板块'], false],
    ['sourceAt', ['sourceAt', 'updatedAt', '更新时间'], false]
  ]
  for (const [key, aliases, numeric] of mappings) {
    const entry = picked(market, aliases)
    if (entry.found) result[key] = numeric ? optionalNumber(entry.value) : text(entry.value)
  }
  const source = picked(market, ['dataSource', 'source', '数据来源'])
  result.dataSource = source.found ? text(source.value, 'a-stock-data 快照') : 'a-stock-data 快照'
  return result
}

export function analyzeSentiment(record) {
  const up = Number(record.upLimit) || 0
  const down = Number(record.downLimit) || 0
  const breadth = up - down
  const breadthLabel = breadth >= 20 ? '赚钱效应较强' : breadth <= -10 ? '亏钱效应明显' : '多空相对均衡'
  const stageActions = {
    冰点: '控制仓位，只做小仓试错',
    启动: '观察主线确认与次日溢价',
    主升: '聚焦主线，避免追逐后排',
    高潮: '防止一致性过强，逐步降低风险',
    退潮: '停止追高，优先空仓与复盘',
    震荡: '控制节奏，围绕强板块高低切换'
  }
  return { breadth, breadthLabel, action: stageActions[record.phase || record.marketPhase] || '继续记录，等待阶段明确' }
}

export function scoreCandidate(checks = {}) {
  const total = ['market', 'theme', 'trend', 'volume', 'risk'].filter((key) => checks[key]).length
  return {
    total,
    label: total >= 4 ? '研究条件较完整' : total === 3 ? '继续观察验证' : '条件不足，暂不行动'
  }
}

export function summarizeReviews(reviews) {
  const items = normalizeReviews(reviews)
  const disciplineItems = items.filter((item) => typeof item.disciplined === 'boolean')
  const disciplined = disciplineItems.filter((item) => item.disciplined).length
  const corrected = items.filter((item) => item.errorType && item.errorType !== '无').length
  const errorCounts = items.reduce((result, item) => {
    if (item.errorType && item.errorType !== '无') result[item.errorType] = (result[item.errorType] || 0) + 1
    return result
  }, {})
  const topError = Object.entries(errorCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || '暂无'
  return {
    total: items.length,
    disciplined,
    rate: disciplineItems.length ? Math.round(disciplined / disciplineItems.length * 100) : 0,
    corrected,
    topError
  }
}

export function upsertAutoReview(reviews, record, now = Date.now()) {
  const items = Array.isArray(reviews) ? reviews : []
  const existing = items.find((item) => item?.id === record.id)
  if (existing?.dataFingerprint && existing.dataFingerprint === record.dataFingerprint && existing.manualFingerprint === record.manualFingerprint) return items
  const next = { ...record, createdAt: existing?.createdAt || now, updatedAt: now }
  return [next, ...items.filter((item) => item?.id !== record.id)].slice(0, 200)
}

export function filterReviews(reviews, filters = {}) {
  const keyword = text(filters.keyword).toLowerCase()
  return normalizeReviews(reviews).filter((item) => {
    if (filters.from && item.date < filters.from) return false
    if (filters.to && item.date > filters.to) return false
    if (filters.regime && filters.regime !== '全部环境' && item.marketRegime !== filters.regime) return false
    if (filters.cycle && filters.cycle !== '全部位置' && item.cyclePosition !== filters.cycle) return false
    if (filters.phase && filters.phase !== '全部阶段' && item.marketPhase !== filters.phase) return false
    if (filters.errorType && filters.errorType !== '全部错误' && item.errorType !== filters.errorType) return false
    if (filters.discipline === 'yes' && item.disciplined !== true) return false
    if (filters.discipline === 'no' && item.disciplined !== false) return false
    if (!keyword) return true
    const haystack = [item.date, item.symbol, item.marketPhase, item.marketRegime, item.cycleDirection, item.cyclePosition, item.turningSignal, item.expectation, item.reality, item.moneyEffect, item.mainline, item.mainlineStage, item.coreRoles, item.sectorFlow, item.anomalyScan, item.holdingsReview, item.plan, item.execution, item.anchor, item.errorType, item.lesson, item.nextPlan].join(' ').toLowerCase()
    return haystack.includes(keyword)
  }).sort((left, right) => {
    const byDate = right.date.localeCompare(left.date)
    if (byDate) return byDate
    return number(right.createdAt) - number(left.createdAt)
  })
}
