import React, { useEffect, useState } from 'react'
import { analyzeSentiment, CYCLE_DIRECTIONS, CYCLE_POSITIONS, EXPECTATION_LEVELS, filterReviews, MAINLINE_STAGES, mergeTradeResultWithSnapshot, MARKET_REGIMES, normalizeMarketSnapshot, REALITY_LEVELS, REVIEW_ERROR_TYPES, REVIEW_PHASES, scoreCandidate, summarizeReviews, upsertAutoReview, upsertTradeSnapshot } from './research.js'

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function Field({ label, children }) {
  return React.createElement('label', { className: 'sq-field' }, React.createElement('span', null, label), children)
}

function Empty({ children }) {
  return React.createElement('div', { className: 'sq-empty' }, children)
}

function ReportDashboard({ report }) {
  if (!report) return null
  const riskLights = report.riskLights?.length ? report.riskLights : (report.risks || []).map((item, index) => ({ level: 'yellow', code: `legacy-${index}`, title: '风险提示', action: item }))
  const axes = [
    ['市场环境', report.marketEnvironment?.label || '待确认'],
    ['周期位置', report.cycle ? `${report.cycle.direction || '待确认'} · ${report.cycle.position || '待确认'}` : '待确认'],
    ['情绪阶段', report.cycle?.emotionStage || '待确认'],
    ['预期 × 现实', report.expectation?.key || '待确认']
  ]
  return React.createElement('section', { className: 'sq-knowledge-report' },
    React.createElement('header', null, React.createElement('div', null, React.createElement('span', { className: 'sq-eyebrow' }, 'KNOWLEDGE REVIEW V2'), React.createElement('h3', null, '知识规则复盘台')), React.createElement('b', null, `置信度 ${Math.round((report.confidence || 0) * 100)}%`)),
    React.createElement('div', { className: 'sq-axis-grid' }, axes.map(([label, value]) => React.createElement('article', { key: label }, React.createElement('span', null, label), React.createElement('strong', null, value)))),
    React.createElement('div', { className: 'sq-policy-row' },
      React.createElement('article', null, React.createElement('span', null, '赚钱效应'), React.createElement('strong', null, `${report.moneyEffect?.label || '待确认'}${report.moneyEffect?.score === null || report.moneyEffect?.score === undefined ? '' : ` · ${report.moneyEffect.score}/100`}`), React.createElement('p', null, report.effectText)),
      React.createElement('article', null, React.createElement('span', null, '仓位上限'), React.createElement('strong', null, report.suggestedPosition), React.createElement('p', null, report.expectation?.action || '等待人工确认'))
    ),
    React.createElement('div', { className: 'sq-report-columns' },
      React.createElement('article', null, React.createElement('h4', null, '主线质量与角色'), (report.mainlines || []).slice(0, 4).map((item) => React.createElement('div', { className: 'sq-mainline-row', key: item.name }, React.createElement('b', null, `${item.name} · ${item.grade || '—'}级`), React.createElement('span', null, `${item.stage || '待验证'} · ${item.count} 家涨停 · ${item.maxBoard} 板`))), report.roles?.spaceLeader && React.createElement('p', null, `空间候选：${report.roles.spaceLeader.name || report.roles.spaceLeader.code}（${report.roles.spaceLeader.board} 板）`)),
      React.createElement('article', null, React.createElement('h4', null, '风险红灯'), riskLights.map((item) => React.createElement('div', { className: `sq-risk-light is-${item.level}`, key: item.code }, React.createElement('b', null, item.title), React.createElement('span', null, item.action))))
    ),
    React.createElement('div', { className: 'sq-scenario-grid' }, (report.scenarios || []).map((item) => React.createElement('article', { key: item.name }, React.createElement('b', null, item.name), React.createElement('p', null, `如果：${item.condition}`), React.createElement('span', null, `那么：${item.action}`)))),
    React.createElement('details', { className: 'sq-rule-evidence' }, React.createElement('summary', null, `查看规则证据与知识依据（${(report.knowledgeBasis || []).length} 条）`), React.createElement('div', null, (report.ruleHits || []).map((item) => React.createElement('p', { key: item }, `• ${item}`)), React.createElement('small', null, (report.knowledgeBasis || []).map((item) => `${item.id} ${item.title}`).join(' · '))))
  )
}

export function SentimentApp({ data, onChange }) {
  const [form, setForm] = useState({ date: today(), phase: '冰点', upLimit: '', downLimit: '', maxBoard: '', note: '' })
  const save = (event) => {
    event.preventDefault()
    const record = { ...form, id: `${Date.now()}`, upLimit: Number(form.upLimit) || 0, downLimit: Number(form.downLimit) || 0, maxBoard: Number(form.maxBoard) || 0 }
    onChange({ ...data, sentiments: [record, ...data.sentiments].slice(0, 50) })
    setForm({ ...form, note: '' })
  }
  return React.createElement('div', { className: 'sq-tool-page' },
    React.createElement('header', { className: 'sq-page-intro' }, React.createElement('span', { className: 'sq-eyebrow' }, 'MARKET SENTIMENT'), React.createElement('h1', null, '情绪分析'), React.createElement('p', null, '每天记录可观察的市场事实，再结合周期阶段形成行动纪律。')),
    React.createElement('div', { className: 'sq-tool-layout' },
      React.createElement('form', { className: 'sq-tool-card sq-form-grid', onSubmit: save },
        React.createElement('h2', null, '今日情绪记录'),
        React.createElement(Field, { label: '日期' }, React.createElement('input', { type: 'date', value: form.date, onChange: (e) => setForm({ ...form, date: e.target.value }), required: true })),
        React.createElement(Field, { label: '周期阶段' }, React.createElement('select', { value: form.phase, onChange: (e) => setForm({ ...form, phase: e.target.value }) }, ['冰点', '启动', '主升', '高潮', '退潮'].map((phase) => React.createElement('option', { key: phase }, phase)))),
        React.createElement(Field, { label: '涨停家数' }, React.createElement('input', { type: 'number', min: 0, value: form.upLimit, onChange: (e) => setForm({ ...form, upLimit: e.target.value }), required: true })),
        React.createElement(Field, { label: '跌停家数' }, React.createElement('input', { type: 'number', min: 0, value: form.downLimit, onChange: (e) => setForm({ ...form, downLimit: e.target.value }), required: true })),
        React.createElement(Field, { label: '最高连板' }, React.createElement('input', { type: 'number', min: 0, value: form.maxBoard, onChange: (e) => setForm({ ...form, maxBoard: e.target.value }), required: true })),
        React.createElement(Field, { label: '观察备注' }, React.createElement('textarea', { value: form.note, onChange: (e) => setForm({ ...form, note: e.target.value }), placeholder: '主线、分歧、异常反馈…' })),
        React.createElement('button', { className: 'sq-primary', type: 'submit' }, '保存记录')
      ),
      React.createElement('section', { className: 'sq-tool-card' }, React.createElement('h2', null, '最近记录'),
        data.sentiments.length ? data.sentiments.map((item) => {
          const insight = analyzeSentiment(item)
          return React.createElement('article', { className: 'sq-record', key: item.id },
            React.createElement('header', null, React.createElement('b', null, `${item.date} · ${item.phase}`), React.createElement('button', { type: 'button', onClick: () => onChange({ ...data, sentiments: data.sentiments.filter((row) => row.id !== item.id) }) }, '删除')),
            React.createElement('p', null, `涨停 ${item.upLimit} · 跌停 ${item.downLimit} · 最高 ${item.maxBoard} 板`),
            React.createElement('strong', null, `${insight.breadthLabel}：${insight.action}`),
            item.note && React.createElement('small', null, item.note)
          )
        }) : React.createElement(Empty, null, '还没有情绪记录。')
      )
    )
  )
}

const CHECKS = [
  ['market', '大盘环境允许开仓'], ['theme', '属于明确主线或强题材'], ['trend', '趋势与关键位置清晰'], ['volume', '量价和承接符合预期'], ['risk', '防守位与退出条件明确']
]

export function ScreenerApp({ data, onChange }) {
  const [form, setForm] = useState({ symbol: '', thesis: '', riskNote: '', checks: {} })
  const save = (event) => {
    event.preventDefault()
    const score = scoreCandidate(form.checks)
    const record = { ...form, ...score, id: `${Date.now()}`, at: today() }
    onChange({ ...data, candidates: [record, ...data.candidates].slice(0, 50) })
    setForm({ symbol: '', thesis: '', riskNote: '', checks: {} })
  }
  return React.createElement('div', { className: 'sq-tool-page' },
    React.createElement('header', { className: 'sq-page-intro' }, React.createElement('span', { className: 'sq-eyebrow' }, 'STOCK RESEARCH'), React.createElement('h1', null, '选股研究'), React.createElement('p', null, '用统一清单约束研究过程；评分表示资料完整度，不代表涨跌预测或买入建议。')),
    React.createElement('div', { className: 'sq-tool-layout' },
      React.createElement('form', { className: 'sq-tool-card sq-form-grid', onSubmit: save },
        React.createElement('h2', null, '新增候选研究'),
        React.createElement(Field, { label: '股票名称或代码' }, React.createElement('input', { value: form.symbol, onChange: (e) => setForm({ ...form, symbol: e.target.value }), required: true })),
        React.createElement(Field, { label: '关注逻辑' }, React.createElement('textarea', { value: form.thesis, onChange: (e) => setForm({ ...form, thesis: e.target.value }), required: true, placeholder: '为什么值得继续研究？' })),
        React.createElement('fieldset', null, React.createElement('legend', null, '研究清单'), CHECKS.map(([key, label]) => React.createElement('label', { className: 'sq-check', key }, React.createElement('input', { type: 'checkbox', checked: Boolean(form.checks[key]), onChange: (e) => setForm({ ...form, checks: { ...form.checks, [key]: e.target.checked } }) }), label))),
        React.createElement(Field, { label: '主要风险' }, React.createElement('textarea', { value: form.riskNote, onChange: (e) => setForm({ ...form, riskNote: e.target.value }), required: true, placeholder: '什么情况说明逻辑失效？' })),
        React.createElement('button', { className: 'sq-primary', type: 'submit' }, '加入研究池')
      ),
      React.createElement('section', { className: 'sq-tool-card' }, React.createElement('h2', null, '候选研究池'),
        data.candidates.length ? data.candidates.map((item) => React.createElement('article', { className: 'sq-record', key: item.id },
          React.createElement('header', null, React.createElement('b', null, item.symbol), React.createElement('button', { type: 'button', onClick: () => onChange({ ...data, candidates: data.candidates.filter((row) => row.id !== item.id) }) }, '删除')),
          React.createElement('strong', null, `${item.total}/5 · ${item.label}`),
          React.createElement('p', null, item.thesis), React.createElement('small', null, `风险：${item.riskNote}`)
        )) : React.createElement(Empty, null, '还没有候选研究。')
      )
    )
  )
}

const emptyReviewForm = () => ({
  date: today(), symbol: '', marketRegime: '待确认', cycleDirection: '待确认', cyclePosition: '待确认', turningSignal: '待确认', marketPhase: '震荡', expectation: '待确认', reality: '待确认', moneyEffect: '待确认',
  indexChange: '', amount: '', upCount: '', downCount: '', upLimit: '', downLimit: '', maxBoard: '', promotionRate: '', brokenRate: '',
  mainline: '', mainlineStage: '待验证', coreRoles: '', sectorFlow: '', anomalyScan: '', holdingsReview: '', plan: '', execution: '', position: '', anchor: '',
  errorType: '无', lesson: '', nextPlan: '', disciplined: null, safetyChecks: {}, dataSource: '手工记录', sourceAt: ''
})

const emptyReviewFilters = () => ({ keyword: '', from: '', to: '', regime: '全部环境', cycle: '全部位置', phase: '全部阶段', errorType: '全部错误', discipline: 'all' })

const REVIEW_SOURCES = [
  ['指数与成交额', '腾讯行情 / K 线'],
  ['涨停、跌停、炸板', '东财涨停池 / 炸板池 / 跌停池'],
  ['连板与晋级率', '东财昨日涨停池'],
  ['板块与主线', '行业排名 / 板块资金流']
]

const SAFETY_CHECKS = [
  ['inMode', '开仓是否属于既定模式'], ['cycleAllows', '周期与板块是否允许开仓'], ['anchorClear', '防守锚是否清晰'],
  ['notFishTail', '是否避开鱼尾与过度一致'], ['positionProgressive', '仓位是否按确认度递进'], ['acceptStop', '是否能无条件接受止损']
]

const REVIEW_STEPS = [
  ['market', '01', '市场与情绪', '四轴、广度与赚钱效应'],
  ['mainline', '02', '主线与角色', '五步验证与角色梯队'],
  ['holding', '03', '持仓与执行', '仓位、逻辑与防守锚'],
  ['correction', '04', '门禁与纠错', '纪律检查与次日剧本']
]

const displayNumber = (value, suffix = '') => value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`
const toneClass = (value) => Number(value) > 0 ? 'is-up' : Number(value) < 0 ? 'is-down' : ''

function IntradayLine({ trend }) {
  const points = trend?.points || []
  if (points.length < 2) return React.createElement(Empty, null, '当前日期没有可用的指数分时数据。')
  const values = points.map((item) => Number(item.changePct)).filter(Number.isFinite)
  const min = Math.min(...values, -0.1); const max = Math.max(...values, 0.1); const range = max - min || 1
  const path = points.map((item, index) => `${index ? 'L' : 'M'} ${(index / (points.length - 1) * 940 + 30).toFixed(1)} ${(210 - (Number(item.changePct) - min) / range * 165).toFixed(1)}`).join(' ')
  const zeroY = (210 - (0 - min) / range * 165).toFixed(1)
  return React.createElement('figure', { className: 'sq-trade-line' },
    React.createElement('svg', { viewBox: '0 0 1000 240', role: 'img', 'aria-label': '上证指数当日涨跌幅分时图' },
      React.createElement('line', { x1: 30, x2: 970, y1: zeroY, y2: zeroY, className: 'sq-trade-zero' }),
      React.createElement('path', { d: `${path} L 970 220 L 30 220 Z`, className: 'sq-trade-area' }),
      React.createElement('path', { d: path, className: 'sq-trade-path' })
    ),
    React.createElement('figcaption', null, React.createElement('span', null, '09:30'), React.createElement('span', null, `最低 ${displayNumber(min.toFixed(2), '%')} · 最高 ${displayNumber(max.toFixed(2), '%')}`), React.createElement('span', null, '15:00'))
  )
}

function TradeDataDashboard({ state, date, snapshots, onDate, onRefresh, onUse }) {
  const result = state.result
  const data = result?.tradeData
  const savedRecord = (snapshots || []).find((item) => item.tradeDate === (date || data?.tradeDate))
  if (state.loading && !data) return React.createElement('section', { className: 'sq-trade-loading', role: 'status', 'aria-live': 'polite' }, React.createElement('b', null, '正在汇总今日交易数据…'), React.createElement('p', null, '指数、成交额、涨跌分布、涨停梯队和题材数据正在依次采集。'))
  if (state.error && !data) return React.createElement('section', { className: 'sq-auto-error', role: 'alert' }, React.createElement('b', null, '交易数据加载失败'), React.createElement('span', null, state.error), React.createElement('button', { type: 'button', onClick: () => onRefresh(true) }, '重试'))
  if (!data) return null
  const stats = data.limitStats || {}
  const breadth = data.breadth
  const distribution = breadth?.distribution ? [
    ['跌停/-10%', breadth.distribution.down10], ['-10~-5%', breadth.distribution.down5], ['-5~-2%', breadth.distribution.down2], ['-2~0%', breadth.distribution.down0], ['平盘', breadth.distribution.flat], ['0~2%', breadth.distribution.up0], ['2~5%', breadth.distribution.up2], ['5~10%', breadth.distribution.up5], ['10%+', breadth.distribution.up10]
  ] : []
  const maxDistribution = Math.max(1, ...distribution.map(([, value]) => value || 0))
  return React.createElement('div', { className: 'sq-trade-dashboard' },
    React.createElement('header', { className: 'sq-trade-toolbar' },
      React.createElement('div', null, React.createElement('span', { className: 'sq-eyebrow' }, 'TODAY TRADE DATA'), React.createElement('h2', null, '今日大盘交易数据'), React.createElement('p', null, '公开行情聚合 · 红涨绿跌 · 缺失数据不按 0 处理')),
      React.createElement('div', { className: 'sq-trade-actions' },
        React.createElement(Field, { label: '交易日期' }, React.createElement('input', { type: 'date', value: date || data.tradeDate || '', onChange: (event) => onDate(event.target.value) })),
        (snapshots || []).length > 0 && React.createElement(Field, { label: `已保存 ${snapshots.length} 天` }, React.createElement('select', { value: date || data.tradeDate || '', onChange: (event) => onDate(event.target.value) }, (snapshots || []).map((item) => React.createElement('option', { key: item.tradeDate, value: item.tradeDate }, item.tradeDate)))),
        React.createElement('button', { className: 'sq-secondary', type: 'button', disabled: state.loading, onClick: () => onRefresh(true) }, state.loading ? '刷新并保存中…' : '刷新并保存'),
        React.createElement('button', { className: 'sq-primary', type: 'button', onClick: onUse }, '生成复盘草稿'))
    ),
    state.error && React.createElement('div', { className: 'sq-trade-stale', role: 'status' }, `刷新请求失败，继续展示上次成功数据：${state.error}`),
    result.preservedSections?.length > 0 && React.createElement('div', { className: 'sq-trade-preserved', role: 'status' }, React.createElement('b', null, '部分数据沿用该日最近一次成功快照'), React.createElement('span', null, `${result.preservedSections.join('、')}本次未能重新取得，未用空值覆盖已保存数据。`)),
    React.createElement('div', { className: 'sq-trade-save-state', role: 'status' },
      React.createElement('b', null, savedRecord ? '已自动保存' : state.loading ? '采集完成后自动保存' : '等待保存'),
      React.createElement('span', null, savedRecord ? `${savedRecord.tradeDate} · 最近更新 ${new Date(savedRecord.updatedAt || savedRecord.savedAt).toLocaleString('zh-CN')}` : '每个交易日保存一份；刷新会覆盖该日快照，不会重复新增。')),
    React.createElement('div', { className: 'sq-trade-index-strip' }, (data.indices || []).map((item) => React.createElement('article', { key: item.ticker }, React.createElement('span', null, item.name), React.createElement('strong', { className: toneClass(item.changePct) }, displayNumber(item.price)), React.createElement('em', { className: toneClass(item.changePct) }, displayNumber(item.changePct, '%'))))),
    React.createElement('div', { className: 'sq-trade-main-grid' },
      React.createElement('section', { className: 'sq-trade-panel sq-trade-chart-panel' }, React.createElement('header', null, React.createElement('div', null, React.createElement('span', null, 'INDEX INTRADAY'), React.createElement('h3', null, '大盘异动 · 上证指数')), React.createElement('b', { className: toneClass(data.indices?.[0]?.changePct) }, displayNumber(data.indices?.[0]?.changePct, '%'))), React.createElement(IntradayLine, { trend: data.trend })),
      React.createElement('aside', { className: 'sq-trade-panel sq-turnover-card' }, React.createElement('span', null, '两市成交额'), React.createElement('strong', null, displayNumber(data.turnover?.amount, ' 亿')), React.createElement('p', { className: toneClass(data.turnover?.amountChangePct) }, `较昨日 ${displayNumber(data.turnover?.amountChangePct, '%')}`), React.createElement('dl', null, React.createElement('div', null, React.createElement('dt', null, '昨日成交额'), React.createElement('dd', null, displayNumber(data.turnover?.previousAmount, ' 亿'))), React.createElement('div', null, React.createElement('dt', null, '数据状态'), React.createElement('dd', null, result.status === 'complete' ? '完整' : '部分可用'))))
    ),
    React.createElement('section', { className: 'sq-trade-stat-grid' }, [['上涨', breadth?.upCount], ['下跌', breadth?.downCount], ['涨停', stats.upLimit], ['跌停', stats.downLimit], ['封板率', stats.sealRate, '%'], ['炸板', stats.brokenCount], ['最高板', stats.maxBoard, ' 板'], ['晋级率', stats.promotionRate, '%']].map(([label, value, suffix]) => React.createElement('article', { key: label }, React.createElement('span', null, label), React.createElement('strong', { className: ['上涨', '涨停', '封板率', '晋级率'].includes(label) ? 'is-up' : ['下跌', '跌停', '炸板'].includes(label) ? 'is-down' : '' }, displayNumber(value, suffix || ''))))),
    React.createElement('section', { className: 'sq-trade-panel sq-distribution' }, React.createElement('header', null, React.createElement('div', null, React.createElement('span', null, 'MARKET BREADTH'), React.createElement('h3', null, '涨跌分布')), breadth ? React.createElement('b', null, `${breadth.upCount} : ${breadth.downCount}`) : React.createElement('b', null, '数据不可用')), distribution.length ? React.createElement('div', { className: 'sq-distribution-bars' }, distribution.map(([label, value], index) => React.createElement('div', { key: label }, React.createElement('span', null, label), React.createElement('i', { className: index < 4 ? 'is-down' : index > 4 ? 'is-up' : '', style: { height: `${Math.max(4, value / maxDistribution * 100)}%` } }), React.createElement('b', null, value)))) : React.createElement(Empty, null, '该日期的全市场涨跌分布不可用。')),
    React.createElement('div', { className: 'sq-trade-columns' },
      React.createElement('section', { className: 'sq-trade-panel' }, React.createElement('header', null, React.createElement('div', null, React.createElement('span', null, 'LIMIT LADDER'), React.createElement('h3', null, '涨停梯队')), React.createElement('b', null, `${stats.upLimit ?? '—'} 只`)), React.createElement('div', { className: 'sq-limit-ladder' }, (data.ladder || []).map((group) => React.createElement('article', { key: group.board }, React.createElement('div', null, React.createElement('strong', null, group.label), React.createElement('span', null, `${group.count} 只`)), React.createElement('p', null, group.stocks.map((stock) => `${stock.name} · ${stock.theme}`).join('　')))))),
      React.createElement('section', { className: 'sq-trade-panel' }, React.createElement('header', null, React.createElement('div', null, React.createElement('span', null, 'HOT THEMES'), React.createElement('h3', null, '热门题材表现')), React.createElement('b', null, `${data.themes?.length || 0} 个`)), React.createElement('div', { className: 'sq-theme-ranking' }, (data.themes || []).slice(0, 8).map((theme, index) => React.createElement('article', { key: theme.name }, React.createElement('span', null, String(index + 1).padStart(2, '0')), React.createElement('div', null, React.createElement('strong', null, theme.name), React.createElement('small', null, `最高 ${theme.maxBoard} 板 · ${theme.leaders.map((item) => item.name).filter(Boolean).join('、') || '待确认龙头'}`)), React.createElement('b', null, `${theme.count} 只`)))))
    ),
    React.createElement('div', { className: 'sq-trade-columns is-bottom' },
      React.createElement('section', { className: 'sq-trade-panel' }, React.createElement('header', null, React.createElement('div', null, React.createElement('span', null, 'YESTERDAY LIMIT-UP'), React.createElement('h3', null, '昨日涨停 · 今日表现'))), React.createElement('div', { className: 'sq-yesterday-performance' }, [['样本', data.yesterdayPerformance?.total, ' 只'], ['平均涨幅', data.yesterdayPerformance?.averageChangePct, '%'], ['上涨 / 下跌', `${data.yesterdayPerformance?.upCount ?? '—'} / ${data.yesterdayPerformance?.downCount ?? '—'}`], ['成功晋级', data.yesterdayPerformance?.promoted, ' 只']].map(([label, value, suffix]) => React.createElement('article', { key: label }, React.createElement('span', null, label), React.createElement('strong', null, displayNumber(value, suffix || '')))))),
      React.createElement('section', { className: 'sq-trade-panel sq-access-note' }, React.createElement('header', null, React.createElement('div', null, React.createElement('span', null, 'DATA SCOPE'), React.createElement('h3', null, '数据范围与权限边界'))), React.createElement('p', null, '本地版复刻公开可见的数据工作台，不调用量化复盘网的私有加密接口，也不绕过登录或订阅权限。严重异动预测与付费进阶指标不采集。'), React.createElement('small', null, `生成于 ${new Date(result.generatedAt).toLocaleString('zh-CN')} · ${result.cached ? '缓存数据' : '实时采集'}`))
    ),
    React.createElement('details', { className: 'sq-trade-sources' }, React.createElement('summary', null, '查看数据源与降级状态'), React.createElement('div', null, Object.entries(result.sources || {}).map(([key, source]) => React.createElement('p', { key }, React.createElement('b', null, key), React.createElement('span', null, source.status === 'ok' ? `${source.source} · 正常` : source.preserved ? `本次不可用 · 展示已保存快照 · ${source.error}` : `不可用 · ${source.error}`)))))
  )
}

function storedTradeResult(record) {
  if (!record?.tradeData) return null
  return { ok: true, localSnapshot: true, cached: true, schemaVersion: record.schemaVersion, status: record.status, tradeDate: record.tradeDate, generatedAt: record.generatedAt, preservedSections: record.preservedSections || [], tradeData: record.tradeData, snapshot: record.snapshot, report: record.report, sources: record.sources }
}

export function ReviewApp({ data, onChange }) {
  const initialStored = data.tradeSnapshots?.[0]
  const initialTradeResult = storedTradeResult(initialStored)
  const tradeResultRef = React.useRef(initialTradeResult)
  const [tab, setTab] = useState('data')
  const [tradeDate, setTradeDate] = useState(initialStored?.tradeDate || '')
  const [tradeState, setTradeState] = useState({ loading: true, error: '', result: initialTradeResult })
  const [form, setForm] = useState(emptyReviewForm)
  const [filters, setFilters] = useState(emptyReviewFilters)
  const [historyLimit, setHistoryLimit] = useState(10)
  const [snapshotText, setSnapshotText] = useState('')
  const [snapshotStatus, setSnapshotStatus] = useState('')
  const [autoState, setAutoState] = useState({ loading: false, error: '' })
  const [autoDraft, setAutoDraft] = useState(null)
  const [formError, setFormError] = useState('')
  const [reviewStep, setReviewStep] = useState('market')
  const stepIndex = REVIEW_STEPS.findIndex(([id]) => id === reviewStep)
  const stats = summarizeReviews(data.reviews)
  const records = filterReviews(data.reviews, filters)
  const visibleRecords = records.slice(0, historyLimit)
  const dateFilterCount = [filters.from, filters.to].filter(Boolean).length
  const otherFilterCount = [filters.keyword, filters.regime !== '全部环境' && filters.regime, filters.cycle !== '全部位置' && filters.cycle, filters.phase !== '全部阶段' && filters.phase, filters.errorType !== '全部错误' && filters.errorType, filters.discipline !== 'all' && filters.discipline].filter(Boolean).length
  const activeFilterCount = dateFilterCount + otherFilterCount
  const field = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setFormError('') }
  const filterField = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setHistoryLimit(10) }
  const option = (value) => React.createElement('option', { key: value, value }, value)
  const requestReview = async (dateValue = '', force = false) => {
    const query = new URLSearchParams()
    if (dateValue) query.set('date', dateValue)
    if (force) query.set('force', '1')
    const response = await fetch(`/api/stock-quiz.recap${query.size ? `?${query}` : ''}`, { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' } })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || !result.ok) throw new Error(result.error || `复盘服务返回 HTTP ${response.status}`)
    return result
  }
  const applyReviewResult = (result) => {
    const draftSnapshot = Object.fromEntries(Object.entries(result.snapshot || {}).map(([key, value]) => [key, value ?? '']))
    setAutoDraft(result)
    setForm((current) => ({
      ...current, ...draftSnapshot, symbol: '全市场今日复盘',
      plan: `预期现实：${result.report.expectation?.action || '待人工确认'}。只执行模式内、周期允许且防守锚清晰的交易。`,
      execution: result.report.summary, position: result.report.suggestedPosition,
      anchor: (result.report.riskLights || []).map((item) => `${item.title}：${item.action}`).join('；') || result.report.risks.join('；'),
      anomalyScan: (result.report.ruleHits || []).join('；'), holdingsReview: '请逐笔核对持仓：所属主线与角色、买入逻辑、当前承接、防守锚、是否需要减仓或清仓。',
      errorType: '无', lesson: `系统定位：${result.snapshot.marketRegime} / ${result.snapshot.cyclePosition} / ${result.snapshot.marketPhase}。请补充个人认知偏差与改进。`,
      nextPlan: result.report.nextPlan, disciplined: null, safetyChecks: {}
    }))
    setAutoState({ loading: false, error: '' })
    setReviewStep('market')
    setTab('write')
  }
  const loadTradeData = async (force = false, dateValue = tradeDate) => {
    setTradeState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const result = await requestReview(dateValue, force)
      const mergedResult = mergeTradeResultWithSnapshot(result, tradeResultRef.current)
      const resolvedDate = mergedResult.tradeData?.tradeDate || mergedResult.snapshot?.date || dateValue
      onChange((current) => {
        const tradeSnapshots = upsertTradeSnapshot(current.tradeSnapshots, mergedResult)
        return tradeSnapshots === current.tradeSnapshots ? current : { ...current, tradeSnapshots }
      })
      tradeResultRef.current = mergedResult
      setTradeDate(resolvedDate)
      setTradeState({ loading: false, error: '', result: mergedResult })
      return mergedResult
    } catch (error) {
      setTradeState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : String(error) }))
      return null
    }
  }
  const selectTradeDate = (value) => {
    setTradeDate(value)
    const stored = (data.tradeSnapshots || []).find((item) => item.tradeDate === value)
    if (stored) {
      const storedResult = storedTradeResult(stored)
      tradeResultRef.current = storedResult
      setTradeState({ loading: false, error: '', result: storedResult })
    } else loadTradeData(false, value)
  }
  const startAutoReview = async () => {
    setAutoState({ loading: true, error: '' })
    try {
      const currentDate = tradeState.result?.tradeData?.tradeDate || ''
      const result = tradeState.result && (!tradeDate || tradeDate === currentDate) ? tradeState.result : await requestReview(tradeDate)
      applyReviewResult(result)
    } catch (error) {
      setAutoState({ loading: false, error: error instanceof Error ? error.message : String(error) })
    }
  }
  useEffect(() => {
    loadTradeData(false, '')
    const timer = globalThis.setInterval(() => {
      if (globalThis.document?.visibilityState !== 'hidden') loadTradeData(false, '')
    }, 120000)
    return () => globalThis.clearInterval(timer)
  }, [])
  const save = (event) => {
    event.preventDefault()
    const required = [['date', '交易日期', 'market'], ['mainline', '当日主线', 'mainline'], ['symbol', '股票/主题', 'holding'], ['plan', '盘前计划', 'holding'], ['execution', '实际执行', 'holding'], ['lesson', '经验与改进', 'correction']]
    const missing = required.find(([key]) => !String(form[key] || '').trim())
    if (missing) {
      setFormError(`请先完成“${missing[1]}”后再保存。`)
      setReviewStep(missing[2])
      return
    }
    const numeric = ['indexChange', 'amount', 'upCount', 'downCount', 'upLimit', 'downLimit', 'maxBoard', 'promotionRate', 'brokenRate']
    const id = autoDraft?.reportId || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const record = { ...form, id, createdAt: Date.now() }
    for (const key of numeric) record[key] = record[key] === '' ? null : (Number.isFinite(Number(record[key])) ? Number(record[key]) : null)
    if (autoDraft) {
      Object.assign(record, {
        reviewType: 'market', autoReport: autoDraft.report, sourceStatus: autoDraft.sources,
        dataFingerprint: JSON.stringify({ snapshot: autoDraft.snapshot, ruleVersion: autoDraft.report.ruleVersion }),
        manualFingerprint: JSON.stringify(form)
      })
      onChange((current) => ({ ...current, reviews: upsertAutoReview(current.reviews, record) }))
    } else {
      onChange((current) => ({ ...current, reviews: [record, ...(current.reviews || [])].slice(0, 200) }))
    }
    setFilters(emptyReviewFilters())
    setHistoryLimit(10)
    setAutoDraft(null)
    setFormError('')
    setReviewStep('market')
    setForm(emptyReviewForm())
    setTab('history')
  }
  const remove = (id) => {
    if (typeof globalThis.confirm === 'function' && !globalThis.confirm('删除后无法恢复，确认删除这条复盘记录吗？')) return
    onChange((current) => ({ ...current, reviews: (current.reviews || []).filter((item) => item.id !== id) }))
  }
  const applySnapshot = () => {
    try {
      const snapshot = normalizeMarketSnapshot(JSON.parse(snapshotText))
      setForm((current) => ({ ...current, ...snapshot, date: snapshot.date || current.date }))
      setSnapshotStatus(`已载入 ${snapshot.dataSource}${snapshot.sourceAt ? ` · ${snapshot.sourceAt}` : ''}`)
    } catch {
      setSnapshotStatus('无法识别 JSON，请检查格式后重试。')
    }
  }
  const metric = (label, value, suffix = '') => React.createElement('div', { className: 'sq-review-metric', key: label }, React.createElement('span', null, label), React.createElement('strong', null, value === null || value === undefined || value === '' ? '—' : `${value}${suffix}`))
  const pairValue = (left, right) => left === null && right === null ? null : `${left ?? '—'} / ${right ?? '—'}`
  return React.createElement('div', { className: 'sq-tool-page sq-review-page' },
    React.createElement('div', { className: 'sq-review-tabs', role: 'tablist', 'aria-label': '复盘页面' },
      React.createElement('button', { id: 'sq-review-tab-data', type: 'button', role: 'tab', tabIndex: tab === 'data' ? 0 : -1, 'aria-selected': tab === 'data', 'aria-controls': 'sq-review-data', className: tab === 'data' ? 'is-active' : '', onClick: () => setTab('data') }, '今日交易数据'),
      React.createElement('button', { id: 'sq-review-tab-write', type: 'button', role: 'tab', tabIndex: tab === 'write' ? 0 : -1, 'aria-selected': tab === 'write', 'aria-controls': 'sq-review-write', className: tab === 'write' ? 'is-active' : '', onClick: () => setTab('write') }, '今日复盘'),
      React.createElement('button', { id: 'sq-review-tab-history', type: 'button', role: 'tab', tabIndex: tab === 'history' ? 0 : -1, 'aria-selected': tab === 'history', 'aria-controls': 'sq-review-history', className: tab === 'history' ? 'is-active' : '', onClick: () => setTab('history') }, `历史记录 ${stats.total ? `(${stats.total})` : ''}`)
    ),
    tab === 'data' ? React.createElement('section', { className: 'sq-review-data', id: 'sq-review-data', role: 'tabpanel', 'aria-labelledby': 'sq-review-tab-data', tabIndex: 0 }, React.createElement(TradeDataDashboard, { state: tradeState, date: tradeDate, snapshots: data.tradeSnapshots || [], onDate: selectTradeDate, onRefresh: (force) => loadTradeData(force), onUse: () => tradeState.result && applyReviewResult(tradeState.result) })) : tab === 'write' ? React.createElement('div', { className: 'sq-review-workspace', id: 'sq-review-write', role: 'tabpanel', 'aria-labelledby': 'sq-review-tab-write', tabIndex: 0 },
      React.createElement('section', { className: 'sq-review-hero' },
        React.createElement('div', null, React.createElement('span', { className: 'sq-eyebrow' }, 'TRADING REVIEW · KNOWLEDGE DRIVEN'), React.createElement('h1', null, '一键生成今日市场复盘草稿'), React.createElement('p', null, '点击后自动采集大盘、涨跌停、晋级率、炸板率和行业强弱，执行“大盘 → 板块 → 个股 → 纠错”逻辑，并填充到今日复盘模板。'), React.createElement('div', { className: 'sq-auto-actions' }, React.createElement('button', { className: 'sq-primary sq-auto-review-button', type: 'button', disabled: autoState.loading, onClick: startAutoReview }, autoState.loading ? '正在采集并分析…' : autoDraft ? '重新生成今日草稿' : '开始今日复盘'), React.createElement('small', null, '生成草稿不会保存 · 检查修改后再点击保存'))),
        React.createElement('div', { className: 'sq-review-stats' }, metric('历史复盘', stats.total, ' 条'), metric('纪律执行率', stats.rate, '%'), metric('已识别偏差', stats.corrected, ' 次'), metric('高频错误', stats.topError))
      ),
      autoState.error && React.createElement('div', { className: 'sq-auto-error', role: 'alert' }, React.createElement('b', null, '自动复盘未完成'), React.createElement('span', null, autoState.error), React.createElement('button', { type: 'button', onClick: startAutoReview }, '重试')),
      autoDraft && React.createElement('div', { className: 'sq-review-overview' },
        React.createElement('section', { className: 'sq-draft-banner', role: 'status', 'aria-live': 'polite' }, React.createElement('div', null, React.createElement('b', null, '今日复盘草稿已填充 · 尚未保存'), React.createElement('span', null, `${autoDraft.snapshot.date} · 置信度 ${Math.round((autoDraft.report.confidence || 0) * 100)}%`)), React.createElement('p', null, autoDraft.report.summary)),
        React.createElement('div', { className: 'sq-overview-strip' }, metric('市场环境', autoDraft.snapshot.marketRegime), metric('周期位置', `${autoDraft.snapshot.cycleDirection} · ${autoDraft.snapshot.cyclePosition}`), metric('情绪阶段', autoDraft.snapshot.marketPhase), metric('仓位上限', autoDraft.report.suggestedPosition), metric('最高风险', autoDraft.report.riskLights?.[0]?.title || '暂无极端红灯')),
        React.createElement('details', { className: 'sq-report-disclosure' }, React.createElement('summary', null, '展开完整知识规则报告'), React.createElement(ReportDashboard, { report: autoDraft.report }))
      ),
      React.createElement('div', { className: 'sq-review-editor-layout' },
      React.createElement('nav', { className: 'sq-review-step-nav', 'aria-label': '复盘编辑步骤' },
        React.createElement('span', null, 'TODAY REVIEW'),
        REVIEW_STEPS.map(([id, number, title, description]) => React.createElement('button', { key: id, type: 'button', className: reviewStep === id ? 'is-active' : '', 'aria-current': reviewStep === id ? 'step' : undefined, onClick: () => setReviewStep(id) }, React.createElement('b', null, number), React.createElement('span', null, title), React.createElement('small', null, description)))
      ),
      React.createElement('form', { className: 'sq-review-form', onSubmit: save, 'aria-busy': autoState.loading },
        formError && React.createElement('div', { className: 'sq-form-error', role: 'alert' }, formError),
        React.createElement('div', { className: 'sq-manual-note' }, React.createElement('b', null, autoDraft ? '请检查当前步骤中的自动结论' : '今日复盘模板'), React.createElement('span', null, autoDraft ? '自动字段可修改；完成四步后再保存进入历史。' : '点击上方按钮自动填充，也可以直接手工记录。')),
        reviewStep === 'market' && React.createElement('section', { className: 'sq-review-section' },
          React.createElement('header', null, React.createElement('div', null, React.createElement('small', null, 'STEP 01'), React.createElement('h2', null, '市场四轴与赚钱效应')), React.createElement('span', { className: 'sq-review-hint' }, '大盘环境、周期位置、情绪阶段、预期现实分别确认')),
          React.createElement('div', { className: 'sq-review-grid is-3' },
            React.createElement(Field, { label: '交易日期' }, React.createElement('input', { type: 'date', value: form.date, onChange: (e) => field('date', e.target.value), required: true })),
            React.createElement(Field, { label: '市场环境（大盘锚）' }, React.createElement('select', { value: form.marketRegime, onChange: (e) => field('marketRegime', e.target.value) }, MARKET_REGIMES.map(option))),
            React.createElement(Field, { label: '周期方向' }, React.createElement('select', { value: form.cycleDirection, onChange: (e) => field('cycleDirection', e.target.value) }, CYCLE_DIRECTIONS.map(option))),
            React.createElement(Field, { label: '穷变通久位置' }, React.createElement('select', { value: form.cyclePosition, onChange: (e) => field('cyclePosition', e.target.value) }, CYCLE_POSITIONS.map(option))),
            React.createElement(Field, { label: '情绪五阶段' }, React.createElement('select', { value: form.marketPhase, onChange: (e) => field('marketPhase', e.target.value) }, REVIEW_PHASES.map(option))),
            React.createElement(Field, { label: '大众预期' }, React.createElement('select', { value: form.expectation, onChange: (e) => field('expectation', e.target.value) }, EXPECTATION_LEVELS.map(option))),
            React.createElement(Field, { label: '市场现实' }, React.createElement('select', { value: form.reality, onChange: (e) => field('reality', e.target.value) }, REALITY_LEVELS.map(option))),
            React.createElement(Field, { label: '拐点 / 诱多诱空信号' }, React.createElement('input', { value: form.turningSignal, onChange: (e) => field('turningSignal', e.target.value), placeholder: '仅作风险证据，不能单独确认拐点' })),
            React.createElement(Field, { label: '赚钱 / 亏钱效应' }, React.createElement('input', { value: form.moneyEffect, onChange: (e) => field('moneyEffect', e.target.value), placeholder: '例如：结构性机会' })),
            React.createElement(Field, { label: '上证涨跌幅（%）' }, React.createElement('input', { type: 'number', step: '0.01', value: form.indexChange, onChange: (e) => field('indexChange', e.target.value), placeholder: '例如 0.65' })),
            React.createElement(Field, { label: '两市成交额（亿元）' }, React.createElement('input', { type: 'number', min: 0, value: form.amount, onChange: (e) => field('amount', e.target.value), placeholder: '例如 12860' })),
            React.createElement(Field, { label: '上涨 / 下跌家数' }, React.createElement('div', { className: 'sq-dual-input' }, React.createElement('input', { type: 'number', min: 0, value: form.upCount, onChange: (e) => field('upCount', e.target.value), placeholder: '上涨', 'aria-label': '上涨家数' }), React.createElement('input', { type: 'number', min: 0, value: form.downCount, onChange: (e) => field('downCount', e.target.value), placeholder: '下跌', 'aria-label': '下跌家数' }))),
            React.createElement(Field, { label: '涨停 / 跌停家数' }, React.createElement('div', { className: 'sq-dual-input' }, React.createElement('input', { type: 'number', min: 0, value: form.upLimit, onChange: (e) => field('upLimit', e.target.value), placeholder: '涨停', 'aria-label': '涨停家数' }), React.createElement('input', { type: 'number', min: 0, value: form.downLimit, onChange: (e) => field('downLimit', e.target.value), placeholder: '跌停', 'aria-label': '跌停家数' }))),
            React.createElement(Field, { label: '最高连板' }, React.createElement('input', { type: 'number', min: 0, value: form.maxBoard, onChange: (e) => field('maxBoard', e.target.value), placeholder: '板数' })),
            React.createElement(Field, { label: '晋级率（%）' }, React.createElement('input', { type: 'number', min: 0, max: 100, step: '0.1', value: form.promotionRate, onChange: (e) => field('promotionRate', e.target.value) })),
            React.createElement(Field, { label: '炸板率（%）' }, React.createElement('input', { type: 'number', min: 0, max: 100, step: '0.1', value: form.brokenRate, onChange: (e) => field('brokenRate', e.target.value) }))
          )
        ),
        reviewStep === 'mainline' && React.createElement('section', { className: 'sq-review-section' },
          React.createElement('header', null, React.createElement('div', null, React.createElement('small', null, 'STEP 02'), React.createElement('h2', null, '主线与板块')), React.createElement('span', { className: 'sq-review-hint' }, '确定资金正在选择什么')),
          React.createElement('div', { className: 'sq-review-grid is-2' },
            React.createElement(Field, { label: '当日主线 / 核心题材' }, React.createElement('input', { value: form.mainline, onChange: (e) => field('mainline', e.target.value), placeholder: '例如：机器人、算力、低空经济', required: true })),
            React.createElement(Field, { label: '主线阶段（五步验证）' }, React.createElement('select', { value: form.mainlineStage, onChange: (e) => field('mainlineStage', e.target.value) }, MAINLINE_STAGES.map(option))),
            React.createElement(Field, { label: '角色梯队' }, React.createElement('textarea', { value: form.coreRoles, onChange: (e) => field('coreRoles', e.target.value), placeholder: '空间龙、真龙候选、容量中军、补涨/穿越候选；必须人工确认角色' })),
            React.createElement(Field, { label: '板块高度 / 宽度 / 深度 / 回流' }, React.createElement('textarea', { value: form.sectorFlow, onChange: (e) => field('sectorFlow', e.target.value), placeholder: '是否有高度、首板潮、容量中军、分歧后回流和次日溢价？' })),
            React.createElement(Field, { label: '主线异动扫描与规则证据' }, React.createElement('textarea', { value: form.anomalyScan, onChange: (e) => field('anomalyScan', e.target.value), placeholder: '异动股票、老龙反馈、容量标的、量价异常和待验证逻辑' }))
          )
        ),
        reviewStep === 'holding' && React.createElement('section', { className: 'sq-review-section' },
          React.createElement('header', null, React.createElement('div', null, React.createElement('small', null, 'STEP 03'), React.createElement('h2', null, '持仓体检与执行')), React.createElement('span', { className: 'sq-review-hint' }, '角色、仓位、逻辑、防守锚和计划执行逐项核对')),
          React.createElement('div', { className: 'sq-review-grid is-2' },
            React.createElement(Field, { label: '股票 / 主题' }, React.createElement('input', { value: form.symbol, onChange: (e) => field('symbol', e.target.value), placeholder: '代码、名称或组合主题', required: true })),
            React.createElement(Field, { label: '逐笔持仓体检' }, React.createElement('textarea', { value: form.holdingsReview, onChange: (e) => field('holdingsReview', e.target.value), placeholder: '每笔持仓：所属主线、角色、成本与仓位、买入逻辑、当前承接、防守锚、处理动作' })),
            React.createElement(Field, { label: '仓位与盈亏' }, React.createElement('input', { value: form.position, onChange: (e) => field('position', e.target.value), placeholder: '例如：3 成仓，+2.4%' })),
            React.createElement(Field, { label: '盘前计划' }, React.createElement('textarea', { value: form.plan, onChange: (e) => field('plan', e.target.value), placeholder: '模式、触发条件和禁止事项', required: true })),
            React.createElement(Field, { label: '实际执行' }, React.createElement('textarea', { value: form.execution, onChange: (e) => field('execution', e.target.value), placeholder: '实际买卖与盘中决策', required: true })),
            React.createElement(Field, { label: '防守锚 / 逻辑失效点' }, React.createElement('textarea', { value: form.anchor, onChange: (e) => field('anchor', e.target.value), placeholder: '跌破什么位置或出现什么事实必须退出？' }))
          )
        ),
        reviewStep === 'correction' && React.createElement('section', { className: 'sq-review-section' },
          React.createElement('header', null, React.createElement('div', null, React.createElement('small', null, 'STEP 04'), React.createElement('h2', null, '开仓门禁、纠错与次日剧本')), React.createElement('span', { className: 'sq-review-hint' }, '任一红灯或未知项都不应转化为开仓许可')),
          React.createElement('div', { className: 'sq-review-grid is-2' },
            React.createElement('fieldset', { className: 'sq-safety-checks' }, React.createElement('legend', null, '开仓三问 + 防腰斩五问'), React.createElement('small', null, '只有全部明确确认，才允许把候选计划转成开仓动作。'), SAFETY_CHECKS.map(([key, label]) => React.createElement('label', { key }, React.createElement('input', { type: 'checkbox', checked: Boolean(form.safetyChecks?.[key]), onChange: (e) => field('safetyChecks', { ...(form.safetyChecks || {}), [key]: e.target.checked }) }), React.createElement('span', null, label)))),
            React.createElement(Field, { label: '错误分类' }, React.createElement('select', { value: form.errorType, onChange: (e) => field('errorType', e.target.value) }, REVIEW_ERROR_TYPES.map(option))),
            React.createElement('fieldset', { className: 'sq-discipline-choice' }, React.createElement('legend', null, '纪律执行评估'), [['pending', null, '待评估'], ['pass', true, '按计划执行'], ['fail', false, '存在偏差']].map(([value, state, label]) => React.createElement('label', { key: value }, React.createElement('input', { type: 'radio', name: 'review-discipline', value, checked: form.disciplined === state, onChange: () => field('disciplined', state) }), React.createElement('span', null, label)))), 
            React.createElement(Field, { label: '经验与改进' }, React.createElement('textarea', { value: form.lesson, onChange: (e) => field('lesson', e.target.value), placeholder: '本次最重要的一条教训', required: true })),
            React.createElement(Field, { label: '下一交易日行动' }, React.createElement('textarea', { value: form.nextPlan, onChange: (e) => field('nextPlan', e.target.value), placeholder: '观察、等待、减仓或只做某一模式' }))
          )
        ),
        React.createElement('footer', { className: 'sq-review-submit sq-review-sticky-actions' },
          React.createElement('span', null, `步骤 ${stepIndex + 1}/${REVIEW_STEPS.length} · ${autoDraft ? '草稿尚未保存' : '手工复盘'}`),
          React.createElement('div', null,
            stepIndex > 0 && React.createElement('button', { className: 'sq-secondary', type: 'button', onClick: () => setReviewStep(REVIEW_STEPS[stepIndex - 1][0]) }, '上一步'),
            stepIndex < REVIEW_STEPS.length - 1 && React.createElement('button', { className: 'sq-primary', type: 'button', onClick: () => setReviewStep(REVIEW_STEPS[stepIndex + 1][0]) }, '下一步'),
            stepIndex === REVIEW_STEPS.length - 1 && React.createElement('button', { className: 'sq-primary', type: 'submit' }, '保存复盘并进入历史')
          )
        )
      ),
      React.createElement('aside', { className: 'sq-review-aside' },
        React.createElement('section', { className: 'sq-review-source-card' },
          React.createElement('span', { className: 'sq-eyebrow' }, 'DATA REFERENCE'), React.createElement('h3', null, 'a-stock-data 数据映射'), React.createElement('p', null, '页面字段参考该项目的数据口径；网络不可用时仍可手工复盘。'),
          REVIEW_SOURCES.map(([label, source]) => React.createElement('div', { key: label }, React.createElement('span', null, label), React.createElement('b', null, source))),
          React.createElement('details', null, React.createElement('summary', null, '导入 JSON 数据快照'), React.createElement('textarea', { value: snapshotText, onChange: (e) => setSnapshotText(e.target.value), placeholder: '{"date":"2026-10-09","upLimit":58,"brokenRate":21.4,...}' }), React.createElement('button', { className: 'sq-secondary', type: 'button', onClick: applySnapshot }, '载入到表单'), snapshotStatus && React.createElement('small', { role: 'status', 'aria-live': 'polite' }, snapshotStatus))
        ),
        React.createElement('section', { className: 'sq-review-knowledge-card' }, React.createElement('span', null, '复盘原则'), React.createElement('blockquote', null, '大盘决定仓位上限，板块决定选股范围，个股决定盈亏兑现。'), React.createElement('small', null, '数据本身是死的，解读与行动规则才是复盘。'))
      )
      )
    ) : React.createElement('div', { className: 'sq-review-history', id: 'sq-review-history', role: 'tabpanel', 'aria-labelledby': 'sq-review-tab-history', tabIndex: 0 },
      React.createElement('section', { className: 'sq-review-filter' },
        React.createElement('div', { className: 'sq-history-filter-head' }, React.createElement('div', null, React.createElement('span', { className: 'sq-eyebrow' }, 'HISTORY QUERY'), React.createElement('h2', null, '历史复盘查询'), React.createElement('p', null, `找到 ${records.length} 条记录${activeFilterCount ? ` · ${activeFilterCount} 个筛选条件` : ''}`)), activeFilterCount > 0 && React.createElement('button', { className: 'sq-secondary', type: 'button', onClick: () => { setFilters(emptyReviewFilters()); setHistoryLimit(10) } }, '清空筛选')),
        React.createElement('div', { className: 'sq-history-filter-stack' },
          React.createElement('div', { className: 'sq-history-date-row' },
            React.createElement(Field, { label: '开始日期' }, React.createElement('input', { type: 'date', value: filters.from, onChange: (e) => filterField('from', e.target.value) })),
            React.createElement(Field, { label: '结束日期' }, React.createElement('input', { type: 'date', value: filters.to, onChange: (e) => filterField('to', e.target.value) })),
          React.createElement('details', { className: 'sq-advanced-filters sq-history-more-filters' },
            React.createElement('summary', null, `其他筛选${otherFilterCount ? ` (${otherFilterCount})` : ''}`),
            React.createElement('div', { className: 'sq-review-filter-grid sq-history-filter-grid' },
            React.createElement(Field, { label: '关键词' }, React.createElement('input', { value: filters.keyword, onChange: (e) => filterField('keyword', e.target.value), placeholder: '股票、题材、错误或教训' })),
            React.createElement(Field, { label: '市场环境' }, React.createElement('select', { value: filters.regime, onChange: (e) => filterField('regime', e.target.value) }, ['全部环境', ...MARKET_REGIMES].map(option))),
            React.createElement(Field, { label: '穷变通久' }, React.createElement('select', { value: filters.cycle, onChange: (e) => filterField('cycle', e.target.value) }, ['全部位置', ...CYCLE_POSITIONS].map(option))),
            React.createElement(Field, { label: '情绪阶段' }, React.createElement('select', { value: filters.phase, onChange: (e) => filterField('phase', e.target.value) }, ['全部阶段', ...REVIEW_PHASES].map(option))),
            React.createElement(Field, { label: '错误类型' }, React.createElement('select', { value: filters.errorType, onChange: (e) => filterField('errorType', e.target.value) }, ['全部错误', ...REVIEW_ERROR_TYPES].map(option))),
            React.createElement(Field, { label: '纪律执行' }, React.createElement('select', { value: filters.discipline, onChange: (e) => filterField('discipline', e.target.value) }, React.createElement('option', { value: 'all' }, '全部'), React.createElement('option', { value: 'yes' }, '按计划执行'), React.createElement('option', { value: 'no' }, '存在执行偏差')))
          )
          )
        )
      ),
      ),
      React.createElement('section', { className: 'sq-history-report-feed', 'aria-label': '历史复盘报告列表' },
        visibleRecords.length ? visibleRecords.map((item, index) => React.createElement('article', { className: 'sq-history-report-card', key: item.id },
          React.createElement('header', { className: 'sq-history-report-head' },
            React.createElement('div', { className: 'sq-history-report-index' }, React.createElement('span', null, String(index + 1).padStart(2, '0')), React.createElement('div', null, React.createElement('time', { dateTime: item.date }, item.date || '未标日期'), React.createElement('h2', null, item.symbol))),
            React.createElement('div', { className: 'sq-history-report-tags' }, React.createElement('em', null, item.marketRegime), React.createElement('em', null, item.marketPhase), React.createElement('em', { className: item.disciplined === null ? '' : item.disciplined ? 'is-good' : 'is-warn' }, item.disciplined === null ? '待评估' : item.disciplined ? '按计划' : '有偏差'), item.errorType !== '无' && React.createElement('em', { className: 'is-risk' }, item.errorType)),
            React.createElement('button', { className: 'sq-history-delete', type: 'button', onClick: () => remove(item.id), 'aria-label': `删除 ${item.date} ${item.symbol}` }, '删除')
          ),
          React.createElement('section', { className: 'sq-history-decision' }, React.createElement('div', null, React.createElement('span', null, '核心结论'), React.createElement('h3', null, `${item.marketRegime} · ${item.marketPhase} · 主线 ${item.mainline || '待确认'}`), React.createElement('p', null, item.autoReport?.summary || item.execution || item.plan || '未记录结论。')), React.createElement('aside', null, React.createElement('span', null, '仓位上限 / 风险锚'), React.createElement('strong', null, item.position || '未记录'), React.createElement('small', null, item.anchor || '未记录风险锚。'), item.autoReport?.riskLights?.[0] && React.createElement('em', { className: 'sq-history-risk-focus' }, `${item.autoReport.riskLights[0].title}：${item.autoReport.riskLights[0].action}`))),
          React.createElement('div', { className: 'sq-history-market-strip' }, metric('周期位置', `${item.cycleDirection} · ${item.cyclePosition}`), metric('预期 × 现实', `${item.expectation} × ${item.reality}`), metric('赚钱效应', item.moneyEffect), metric('涨 / 跌停', pairValue(item.upLimit, item.downLimit)), metric('晋级 / 炸板', pairValue(item.promotionRate, item.brokenRate), '%')),
          React.createElement('div', { className: 'sq-history-report-body' },
            React.createElement('section', null, React.createElement('header', null, React.createElement('span', null, '01'), React.createElement('h3', null, '主线与市场判断')), React.createElement('dl', null, React.createElement('div', null, React.createElement('dt', null, '主线阶段'), React.createElement('dd', null, `${item.mainlineStage} · ${item.mainline || '未记录'}`)), React.createElement('div', null, React.createElement('dt', null, '角色梯队'), React.createElement('dd', null, item.coreRoles || '未确认角色')), React.createElement('div', null, React.createElement('dt', null, '板块四维'), React.createElement('dd', null, item.sectorFlow || '未记录')), React.createElement('div', null, React.createElement('dt', null, '异动证据'), React.createElement('dd', null, item.anomalyScan || '未记录')))),
            React.createElement('section', null, React.createElement('header', null, React.createElement('span', null, '02'), React.createElement('h3', null, '持仓与执行')), React.createElement('dl', null, React.createElement('div', null, React.createElement('dt', null, '持仓体检'), React.createElement('dd', null, item.holdingsReview || '未逐笔核对')), React.createElement('div', null, React.createElement('dt', null, '盘前计划'), React.createElement('dd', null, item.plan || '未记录')), React.createElement('div', null, React.createElement('dt', null, '实际执行'), React.createElement('dd', null, item.execution || '未记录')), React.createElement('div', null, React.createElement('dt', null, '开仓门禁'), React.createElement('dd', null, `${Object.values(item.safetyChecks || {}).filter(Boolean).length}/${SAFETY_CHECKS.length} 已确认`)))),
            React.createElement('section', { className: 'is-wide' }, React.createElement('header', null, React.createElement('span', null, '03'), React.createElement('h3', null, '纠错与次日剧本')), React.createElement('div', { className: 'sq-history-correction' }, React.createElement('article', null, React.createElement('span', null, `错误分类 · ${item.errorType}`), React.createElement('p', null, item.lesson || '未记录经验与改进。')), React.createElement('article', null, React.createElement('span', null, '下一交易日行动'), React.createElement('p', null, item.nextPlan || '未记录下一交易日剧本。'))))
          ),
          item.autoReport && React.createElement('details', { className: 'sq-report-disclosure is-history' }, React.createElement('summary', null, '展开完整知识规则报告与证据'), React.createElement(ReportDashboard, { report: item.autoReport })),
          React.createElement('footer', null, React.createElement('span', null, `数据来源：${item.dataSource}${item.sourceAt ? ` · ${item.sourceAt}` : ''}`), React.createElement('span', null, `保存于 ${item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '未知时间'}`))
        )) : React.createElement(Empty, null, stats.total ? '没有符合当前条件的记录。' : '还没有复盘记录，先完成今日复盘。'),
        historyLimit < records.length && React.createElement('button', { className: 'sq-secondary sq-history-load-more', type: 'button', onClick: () => setHistoryLimit((current) => current + 10) }, `继续加载（剩余 ${records.length - historyLimit} 条）`)
      )
    )
  )
}
