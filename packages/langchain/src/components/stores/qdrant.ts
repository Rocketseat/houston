import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { TokenTextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'

import { QdrantVectorStore } from './qdrant-vector-store'

import { env } from '../../env'

interface Video {
  id: string
  title: string
  transcription: string
}

interface VideoMetadata {
  jupiterId: string
  title: string
  journeyIds: string[]
  journeyNodeIds: string[]
  lessonGroupIds: string[]
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
  scoreThreshold: 0.83,
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
  await qdrantVectorStore.client.delete(qdrantVectorStore.collectionName, {
    filter: {
      must: [
        {
          key: 'metadata.jupiterId',
          match: {
            value: videoId,
          },
        },
      ],
    },
  })
}

export async function getVideo(videoId: string) {
  const response = await qdrantVectorStore.client.scroll(
    qdrantVectorStore.collectionName,
    {
      with_vector: false,
      with_payload: false,
      filter: {
        must: [
          {
            key: 'metadata.jupiterId',
            match: {
              value: videoId,
            },
          },
        ],
      },
    },
  )

  return response
}

export async function updateVideoMetadata(
  videoId: string,
  metadata: VideoMetadata,
) {
  await qdrantVectorStore.client.setPayload(qdrantVectorStore.collectionName, {
    filter: {
      must: [
        {
          key: 'metadata.jupiterId',
          match: {
            value: videoId,
          },
        },
      ],
    },
    payload: {
      metadata,
    },
  })
}
