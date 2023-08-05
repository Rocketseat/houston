import { z } from 'zod'

export const sendMessageBody = z.object({
  text: z.string(),
  title: z.string(),
  jupiterVideoId: z.string().optional(),
  chatId: z.string().uuid().optional(),
})

/**
 * Todo:
 *
 * - This should return the response source documents
 * - This should return the chat title and ID based on user prompt
 */
export const sendMessageResponse = z
  .instanceof(ReadableStream<string>)
  .or(z.object({ status: z.literal('error'), message: z.string() }))

export type SendMessageBody = z.infer<typeof sendMessageBody>

export type SendMessageResponse = z.infer<typeof sendMessageResponse>
