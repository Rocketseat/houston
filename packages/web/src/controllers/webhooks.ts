import { Receiver } from '@upstash/qstash/cloudflare'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { db } from '../db'
import { lessonMetadata, lessons } from '../db/schema'
import { env } from '../env'
import { HoustonApp } from '../types'

import { jwtVerify } from 'jose'
import { CommonQuestionsService, VideoService } from '@houston/langchain'

const videoService = new VideoService()
const commonQuestionsService = new CommonQuestionsService()

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

async function validateNivoSignature(signature: string | null) {
  if (!signature) {
    throw new HTTPException(401)
  }

  try {
    const signingKey = new TextEncoder().encode(env.NIVO_SIGNING_KEY)

    await jwtVerify(signature, signingKey)
  } catch (err) {
    console.log(err)
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

const createVideoBody = z.object({
  jupiterId: z.string().uuid(),
  title: z.string(),
})

const syncLessonMetadataBody = z.object({
  action: z.enum(['create', 'delete']),
  jupiterId: z.string().uuid(),
  journeyId: z.string().uuid(),
  journeyNodeId: z.string().uuid(),
  lessonGroupId: z.string().uuid(),
})

// Skylab-QStash Routes
webhooks.post('/sync-lesson-metadata', async (c) => {
  const bodyAsText = await c.req.text()
  const signature = c.req.raw.headers.get('Upstash-Signature')

  await validateQstashSignature(bodyAsText, signature)

  try {
    const { action, jupiterId, journeyId, journeyNodeId, lessonGroupId } =
      syncLessonMetadataBody.parse(JSON.parse(bodyAsText))

    const lessonResult = await db
      .select()
      .from(lessons)
      .where(eq(lessons.jupiterVideoId, jupiterId))

    if (lessonResult.length === 0) {
      return c.json({ message: 'Video does not exist.' })
    }

    const lesson = lessonResult[0]

    const metadata = await db
      .select()
      .from(lessonMetadata)
      .where(
        and(
          eq(lessonMetadata.lessonId, lesson.id),
          eq(lessonMetadata.journeyId, journeyId),
          eq(lessonMetadata.journeyNodeId, journeyNodeId),
          eq(lessonMetadata.lessonGroupId, lessonGroupId),
        ),
      )

    const metadataExists = metadata.length > 0

    switch (action) {
      case 'create': {
        if (metadataExists) {
          return c.json({
            message: 'Metadata already exists.',
          })
        }

        await db.insert(lessonMetadata).values({
          lessonId: lesson.id,
          journeyId,
          journeyNodeId,
          lessonGroupId,
        })

        const metadataAfterCreate = await db
          .select()
          .from(lessonMetadata)
          .where(eq(lessonMetadata.lessonId, lesson.id))
          .groupBy(
            lessonMetadata.id,
            lessonMetadata.journeyId,
            lessonMetadata.journeyNodeId,
            lessonMetadata.lessonGroupId,
          )

        const mappedMetadata = metadataAfterCreate.reduce(
          (acc, curr) => {
            if (!acc.journeyIds.includes(curr.journeyId)) {
              acc.journeyIds.push(curr.journeyId)
            }

            if (!acc.journeyNodeIds.includes(curr.journeyNodeId)) {
              acc.journeyNodeIds.push(curr.journeyNodeId)
            }

            if (!acc.lessonGroupIds.includes(curr.lessonGroupId)) {
              acc.lessonGroupIds.push(curr.lessonGroupId)
            }

            return acc
          },
          {
            journeyIds: [] as string[],
            journeyNodeIds: [] as string[],
            lessonGroupIds: [] as string[],
            jupiterId: lesson.jupiterVideoId,
            title: lesson.title,
          },
        )

        await videoService.updateVideoMetadata(jupiterId, mappedMetadata)

        return c.json({ ok: true }, { status: 201 })
      }
      case 'delete': {
        if (!metadataExists) {
          return c.json({
            message: 'Metadata does not exist.',
          })
        }

        await db
          .delete(lessonMetadata)
          .where(
            and(
              eq(lessonMetadata.lessonId, lesson.id),
              eq(lessonMetadata.journeyId, journeyId),
              eq(lessonMetadata.journeyNodeId, journeyNodeId),
              eq(lessonMetadata.lessonGroupId, lessonGroupId),
            ),
          )

        const metadataAfterDelete = await db
          .select()
          .from(lessonMetadata)
          .where(eq(lessonMetadata.lessonId, lesson.id))
          .groupBy(
            lessonMetadata.id,
            lessonMetadata.journeyId,
            lessonMetadata.journeyNodeId,
            lessonMetadata.lessonGroupId,
          )

        const mappedMetadata = metadataAfterDelete.reduce(
          (acc, curr) => {
            if (!acc.journeyIds.includes(curr.journeyId)) {
              acc.journeyIds.push(curr.journeyId)
            }

            if (!acc.journeyNodeIds.includes(curr.journeyNodeId)) {
              acc.journeyNodeIds.push(curr.journeyNodeId)
            }

            if (!acc.lessonGroupIds.includes(curr.lessonGroupId)) {
              acc.lessonGroupIds.push(curr.lessonGroupId)
            }

            return acc
          },
          {
            journeyIds: [] as string[],
            journeyNodeIds: [] as string[],
            lessonGroupIds: [] as string[],
            jupiterId: lesson.jupiterVideoId,
            title: lesson.title,
          },
        )

        await videoService.updateVideoMetadata(jupiterId, mappedMetadata)

        return new Response(null, {
          status: 204,
        })
      }
      default:
        throw new Error('Invalid action')
    }
  } catch (err) {
    console.log(err)
    return c.json(
      { message: 'Error updating metadata.', error: err },
      { status: 400 },
    )
  }
})

// Jupiter Routes
webhooks.post('/create-video', async (c) => {
  try {
    const bodyAsText = await c.req.text()
    const signature = c.req.raw.headers.get('Upstash-Signature')

    await validateQstashSignature(bodyAsText, signature)

    const { jupiterId, title } = createVideoBody.parse(JSON.parse(bodyAsText))

    await db.insert(lessons).values({
      jupiterVideoId: jupiterId,
      title,
    })

    return new Response(null, { status: 201 })
  } catch (err: any) {
    console.log(err)
    return c.json({ error: err.message }, { status: 400 })
  }
})

webhooks.post('/create-video-transcription', async (c) => {
  const bodyAsText = await c.req.text()
  const signature = c.req.raw.headers.get('Upstash-Signature')

  await validateQstashSignature(bodyAsText, signature)

  const { videoId, title, transcription } =
    createOrUpdateVideoTranscriptionBody.parse(JSON.parse(bodyAsText))

  await videoService.addVideos([
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
  const signature = c.req.raw.headers.get('Upstash-Signature')

  await validateQstashSignature(bodyAsText, signature)

  const { videoId, title, transcription } =
    createOrUpdateVideoTranscriptionBody.parse(JSON.parse(bodyAsText))

  await videoService.removeVideo(videoId)
  await videoService.addVideos([
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
  const signature = c.req.raw.headers.get('Upstash-Signature')

  await validateQstashSignature(bodyAsText, signature)

  const { videoId } = deleteVideoTranscriptionBody.parse(JSON.parse(bodyAsText))

  await db.delete(lessons).where(eq(lessons.jupiterVideoId, videoId))
  await videoService.removeVideo(videoId)

  return new Response()
})

// Nivo Routes
webhooks.post('/nivo', async (c) => {
  const bodyAsText = await c.req.text()
  const signature = c.req.raw.headers.get('Nivo-Signature')

  await validateNivoSignature(signature)

  const body = JSON.parse(bodyAsText)

  const { trigger, payload } = body

  switch (trigger) {
    case 'upload.created': {
      const { id, title } = payload

      await db.insert(lessons).values({
        jupiterVideoId: id,
        title,
      })

      return new Response(null, { status: 201 })
    }

    case 'upload.transcription.created': {
      const { uploadId, text: transcription } = payload

      const lessonToFind = await db
        .select()
        .from(lessons)
        .where(eq(lessons.jupiterVideoId, uploadId))

      if (lessonToFind.length === 0) {
        return c.json({ message: 'Video does not exist.' }, { status: 400 })
      }

      const lesson = lessonToFind[0]

      await videoService.addVideos([
        {
          id: uploadId,
          title: lesson.title,
          transcription,
        },
      ])

      return new Response(null, { status: 201 })
    }

    case 'upload.deleted': {
      const { id } = payload

      await db.delete(lessons).where(eq(lessons.jupiterVideoId, id))

      await videoService.removeVideo(id)

      return new Response(null, { status: 204 })
    }

    default: {
      return c.json({ error: 'Invalid trigger' }, { status: 400 })
    }
  }
})

webhooks.post('/lesson/import', async (c) => {
  const secret = c.req.raw.headers.get('Migration-Secret')
  const body = await c.req.json()

  if (secret !== env.MIGRATION_SECRET) {
    return c.json({ message: 'Invalid secret' }, { status: 401 })
  }

  const transcriptionMetadata = await videoService.getVideo(body.jupiterVideoId)
  const hasTranscription = transcriptionMetadata.points.length > 0

  if (!hasTranscription) {
    return c.json({ message: 'Lesson skipped' })
  }

  const { title, journeyId, journeyNodeId, lessonGroupId, jupiterVideoId } =
    body

  const lessonResult = await db
    .select()
    .from(lessons)
    .where(eq(lessons.jupiterVideoId, jupiterVideoId))

  let lesson = lessonResult[0]

  if (!lesson) {
    const insertResult = await db
      .insert(lessons)
      .values({
        jupiterVideoId,
        title,
      })
      .returning({
        id: lessons.id,
        jupiterVideoId: lessons.jupiterVideoId,
        title: lessons.title,
        createdAt: lessons.createdAt,
      })

    lesson = insertResult[0]
  }

  const metadata = await db
    .select()
    .from(lessonMetadata)
    .where(
      and(
        eq(lessonMetadata.lessonId, lesson.id),
        eq(lessonMetadata.journeyId, journeyId),
        eq(lessonMetadata.journeyNodeId, journeyNodeId),
        eq(lessonMetadata.lessonGroupId, lessonGroupId),
      ),
    )

  const metadataExists = metadata.length > 0

  if (!metadataExists) {
    await db.insert(lessonMetadata).values({
      lessonId: lesson.id,
      journeyId,
      journeyNodeId,
      lessonGroupId,
    })
  }

  const metadataAfterCreate = await db
    .select()
    .from(lessonMetadata)
    .where(eq(lessonMetadata.lessonId, lesson.id))
    .groupBy(
      lessonMetadata.id,
      lessonMetadata.journeyId,
      lessonMetadata.journeyNodeId,
      lessonMetadata.lessonGroupId,
    )

  const mappedMetadata = metadataAfterCreate.reduce(
    (acc, curr) => {
      if (!acc.journeyIds.includes(curr.journeyId)) {
        acc.journeyIds.push(curr.journeyId)
      }

      if (!acc.journeyNodeIds.includes(curr.journeyNodeId)) {
        acc.journeyNodeIds.push(curr.journeyNodeId)
      }

      if (!acc.lessonGroupIds.includes(curr.lessonGroupId)) {
        acc.lessonGroupIds.push(curr.lessonGroupId)
      }

      return acc
    },
    {
      journeyIds: [] as string[],
      journeyNodeIds: [] as string[],
      lessonGroupIds: [] as string[],
      jupiterId: lesson.jupiterVideoId,
      title: lesson.title,
    },
  )

  await videoService.updateVideoMetadata(jupiterVideoId, mappedMetadata)

  return c.json({ ok: true })
})

webhooks.post('/faq/import', async (c) => {
  const secret = c.req.raw.headers.get('Migration-Secret')
  const body = await c.req.json()

  if (secret !== env.MIGRATION_SECRET) {
    return c.json({ message: 'Invalid secret' }, { status: 401 })
  }

  const { id, title, answer, category } = body

  const question = {
    id,
    title,
    answer,
    category,
  }

  await commonQuestionsService.addQuestions([question])

  return c.json({ ok: true })
})
