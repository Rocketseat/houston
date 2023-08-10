import { z } from 'zod'
import { paginatedRequest } from './utils/paginated-request'
import { paginatedResponse } from './utils/paginated-response'

export const getChatMessagesParams = z.object({
  chatId: z.string().uuid(),
})

export const getChatMessagesQuery = z.object({
  cursor: z.string().transform(BigInt).pipe(z.bigint()).optional(),
  pageSize: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(20).default(5)),
})

export const getChatMessagesResponse = z
  .object({
    messages: z.array(
      z.object({
        id: z.string(),
        role: z.enum(['assistant', 'user']),
        text: z.string(),
        source: z.array(
          z.object({
            jupiterId: z.string(),
            title: z.string(),
          }),
        ),
        createdAt: z.date(),
      }),
    ),
  })
  .merge(paginatedResponse)

export type GetChatMessagesParams = z.input<typeof getChatMessagesParams>

export type GetChatMessagesQuery = z.input<typeof getChatMessagesQuery>

export type GetChatMessagesResponse = z.input<typeof getChatMessagesResponse>
