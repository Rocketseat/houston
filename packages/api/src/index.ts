import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

import {
  SendMessageResponse,
  sendMessageBody,
} from '@rocketseat/houston-contracts'

const app = new Hono()

const routes = app.post(
  '/messages',
  zValidator('json', sendMessageBody),
  async (c) => {
    return c.jsonT({
      status: 'error',
      message: 'An error has occurred.',
    } satisfies SendMessageResponse)
  },
)

export type Api = typeof routes

serve({
  fetch: app.fetch,
  port: 3333,
})
