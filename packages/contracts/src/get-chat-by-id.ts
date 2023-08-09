import { z } from 'zod'

export const getChatByIdParams = z.object({
  chatId: z.string().uuid(),
})

export const getChatByIdResponse = z.object({
  chat: z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.date(),
  }),
})

export type GetChatByIdParams = z.input<typeof getChatByIdParams>

export type GetChatByIdResponse = z.input<typeof getChatByIdResponse>
