import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { env } from '../env'

export const openAIEmbeddings = new OpenAIEmbeddings({
  openAIApiKey: env.OPENAI_API_KEY,
})
