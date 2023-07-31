import { z } from 'zod'

export const getChatMessagesParams = z.object({
  pageIndex: z.number().default(0),
  pageSize: z.number().default(10),
})

export const getChatMessagesResponse = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      createdAt: z.date(),
    }),
  ),
})

export type GetChatMessagesParams = z.infer<typeof getChatMessagesParams>

export type GetChatMessagesResponse = z.infer<typeof getChatMessagesResponse>
