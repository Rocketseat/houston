import { Hono } from 'hono'
import { HoustonApp } from '../types'
import {
  getRecentChatsQuery,
  GetRecentChatsResponse,
} from '@rocketseat/houston-contracts'
import { sql, and, eq, ilike, desc } from 'drizzle-orm'
import { db } from '../db'
import { chats } from '../db/schema'

export const searchRecentChatsController = new Hono<HoustonApp>()

searchRecentChatsController.get('/chats', async (c) => {
  const { search, pageIndex, pageSize } = getRecentChatsQuery.parse(
    c.req.query(),
  )

  const atlasUserId = c.get('atlasUserId')

  const [countResult, results] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(chats)
      .where(
        and(
          eq(chats.atlasUserId, atlasUserId),
          ilike(chats.title, `%${search}%`),
        ),
      ),
    db
      .select()
      .from(chats)
      .where(
        and(
          eq(chats.atlasUserId, atlasUserId),
          ilike(chats.title, `%${search}%`),
        ),
      )
      .orderBy(desc(chats.createdAt))
      .offset(pageIndex * pageSize)
      .limit(pageSize),
  ])

  const totalCount = countResult[0].count

  return c.jsonT<GetRecentChatsResponse>({
    totalCount,
    chats: results.map((chat) => {
      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
      }
    }),
  })
})
