import { QdrantClient } from '@qdrant/js-client-rest'
import type { Schemas as QdrantSchemas } from '@qdrant/js-client-rest'

import { Embeddings } from 'langchain/embeddings/base'
import { VectorStore } from 'langchain/vectorstores/base'
import { Document } from 'langchain/document'

import { env } from '../../env'

export interface QdrantLibArgs {
  client?: QdrantClient
  url?: string
  apiKey?: string
  collectionName?: string
  collectionConfig?: QdrantSchemas['CreateCollection']
  scoreThreshold?: number
}

type QdrantSearchResponse = QdrantSchemas['ScoredPoint'] & {
  payload: {
    metadata: object
    content: string
  }
}

export class QdrantVectorStore extends VectorStore {
  get lc_secrets(): { [key: string]: string } {
    return {
      apiKey: 'QDRANT_API_KEY',
      url: 'QDRANT_URL',
    }
  }

  client: QdrantClient

  collectionName: string
  scoreThreshold: number

  collectionConfig: QdrantSchemas['CreateCollection']

  _vectorstoreType(): string {
    return 'qdrant'
  }

  constructor(embeddings: Embeddings, args: QdrantLibArgs) {
    super(embeddings, args)

    const url = args.url ?? env.QDRANT_URL
    const apiKey = args.apiKey ?? env.QDRANT_API_KEY

    if (!args.client && !url) {
      throw new Error('Qdrant client or url address must be set.')
    }

    this.client =
      args.client ||
      new QdrantClient({
        url,
        apiKey,
      })

    this.collectionName = args.collectionName ?? 'documents'
    this.scoreThreshold = args.scoreThreshold ?? 0.8

    this.collectionConfig = args.collectionConfig ?? {
      vectors: {
        size: 1536,
        distance: 'Cosine',
      },
    }
  }

  async addDocuments(documents: Document[]): Promise<void> {
    const texts = documents.map(({ pageContent }) => pageContent)

    await this.addVectors(
      await this.embeddings.embedDocuments(texts),
      documents,
    )
  }

  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    if (vectors.length === 0) {
      return
    }

    await this.ensureCollection()

    const points = vectors.map((embedding, idx) => ({
      id: crypto.randomUUID(),
      vector: embedding,
      payload: {
        content: documents[idx].pageContent,
        metadata: documents[idx].metadata,
      },
    }))

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    })
  }

  async similaritySearchVectorWithScore(
    query: number[],
    k?: number,
    filter?: QdrantSchemas['Filter'],
  ): Promise<[Document, number][]> {
    if (!query) {
      return []
    }

    await this.ensureCollection()

    let results = await this.client.search(this.collectionName, {
      vector: query,
      limit: k,
      filter,
      score_threshold: this.scoreThreshold,
    })

    if (filter && results.length === 0) {
      results = await this.client.search(this.collectionName, {
        vector: query,
        limit: k,
        score_threshold: this.scoreThreshold,
      })
    }

    console.log(results)
    const result: [Document, number][] = (
      results as QdrantSearchResponse[]
    ).map((res) => [
      new Document({
        metadata: res.payload.metadata,
        pageContent: res.payload.content,
      }),
      res.score,
    ])

    return result
  }

  async ensureCollection() {
    const response = await this.client.getCollections()

    const collectionNames = response.collections.map(
      (collection) => collection.name,
    )

    if (!collectionNames.includes(this.collectionName)) {
      await this.client.createCollection(
        this.collectionName,
        this.collectionConfig,
      )
    }
  }

  static async fromTexts(
    texts: string[],
    metadatas: object[] | object,
    embeddings: Embeddings,
    dbConfig: QdrantLibArgs,
  ): Promise<QdrantVectorStore> {
    const docs = []
    for (let i = 0; i < texts.length; i += 1) {
      const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas
      const newDoc = new Document({
        pageContent: texts[i],
        metadata,
      })
      docs.push(newDoc)
    }
    return QdrantVectorStore.fromDocuments(docs, embeddings, dbConfig)
  }

  static async fromDocuments(
    docs: Document[],
    embeddings: Embeddings,
    dbConfig: QdrantLibArgs,
  ): Promise<QdrantVectorStore> {
    const instance = new this(embeddings, dbConfig)
    await instance.addDocuments(docs)
    return instance
  }

  static async fromExistingCollection(
    embeddings: Embeddings,
    dbConfig: QdrantLibArgs,
  ): Promise<QdrantVectorStore> {
    const instance = new this(embeddings, dbConfig)
    await instance.ensureCollection()
    return instance
  }
}
