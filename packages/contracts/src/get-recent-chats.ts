import { z } from 'zod'
import { paginatedRequest } from './utils/paginated-request'
import { paginatedResponse } from './utils/paginated-response'

export const getRecentChatsParams = z
  .object({
    search: z.string().optional(),
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

export type GetRecentChatsParams = z.infer<typeof getRecentChatsParams>

export type GetRecentChatsResponse = z.infer<typeof getRecentChatsResponse>
