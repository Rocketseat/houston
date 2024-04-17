import { z } from 'zod'

export const getQuestionsParams = z.object({
  limit: z.coerce.number().optional(),
  cursorId: z.string().optional(),
  q: z.string().optional(),
})

export const getQuestionParams = z.object({
  questionId: z.string(),
})

export const createQuestionBody = z.object({
  title: z.string(),
  answer: z.string(),
  category: z.string(),
})

export const updateQuestionParams = z.object({
  questionId: z.string(),
})

export const updateQuestionBody = z.object({
  title: z.string(),
  answer: z.string(),
  category: z.string(),
})

export const deleteQuestionByIdParams = z.object({
  questionId: z.string(),
})

export type GetQuestionsParams = z.input<typeof getQuestionsParams>
