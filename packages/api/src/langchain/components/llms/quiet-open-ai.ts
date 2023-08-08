import { env } from '@/env'
import { ChatOpenAI } from 'langchain/chat_models/openai'

export const quietOpenAI = new ChatOpenAI({
  openAIApiKey: env.OPENAI_API_KEY,
  modelName: 'gpt-3.5-turbo',
  temperature: 0,
})
