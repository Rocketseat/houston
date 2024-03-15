import { createQDrantVectorInstance } from '../components/stores/qdrant'
import { QdrantVectorStore } from '../components/stores/qdrant-vector-store'
import { Document } from 'langchain/document'
import { splitter } from '../lib/splitter'

interface Question {
  id: string
  title: string
  answer: string
  category: string
}

interface QuestionMetadata {
  id: string
  title: string
  category: string
}

export class CommonQuestionsService {
  private collectionName = 'common_questions'
  private qdrantVectorStore: QdrantVectorStore

  constructor() {
    this.qdrantVectorStore = createQDrantVectorInstance({
      collectionName: this.collectionName,
    })
  }

  async addQuestions(questions: Question[]) {
    const documents = questions.map((question) => {
      return new Document({
        pageContent: question.answer,
        metadata: {
          id: question.id,
          title: question.title,
          category: question.category,
        },
      })
    })

    const splittedDocuments = await splitter.splitDocuments(documents)

    await this.qdrantVectorStore.addDocuments(splittedDocuments)
  }

  async removeQuestion(questionId: string) {
    await this.qdrantVectorStore.client.delete(this.collectionName, {
      filter: {
        must: [
          {
            key: 'metadata.id',
            match: {
              value: questionId,
            },
          },
        ],
      },
    })
  }

  async getQuestionWithPayload(questionId: string) {
    const response = await this.qdrantVectorStore.client.scroll(
      this.collectionName,
      {
        with_vector: false,
        with_payload: true,
        filter: {
          must: [
            {
              key: 'metadata.id',
              match: {
                value: questionId,
              },
            },
          ],
        },
      },
    )

    return response
  }

  async updateQuestionMetadata(questionId: string, metadata: QuestionMetadata) {
    await this.qdrantVectorStore.client.setPayload(this.collectionName, {
      filter: {
        must: [
          {
            key: 'metadata.id',
            match: {
              value: questionId,
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
