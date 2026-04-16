import { relations } from "drizzle-orm/relations";
import { userProfile, quiz, userGroup, quizAttempt, usersInAuth, groupMember } from "./schema";

export const quizRelations = relations(quiz, ({one, many}) => ({
	userProfile: one(userProfile, {
		fields: [quiz.createdBy],
		references: [userProfile.id]
	}),
	quizAttempts: many(quizAttempt),
}));

export const userProfileRelations = relations(userProfile, ({one, many}) => ({
	quizzes: many(quiz),
	quizAttempts: many(quizAttempt),
	userGroups: many(userGroup),
	usersInAuth: one(usersInAuth, {
		fields: [userProfile.id],
		references: [usersInAuth.id]
	}),
	groupMembers: many(groupMember),
}));

export const quizAttemptRelations = relations(quizAttempt, ({one}) => ({
	userGroup: one(userGroup, {
		fields: [quizAttempt.groupId],
		references: [userGroup.id]
	}),
	quiz: one(quiz, {
		fields: [quizAttempt.quizId],
		references: [quiz.id]
	}),
	userProfile: one(userProfile, {
		fields: [quizAttempt.userId],
		references: [userProfile.id]
	}),
}));

export const userGroupRelations = relations(userGroup, ({one, many}) => ({
	quizAttempts: many(quizAttempt),
	userProfile: one(userProfile, {
		fields: [userGroup.createdBy],
		references: [userProfile.id]
	}),
	groupMembers: many(groupMember),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	userProfiles: many(userProfile),
}));

export const groupMemberRelations = relations(groupMember, ({one}) => ({
	userProfile: one(userProfile, {
		fields: [groupMember.userId],
		references: [userProfile.id]
	}),
	userGroup: one(userGroup, {
		fields: [groupMember.groupId],
		references: [userGroup.id]
	}),
}));