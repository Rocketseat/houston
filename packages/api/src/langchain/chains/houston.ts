import { RetrievalQAChain } from 'langchain/chains'
// import { ConversationSummaryMemory } from 'langchain/memory'

import { qdrantVectorStore } from '../components/stores/qdrant'
import { defaultPrompt } from '../components/prompts/default'
import { openAiChat } from '../components/llms/chat-open-ai'

const MAX_RETRIEVER_RESULTS = 3

// export function createChainFromMemoryId() {
// const memory = new ConversationSummaryMemory({
//   llm: openAiChat,
//   memoryKey: 'chat_history',
//   prompt: defaultPrompt,
// })

export const houston = RetrievalQAChain.fromLLM(
  openAiChat,
  qdrantVectorStore.asRetriever(MAX_RETRIEVER_RESULTS),
  {
    returnSourceDocuments: true,
    prompt: defaultPrompt,
    // memory,
  },
)

// return houston
// }
