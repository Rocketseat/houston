import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { zValidator } from '@hono/zod-validator'
import {
  getChatByIdParams,
  GetChatByIdResponse,
} from '@rocketseat/houston-contracts'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { chats } from '../db/schema'

export const getChatByIdController = new Hono<HoustonApp>()

getChatByIdController.get(
  '/chats/:chatId',
  zValidator('param', getChatByIdParams),
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

    const chat = results[0]

    return c.jsonT<GetChatByIdResponse>({
      chat: {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
      },
    })
  },
)
