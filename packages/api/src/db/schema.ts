import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title'),
  atlasUserId: uuid('atlas_user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})
