import { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { importSPKI, jwtVerify } from 'jose'
import { env } from '../env'
import { Env } from '../types'

export const auth: MiddlewareHandler<Env> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader) {
    throw new HTTPException(401)
  }

  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer') {
    throw new HTTPException(401)
  }

  const publicKey = await importSPKI(atob(env.JWT_PUBLIC_KEY), 'RS256')
  const { payload } = await jwtVerify(token, publicKey)

  const atlasUserId = z.string().uuid().parse(payload.uid)

  c.set('atlasUserId', atlasUserId)

  return await next()
}
