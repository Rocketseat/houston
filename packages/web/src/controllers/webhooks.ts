import { Hono } from 'hono'
import { HoustonApp } from '../types'
import { Receiver } from '@upstash/qstash/cloudflare'
import { env } from '../env'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import {
  addVideos,
  removeVideo,
} from '@houston/langchain/src/components/stores/qdrant'

export const webhooks = new Hono<HoustonApp>()

webhooks.use('*', async (c, next) => {
  if (env.NODE_ENV === 'development') {
    // Bypass signature verification in development
    return await next()
  }

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  })

  const body = await c.req.text()

  const signature = c.req.headers.get('Upstash-Signature')

  if (!signature) {
    throw new HTTPException(401)
  }

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

  return await next()
})

const createOrUpdateVideoBody = z.object({
  videoId: z.string(),
  title: z.string(),
  transcription: z.string(),
})

const deleteVideoBody = z.object({
  videoId: z.string(),
})

webhooks.post(
  '/create-video',
  zValidator('json', createOrUpdateVideoBody),
  async (c) => {
    const { videoId, title, transcription } = c.req.valid('json')

    await addVideos([
      {
        id: videoId,
        title,
        transcription,
      },
    ])

    return new Response()
  },
)

webhooks.post(
  '/update-video',
  zValidator('json', createOrUpdateVideoBody),
  async (c) => {
    const { videoId, title, transcription } = c.req.valid('json')

    await removeVideo(videoId)
    await addVideos([
      {
        id: videoId,
        title,
        transcription,
      },
    ])

    return new Response()
  },
)

webhooks.post(
  '/delete-video',
  zValidator('json', deleteVideoBody),
  async (c) => {
    const { videoId } = c.req.valid('json')

    await removeVideo(videoId)

    return new Response()
  },
)
