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
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const chatsRelations = relations(chats, ({ many }) => ({
  messages: many(messages),
}))
