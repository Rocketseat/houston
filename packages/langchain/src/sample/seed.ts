import 'dotenv/config'
import sample from './sample-data.json'
import sampleQuestions from './sample-questions-data.json'
import { VideoService } from '../services/VideoService'
import { CommonQuestionsService } from '../services/CommonQuestionsService'
import crypto from 'crypto'

const videoService = new VideoService()
const commonQuestionsService = new CommonQuestionsService()

async function main() {
  const questions = sampleQuestions.map((question) => {
    return {
      id: crypto.randomUUID(),
      title: question.title,
      answer: `${question.title} - ${question.body}`,
      category: question.category,
    }
  })

  await videoService.addVideos(sample)
  await commonQuestionsService.addQuestions(questions)
}

main().then(() => {
  console.log('Loaded sample data.')
})
