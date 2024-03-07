import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { zValidator } from '@hono/zod-validator'
import {
  createChainFromMemories,
  generateTitleFromChatMessages,
  Document,
} from '@houston/langchain'
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

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export const sendMessageController = new Hono<HoustonApp>()

/* Rate limit amount of daily messages */
sendMessageController.use('/messages', async (c, next) => {
  const atlasUserId = c.get('atlasUserId')

  const today = dayjs().format('YYYY-MM-DD')
  const userDailyMessageCountRedisKey = `user:${atlasUserId}:${today}`

  const result = await redis.get(userDailyMessageCountRedisKey)
  const amountOfMessagesToday = Number(result) ?? 0

  if (amountOfMessagesToday >= 100) {
    throw new HTTPException(429)
  }

  await next()

  await redis.set(userDailyMessageCountRedisKey, amountOfMessagesToday + 1, {
    exat: dayjs().endOf('day').unix(),
  })
})

async function getChatMemory(chatId: string) {
  return await db
    .select({ role: messages.role, text: messages.text })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt))
}

async function generateTitleForChat(chatId: string, history: ChatMessage[]) {
  const generateTitle = generateTitleFromChatMessages(history)

  const response = await generateTitle.call({ additional: ' ' })

  const title = response.text.endsWith('.')
    ? response.text.slice(0, -1)
    : response.text

  console.log(title)

  await db.update(chats).set({ title }).where(eq(chats.id, chatId))
}

type QDrantFilterReturn =
  | {
      key: string
      match: { value: string }
    }
  | {
      key: string
      match: { any: string[] }
    }

function createQDrantFilter(
  key: string,
  value: string | string[] | undefined,
  isAny = false,
): QDrantFilterReturn | null {
  return value !== undefined
    ? ({
        key,
        match: isAny ? { any: value as string[] } : { value: value as string },
      } as QDrantFilterReturn)
    : null
}

sendMessageController.post(
  '/messages',
  zValidator('json', sendMessageBody),
  async (c) => {
    const snowflake = new Snowflake()

    const { text, chatId, chatContext } = c.req.valid('json')
    const atlasUserId = c.get('atlasUserId')

    const isNewChat = !chatId

    let conversationMemory: ChatMessage[] = []
    let currentChatId = chatId

    if (!currentChatId) {
      const [chat] = await db
        .insert(chats)
        .values({ atlasUserId, title: 'Novo chat' })
        .returning()

      currentChatId = chat.id
    } else {
      conversationMemory = await getChatMemory(currentChatId)
    }

    const userMessageId = snowflake.getUniqueID()

    await db.insert(messages).values({
      id: userMessageId,
      chatId: currentChatId,
      role: 'user',
      text,
      originMetadata: chatContext,
    })

    const responseMessageId = snowflake.getUniqueID()

    const filtersToApply = [
      createQDrantFilter('metadata.jupiterId', chatContext?.jupiterVideoId),
      createQDrantFilter(
        'metadata.lessonGroupIds',
        chatContext?.lessonGroupIds,
        true,
      ),
      createQDrantFilter('metadata.journeyNodeIds', chatContext?.journeyNodeId),
      createQDrantFilter('metadata.journeyId', chatContext?.journeyId),
    ].filter((filter) => filter !== null) as QDrantFilterReturn[]

    const filter = {
      should: filtersToApply,
    }

    return textStream(
      async (stream) => {
        const houston = createChainFromMemories(
          conversationMemory,
          filtersToApply ? { filter } : {},
        )

        const response = await houston.call({ question: text }, [
          {
            handleLLMNewToken(token) {
              stream.writeJson({ token })
            },
          },
        ])

        let source: Array<{ jupiterId: string; title: string }> = []

        const sources:
          | Document<{ jupiterId: string; title: string }>[]
          | undefined = response?.sourceDocuments

        if (sources) {
          source = sources.reduce(
            (uniqueSources, document) => {
              const { jupiterId, title } = document.metadata

              const documentInSources = uniqueSources.some(
                (item) => item.jupiterId === jupiterId,
              )

              if (!documentInSources) {
                uniqueSources.push({ jupiterId, title })
              }

              return uniqueSources
            },
            [] as typeof source,
          )

          stream.writeJson({ source })
        }

        if (!currentChatId) {
          throw new HTTPException(404, {
            message: 'Chat not found',
          })
        }

        await db.insert(messages).values({
          id: responseMessageId,
          chatId: currentChatId,
          role: 'assistant',
          source,
          text: response.text,
        })

        if (isNewChat) {
          await generateTitleForChat(currentChatId, [
            { role: 'user', text },
            { role: 'assistant', text: response.text },
          ])
        }
      },
      {
        'Houston-ChatId': currentChatId,
        'Houston-UserMessageId': userMessageId.toString(),
        'Houston-AssistantMessageId': responseMessageId.toString(),
      } as SendMessageResponseHeaders,
    )
  },
)
