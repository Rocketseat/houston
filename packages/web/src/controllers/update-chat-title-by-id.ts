import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { zValidator } from '@hono/zod-validator'
import {
  updateChatTitleByIdParams,
  updateChatTitleByIdBody,
} from '@rocketseat/houston-contracts'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { chats } from '../db/schema'

export const updateChatTitleByIdController = new Hono<HoustonApp>()

updateChatTitleByIdController.patch(
  '/chats/:chatId/title',
  zValidator('param', updateChatTitleByIdParams),
  zValidator('json', updateChatTitleByIdBody),
  async (c) => {
    const atlasUserId = c.get('atlasUserId')

    const { chatId } = c.req.valid('param')
    const { title } = c.req.valid('json')

    const results = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.atlasUserId, atlasUserId)))

    if (results.length === 0) {
      return new Response(null, {
        status: 400,
      })
    }

    await db.update(chats).set({ title }).where(eq(chats.id, chatId))

    return new Response(null, {
      status: 204,
    })
  },
)
