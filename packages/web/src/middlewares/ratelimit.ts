import { Hono } from 'hono'
import { env } from '../env'
import { ratelimit } from '../lib/redis'
import { HoustonApp } from '../types'

export const rateLimitMiddleware = new Hono<HoustonApp>()

rateLimitMiddleware.use('*', async (c, next) => {
  const atlasUserId = c.get('atlasUserId')

  if (env.NODE_ENV === 'production') {
    await ratelimit.limit(atlasUserId)
  }

  return await next()
})
