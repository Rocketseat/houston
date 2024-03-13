import { QdrantVectorStore } from './qdrant-vector-store'

import { env } from '../../env'
import { openAIEmbeddings } from '../../lib/open-ai-embeddings'

interface CreateQDrantVectorInstanceOptions {
  collectionName?: string
}

export function createQDrantVectorInstance({
  collectionName = 'videos',
}: CreateQDrantVectorInstanceOptions) {
  return new QdrantVectorStore(openAIEmbeddings, {
    url: env.QDRANT_URL,
    collectionName,
    scoreThreshold: 0.83,
  })
}
