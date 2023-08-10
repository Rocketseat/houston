import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { zValidator } from '@hono/zod-validator'
import { createChainFromMemories, Document } from '@houston/langchain'
import {
  sendMessageBody,
  SendMessageResponseHeaders,
} from '@rocketseat/houston-contracts'
import dayjs from 'dayjs'
import { eq, asc } from 'drizzle-orm'
import { db } from '../db'
import { chats, messages } from '../db/schema'
import { textStream } from '../util/http-stream'
import { redis } from '../lib/redis'
import { HTTPException } from 'hono/http-exception'
import { Snowflake } from '../util/snowflake'

export const sendMessageController = new Hono<HoustonApp>()

sendMessageController.post(
  '/messages',
  zValidator('json', sendMessageBody),
  async (c) => {
    const snowflake = new Snowflake()

    const { text, chatId, title } = c.req.valid('json')
    const atlasUserId = c.get('atlasUserId')

    const today = dayjs().format('YYYY-MM-DD')
    const userDailyMessageCountRedisKey = `user:${atlasUserId}:${today}`

    const result = await redis.get(userDailyMessageCountRedisKey)
    const amountOfMessagesToday = Number(result) ?? 0

    if (amountOfMessagesToday >= 100) {
      throw new HTTPException(429)
    }

    let conversationMemory: Array<{
      role: 'user' | 'assistant'
      text: string
    }> = []

    let currentChatId = chatId

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

    const userMessageId = snowflake.getUniqueID()

    const [{ dialogChatId }] = await db
      .insert(messages)
      .values({
        id: userMessageId,
        chatId: currentChatId,
        role: 'user',
        text,
      })
      .returning({ dialogChatId: messages.chatId })

    await redis.set(userDailyMessageCountRedisKey, amountOfMessagesToday + 1, {
      exat: dayjs().endOf('day').unix(),
    })

    const responseMessageId = snowflake.getUniqueID()

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

        const source =
          response.sourceDocuments?.map((document: Document) => {
            const { jupiterId, title } = document.metadata

            return { jupiterId, title }
          }) ?? []

        await db.insert(messages).values({
          id: responseMessageId,
          chatId: dialogChatId,
          role: 'assistant',
          source,
          text: response.text,
        })
      },
      {
        'Houston-ChatId': currentChatId,
        'Houston-UserMessageId': userMessageId.toString(),
        'Houston-AssistantMessageId': responseMessageId.toString(),
      } as SendMessageResponseHeaders,
    )
  },
)
