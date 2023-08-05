ALTER TABLE "chats" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "created_at" SET NOT NULL;