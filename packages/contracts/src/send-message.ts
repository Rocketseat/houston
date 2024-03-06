import { z } from 'zod'

export const sendMessageBody = z.object({
  text: z.string(),
  chatId: z.string().uuid().optional(),
  chatContext: z
    .object({
      jupiterVideoId: z.string().optional(),
      journeyId: z.string().optional(),
      lessonGroupIds: z.array(z.string()).optional(),
      journeyNodeId: z.string().optional(),
    })
    .optional(),
})

export const sendMessageResponse = z
  .instanceof(ReadableStream<string>)
  .or(z.object({ status: z.literal('error'), message: z.string() }))

export const sendMessageResponseHeaders = z.object({
  'Houston-ChatId': z.string().uuid(),
  'Houston-UserMessageId': z.string(),
  'Houston-AssistantMessageId': z.string(),
})

export type SendMessageBody = z.input<typeof sendMessageBody>

export type SendMessageResponse = z.input<typeof sendMessageResponse>

export type SendMessageResponseHeaders = z.input<
  typeof sendMessageResponseHeaders
>
