-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."quiz_type" AS ENUM('image_mcq', 'sign_mcq', 'sign_live');--> statement-breakpoint
CREATE TABLE "glosses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"gloss_name" text NOT NULL,
	"image_url" text,
	"gloss_descr" text,
	"gloss_tags" text[],
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learning_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"thumbnail_url" text,
	"type" text,
	"content_url" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"difficulty" text,
	"created_by" uuid,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"type" "quiz_type" DEFAULT 'image_mcq' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid,
	"user_id" uuid,
	"group_id" uuid,
	"started_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"total_score" numeric,
	"response" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"invite_code" text NOT NULL,
	"created_by" uuid,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_group_invite_code_key" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"email" text,
	"contact_no" text,
	"bio_description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member',
	"joined_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "group_member_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."user_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."user_group"("id") ON DELETE cascade ON UPDATE no action;
*/