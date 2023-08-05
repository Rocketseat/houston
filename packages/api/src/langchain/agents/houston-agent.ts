import { AgentExecutor, ChatConversationalAgent } from 'langchain/agents'
import { getLessonData } from './tools/get-lesson-data'
import { getPlatformData } from './tools/get-platform-data'
import { env } from '@/env'
// import { openAiDefaultChain } from '@/chains/open-ai-default-chain'
import { openAiChat } from '@/components/llms/chat-open-ai'
import { LLMChain } from 'langchain/chains'

const tools = [getLessonData, getPlatformData]

const prompt = ChatConversationalAgent.createPrompt(tools, {
  inputVariables: ['input', 'agent_scratchpad'],
  systemMessage:
    'Tenha uma conversação amigável com um humano. Você responde dúvidas sobre programação. Você tem acesso as seguintes ferramentas:',
  humanMessage: 'Comece!\n\nPergunta: {input}\n\n{agent_scratchpad}',
})

const llmChain = new LLMChain({
  prompt,
  llm: openAiChat,
})

const agent = new ChatConversationalAgent({
  llmChain,
  allowedTools: [getLessonData.name, getPlatformData.name],
})

export const houston = AgentExecutor.fromAgentAndTools({
  tools,
  verbose: env.VERBOSE,
  agent,
})
