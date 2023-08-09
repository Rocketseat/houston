import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { zValidator } from '@hono/zod-validator'
import { db } from './db'
import { chats, messages } from './db/schema'
import {
  GetChatByIdResponse,
  GetChatMessagesResponse,
  GetRecentChatsResponse,
  getChatByIdParams,
  getChatMessagesParams,
  getChatMessagesQuery,
  getRecentChatsQuery,
  sendMessageBody,
} from '@rocketseat/houston-contracts'
import { createChainFromMemories, Document } from '@houston/langchain'
import { HTTPException } from 'hono/http-exception'
import { importSPKI, jwtVerify } from 'jose'
import { z } from 'zod'
import { env } from './env'
import { textStream } from './util/http-stream'
import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import dayjs from 'dayjs'

const redis = Redis.fromEnv()

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
})

export const app = new Hono<{
  Variables: { atlasUserId: string }
}>().basePath('/api')

app.use('*', cors())

app.use(async (c, next) => {
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
    return new Response(null, { status: 401 })
  }
})

app.use(async (c, next) => {
  const atlasUserId = c.get('atlasUserId')

  if (env.NODE_ENV === 'production') {
    await ratelimit.limit(atlasUserId)
  }

  return await next()
})

const routes = app
  .post('/messages', zValidator('json', sendMessageBody), async (c) => {
    const { text, chatId, title } = c.req.valid('json')
    const atlasUserId = c.get('atlasUserId')

    let currentChatId = chatId

    const today = dayjs().format('YYYY-MM-DD')
    const userDailyMessageCountRedisKey = `user:${atlasUserId}:${today}`

    const result = await redis.get(userDailyMessageCountRedisKey)
    const amountOfMessagesToday = Number(result) ?? 0

    if (amountOfMessagesToday >= 100) {
      return c.jsonT(
        {
          message:
            'São permitidas até 100 mensagens por usuário por dia. Você poderá utilizar novamente após 24h. ',
        },
        {
          status: 429,
        },
      )
    }

    let conversationMemory: Array<{
      role: 'user' | 'assistant'
      text: string
    }> = []

    if (!currentChatId) {
      const [chat] = await db
        .insert(chats)
        .values({ atlasUserId, title })
        .returning()

      currentChatId = chat.id
    } else {
      conversationMemory = await db
        .select({ role: messages.role, text: messages.text })
        .from(messages)
        .where(eq(messages.chatId, currentChatId))
        .orderBy(asc(messages.createdAt))
    }

    const [{ dialogChatId }] = await db
      .insert(messages)
      .values({
        chatId: currentChatId,
        role: 'user',
        text,
      })
      .returning({ dialogChatId: messages.chatId })

    await redis.set(userDailyMessageCountRedisKey, amountOfMessagesToday + 1, {
      exat: dayjs().endOf('day').unix(),
    })

    return textStream(
      async (stream) => {
        const houston = createChainFromMemories(conversationMemory)

        const response = await houston.call({ question: text }, [
          {
            handleLLMNewToken(token) {
              stream.writeJson({ token })
            },
            handleChainEnd(response) {
              if (response.sourceDocuments) {
                const source =
                  response.sourceDocuments.map((document: Document) => {
                    const { jupiterId, title } = document.metadata

                    return { jupiterId, title }
                  }) ?? []

                stream.writeJson({ source })
              }
            },
          },
        ])

        const sourceVideosIds =
          response?.sourceDocuments.map(
            (document: Document) => document.metadata.jupiterId,
          ) ?? []

        await db.insert(messages).values({
          chatId: dialogChatId,
          role: 'assistant',
          sourceDocuments: sourceVideosIds,
          text: response.text,
        })
      },
      {
        'Houston-CurrentChatId': currentChatId,
      },
    )
  })
  .get('/chats/:id', zValidator('param', getChatByIdParams), async (c) => {
    const { chatId } = c.req.valid('param')
    const atlasUserId = c.get('atlasUserId')

    const results = await db
      .select()
      .from(chats)
      .where(eq(chats.id, chatId))
      .where(eq(chats.atlasUserId, atlasUserId))

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
  })
  .get('/chats', async (c) => {
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
  .get(
    '/chats/:chatId/messages',
    zValidator('param', getChatMessagesParams),
    async (c) => {
      const { pageIndex, pageSize } = getChatMessagesQuery.parse(c.req.query())
      const { chatId } = c.req.valid('param')
      const atlasUserId = c.get('atlasUserId')

      const [countResult, results] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .innerJoin(chats, eq(chats.id, messages.chatId))
          .where(
            and(
              eq(chats.atlasUserId, atlasUserId),
              eq(messages.chatId, chatId),
            ),
          ),
        db
          .select()
          .from(messages)
          .where(
            and(
              eq(chats.atlasUserId, atlasUserId),
              eq(messages.chatId, chatId),
            ),
          )
          .offset(pageIndex * pageSize)
          .limit(pageSize),
      ])

      const totalCount = countResult[0].count

      return c.jsonT<GetChatMessagesResponse>({
        totalCount,
        messages: results.map((message) => {
          return {
            id: message.id,
            role: message.role,
            text: message.text,
            createdAt: message.createdAt,
          }
        }),
      })
    },
  )

export type Api = typeof routes
export type App = typeof app
