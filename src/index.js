import { registerMarketReviewRoute } from './market-review.js'

export const name = 'stock-quiz'

export function apply(ctx) {
  ctx.logger.info('[stock-quiz] 独立股票学习工作台已启用')
  ctx.inject(['connection'], (host) => {
    host.effect(() => registerMarketReviewRoute(host.connection), 'stock-quiz: authenticated market review route')
  })
}
