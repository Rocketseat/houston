import { ConversationalRetrievalQAChain, LLMChain } from 'langchain/chains'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'

import { qdrantVectorStore } from '../components/stores/qdrant'
import { defaultPrompt } from '../components/prompts/default'
import { openAiChat } from '../components/llms/chat-open-ai'
import { AIMessage, HumanMessage } from 'langchain/schema'
import { PromptTemplate } from 'langchain/prompts'
import { openAiGenerator } from '../components/llms/generator-open-ai'
import { CombineDocsWithMetadataChain } from './combine-docs-with-metadata'

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

  const houston = new ConversationalRetrievalQAChain({
    inputKey: 'question',
    returnSourceDocuments: true,
    memory,
    retriever: qdrantVectorStore.asRetriever({
      k: MAX_RETRIEVER_RESULTS,
    }),
    questionGeneratorChain: new LLMChain({
      llm: openAiGenerator,
      prompt: PromptTemplate.fromTemplate(`
        Dada a conversa e a pergunta a seguir, reformule a pergunta a seguir para ser uma pergunta independente.

        Histórico da conversa:
        {chat_history}

        Pergunta a seguir:
        {question}
      `),
    }),
    combineDocumentsChain: new CombineDocsWithMetadataChain({
      llmChain: new LLMChain({
        llm: openAiChat,
        prompt: defaultPrompt,
      }),
      template: `Aula "{{title}}": {{pageContent}}`,
    }),
  })

  return houston
}
