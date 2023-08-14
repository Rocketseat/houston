import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { zValidator } from '@hono/zod-validator'
import { deleteChatByIdParams } from '@rocketseat/houston-contracts'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { chats } from '../db/schema'

export const deleteChatByIdController = new Hono<HoustonApp>()

deleteChatByIdController.delete(
  '/chats/:chatId',
  zValidator('param', deleteChatByIdParams),
  async (c) => {
    const { chatId } = c.req.valid('param')
    const atlasUserId = c.get('atlasUserId')

    const results = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.atlasUserId, atlasUserId)))

    if (results.length === 0) {
      return new Response(null, {
        status: 400,
      })
    }

    await db
      .update(chats)
      .set({
        atlasUserId: null,
      })
      .where(eq(chats.id, chatId))

    return new Response(null, {
      status: 204,
    })
  },
)
