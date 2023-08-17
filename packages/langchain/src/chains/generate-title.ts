import { LLMChain } from 'langchain/chains'
import { PromptTemplate } from 'langchain/prompts'
import { AIMessage, HumanMessage } from 'langchain/schema'
import { BufferMemory, ChatMessageHistory } from 'langchain/memory'
import { openAiGenerator } from '../components/llms/generator-open-ai'

export interface Message {
  role: 'user' | 'assistant'
  text: string
}

export function generateTitleFromChatMessages(messages: Message[]) {
  const pastMessages = messages.map((message) => {
    if (message.role === 'user') {
      return new HumanMessage(message.text)
    } else {
      return new AIMessage(message.text)
    }
  })

  const chain = new LLMChain({
    llm: openAiGenerator,
    prompt: PromptTemplate.fromTemplate(
      `Você é um chatbot e está tendo uma conversa com um humano.

      Histórico da conversa:
      """
      {chat_history}
      """

      Gere um título de no máximo 5 palavras para identificar do que se trata a conversa atual.
      `.trim(),
    ),
    memory: new BufferMemory({
      chatHistory: new ChatMessageHistory(pastMessages),
      humanPrefix: 'Humano',
      inputKey: 'additional',
      aiPrefix: 'Assitente',
      memoryKey: 'chat_history',
    }),
  })

  return chain
}
