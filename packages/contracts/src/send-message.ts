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

export const sendMessageResponseHeaders = z.object({
  'Houston-ChatId': z.string().uuid(),
  'Houston-MessageId': z.string().uuid(),
})

export type SendMessageBody = z.input<typeof sendMessageBody>

export type SendMessageResponse = z.input<typeof sendMessageResponse>

export type SendMessageResponseHeaders = z.input<
  typeof sendMessageResponseHeaders
>
