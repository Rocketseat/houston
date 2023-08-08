import { relations } from 'drizzle-orm'
import {
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  atlasUserId: uuid('atlas_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const roleEnum = pgEnum('message_role', ['user', 'assistant'])

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull().default('user'),
  sourceDocuments: json('source_documents').$type<string[]>().default([]),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
}))