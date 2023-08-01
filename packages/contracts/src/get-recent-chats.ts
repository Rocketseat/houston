import { z } from 'zod'

export const getRecentChatsParams = z.object({
  search: z.string().optional(),
  pageIndex: z.number().default(0),
  pageSize: z.number().default(10),
})

export const getRecentChatsResponse = z.object({
  totalCount: z.number(),
  chats: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      createdAt: z.date(),
    }),
  ),
})

export type GetRecentChatsParams = z.infer<typeof getRecentChatsParams>

export type GetRecentChatsResponse = z.infer<typeof getRecentChatsResponse>
