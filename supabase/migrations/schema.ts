import { pgTable, bigserial, text, timestamp, uuid, foreignKey, jsonb, numeric, unique, boolean, primaryKey, pgEnum, pgSchema } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const authSchema = pgSchema('auth');
export const usersInAuth = authSchema.table('users', {
	id: uuid('id').primaryKey(),
});

export const quizType = pgEnum("quiz_type", ['image_mcq', 'sign_mcq', 'sign_live'])


export const glosses = pgTable("glosses", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	glossName: text("gloss_name").notNull(),
	imageUrl: text("image_url"),
	glossDescr: text("gloss_descr"),
	glossTags: text("gloss_tags").array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const learningResource = pgTable("learning_resource", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	thumbnailUrl: text("thumbnail_url"),
	type: text(),
	contentUrl: text("content_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const quiz = pgTable("quiz", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	difficulty: text(),
	createdBy: uuid("created_by"),
	content: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	type: quizType().default('image_mcq').notNull(),
}, (table) => [
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [userProfile.id],
		name: "quiz_created_by_fkey"
	}),
]);

export const quizAttempt = pgTable("quiz_attempt", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	quizId: uuid("quiz_id"),
	userId: uuid("user_id"),
	groupId: uuid("group_id"),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	totalScore: numeric("total_score"),
	response: jsonb(),
}, (table) => [
	foreignKey({
		columns: [table.groupId],
		foreignColumns: [userGroup.id],
		name: "quiz_attempt_group_id_fkey"
	}),
	foreignKey({
		columns: [table.quizId],
		foreignColumns: [quiz.id],
		name: "quiz_attempt_quiz_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [userProfile.id],
		name: "quiz_attempt_user_id_fkey"
	}).onDelete("cascade"),
]);

export const userGroup = pgTable("user_group", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	inviteCode: text("invite_code").notNull(),
	createdBy: uuid("created_by"),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.createdBy],
		foreignColumns: [userProfile.id],
		name: "user_group_created_by_fkey"
	}),
	unique("user_group_invite_code_key").on(table.inviteCode),
]);

export const userProfile = pgTable("user_profile", {
	id: uuid().primaryKey().notNull(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	email: text(),
	contactNo: text("contact_no"),
	bioDescription: text("bio_description"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.id],
		foreignColumns: [usersInAuth.id],
		name: "user_profile_id_fkey"
	}).onDelete("cascade"),
]);

export const groupMember = pgTable("group_member", {
	groupId: uuid("group_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text().default('member'),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.userId],
		foreignColumns: [userProfile.id],
		name: "group_member_user_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.groupId],
		foreignColumns: [userGroup.id],
		name: "group_member_group_id_fkey"
	}).onDelete("cascade"),
	primaryKey({ columns: [table.groupId, table.userId], name: "group_member_pkey" }),
]);
