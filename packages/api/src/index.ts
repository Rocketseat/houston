import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { db } from './db'
import { chats } from './db/schema'
import { sendMessageBody } from '@rocketseat/houston-contracts'

const app = new Hono()

const routes = app.post(
  '/messages',
  zValidator('json', sendMessageBody),
  async (c) => {
    const result = await db.select().from(chats)

    return c.json(result)
  },
)

export type Api = typeof routes

serve({
  fetch: app.fetch,
  port: 3333,
})
