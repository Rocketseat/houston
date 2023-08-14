import { ConversationalRetrievalQAChain } from 'langchain/chains'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'

import { qdrantVectorStore } from '../components/stores/qdrant'
import { defaultPrompt } from '../components/prompts/default'
import { openAiChat } from '../components/llms/chat-open-ai'
import { AIMessage, HumanMessage } from 'langchain/schema'
import { openAiGenerator } from '../components/llms/generator-open-ai'

const MAX_RETRIEVER_RESULTS = 3

export interface Memory {
  role: 'user' | 'assistant'
  text: string
}

export function createChainFromMemories(memories: Memory[]) {
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

  const houston = ConversationalRetrievalQAChain.fromLLM(
    openAiChat,
    qdrantVectorStore.asRetriever({
      k: MAX_RETRIEVER_RESULTS,
    }),
    {
      returnSourceDocuments: true,
      inputKey: 'question',
      // verbose: true,
      questionGeneratorChainOptions: {
        llm: openAiGenerator,
        template: `
          Dada a conversa e a pergunta a seguir, reformule a pergunta a seguir para ser uma pergunta independente.

          Histórico da conversa:
          {chat_history}

          Pergunta a seguir:
          {question}
        `.trim(),
      },
      qaChainOptions: {
        type: 'stuff',
        prompt: defaultPrompt,
      },
      memory,
    },
  )

  return houston
}
