import { TokenTextSplitter } from 'langchain/text_splitter'

export const splitter = new TokenTextSplitter({
  encodingName: 'cl100k_base',
  chunkSize: 600,
  chunkOverlap: 0,
})
