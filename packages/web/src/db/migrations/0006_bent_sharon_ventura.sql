ALTER TABLE "messages" ADD COLUMN "source" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "source_documents";