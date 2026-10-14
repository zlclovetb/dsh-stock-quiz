const EASTMONEY_TOKEN = '7eea3edcaed734bea9cbfc24409ed989'
const CACHE_TTL_MS = 2 * 60 * 1000
const cache = new Map()

const round = (value, digits = 1) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const compactDate = (value) => String(value || '').replace(/-/g, '').slice(0, 8)
const displayDate = (value) => compactDate(value).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')

async function request(url, { encoding = 'utf-8', timeout = 12000, retries = 1 } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { accept: '*/*', 'user-agent': 'Mozilla/5.0 DSH Stock Review/0.4' },
        signal: AbortSignal.timeout(timeout)
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = await response.arrayBuffer()
      return new TextDecoder(encoding).decode(bytes)
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(800 * (attempt + 1))
    }
  }
  throw lastError
}

async function requestJson(url, options) {
  const text = await request(url, options)
  const value = JSON.parse(text)
  if (value?.rc !== undefined && value.rc !== 0) throw new Error(`upstream rc=${value.rc}`)
  return value
}

export function parseTencentQuotes(source) {
  const rows = []
  for (const part of String(source).split(';')) {
    const match = part.match(/v_([a-z0-9]+)="([^"]*)"/i)
    if (!match) continue
    const fields = match[2].split('~')
    const updatedAt = fields[30] || ''
    rows.push({
      ticker: match[1], name: fields[1] || match[1], code: fields[2] || '', price: Number(fields[3]) || null,
      previousClose: Number(fields[4]) || null, open: Number(fields[5]) || null, updatedAt,
      tradeDate: compactDate(updatedAt), change: Number(fields[31]) || 0, changePct: Number(fields[32]) || 0,
      high: Number(fields[33]) || null, low: Number(fields[34]) || null, amountWan: Number(fields[37]) || 0
    })
  }
  if (!rows.length) throw new Error('腾讯指数响应为空或字段格式变化')
  return rows
}

async function fetchIndices() {
  const tickers = ['sh000001', 'sz399001', 'sh000300', 'sz399006']
  const url = `https://qt.gtimg.cn/q=${tickers.join(',')}`
  const rows = parseTencentQuotes(await request(url, { encoding: 'gbk', timeout: 10000 }))
  const byTicker = Object.fromEntries(rows.map((item) => [item.ticker, item]))
  const amount = ((byTicker.sh000001?.amountWan || 0) + (byTicker.sz399001?.amountWan || 0)) / 10000
  return { source: '腾讯财经', sourceUrl: url, tradeDate: rows[0]?.tradeDate || '', rows, amount: round(amount, 0), indexChange: byTicker.sh000001?.changePct ?? null }
}

function poolUrl(endpoint, date, sort) {
  const query = new URLSearchParams({ ut: EASTMONEY_TOKEN, dpt: 'wz.ztzt', Pageindex: '0', pagesize: '10000', sort, date })
  return `https://push2ex.eastmoney.com/${endpoint}?${query}`
}

async function fetchPool(endpoint, date, sort) {
  const url = poolUrl(endpoint, date, sort)
  const value = await requestJson(url, { timeout: 12000 })
  if (!value?.data || !Number.isFinite(Number(value.data.tc)) || !Array.isArray(value.data.pool)) throw new Error('涨跌停池未发布或响应格式变化')
  const tradeDate = compactDate(value.data.qdate || date)
  if (tradeDate !== compactDate(date)) throw new Error(`涨跌停池日期不匹配：${tradeDate}`)
  return { source: '东方财富', sourceUrl: url, tradeDate, total: Number(value.data.tc), rows: value.data.pool }
}

async function summarizeSortedBreadth(total, pageSize, fetchPage) {
  const pageCount = Math.ceil(total / pageSize)
  const countAtLeast = async (threshold) => {
    let low = 1; let high = pageCount; let lastFull = 0
    while (low <= high) {
      const middle = Math.floor((low + high) / 2)
      const rows = await fetchPage(middle)
      if (rows[0] < threshold) high = middle - 1
      else if (rows.at(-1) >= threshold) { lastFull = middle; low = middle + 1 }
      else return Math.min(total, (middle - 1) * pageSize + rows.filter((value) => value >= threshold).length)
    }
    if (!lastFull) return 0
    if (lastFull >= pageCount) return total
    const rows = await fetchPage(lastFull + 1)
    return Math.min(total, lastFull * pageSize + rows.filter((value) => value >= threshold).length)
  }
  const at10 = await countAtLeast(10)
  const at5 = await countAtLeast(5)
  const at2 = await countAtLeast(2)
  const positive = await countAtLeast(Number.EPSILON)
  const nonNegative = await countAtLeast(0)
  const atMinus2 = await countAtLeast(-2)
  const atMinus5 = await countAtLeast(-5)
  const atMinus10 = await countAtLeast(-10)
  return {
    total, upCount: positive, downCount: total - nonNegative, flatCount: nonNegative - positive,
    distribution: { up10: at10, up5: at5 - at10, up2: at2 - at5, up0: positive - at2, flat: nonNegative - positive, down0: atMinus2 - nonNegative, down2: atMinus5 - atMinus2, down5: atMinus10 - atMinus5, down10: total - atMinus10 }
  }
}

async function fetchEastmoneyBreadth() {
  const pageSize = 100
  const pageCache = new Map()
  const pageUrl = (page) => {
    const query = new URLSearchParams({ pn: String(page), pz: String(pageSize), po: '1', np: '1', fltt: '2', invt: '2', fid: 'f3', fs: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23', fields: 'f3' })
    return `https://push2.eastmoney.com/api/qt/clist/get?${query}`
  }
  const fetchPage = async (page) => {
    if (pageCache.has(page)) return pageCache.get(page)
    if (pageCache.size) await sleep(100)
    const value = await requestJson(pageUrl(page), { timeout: 16000, retries: 2 })
    const rows = Array.isArray(value?.data?.diff) ? value.data.diff.map((row) => Number(row.f3)).filter(Number.isFinite) : []
    if (!rows.length) throw new Error(`东方财富涨跌分布第 ${page} 页为空`)
    pageCache.set(page, rows)
    return rows
  }
  const firstValue = await requestJson(pageUrl(1), { timeout: 16000, retries: 2 })
  const firstRows = Array.isArray(firstValue?.data?.diff) ? firstValue.data.diff.map((row) => Number(row.f3)).filter(Number.isFinite) : []
  if (!firstRows.length) throw new Error('东方财富涨跌分布首页为空')
  pageCache.set(1, firstRows)
  return { source: '东方财富', sourceUrl: pageUrl(1), ...await summarizeSortedBreadth(Number(firstValue.data.total) || firstRows.length, pageSize, fetchPage) }
}

async function fetchSinaBreadth() {
  const pageSize = 100
  const pageCache = new Map()
  const countUrl = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeStockCount?node=hs_a'
  const pageUrl = (page) => `https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/Market_Center.getHQNodeData?page=${page}&num=${pageSize}&sort=changepercent&asc=0&node=hs_a&symbol=&_s_r_a=page`
  const total = Number(await requestJson(countUrl, { timeout: 12000, retries: 2 }))
  if (!Number.isFinite(total) || total < 1000) throw new Error('新浪财经 A 股总数不可用')
  const fetchPage = async (page) => {
    if (pageCache.has(page)) return pageCache.get(page)
    if (pageCache.size) await sleep(120)
    const value = await requestJson(pageUrl(page), { timeout: 16000, retries: 2 })
    const rows = Array.isArray(value) ? value.map((row) => Number(row.changepercent)).filter(Number.isFinite) : []
    if (!rows.length) throw new Error(`新浪财经涨跌分布第 ${page} 页为空`)
    pageCache.set(page, rows)
    return rows
  }
  return { source: '新浪财经（备用）', sourceUrl: pageUrl(1), ...await summarizeSortedBreadth(total, pageSize, fetchPage) }
}

async function fetchBreadth() {
  try { return await fetchEastmoneyBreadth() }
  catch (primaryError) {
    try { return { ...await fetchSinaBreadth(), fallbackReason: primaryError instanceof Error ? primaryError.message : String(primaryError) } }
    catch (fallbackError) { throw new Error(`东方财富与新浪财经涨跌分布均不可用：${primaryError instanceof Error ? primaryError.message : String(primaryError)}；${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`) }
  }
}

async function fetchIndustries() {
  const query = new URLSearchParams({ pn: '1', pz: '20', po: '1', np: '1', fltt: '2', invt: '2', fid: 'f3', fs: 'm:90+t:2', fields: 'f12,f14,f3,f104,f105,f128,f136' })
  const url = `https://push2.eastmoney.com/api/qt/clist/get?${query}`
  const value = await requestJson(url, { timeout: 12000 })
  const rows = Array.isArray(value?.data?.diff) ? value.data.diff : []
  if (!rows.length) throw new Error('行业排名响应为空')
  return {
    source: '东方财富', sourceUrl: url,
    rows: rows.map((row) => ({ code: row.f12, name: row.f14, changePct: Number(row.f3) || 0, upCount: Number(row.f104) || 0, downCount: Number(row.f105) || 0, leader: row.f128 || '', leaderChange: Number(row.f136) || 0 }))
  }
}

function subtractDays(value, days) {
  const text = displayDate(value)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T12:00:00Z`) : new Date()
  date.setUTCDate(date.getUTCDate() - days)
  return compactDate(date.toISOString().slice(0, 10))
}

async function fetchDailySeries(secid, date) {
  const query = new URLSearchParams({ secid, klt: '101', fqt: '1', beg: subtractDays(date, 24), end: compactDate(date), fields1: 'f1,f2,f3,f4,f5,f6', fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61' })
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?${query}`
  const value = await requestJson(url, { timeout: 12000 })
  const rows = (value?.data?.klines || []).map((line) => {
    const [tradeDate, open, close, high, low, volume, amount, amplitude, changePct, change, turnover] = String(line).split(',')
    return { tradeDate: compactDate(tradeDate), open: Number(open), close: Number(close), high: Number(high), low: Number(low), volume: Number(volume), amount: Number(amount), amplitude: Number(amplitude), changePct: Number(changePct), change: Number(change), turnover: Number(turnover) }
  }).filter((row) => /^\d{8}$/.test(row.tradeDate))
  if (!rows.length) throw new Error('指数日线数据不可用')
  return { source: '东方财富指数日线', sourceUrl: url, rows }
}

async function fetchHistoricalIndices(date) {
  const mappings = [
    ['sh000001', '1.000001', '上证指数', '000001'], ['sz399001', '0.399001', '深证成指', '399001'],
    ['sh000300', '1.000300', '沪深300', '000300'], ['sz399006', '0.399006', '创业板指', '399006']
  ]
  const rows = []
  for (const [ticker, secid, name, code] of mappings) {
    const series = await fetchDailySeries(secid, date)
    const daily = series.rows.at(-1)
    rows.push({ ticker, name, code, price: daily.close, previousClose: round(daily.close - daily.change, 2), open: daily.open, updatedAt: `${daily.tradeDate}153000`, tradeDate: daily.tradeDate, change: daily.change, changePct: daily.changePct, high: daily.high, low: daily.low, amountWan: daily.amount / 10000 })
    await sleep(250)
  }
  const tradeDate = rows[0].tradeDate
  if (rows.some((row) => row.tradeDate !== tradeDate)) throw new Error('指数历史交易日不一致')
  return { source: '东方财富指数日线', sourceUrl: 'https://push2his.eastmoney.com/api/qt/stock/kline/get', tradeDate, rows, amount: round(((rows[0]?.amountWan || 0) + (rows[1]?.amountWan || 0)) / 10000, 0), indexChange: rows[0]?.changePct ?? null }
}

async function fetchMarketHistory(date) {
  const series = []
  for (const secid of ['1.000001', '0.399001']) {
    series.push(await fetchDailySeries(secid, date))
    await sleep(250)
  }
  const targetDate = series[0].rows.at(-1)?.tradeDate
  const findAt = (item, offset = 0) => {
    const index = item.rows.findIndex((row) => row.tradeDate === targetDate)
    return index >= 0 ? item.rows[index + offset] : null
  }
  const currentAmount = series.reduce((sum, item) => sum + (findAt(item)?.amount || 0), 0) / 1e8
  const previousAmount = series.reduce((sum, item) => sum + (findAt(item, -1)?.amount || 0), 0) / 1e8
  return { source: '东方财富指数日线', tradeDate: targetDate, amount: round(currentAmount, 0), previousAmount: round(previousAmount, 0), amountChangePct: previousAmount ? round((currentAmount - previousAmount) / previousAmount * 100, 1) : null }
}

async function fetchIndexTrend(date) {
  const query = new URLSearchParams({ secid: '1.000001', fields1: 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13', fields2: 'f51,f52,f53,f54,f55,f56,f57,f58', iscr: '0', ndays: '1' })
  const url = `https://push2his.eastmoney.com/api/qt/stock/trends2/get?${query}`
  const value = await requestJson(url, { timeout: 12000 })
  const preClose = Number(value?.data?.preClose)
  const points = (value?.data?.trends || []).map((line) => {
    const [time, open, close, high, low, volume, amount, average] = String(line).split(',')
    return { time, price: Number(close), changePct: preClose ? round((Number(close) - preClose) / preClose * 100, 2) : null, volume: Number(volume), amount: Number(amount), average: Number(average) }
  }).filter((item) => Number.isFinite(item.price))
  if (!points.length) throw new Error('指数分时数据不可用')
  const tradeDate = compactDate(points[0].time.slice(0, 10))
  if (tradeDate !== compactDate(date)) throw new Error(`指数分时只提供最新交易日（${displayDate(tradeDate)}）`)
  return { source: '东方财富指数分时', sourceUrl: url, tradeDate, preClose, points }
}

async function partition(name, source, fn) {
  try {
    const data = await fn()
    return { name, status: 'ok', source: data?.source || source, fetchedAt: new Date().toISOString(), data }
  } catch (error) {
    return { name, status: 'unavailable', source, fetchedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error), data: null }
  }
}

function groupMainlines(rows) {
  const groups = new Map()
  for (const row of rows || []) {
    const name = String(row.hybk || '其他').trim() || '其他'
    const current = groups.get(name) || { name, count: 0, maxBoard: 0, leaders: [] }
    current.count += 1
    current.maxBoard = Math.max(current.maxBoard, Number(row.lbc || row.zttj?.ct) || 0)
    if (current.leaders.length < 4) current.leaders.push({ code: row.c, name: row.n, board: Number(row.lbc || row.zttj?.ct) || 1, changePct: round(Number(row.zdp) || 0, 2) })
    groups.set(name, current)
  }
  return [...groups.values()].sort((left, right) => right.count - left.count || right.maxBoard - left.maxBoard).slice(0, 6)
}

export function buildTradeData(input, extra = {}) {
  const { indices, breadth, limitUp, broken, limitDown, yesterday, industries } = input
  const limitRows = limitUp?.rows || []
  const brokenRows = broken?.rows || []
  const yesterdayRows = yesterday?.rows || []
  const brokenCount = broken?.total ?? null
  const upLimit = limitUp?.total ?? null
  const sealRate = upLimit !== null && brokenCount !== null && upLimit + brokenCount > 0 ? round(upLimit / (upLimit + brokenCount) * 100, 1) : null
  const todayCodes = new Set(limitRows.map((row) => String(row.c || '')).filter(Boolean))
  const yesterdayCodes = [...new Set(yesterdayRows.map((row) => String(row.c || '')).filter(Boolean))]
  const promoted = yesterdayCodes.filter((code) => todayCodes.has(code)).length
  const promotionRate = yesterdayCodes.length ? round(promoted / yesterdayCodes.length * 100, 1) : null
  const ladderMap = new Map()
  for (const row of limitRows) {
    const board = Number(row.lbc || row.zttj?.ct) || 1
    const group = ladderMap.get(board) || { board, label: board === 1 ? '首板' : `${board}板`, count: 0, stocks: [] }
    group.count += 1
    if (group.stocks.length < 10) group.stocks.push({ code: row.c || '', name: row.n || '', theme: row.hybk || '其他', changePct: round(Number(row.zdp) || 0, 2), firstLimitTime: row.fbt || '', lastLimitTime: row.lbt || '' })
    ladderMap.set(board, group)
  }
  const ladder = [...ladderMap.values()].sort((left, right) => right.board - left.board)
  const themes = groupMainlines(limitRows).map((item) => ({ name: item.name, count: item.count, maxBoard: item.maxBoard, leaders: item.leaders.slice(0, 3) }))
  const yesterdayChanges = yesterdayRows.map((row) => Number(row.zdp)).filter(Number.isFinite)
  const yesterdayPerformance = {
    total: yesterday?.total ?? (yesterdayRows.length || null), promoted, promotionRate,
    averageChangePct: yesterdayChanges.length ? round(yesterdayChanges.reduce((sum, value) => sum + value, 0) / yesterdayChanges.length, 2) : null,
    upCount: yesterdayChanges.length ? yesterdayChanges.filter((value) => value > 0).length : null,
    downCount: yesterdayChanges.length ? yesterdayChanges.filter((value) => value < 0).length : null
  }
  return {
    tradeDate: displayDate(indices?.tradeDate), generatedAt: new Date().toISOString(), provisional: extra.provisional ?? true,
    indices: (indices?.rows || []).map((row) => ({ ticker: row.ticker, name: row.name, price: row.price, changePct: row.changePct, open: row.open, high: row.high, low: row.low })),
    trend: extra.trend || null,
    turnover: { amount: extra.marketHistory?.amount ?? indices?.amount ?? null, previousAmount: extra.marketHistory?.previousAmount ?? null, amountChangePct: extra.marketHistory?.amountChangePct ?? null },
    breadth: breadth ? { total: breadth.total, upCount: breadth.upCount, downCount: breadth.downCount, flatCount: breadth.flatCount, distribution: breadth.distribution || null } : null,
    limitStats: { upLimit, downLimit: limitDown?.total ?? null, brokenCount, sealRate, maxBoard: ladder[0]?.board ?? null, promotionRate },
    ladder, themes, industries: (industries?.rows || []).slice(0, 10), yesterdayPerformance,
    pools: { limitUp: limitRows.slice(0, 100), broken: brokenRows.slice(0, 100), limitDown: (limitDown?.rows || []).slice(0, 100) }
  }
}

function scoreMoneyEffect({ upCount, downCount, upLimit, downLimit, promotionRate, breakRate }) {
  const parts = []
  if (upCount !== null && downCount !== null && upCount + downCount > 0) parts.push({ key: 'breadth', score: Math.min(100, Math.max(0, upCount / (upCount + downCount) * 100)), weight: 25 })
  if (upLimit !== null) parts.push({ key: 'limitUp', score: Math.min(100, upLimit / 80 * 100), weight: 20 })
  if (downLimit !== null) parts.push({ key: 'limitDown', score: Math.max(0, 100 - downLimit / 20 * 100), weight: 15 })
  if (promotionRate !== null) parts.push({ key: 'promotion', score: Math.min(100, promotionRate / 45 * 100), weight: 20 })
  if (breakRate !== null) parts.push({ key: 'sealQuality', score: Math.max(0, 100 - breakRate / 50 * 100), weight: 20 })
  const weight = parts.reduce((sum, item) => sum + item.weight, 0)
  const score = weight ? round(parts.reduce((sum, item) => sum + item.score * item.weight, 0) / weight, 0) : null
  const label = score === null ? '数据不足' : score >= 75 ? '强赚钱效应' : score >= 60 ? '赚钱效应扩散' : score >= 45 ? '结构性机会' : score >= 30 ? '亏钱效应扩散' : '强亏钱效应'
  return { score, label, components: parts.map((item) => ({ key: item.key, score: round(item.score, 0), weight: item.weight })) }
}

function assessMainlines(mainlines) {
  return mainlines.map((item) => {
    const score = Math.min(80, item.count * 6 + item.maxBoard * 8)
    const grade = score >= 70 ? 'A' : score >= 50 ? 'B' : 'C'
    const stage = item.maxBoard >= 6 ? '高位一致/鱼尾观察' : item.maxBoard >= 4 && item.count >= 5 ? '主升梯队' : item.maxBoard >= 2 && item.count >= 3 ? '启动发酵' : '首日异动/待验证'
    return { ...item, score, grade, stage, hasHeight: item.maxBoard >= 3, hasWidth: item.count >= 4, hasDepth: null, hasReturn: null, needsCapacityConfirmation: true }
  })
}

function expectationMatrix(marketPhase, moneyScore, indexChange) {
  const expectation = marketPhase === '高潮' ? '高预期' : marketPhase === '冰点' || marketPhase === '退潮' ? '低预期' : '分歧预期'
  const reality = moneyScore === null ? '待确认' : moneyScore >= 60 && (indexChange === null || indexChange >= -0.3) ? '强现实' : moneyScore < 40 || (indexChange !== null && indexChange <= -1) ? '弱现实' : '结构现实'
  const key = `${expectation}+${reality}`
  const action = expectation === '低预期' && reality === '强现实' ? '关注预期差修复，只允许小仓确认后试错'
    : expectation === '高预期' && reality === '强现实' ? '持有核心、拒绝后排加速，随一致性增强逐步兑现'
      : expectation === '高预期' && reality === '弱现实' ? '预期落空，优先离场并停止追高'
        : expectation === '低预期' && reality === '弱现实' ? '继续等待，不把冰点机械等同于见底'
          : '现实呈结构分化，只在趋势右侧寻找情绪分歧点'
  return { expectation, reality, key, action, needsConfirmation: true }
}

const KNOWLEDGE_BASIS = [
  ['c01', '价格、情绪与预期差'], ['c03', '穷变通久完整周期'], ['c07', '预期现实四象限'], ['c14', '大盘是锚'], ['c17', '大盘板块个股三重滤网'], ['c19', '赚钱亏钱效应指标'],
  ['w08', '情绪周期五阶段'], ['w09', '周期仓位动作'], ['w10', '过度一致与鱼尾行情'], ['w16', '主线五步法'], ['w17', '真龙头硬性指标'], ['w24', '无条件止损铁律'], ['w27', '四类错误即时纠错'], ['w28', '职业复盘 SOP'], ['w29', '开仓三问与防腰斩五问']
].map(([id, title]) => ({ id, title }))

export function analyzeMarketReview(input) {
  const { indices, breadth, limitUp, broken, limitDown, yesterday, industries } = input
  const upLimit = limitUp?.total ?? null
  const brokenCount = broken?.total ?? null
  const downLimit = limitDown?.total ?? null
  const breakRate = upLimit !== null && brokenCount !== null && upLimit + brokenCount > 0 ? round(brokenCount / (upLimit + brokenCount) * 100) : null
  const yesterdayRows = yesterday?.rows || []
  const todayLimitCodes = new Set((limitUp?.rows || []).map((row) => String(row.c || '')).filter(Boolean))
  const yesterdayCodes = [...new Set(yesterdayRows.map((row) => String(row.c || '')).filter(Boolean))]
  const promoted = yesterdayCodes.filter((code) => todayLimitCodes.has(code)).length
  const promotionRate = yesterdayCodes.length ? round(promoted / yesterdayCodes.length * 100) : null
  const maxBoard = limitUp?.rows?.length ? Math.max(...limitUp.rows.map((row) => Number(row.lbc || row.zttj?.ct) || 1)) : null
  const indexChange = indices?.indexChange ?? null
  const upCount = breadth?.upCount ?? null
  const downCount = breadth?.downCount ?? null
  const breadthStrong = upCount !== null && downCount !== null && upCount > downCount * 1.35
  const breadthWeak = upCount !== null && downCount !== null && downCount > upCount * 1.35
  const moneyEffect = scoreMoneyEffect({ upCount, downCount, upLimit, downLimit, promotionRate, breakRate })

  let marketPhase = upLimit === null && upCount === null ? '数据不足' : '震荡'
  if (marketPhase !== '数据不足') {
    if ((downLimit !== null && downLimit >= 20) || (breakRate !== null && breakRate >= 40) || (moneyEffect.score !== null && moneyEffect.score < 30) || (indexChange !== null && indexChange <= -1.5 && breadthWeak)) marketPhase = '退潮'
    else if (upLimit !== null && upLimit <= 20 && downLimit !== null && downLimit >= 10) marketPhase = '冰点'
    else if (upLimit !== null && upLimit >= 80 && maxBoard !== null && maxBoard >= 6 && breakRate !== null && breakRate <= 20) marketPhase = '高潮'
    else if (upLimit !== null && upLimit >= 50 && (breadthStrong || (moneyEffect.score !== null && moneyEffect.score >= 60)) && (promotionRate === null || promotionRate >= 25)) marketPhase = '主升'
    else if (upLimit !== null && upLimit >= 35 && indexChange !== null && indexChange >= 0) marketPhase = '启动'
  }

  const positionMap = { 冰点: '0–5%，仅允许极小仓试错，冰点不等于见底', 启动: '5–10%，等待主线与次日溢价确认后再递进', 主升: '20–40%，聚焦主线核心，单票不得超过总仓位 50%', 高潮: '20–30%，主动兑现并禁止追逐中位补涨', 退潮: '0%，清仓等待，停止所有模式外开仓', 震荡: '10–20%，高低切换且不追日内轮动末端', 数据不足: '0%，关键数据不足，不形成仓位判断' }
  const cyclePosition = { 冰点: '穷', 启动: '变', 主升: '通', 高潮: '久', 退潮: '穷', 震荡: '待确认', 数据不足: '待确认' }[marketPhase]
  const cycleDirection = marketPhase === '启动' || marketPhase === '主升' || marketPhase === '高潮' ? '上升周期' : marketPhase === '退潮' ? '下降周期' : marketPhase === '冰点' ? '下降周期末端候选' : '待确认'
  const marketEnvironment = moneyEffect.score === null ? '待确认' : indexChange !== null && indexChange <= -1 && moneyEffect.score < 45 ? '偏弱/熊市策略' : indexChange !== null && indexChange >= 0.8 && moneyEffect.score >= 60 ? '偏强/牛市策略' : '震荡/结构市策略'
  const expectation = expectationMatrix(marketPhase, moneyEffect.score, indexChange)
  const turningSignal = marketPhase === '高潮' && indexChange !== null && indexChange >= 1 ? '上涨衰竭候选' : marketPhase === '冰点' && indexChange !== null && indexChange <= -1 ? '下跌衰竭候选' : Math.abs(indexChange || 0) < 0.3 && expectation.expectation === '高预期' ? '诱多风险候选' : Math.abs(indexChange || 0) < 0.3 && expectation.expectation === '低预期' ? '诱空修复候选' : '暂无明确拐点信号'
  const mainlines = assessMainlines(groupMainlines(limitUp?.rows))
  const topIndustries = (industries?.rows || []).slice(0, 8)
  const risks = []
  if (breakRate !== null && breakRate >= 30) risks.push(`炸板率 ${breakRate}%，封板质量偏弱`)
  if (downLimit !== null && downLimit >= 10) risks.push(`跌停 ${downLimit} 家，亏钱效应需要警惕`)
  if (breadthWeak) risks.push(`下跌家数 ${downCount} 明显高于上涨家数 ${upCount}`)
  if (marketPhase === '高潮') risks.push('市场一致性较高，次日分歧风险上升')
  const missing = [['indices', indices], ['breadth', breadth], ['limitUp', limitUp], ['broken', broken], ['limitDown', limitDown], ['yesterday', yesterday], ['industries', industries]].filter(([, value]) => !value).map(([key]) => key)
  const sourceTime = String(indices?.rows?.[0]?.updatedAt || '').slice(8, 14)
  const provisional = /^\d{6}$/.test(sourceTime) ? sourceTime < '153000' : true
  const coverage = (7 - missing.length) / 7
  const freshness = provisional ? 0.65 : 1
  const directionAgree = indexChange === null || moneyEffect.score === null ? 0.5 : (indexChange >= 0 && moneyEffect.score >= 50) || (indexChange < 0 && moneyEffect.score < 50) ? 1 : 0.55
  let confidence = round(coverage * 0.5 + freshness * 0.2 + directionAgree * 0.3, 2)
  if (!limitUp || !indices) confidence = Math.min(confidence, 0.49)
  if (missing.length) risks.push(`部分数据不可用：${missing.join('、')}，结论已降级`)
  if (provisional) risks.push('当前为盘中或源时间未确认，报告属于临时结论')
  if (!risks.length) risks.push('未发现极端风险信号，仍需按个股防守锚执行')

  const riskLights = []
  if (marketPhase === '退潮' || (downLimit !== null && downLimit >= 15)) riskLights.push({ level: 'red', code: 'RETREAT', title: '退潮/亏钱效应', action: '停止开新仓，优先清理弱势与模式外持仓' })
  if (marketPhase === '高潮' || (mainlines[0]?.stage.includes('鱼尾') && ((breakRate ?? 0) >= 25 || expectation.expectation === '高预期'))) riskLights.push({ level: 'yellow', code: 'FISHTAIL', title: '过度一致与鱼尾', action: '持仓减仓，空仓者不追中位补涨' })
  if (breakRate !== null && breakRate >= 30) riskLights.push({ level: 'yellow', code: 'SEAL_QUALITY', title: '封板质量下降', action: '只观察最强核心的分歧承接' })
  if (indexChange !== null && indexChange > 0 && breadthWeak) riskLights.push({ level: 'yellow', code: 'DIVERGENCE', title: '指数与广度背离', action: '指数上涨不代表多数个股安全，降低仓位上限' })
  if (missing.length) riskLights.push({ level: 'gray', code: 'MISSING_DATA', title: '数据分区缺失', action: '人工确认缺失指标，不使用缺失值做交易结论' })
  if (!riskLights.length) riskLights.push({ level: 'green', code: 'NO_EXTREME', title: '暂无极端红灯', action: '仍需逐笔设置 -5% 至 -7% 或逻辑失效防守锚' })

  const leaders = mainlines.flatMap((item) => item.leaders.map((leader) => ({ ...leader, theme: item.name, themeGrade: item.grade }))).sort((left, right) => right.board - left.board)
  const roles = {
    spaceLeader: leaders[0] || null,
    coreCandidates: leaders.slice(0, 5),
    centerCandidate: null,
    notes: ['空间龙需同时验证身位、板块助攻与情绪标杆', '中军角色需要市值、趋势与容量数据，当前自动数据不足，必须人工确认', '补涨龙与穿越龙需结合跨日周期，不能由单日涨停池直接确认']
  }
  const ruleHits = [
    `情绪五阶段：${marketPhase} → 周期位置 ${cyclePosition}`,
    `赚钱效应：${moneyEffect.label}${moneyEffect.score === null ? '' : `（${moneyEffect.score}/100）`}`,
    `预期现实：${expectation.key}`,
    `拐点选择：${turningSignal}（仅作证据，需趋势确认）`,
    `市场环境：${marketEnvironment}`,
    mainlines[0] ? `主线五步验证：${mainlines[0].name} 当前 ${mainlines[0].stage}，质量 ${mainlines[0].grade} 级` : '主线五步验证：暂无可确认主线'
  ]
  const scenarios = [
    { name: '超预期', condition: '核心竞价与开盘承接增强，主线有高度、宽度并出现回流', action: marketPhase === '退潮' ? '只记录转强，不立即重仓；等待新周期“通”确认' : '按仓位上限递进，只做核心分歧转一致' },
    { name: '符合预期', condition: '指数、赚钱效应和主线梯队维持当前结构', action: '执行原计划，不因盘中噪声扩大仓位' },
    { name: '低于预期', condition: '空间龙断板无承接、炸板率上升或主线次日无溢价', action: '触发防守锚，停止开仓并处理弱势持仓' }
  ]

  const mainlineText = mainlines.length ? mainlines.slice(0, 3).map((item) => `${item.name}（${item.count} 家涨停）`).join('、') : '主线暂不明确'
  const sectorText = topIndustries.length ? topIndustries.slice(0, 5).map((item) => `${item.name} ${item.changePct >= 0 ? '+' : ''}${item.changePct}%`).join('；') : '行业数据暂不可用'
  const breadthText = upCount === null ? '涨跌家数暂不可用' : `上涨 ${upCount} 家、下跌 ${downCount} 家`
  const effectText = upLimit === null ? '涨跌停数据暂不可用' : `涨停 ${upLimit} 家、跌停 ${downLimit ?? '—'} 家、最高 ${maxBoard ?? '—'} 板、晋级率 ${promotionRate ?? '—'}%、炸板率 ${breakRate ?? '—'}%`
  const summary = `${displayDate(indices?.tradeDate)} 市场环境为“${marketEnvironment}”，情绪阶段“${marketPhase}”，对应穷变通久位置“${cyclePosition}”。${breadthText}；${effectText}，综合为“${moneyEffect.label}”。预期现实组合为“${expectation.key}”。主线集中在${mainlineText}。`
  const nextPlan = marketPhase === '数据不足'
    ? '关键数据不足，暂不形成交易结论；稍后重新生成复盘，或仅记录个人交易执行。'
    : marketPhase === '退潮' || marketPhase === '冰点'
      ? '次日先观察亏钱效应是否收敛；不开模式外仓位，只有主线核心出现明确转强信号才允许小仓试错。'
      : marketPhase === '高潮'
        ? '次日重点检查高位分歧与炸板反馈，主动降低后排仓位，不在一致加速段追高。'
        : `次日围绕${mainlines[0]?.name || '最强主线'}观察核心标的承接，只执行模式内买点，并预设防守锚。`

  return {
    snapshot: {
      date: displayDate(indices?.tradeDate), marketPhase, marketRegime: marketEnvironment, cyclePosition, cycleDirection, turningSignal, expectation: expectation.expectation, reality: expectation.reality,
      moneyEffect: moneyEffect.label, indexChange, amount: indices?.amount ?? null, upCount, downCount,
      upLimit, downLimit, maxBoard, promotionRate, brokenRate: breakRate, mainline: mainlineText, sectorFlow: sectorText,
      mainlineStage: mainlines[0]?.stage || '待验证', coreRoles: leaders.slice(0, 5).map((item) => `${item.name || item.code}（${item.theme}/${item.board}板）`).join('、'),
      dataSource: 'a-stock-data 参考源：腾讯财经 + 东方财富', sourceAt: new Date().toISOString(), provisional, confidence
    },
    report: {
      ruleVersion: 'market-review-rules.v2', knowledgeVersion: 'catalog-56.v1', confidence, missingReasons: missing, provisional,
      summary, marketEnvironment: { label: marketEnvironment, needsConfirmation: true }, cycle: { direction: cycleDirection, position: cyclePosition, emotionStage: marketPhase, needsConfirmation: true },
      expectation, turningSignal, moneyEffect, suggestedPosition: positionMap[marketPhase], nextPlan, risks, riskLights, ruleHits, scenarios,
      mainlines, roles, topIndustries, leaders: leaders.slice(0, 10), effectText, breadthText, knowledgeBasis: KNOWLEDGE_BASIS
    }
  }
}

export async function buildMarketReview(options = {}) {
  const indexPart = await partition('indices', options.date ? '东方财富指数日线' : '腾讯财经', () => options.date ? fetchHistoricalIndices(options.date) : fetchIndices())
  if (indexPart.status !== 'ok') throw new Error(`指数数据获取失败：${indexPart.error}`)
  const detectedDate = compactDate(indexPart.data.tradeDate)
  if (!/^\d{8}$/.test(detectedDate)) throw new Error('无法确定交易日期')
  const cacheKey = detectedDate
  const cached = cache.get(cacheKey)
  if (!options.force && cached && Date.now() - cached.at < CACHE_TTL_MS) return { ...cached.value, cached: true }

  let latestTradeDate = detectedDate
  if (options.date) {
    try { latestTradeDate = compactDate((await fetchIndices()).tradeDate) } catch { latestTradeDate = compactDate(new Date().toISOString().slice(0, 10)) }
  }
  const isHistorical = Boolean(options.date) && detectedDate !== latestTradeDate
  const currentOnly = (label, fn) => isHistorical ? () => { throw new Error(`${label}仅提供最新交易日`) } : fn
  const tasks = [
    ['breadth', '东方财富', currentOnly('全市场涨跌分布', fetchBreadth)],
    ['limitUp', '东方财富涨停池', () => fetchPool('getTopicZTPool', detectedDate, 'fbt:asc')],
    ['broken', '东方财富炸板池', () => fetchPool('getTopicZBPool', detectedDate, 'fbt:asc')],
    ['limitDown', '东方财富跌停池', () => fetchPool('getTopicDTPool', detectedDate, 'fund:asc')],
    ['yesterday', '东方财富昨日涨停池', () => fetchPool('getYesterdayZTPool', detectedDate, 'zs:desc')],
    ['industries', '东方财富行业排名', currentOnly('行业排名', fetchIndustries)],
    ['marketHistory', '东方财富指数日线', () => fetchMarketHistory(detectedDate)],
    ['trend', '东方财富指数分时', () => fetchIndexTrend(detectedDate)]
  ]
  const parts = { indices: indexPart }
  for (const [name, source, fn] of tasks) {
    await sleep(1100)
    parts[name] = await partition(name, source, fn)
  }
  const data = Object.fromEntries(Object.entries(parts).map(([key, part]) => [key, part.status === 'ok' ? part.data : null]))
  const analyzed = analyzeMarketReview(data)
  const tradeData = buildTradeData(data, { trend: data.trend, marketHistory: data.marketHistory, provisional: analyzed.snapshot.provisional })
  const unavailable = Object.values(parts).filter((part) => part.status !== 'ok').length
  const value = { ok: true, schemaVersion: 3, reportId: `auto-recap:v1:${detectedDate}:cn-a`, status: unavailable ? 'partial' : 'complete', tradeDate: detectedDate, generatedAt: new Date().toISOString(), cached: false, tradeData, ...analyzed, sources: parts }
  cache.set(cacheKey, { at: Date.now(), value })
  return value
}

export function registerMarketReviewRoute(connection) {
  return connection.fetch.register({
    path: '/api/stock-quiz.recap', methods: ['GET'], requestBody: 'buffered',
    fetch: async (request) => {
      try {
        const url = new URL(request.url)
        const date = url.searchParams.get('date') || undefined
        const force = url.searchParams.get('force') === '1'
        return Response.json(await buildMarketReview({ date, force }), { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502, headers: { 'cache-control': 'no-store' } })
      }
    }
  })
}
