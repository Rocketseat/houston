ALTER TABLE "chats" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;