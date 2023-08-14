import { z } from 'zod'

export const updateChatTitleByIdParams = z.object({
  chatId: z.string().uuid(),
})

export const updateChatTitleByIdBody = z.object({
  title: z.string(),
})

export type UpdateChatTitleByIdParams = z.input<
  typeof updateChatTitleByIdParams
>

export type UpdateChatTitleByIdBody = z.input<typeof updateChatTitleByIdBody>
