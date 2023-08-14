import { z } from 'zod'

export const deleteChatByIdParams = z.object({
  chatId: z.string().uuid(),
})

export type DeleteChatByIdParams = z.input<typeof deleteChatByIdParams>
