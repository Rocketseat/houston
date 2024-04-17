import { zValidator } from '@hono/zod-validator'
import { CommonQuestionsService } from '@houston/langchain'
import {
  createQuestionBody,
  deleteQuestionByIdParams,
  getQuestionParams,
  getQuestionsParams,
  updateQuestionBody,
  updateQuestionParams,
} from '@rocketseat/houston-contracts'
import { Hono } from 'hono'
import { HoustonApp } from '../types'

const commonQuestionsService = new CommonQuestionsService()
export const faqController = new Hono<HoustonApp>()

faqController.get('/', zValidator('query', getQuestionsParams), async (c) => {
  const { limit = 10, cursorId, q } = c.req.valid('query')

  const questions = await commonQuestionsService.getQuestions({
    limit,
    offset: cursorId,
    filter: q,
  })

  return c.json(questions)
})

faqController.post('/', zValidator('json', createQuestionBody), async (c) => {
  const body = await c.req.valid('json')

  const { title, answer, category } = body

  const question = {
    id: crypto.randomUUID(),
    title,
    answer,
    category,
  }

  await commonQuestionsService.addQuestions([question])

  return new Response(null, {
    status: 204,
  })
})

faqController.get(
  '/:questionId',
  zValidator('param', getQuestionParams),
  async (c) => {
    const { questionId } = c.req.valid('param')

    const question = await commonQuestionsService.getQuestionWithPayload(
      questionId,
    )

    return c.json(question)
  },
)

faqController.put(
  '/:questionId',
  zValidator('param', updateQuestionParams),
  zValidator('json', updateQuestionBody),
  async (c) => {
    const { questionId } = c.req.valid('param')
    const body = c.req.valid('json')

    const { title, answer, category } = body

    await commonQuestionsService.removeQuestion(questionId)

    await commonQuestionsService.addQuestions([
      {
        id: questionId,
        title,
        answer,
        category,
      },
    ])

    return new Response(null, {
      status: 204,
    })
  },
)

faqController.delete(
  '/:questionId',
  zValidator('param', deleteQuestionByIdParams),
  async (c) => {
    const { questionId } = c.req.valid('param')

    await commonQuestionsService.removeQuestion(questionId)

    return new Response(null, {
      status: 204,
    })
  },
)
