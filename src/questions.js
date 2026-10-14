import { EXTRA_QUESTIONS } from './extra-questions.js'
import { KNOWLEDGE_CATALOG, CHAPTERS } from './catalog.js'

const BASE_QUESTIONS = [
  {
    id: 'cycle-core', source: '周期论交易员手册', chapter: '核心框架', type: 'single', difficulty: '基础',
    prompt: '《周期论》的核心观点是什么？',
    options: ['价值决定价格，长期只看基本面', '情绪变化永远落后于价格变化', '成交量决定一切趋势', '大盘涨跌完全决定个股涨跌'],
    answer: [1],
    explanation: '价格是客观现实且先行，情绪是主观预期且滞后。价格与情绪之间的预期差，是交易机会的重要来源。',
    keywords: ['核心观点', '情绪', '价格', '预期差']
  },
  {
    id: 'position-logic', source: '周期论交易员手册', chapter: '核心框架', type: 'single', difficulty: '基础',
    prompt: '周期论的两大要素是？',
    options: ['预期与现实', '位置与逻辑', '价格与成交量', '趋势与形态'],
    answer: [1],
    explanation: '位置对应价格，描述周期变化的过程；逻辑对应情绪，描述变化的成因。位置是逻辑的载体，逻辑是位置的注解。',
    keywords: ['位置', '逻辑', '两大要素']
  },
  {
    id: 'cycle-order', source: '周期论交易员手册', chapter: '周期阶段', type: 'single', difficulty: '基础',
    prompt: '一个完整趋势周期的正确顺序是？',
    options: ['穷→通→变→久→穷', '穷→变→通→久→穷', '变→穷→通→久→穷', '穷→变→久→通→穷'],
    answer: [1],
    explanation: '完整表达为“穷则变、变则通、通则久、久则穷”，并强调周期必完整。',
    keywords: ['穷变通久', '周期阶段', '周期必完整']
  },
  {
    id: 'change-confirm', source: '周期论交易员手册', chapter: '周期阶段', type: 'single', difficulty: '进阶',
    prompt: '关于“变”阶段，下列说法正确的是？',
    options: ['一出现就确认新趋势', '可能只是老周期的次级反弹，需“通”确认', '价格和情绪变化速率相等', '大众已完全认可逻辑'],
    answer: [1],
    explanation: '“通是决胜点，变是发起点”。很多“变”只是老周期中的次级反弹或反抽，需要价格与逻辑双重确认破局。',
    keywords: ['变', '通', '破局', '次级反弹']
  },
  {
    id: 'stage-action', source: '周期论交易员手册', chapter: '周期阶段', type: 'single', difficulty: '基础',
    prompt: '上涨周期制胜口诀中，“久”阶段应如何操作？',
    options: ['空仓等待', '小仓试错', '确定主线并重仓持有', '不断减仓直至空仓'],
    answer: [3],
    explanation: '制胜口诀：穷时空仓；变时小仓试错；通时确定主线、重仓持有；久时不断减仓，直至空仓。',
    keywords: ['久', '减仓', '制胜口诀', '仓位']
  },
  {
    id: 'expectation-four', source: '周期论交易员手册', chapter: '预期与现实', type: 'single', difficulty: '基础',
    prompt: '“高预期 + 弱现实”对应的动作是？',
    options: ['进场猛干', '持有坐轿', '离场休息', '观望等待'],
    answer: [2],
    explanation: '四句口诀：低预期强现实进场猛干；高预期强现实持有坐轿；高预期弱现实离场休息；低预期弱现实观望等待。',
    keywords: ['预期', '现实', '离场休息']
  },
  {
    id: 'expectation-meaning', source: '周期论交易员手册', chapter: '预期与现实', type: 'single', difficulty: '基础',
    prompt: '口诀中的“预期”具体指什么？',
    options: ['交易者自己的愿望', '市场大众的预期', '分析师盈利预测', '上市公司业绩指引'],
    answer: [1],
    explanation: '预期指市场大众预期，而不是交易者自己的预期；现实指市场呈现的客观价格。',
    keywords: ['预期', '大众预期', '客观价格']
  },
  {
    id: 'turning-point', source: '周期论交易员手册', chapter: '拐点选择', type: 'single', difficulty: '进阶',
    prompt: '股价横盘震荡，同时空方情绪预期空前一致，周期论将其概括为？',
    options: ['涨势将尽', '跌势将尽', '诱多（假突破）', '诱空（黄金坑）'],
    answer: [3],
    explanation: '横盘+多方一致为诱多；横盘+空方一致为诱空（黄金坑）。极端一致预期要结合价格所处位置判断。',
    keywords: ['拐点', '诱空', '黄金坑', '横盘']
  },
  {
    id: 'market-anchor', source: '周期论交易员手册', chapter: '大盘是锚', type: 'single', difficulty: '基础',
    prompt: '“大盘是锚”中的“大盘”通常指？',
    options: ['只指上证指数', '只指沪深300', '市场的总价格趋势，平均股价较有代表性', '只指创业板指数'],
    answer: [2],
    explanation: '大盘不是单一指数，而是市场总价格趋势。实践中需结合平均股价及不同宽基、风格指数全面观察。',
    keywords: ['大盘是锚', '大盘', '总价格趋势']
  },
  {
    id: 'review-order', source: '周期论交易员手册', chapter: '复盘体系', type: 'single', difficulty: '基础',
    prompt: '周期论要求的复盘顺序是？',
    options: ['个股→板块→大盘', '板块→个股→大盘', '大盘→板块→个股', '大盘→个股→板块'],
    answer: [2],
    explanation: '复盘遵循自上而下的三重滤网：先看大盘，再看板块，最后锚定个股。',
    keywords: ['复盘', '大盘', '板块', '个股']
  },
  {
    id: 'three-markets', source: '周期论交易员手册', chapter: '大盘是锚', type: 'multiple', difficulty: '进阶',
    prompt: '下列大盘环境与策略的对应关系正确的是？',
    options: ['牛市：重仓持有主线板块', '熊市：龙空龙，单边下跌段空仓', '震荡市：高低切换、预判轮动', '熊市：追涨所有高位板块'],
    answer: [0, 1, 2],
    explanation: '牛市重仓主线；熊市只做抵抗或反弹段的高辨识度标的，单边主跌空仓；震荡市做高低切换和板块轮动。',
    keywords: ['牛市', '熊市', '震荡市', '策略', '龙空龙']
  },
  {
    id: 'no-average-down', source: '周期论交易员手册', chapter: '风险控制', type: 'boolean', difficulty: '基础',
    prompt: '亏损时向下补仓，可以通过摊低成本来降低总风险。',
    options: ['正确', '错误'], answer: [1],
    explanation: '错误。原文强调绝不向下摊薄成本：“向下摊平成本，是亏损的放大器，而不是解药。”',
    keywords: ['补仓', '摊低成本', '止损', '风险']
  },
  {
    id: 'ice-point', source: '周期论交易员手册', chapter: '情绪节点', type: 'boolean', difficulty: '进阶',
    prompt: '情绪冰点就等于确定的市场见底拐点。',
    options: ['正确', '错误'], answer: [1],
    explanation: '错误。情绪冰点并不等于见底拐点，冰点过后可能还有更冰的点，仍需结合价格趋势和周期位置。',
    keywords: ['情绪冰点', '见底', '拐点']
  },
  {
    id: 'theme-formula', source: '野人哥交易实战笔记', chapter: '市场本质', type: 'single', difficulty: '基础',
    prompt: '野人哥笔记中的短线底层公式是？',
    options: ['题材高度=政策/事件级别×板块容量×资金合力×情绪周期位置', '题材高度=政策级别+资金合力', '题材高度=涨停家数×连板高度', '题材高度=成交量÷流通市值'],
    answer: [0],
    explanation: '短线题材高度由政策或事件级别、板块容量、资金合力和情绪周期位置共同作用，不应只看单一因素。',
    keywords: ['题材高度', '底层公式', '资金合力', '情绪周期']
  },
  {
    id: 'stop-loss', source: '野人哥交易实战笔记', chapter: '止损与仓位', type: 'single', difficulty: '基础',
    prompt: '野人哥止损铁律中，单笔最大亏损阈值是？',
    options: ['−3%至−5%', '−5%至−7%', '−8%至−10%', '−10%至−15%'],
    answer: [1],
    explanation: '单笔最大亏损阈值硬性预设为−5%至−7%；触发阈值或买入逻辑消失，必须无条件砍仓。',
    keywords: ['止损', '-5%', '-7%', '亏损阈值']
  },
  {
    id: 'leading-stock', source: '野人哥交易实战笔记', chapter: '龙头战法', type: 'multiple', difficulty: '进阶',
    prompt: '真龙头（空间龙）的硬性判定标准包括？',
    options: ['当前周期连板最高或并列最高但带动性更强', '具备板块助攻，非孤立庄股', '是情绪标杆，资金认可度高', '市值必须超过百亿元'],
    answer: [0, 1, 2],
    explanation: '三者需同时满足：连板身位、板块助攻、情绪标杆。百亿市值是中军常见特征，不是真龙头硬指标。',
    keywords: ['真龙头', '空间龙', '连板', '板块助攻', '情绪标杆']
  },
  {
    id: 'first-divergence', source: '野人哥交易实战笔记', chapter: '买点系统', type: 'single', difficulty: '进阶',
    prompt: '主升首分歧低吸的防守位是？',
    options: ['5日均线', '分歧日最低价', '涨停阳线半分位', 'B点最低价减5%'],
    answer: [1],
    explanation: '可在分歧日尾盘确认承接后低吸，或次日弱转强带量上攻时跟进；防守位为分歧日最低价，破位走人。',
    keywords: ['首分歧', '低吸', '防守位', '分歧日最低价']
  },
  {
    id: 'weak-to-strong', source: '野人哥交易实战笔记', chapter: '买点系统', type: 'single', difficulty: '进阶',
    prompt: '标准弱转强买点中，次日竞价高开区间通常是？',
    options: ['0%至1%', '2%至5%', '7%至9%', '必须一字涨停'],
    answer: [1],
    explanation: '昨日烂板或分歧，次日竞价放量高开2%至5%，9:20—9:25体现坚决吃单，开盘快速带量上攻，才构成标准弱转强。',
    keywords: ['弱转强', '竞价', '2%-5%', '9:20']
  },
  {
    id: 'b-point', source: '野人哥交易实战笔记', chapter: '买点系统', type: 'single', difficulty: '进阶',
    prompt: 'B点识别中，个股通常从近期高点回撤多少？',
    options: ['5%至10%', '15%至30%', '35%至50%', '必须超过50%'],
    answer: [1],
    explanation: 'B点前通常从近期高点回撤15%至30%以上，量能极度萎缩；B点当日出现强承接，防守位为当日最低价−0.5%。',
    keywords: ['B点', '回撤', '15%-30%', '承接']
  },
  {
    id: 'volume-price', source: '野人哥交易实战笔记', chapter: '量价关系', type: 'single', difficulty: '基础',
    prompt: '野人哥关于买入量价条件的原文要求是？',
    options: ['放量突破立刻追入', '量缩至“地量芝麻点”后，再现“倍量红阳”拐头向上', '任何缩量下跌都可买入', '高位历史天量时买入'],
    answer: [1],
    explanation: '买入应等待抛压充分收缩至“地量芝麻点”，随后再由“倍量红阳”验证资金重新主导。',
    keywords: ['地量芝麻点', '倍量红阳', '量价关系']
  },
  {
    id: 'wash-distribute', source: '野人哥交易实战笔记', chapter: '主力行为', type: 'multiple', difficulty: '进阶',
    prompt: '下列更符合“出货”而不是“震仓”的表现有？',
    options: ['高位爆量滞涨', '下跌带持续大单砸，反抽无力', '破锚后无承接', '主升途中急杀后迅速拉回且不破关键位'],
    answer: [0, 1, 2],
    explanation: '出货常见于高位，表现为持续放量不涨、下跌带量、均价线同步创新低、破关键锚点后无承接；D更符合震仓。',
    keywords: ['震仓', '出货', '爆量滞涨', '破锚']
  },
  {
    id: 'position-volume', source: '野人哥交易实战笔记', chapter: '量价关系', type: 'boolean', difficulty: '基础',
    prompt: '同样的量价组合，在高位和低位的意义可能完全相反。',
    options: ['正确', '错误'], answer: [0],
    explanation: '正确。例如量增价跌：低位可能是恐慌盘或挖坑震仓，高位则可能是主力派发，必须结合位置判断。',
    keywords: ['量价', '高位', '低位', '位置']
  },
  {
    id: 'emotion-position', source: '野人哥交易实战笔记', chapter: '情绪周期', type: 'single', difficulty: '基础',
    prompt: '情绪周期的正确节奏口诀是？',
    options: ['冰点满仓→启动减仓→高潮加仓→退潮补仓', '冰点试错→启动确认加→主升做分歧→高潮减→退潮空仓', '启动空仓→主升观望→退潮满仓', '任何阶段都保持固定仓位'],
    answer: [1],
    explanation: '仓位跟着确定性走：冰点极轻仓试错，启动加仓，主升做分歧，高潮减仓，退潮清仓。',
    keywords: ['情绪周期', '冰点', '主升', '退潮', '仓位']
  },
  {
    id: 'position-sizing', source: '野人哥交易实战笔记', chapter: '止损与仓位', type: 'multiple', difficulty: '进阶',
    prompt: '下列仓位管理规则符合原文的是？',
    options: ['试错仓5%至10%', '确认仓递进至20%至30%', '高确定性主仓不超过50%', '退潮期仍应至少保持30%仓位'],
    answer: [0, 1, 2],
    explanation: '仓位跟着确定性走：试错5%—10%，确认20%—30%，主仓不超过50%；退潮期为0或极小仓。',
    keywords: ['仓位管理', '试错仓', '确认仓', '主仓']
  },
  {
    id: 'risk-reward', source: '野人哥交易实战笔记', chapter: '止损与仓位', type: 'single', difficulty: '进阶',
    prompt: '开仓前，潜在盈利空间÷潜在止损亏损的目标要求是？',
    options: ['至少1:1', '至少1.5:1', '目标≥3:1，最低不低于2:1', '盈亏比不重要'],
    answer: [2],
    explanation: '原文标题为盈亏比≥3:1，并说明最少2:1。选择支撑明确、止损空间小且上方压力远的标的。',
    keywords: ['盈亏比', '3:1', '2:1', '开仓条件']
  },
  {
    id: 'five-twenty', source: '野人哥交易实战笔记', chapter: '经典战法', type: 'multiple', difficulty: '进阶',
    prompt: '关于“520战法”，下列说法正确的是？',
    options: ['5日均线是攻击线，20日均线是生命线', '5日线上穿20日线形成金叉', '20日线向下时的金叉多为假信号', '有效跌破20日线仍应继续补仓'],
    answer: [0, 1, 2],
    explanation: '520战法要求20日线走平或向上；上穿时需放量、回调需缩量。有效跌破5日线减半，有效跌破20日线清仓。',
    keywords: ['520战法', '5日均线', '20日均线', '金叉']
  },
  {
    id: 'enlightenment', source: '野人哥交易实战笔记', chapter: '交易心态', type: 'single', difficulty: '基础',
    prompt: '野人哥所说“悟道”的实质是？',
    options: ['能够准确预测每次行情', '承认市场不可预测，靠系统生存并接受系统的亏损和不完美', '掌握所有技术指标', '每次交易都必须盈利'],
    answer: [1],
    explanation: '悟道不是开天眼，而是接受概率和不完美，坚决执行系统，具备空仓自控力，并让情绪与账户脱钩。',
    keywords: ['悟道', '系统', '不可预测', '空仓']
  }
]

const LEGACY_KNOWLEDGE_MAP = {
  'cycle-core':['c01'], 'position-logic':['c02'], 'cycle-order':['c03'], 'change-confirm':['c03'], 'stage-action':['c06'],
  'expectation-four':['c07'], 'expectation-meaning':['c07'], 'turning-point':['c09'], 'market-anchor':['c14'], 'review-order':['c17'],
  'three-markets':['c15'], 'no-average-down':['c21'], 'ice-point':['c13'], 'theme-formula':['w01'], 'stop-loss':['w24'],
  'leading-stock':['w17'], 'first-divergence':['w20'], 'weak-to-strong':['w21'], 'b-point':['w22'], 'volume-price':['w15'],
  'wash-distribute':['w12'], 'position-volume':['w15'], 'emotion-position':['w08'], 'position-sizing':['w09'], 'risk-reward':['w26'],
  'five-twenty':['w31'], 'enlightenment':['w06']
}

export const QUESTION_BANK = [...BASE_QUESTIONS.map((question) => ({ ...question, knowledgeIds: LEGACY_KNOWLEDGE_MAP[question.id] ?? [] })), ...EXTRA_QUESTIONS]
export { KNOWLEDGE_CATALOG, CHAPTERS }

export const KNOWLEDGE_CARDS = [
  { title: '周期论核心', keywords: ['核心', '情绪', '价格', '预期差'], content: '价格是客观现实并率先变化，情绪是大众主观预期且滞后。交易者关注的是情绪追赶价格产生的时间差和空间差。' },
  { title: '位置与逻辑', keywords: ['位置', '逻辑'], content: '位置描述价格周期的过程：穷、变、通、久、穷；逻辑描述大众认知的成因：从隐性到显性、从分歧到一致。位置是逻辑的载体，逻辑是位置的注解。' },
  { title: '周期与仓位', keywords: ['穷', '变', '通', '久', '周期', '仓位'], content: '上涨周期操作：穷时空仓等待，变时小仓试错，通时确认主线并重仓持有，久时逐步减仓直至空仓。' },
  { title: '预期与现实', keywords: ['预期', '现实'], content: '低预期强现实进场猛干；高预期强现实持有坐轿；高预期弱现实离场休息；低预期弱现实观望等待。预期是大众预期，现实是客观价格。' },
  { title: '大盘是锚', keywords: ['大盘', '牛市', '熊市', '震荡市', '复盘'], content: '大盘指市场总价格趋势。复盘顺序为大盘→板块→个股。牛市重仓主线，熊市龙空龙，震荡市高低切换并预判轮动。' },
  { title: '止损纪律', keywords: ['止损', '补仓', '亏损', '回撤'], content: '单笔最大亏损硬阈值为−5%至−7%，破锚或买入逻辑消失即离场；严禁死扛和向下补仓。连续止损2至3笔应降仓或空仓复盘。' },
  { title: '情绪周期', keywords: ['冰点', '启动', '主升', '高潮', '退潮', '情绪周期'], content: '五阶段为冰点、启动、发酵/主升、高潮、退潮。节奏口诀：冰点试错→启动确认加→主升做分歧→高潮减→退潮空仓。' },
  { title: '真龙头判定', keywords: ['龙头', '空间龙', '补涨龙'], content: '真龙头需同时满足：当前周期连板最高或带动性最强、具有板块助攻、是资金认可的情绪标杆。补涨龙通常高度不超过真龙的50%至70%，退潮承接更弱。' },
  { title: '首分歧买点', keywords: ['首分歧', '低吸', '防守位'], content: '主线空间龙打出高度且梯队完整后，首次爆量分歧但未断板；尾盘确认承接可低吸，或次日弱转强跟进。防守位是分歧日最低价。' },
  { title: '弱转强与B点', keywords: ['弱转强', 'B点', '竞价', '承接'], content: '弱转强常见条件：昨日烂板分歧，次日竞价放量高开2%至5%，9:20—9:25体现坚决吃单，开盘快速带量上攻。B点前通常回撤15%至30%，防守位为B点当日最低价−0.5%。' },
  { title: '量价关系', keywords: ['量价', '地量', '倍量', '震仓', '出货'], content: '同一量价组合在高低位可能意义相反。买入要等待“地量芝麻点”后再现“倍量红阳”。高位放量滞涨、下跌带量、破锚无承接更像出货。' },
  { title: '520战法', keywords: ['520', '5日线', '20日线', '金叉', '死叉'], content: '5日均线是攻击线，20日均线是生命线。20日线走平或向上时，5日线上穿20日线的金叉更有效；跌破5日线减半，跌破20日线清仓。' },
  { title: '交易系统与悟道', keywords: ['系统', '悟道', '模式', '空仓'], content: '交易系统由开仓逻辑、仓位管理和出场逻辑构成。悟道是承认市场不可预测、靠系统生存、接受系统自带的亏损与不完美，并具备空仓能力。' }
]

export const ALL_KNOWLEDGE_CARDS = KNOWLEDGE_CATALOG.map((item) => ({
  id: item.id,
  title: item.title,
  source: item.source,
  chapter: item.chapter,
  keywords: item.keywords,
  content: item.content
}))
