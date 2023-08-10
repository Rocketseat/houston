import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { HTTPException } from 'hono/http-exception'
import { importSPKI, jwtVerify } from 'jose'
import { z } from 'zod'
import { env } from '../env'

export const verifyJWTMiddleware = new Hono<HoustonApp>()

verifyJWTMiddleware.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    throw new HTTPException(401)
  }

  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer') {
    throw new HTTPException(401)
  }

  const publicKey = await importSPKI(
    Buffer.from(env.JWT_PUBLIC_KEY, 'base64').toString('utf8'),
    'RS256',
  )

  try {
    const { payload } = await jwtVerify(token, publicKey)

    const atlasUserId = z.string().uuid().parse(payload.uid)

    c.set('atlasUserId', atlasUserId)

    return await next()
  } catch (err) {
    throw new HTTPException(401)
  }
})
