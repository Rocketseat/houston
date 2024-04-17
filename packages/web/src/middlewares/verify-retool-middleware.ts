import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { env } from '../env'
import { HoustonApp } from '../types'

export const verifyRetoolMiddleware = new Hono<HoustonApp>()

verifyRetoolMiddleware.use('*', async (c, next) => {
  const secret = c.req.header('Retool-Secret')

  if (!secret) {
    throw new HTTPException(401)
  }

  if (secret !== env.RETOOL_SECRET_KEY) {
    throw new HTTPException(401)
  }

  return await next()
})
