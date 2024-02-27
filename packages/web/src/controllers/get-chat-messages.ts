import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { zValidator } from '@hono/zod-validator'
import {
  getChatMessagesParams,
  getChatMessagesQuery,
  GetChatMessagesResponse,
} from '@rocketseat/houston-contracts'
import { sql, eq, and, desc, lt } from 'drizzle-orm'
import { db } from '../db'
import { messages, chats } from '../db/schema'

export const getChatMessagesController = new Hono<HoustonApp>()

getChatMessagesController.get(
  '/chats/:chatId/messages',
  zValidator('param', getChatMessagesParams),
  async (c) => {
    const { cursor, pageSize } = getChatMessagesQuery.parse(c.req.query())
    const { chatId } = c.req.valid('param')
    const atlasUserId = c.get('atlasUserId')

    const [countResult, result] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .innerJoin(chats, eq(chats.id, messages.chatId))
        .where(
          and(eq(chats.atlasUserId, atlasUserId), eq(messages.chatId, chatId)),
        ),
      db
        .select({
          id: messages.id,
          role: messages.role,
          source: messages.source,
          text: messages.text,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .leftJoin(chats, eq(chats.id, messages.chatId))
        .where(
          and(
            eq(chats.atlasUserId, atlasUserId),
            eq(messages.chatId, chatId),
            cursor ? lt(messages.id, cursor) : undefined,
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(pageSize),
    ])

    const totalCount = countResult[0].count

    return c.json<GetChatMessagesResponse>({
      totalCount,
      messages: result.map((message) => {
        return {
          id: message.id.toString(),
          role: message.role,
          source: message.source,
          text: message.text,
          createdAt: message.createdAt,
        }
      }),
    })
  },
)
