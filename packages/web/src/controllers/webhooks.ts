import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { Receiver } from '@upstash/qstash/cloudflare'
import { env } from '../env'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import {
  addVideos,
  removeVideo,
} from '@houston/langchain/src/components/stores/qdrant'

export const webhooks = new Hono<HoustonApp>()

async function validateQstashSignature(body: string, signature: string | null) {
  // if (env.NODE_ENV === 'development') {
  //   // Bypass signature verification in development
  //   return await next()
  // }

  if (!signature) {
    throw new HTTPException(401)
  }

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  })

  const isValid = await receiver
    .verify({
      signature,
      body,
    })
    .catch(() => {
      throw new HTTPException(401)
    })

  if (!isValid) {
    throw new HTTPException(401)
  }
}

const createOrUpdateVideoTranscriptionBody = z.object({
  videoId: z.string(),
  title: z.string(),
  transcription: z.string(),
})

const deleteVideoTranscriptionBody = z.object({
  videoId: z.string(),
})

webhooks.post('/create-video-transcription', async (c) => {
  const bodyAsText = await c.req.text()
  const signature = c.req.headers.get('Upstash-Signature')

  await validateQstashSignature(bodyAsText, signature)

  const { videoId, title, transcription } =
    createOrUpdateVideoTranscriptionBody.parse(JSON.parse(bodyAsText))

  await addVideos([
    {
      id: videoId,
      title,
      transcription,
    },
  ])

  return new Response()
})

webhooks.post('/update-video-transcription', async (c) => {
  const bodyAsText = await c.req.text()
  const signature = c.req.headers.get('Upstash-Signature')

  await validateQstashSignature(bodyAsText, signature)

  const { videoId, title, transcription } =
    createOrUpdateVideoTranscriptionBody.parse(JSON.parse(bodyAsText))

  await removeVideo(videoId)
  await addVideos([
    {
      id: videoId,
      title,
      transcription,
    },
  ])

  return new Response()
})

webhooks.post('/delete-video-transcription', async (c) => {
  const bodyAsText = await c.req.text()
  const signature = c.req.headers.get('Upstash-Signature')

  await validateQstashSignature(bodyAsText, signature)

  const { videoId } = deleteVideoTranscriptionBody.parse(JSON.parse(bodyAsText))

  await removeVideo(videoId)

  return new Response()
})
