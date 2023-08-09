import { env } from '../../env'
import { ChatOpenAI } from 'langchain/chat_models/openai'

export const openAiChat = new ChatOpenAI({
  openAIApiKey: env.OPENAI_API_KEY,
  temperature: 0.3,
  modelName: 'gpt-3.5-turbo',
  streaming: true,
  maxTokens: -1,
})
