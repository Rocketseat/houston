import { z } from 'zod'
import { paginatedRequest } from './utils/paginated-request'
import { paginatedResponse } from './utils/paginated-response'

export const getChatMessagesParams = z.object({
  chatId: z.string().uuid(),
})

export const getChatMessagesQuery = z.object({}).merge(paginatedRequest)

export const getChatMessagesResponse = z
  .object({
    messages: z.array(
      z.object({
        id: z.string(),
        role: z.enum(['assistant', 'user']),
        text: z.string(),
        createdAt: z.date(),
      }),
    ),
  })
  .merge(paginatedResponse)

export type GetChatMessagesParams = z.infer<typeof getChatMessagesParams>

export type GetChatMessagesQuery = z.infer<typeof getChatMessagesQuery>

export type GetChatMessagesResponse = z.infer<typeof getChatMessagesResponse>
