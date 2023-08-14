ALTER TABLE "chats" ALTER COLUMN "atlas_user_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atlas_user_id_idx" ON "chats" ("atlas_user_id");