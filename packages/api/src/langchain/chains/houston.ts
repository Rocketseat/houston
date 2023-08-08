import {
  BaseChain,
  ConversationalRetrievalQAChain,
  LLMRouterChain,
  MultiPromptChain,
} from 'langchain/chains'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'

import { qdrantVectorStore } from '../components/stores/qdrant'
import { answerFromTranscriptionsPrompt } from '../components/prompts/answer-from-transcriptions'
import { openAiChat } from '../components/llms/chat-open-ai'
import { AIMessage, HumanMessage } from 'langchain/schema'
import { quietOpenAI } from '../components/llms/quiet-open-ai'
import { answerFromSingleTranscriptionPrompt } from '../components/prompts/answer-from-single-transcription'
import { routerPrompt } from '../components/prompts/router'

const MAX_RETRIEVER_RESULTS = 3

export interface Memory {
  role: 'user' | 'assistant'
  text: string
}

export async function createChainFromMemories(memories: Memory[]) {
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

  const templates = [
    {
      name: 'current',
      description:
        'Útil para responder dúvidas e solicitações sobre a aula atual como pedido de resumos ou quando a pergunta não for uma dúvida técnica direta.',
      prompt: answerFromSingleTranscriptionPrompt,
    },
    {
      name: 'platform',
      description: 'Útil para responder dúvidas de programação no geral.',
      prompt: answerFromTranscriptionsPrompt,
    },
  ] as const

  const destinationChains = templates.reduce(
    (chains, template) => {
      chains[template.name] = ConversationalRetrievalQAChain.fromLLM(
        openAiChat,
        qdrantVectorStore.asRetriever(MAX_RETRIEVER_RESULTS),
        {
          returnSourceDocuments: true,
          inputKey: 'input',
          outputKey: 'text',
          questionGeneratorChainOptions: {
            llm: quietOpenAI,
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
            prompt: template.prompt,
          },
          memory,
        },
      )

      return chains
    },
    {} as Record<(typeof templates)[number]['name'], BaseChain>,
  )

  const destinationsInstructions = templates
    .map((template) => {
      return `${template.name}: ${template.description}`
    })
    .join('\n')

  const llmRouterPrompt = await routerPrompt.partial({
    destinations: destinationsInstructions,
  })

  const routerChain = LLMRouterChain.fromLLM(quietOpenAI, llmRouterPrompt)

  return new MultiPromptChain({
    routerChain,
    destinationChains,
    defaultChain: destinationChains.current,
    verbose: true,
  })
}
