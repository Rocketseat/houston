import { QdrantVectorStore } from 'langchain/vectorstores/qdrant'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { TokenTextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'

import { env } from '@/env'

interface Video {
  id: string
  title: string
  transcription: string
}

const openAIEmbeddings = new OpenAIEmbeddings({
  openAIApiKey: env.OPENAI_API_KEY,
})

const splitter = new TokenTextSplitter({
  encodingName: 'cl100k_base',
  chunkSize: 600,
  chunkOverlap: 0,
})

export const qdrantVectorStore = new QdrantVectorStore(openAIEmbeddings, {
  url: env.QDRANT_URL,
  collectionName: 'videos',
})

export async function addVideos(videos: Video[]) {
  const documents = videos.map((video) => {
    return new Document({
      pageContent: video.transcription,
      metadata: {
        jupiterId: video.id,
        title: video.title,
      },
    })
  })

  const splittedDocuments = await splitter.splitDocuments(documents)

  await qdrantVectorStore.addDocuments(splittedDocuments)
}

export async function removeVideo(videoId: string) {
  await qdrantVectorStore.delete({
    jupiterId: videoId,
  })
}
