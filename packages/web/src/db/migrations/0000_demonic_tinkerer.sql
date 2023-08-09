CREATE TABLE IF NOT EXISTS "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"atlas_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
