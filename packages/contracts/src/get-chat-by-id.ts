import { z } from 'zod'

export const getChatByIdParams = z.object({
  chatId: z.string().uuid(),
})

export const getChatByIdResponse = z.object({
  chat: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      createdAt: z.date(),
    }),
  ),
})

export type GetChatByIdParams = z.infer<typeof getChatByIdParams>

export type GetChatByIdResponse = z.infer<typeof getChatByIdResponse>
