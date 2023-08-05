import { z } from 'zod'
import { paginatedRequest } from './utils/paginated-request'
import { paginatedResponse } from './utils/paginated-response'

export const getRecentChatsQuery = z
  .object({
    search: z.string().default(''),
  })
  .merge(paginatedRequest)

export const getRecentChatsResponse = z
  .object({
    chats: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        createdAt: z.date(),
      }),
    ),
  })
  .merge(paginatedResponse)

export type GetRecentChatsQuery = z.infer<typeof getRecentChatsQuery>

export type GetRecentChatsResponse = z.infer<typeof getRecentChatsResponse>
