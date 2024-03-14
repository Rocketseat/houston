import { ConversationalRetrievalQAChain, LLMChain } from 'langchain/chains'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'

import { PromptTemplate } from 'langchain/prompts'
import { AIMessage, HumanMessage } from 'langchain/schema'
import { openAiChat } from '../components/llms/chat-open-ai'
import { openAiGenerator } from '../components/llms/generator-open-ai'
import { createQDrantVectorInstance } from '../components/stores/qdrant'
import { CombineDocsWithMetadataChain } from './combine-docs-with-metadata'

import type { components } from '@qdrant/js-client-rest/dist/types/openapi/generated_schema'
import { getPrompt } from '../components/prompts'

const MAX_RETRIEVER_RESULTS = 3

export interface Memory {
  role: 'user' | 'assistant'
  text: string
}

type FilterOptions = components['schemas']['Filter']

interface Options {
  filter?: FilterOptions
  questionType: 'support' | 'technical'
}

function getCollectionName(type: string) {
  switch (type) {
    case 'support':
      return 'common_questions'
    case 'technical':
      return 'videos'
    default:
      return 'videos'
  }
}

export function createChainFromMemories(memories: Memory[], options: Options) {
  const { filter, questionType } = options

  const pastMessages = memories.map((memory) => {
    if (memory.role === 'user') {
      return new HumanMessage(memory.text)
    } else {
      return new AIMessage(memory.text)
    }
  })

  const memory = new BufferMemory({
    chatHistory: new ChatMessageHistory(pastMessages),
    aiPrefix: 'IA:',
    humanPrefix: 'Humano:',
    memoryKey: 'chat_history',
    inputKey: 'question',
    outputKey: 'text',
    returnMessages: true,
  })

  const qdrantVectorStore = createQDrantVectorInstance({
    collectionName: getCollectionName(questionType),
  })

  const qDrantRetriever = qdrantVectorStore.asRetriever({
    k: MAX_RETRIEVER_RESULTS,
    filter,
  })

  const questionGeneratorChain = new LLMChain({
    llm: openAiGenerator,
    prompt: PromptTemplate.fromTemplate(`
      Dada a conversa e a pergunta a seguir, reformule a pergunta a seguir para ser uma pergunta independente.

      Histórico da conversa:
      {chat_history}

      Pergunta a seguir:
      {question}
    `),
  })

  const combineDocumentsChain = new CombineDocsWithMetadataChain({
    llmChain: new LLMChain({
      llm: openAiChat,
      prompt: getPrompt(questionType),
    }),
    template: `Aula "{{title}}": {{pageContent}}`,
  })

  const houston = new ConversationalRetrievalQAChain({
    inputKey: 'question',
    returnSourceDocuments: true,
    memory,
    retriever: qDrantRetriever,
    questionGeneratorChain,
    combineDocumentsChain,
  })

  return houston
}
