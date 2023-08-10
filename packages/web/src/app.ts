import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HoustonApp } from './types'

import { sendMessageController } from './controllers/send-message'
import { getChatByIdController } from './controllers/get-chat-by-id'
import { searchRecentChatsController } from './controllers/search-recent-chats'
import { getChatMessagesController } from './controllers/get-chat-messages'

import { verifyJWTMiddleware } from './middlewares/verify-jwt'
import { rateLimitMiddleware } from './middlewares/ratelimit'
import { webhooks } from './controllers/webhooks'

export const app = new Hono<HoustonApp>().basePath('/api')

app.use(
  '*',
  cors({
    origin: '*',
    exposeHeaders: [
      'Houston-ChatId',
      'Houston-AssistantMessageId',
      'Houston-UserMessageId',
    ],
  }),
)

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

app.route('/webhooks', webhooks)

const routes = app
  .route('/', verifyJWTMiddleware)
  .route('/', rateLimitMiddleware)
  .route('/', sendMessageController)
  .route('/', getChatByIdController)
  .route('/', searchRecentChatsController)
  .route('/', getChatMessagesController)

export type Api = typeof routes
export type App = typeof app
