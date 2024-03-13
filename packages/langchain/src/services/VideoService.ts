import { createQDrantVectorInstance } from '../components/stores/qdrant'
import { QdrantVectorStore } from '../components/stores/qdrant-vector-store'
import { Document } from 'langchain/document'
import { splitter } from '../lib/splitter'

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

export class VideoService {
  private collectionName = 'videos'
  private qdrantVectorStore: QdrantVectorStore

  constructor() {
    this.qdrantVectorStore = createQDrantVectorInstance({
      collectionName: this.collectionName,
    })
  }

  async addVideos(videos: Video[]) {
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

    await this.qdrantVectorStore.addDocuments(splittedDocuments)
  }

  async removeVideo(videoId: string) {
    await this.qdrantVectorStore.client.delete(this.collectionName, {
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

  async getVideo(videoId: string) {
    const response = await this.qdrantVectorStore.client.scroll(
      this.collectionName,
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

  async updateVideoMetadata(videoId: string, metadata: VideoMetadata) {
    await this.qdrantVectorStore.client.setPayload(this.collectionName, {
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
}
