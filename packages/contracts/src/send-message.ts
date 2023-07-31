import { z } from 'zod'

export const sendMessageBody = z.object({
  text: z.string(),
  chatId: z.string().uuid().optional(),
})

export const sendMessageHeaders = z.object({
  'Houston-CurrentVideo': z.string().uuid().optional(),
})

/**
 * Todo:
 *
 * - This should return the response source documents
 * - This should return the chat title and ID based on user prompt
 */
export const sendMessageResponse = z.any()

export type SendMessageBody = z.infer<typeof sendMessageBody>

export type SendMessageHeaders = z.infer<typeof sendMessageHeaders>

export type SendMessageResponse = z.infer<typeof sendMessageResponse>
