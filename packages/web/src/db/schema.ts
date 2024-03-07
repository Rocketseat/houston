import { relations } from 'drizzle-orm'
import {
  bigint,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
} from 'drizzle-orm/pg-core'

export const chats = pgTable(
  'chats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    atlasUserId: uuid('atlas_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => {
    return {
      atlasUserIdIdx: index('atlas_user_id_idx').on(table.atlasUserId),
    }
  },
)

export const roleEnum = pgEnum('message_role', ['user', 'assistant'])

export const messages = pgTable('messages', {
  id: bigint('id', { mode: 'bigint' }).primaryKey(),
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull().default('user'),
  source: json('source')
    .$type<Array<{ jupiterId: string; title: string }>>()
    .notNull()
    .default([]),
  originMetadata: json('origin_metadata')
    .$type<{
      jupiterId?: string
      lessonGroupIds?: string[]
      journeyNodeId?: string
      journeyId?: string
    }>()
    .notNull()
    .default({} as any),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
}))

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  jupiterVideoId: uuid('jupiter_video_id').notNull().unique(),
  title: text('title').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const lessonMetadata = pgTable('lesson_metadata', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id),
  journeyId: uuid('journey_id').notNull(),
  journeyNodeId: uuid('journey_node_id').notNull(),
  lessonGroupId: uuid('lesson_group_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const lessonsRelations = relations(lessons, ({ many }) => ({
  metadata: many(lessonMetadata),
}))
