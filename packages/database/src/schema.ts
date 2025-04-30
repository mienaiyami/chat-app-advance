import { relations, sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	index,
	pgEnum,
	pgTableCreator,
	primaryKey,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `chat-app-advance_${name}`);

export type Attachment = {
	fType: "image" | "video" | "audio" | "file" | null;
	url: string | null;
	size: number | null;
	mimeType: string | null;
	name: string | null;
};

export const users = createTable("user", (d) => ({
	id: d
		.varchar({ length: 255 })
		.notNull()
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: d.varchar({ length: 255 }),
	email: d.varchar({ length: 255 }).notNull().unique(),
	emailVerified: d
		.timestamp({
			mode: "date",
			withTimezone: true,
		})
		.default(sql`CURRENT_TIMESTAMP`),
	image: d.varchar({ length: 255 }),
	// password: d.varchar({ length: 255 }), // only for local auth
	createdAt: d
		.timestamp({ withTimezone: true })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export const conversationTypes = pgEnum("conversation_type", [
	"direct",
	"group",
]);
export const conversations = createTable(
	"conversation",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		type: conversationTypes("type").default("direct"),
		closed: d.boolean().default(false),
		// below fields are undefined for direct chats
		name: d.varchar({ length: 255 }),
		description: d.text(),
		image: d.varchar({ length: 255 }),
		creatorId: d.varchar({ length: 255 }).references(() => users.id),
		isPrivate: d.boolean().default(false),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		// wont be able to delete user if use this index
		// index("conversation_creator_id_idx").on(t.creatorId),
		index("conversation_type_idx").on(t.type),
	],
);

export const conversationJoinLinks = createTable(
	"conversation_join_link",
	(d) => ({
		token: d
			.varchar({ length: 255 })
			.notNull()
			.$defaultFn(() => crypto.randomUUID()),
		conversationId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		expiresAt: d.timestamp({ withTimezone: true }).notNull(),
	}),
	(t) => [
		primaryKey({ columns: [t.token, t.conversationId] }),
		uniqueIndex("conversation_join_link_token_idx").on(t.token),
		index("conversation_join_link_conversation_id_idx").on(t.conversationId),
	],
);

export const conversationMemberRoles = pgEnum("conversation_member_role", [
	"owner",
	"admin",
	"member",
]);

export const conversationMembers = createTable(
	"conversation_member",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		conversationId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: conversationMemberRoles("role").default("member"),
		joinedAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		lastReadAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		muted: d.boolean().default(false),
	}),
	(t) => [
		index("conversation_member_conversation_id_idx").on(t.conversationId),
		index("conversation_member_user_id_idx").on(t.userId),
		uniqueIndex("conversation_member_unique_idx").on(
			t.conversationId,
			t.userId,
		),
	],
);

export const messages = createTable(
	"message",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		text: d.text().notNull(),
		senderId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		conversationId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		repliedToId: d
			.varchar({ length: 255 })
			.references((): AnyPgColumn => messages.id),
		attachment: d.jsonb().$type<Attachment | null>(),
		deletedAt: d.timestamp({ withTimezone: true }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		// wont be able to delete user if use this index
		// index("message_sender_id_idx").on(t.senderId),
		index("message_conversation_id_idx").on(t.conversationId),
		index("message_replied_to_id_idx").on(t.repliedToId),
	],
);

export const userContacts = createTable(
	"user_contact",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		contactId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
	}),
	(t) => [
		index("user_contact_user_id_idx").on(t.userId),
		index("user_contact_contact_id_idx").on(t.contactId),
		uniqueIndex("user_contact_unique_idx").on(t.userId, t.contactId),
	],
);

export const userSettings = createTable(
	"user_setting",
	(d) => ({
		id: d
			.varchar({ length: 255 })
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		theme: d.varchar({ length: 20 }).default("light"),
		notifications: d.boolean().default(true),
		soundEnabled: d.boolean().default(true),
		language: d.varchar({ length: 10 }).default("en"),
		createdAt: d
			.timestamp({ withTimezone: true })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [uniqueIndex("user_setting_user_id_idx").on(t.userId)],
);

export const usersRelations = relations(users, ({ many, one }) => ({
	accounts: many(accounts),
	sentMessages: many(messages, { relationName: "userMessages" }),
	conversations: many(conversationMembers, {
		relationName: "userConversations",
	}),
	createdConversations: many(conversations, {
		relationName: "createdConversations",
	}),
	contacts: many(userContacts, { relationName: "userContacts" }),
	contactOf: many(userContacts, { relationName: "contactOfUsers" }),
	settings: one(userSettings),
}));

export const conversationsRelations = relations(
	conversations,
	({ many, one }) => ({
		members: many(conversationMembers),
		messages: many(messages),
		creator: one(users, {
			fields: [conversations.creatorId],
			references: [users.id],
			relationName: "createdConversations",
		}),
	}),
);

export const conversationMembersRelations = relations(
	conversationMembers,
	({ one }) => ({
		conversation: one(conversations, {
			fields: [conversationMembers.conversationId],
			references: [conversations.id],
		}),
		user: one(users, {
			fields: [conversationMembers.userId],
			references: [users.id],
			relationName: "userConversations",
		}),
	}),
);

export const messagesRelations = relations(messages, ({ one }) => ({
	sender: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "userMessages",
	}),
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
	}),
	repliedTo: one(messages, {
		fields: [messages.repliedToId],
		references: [messages.id],
	}),
}));

export const userContactsRelations = relations(userContacts, ({ one }) => ({
	user: one(users, {
		fields: [userContacts.userId],
		references: [users.id],
		relationName: "userContacts",
	}),
	contact: one(users, {
		fields: [userContacts.contactId],
		references: [users.id],
		relationName: "contactOfUsers",
	}),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id],
	}),
}));

// Next-Auth related tables
export const accounts = createTable(
	"account",
	(d) => ({
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
		provider: d.varchar({ length: 255 }).notNull(),
		providerAccountId: d.varchar({ length: 255 }).notNull(),
		refresh_token: d.text(),
		access_token: d.text(),
		expires_at: d.integer(),
		token_type: d.varchar({ length: 255 }),
		scope: d.varchar({ length: 255 }),
		id_token: d.text(),
		session_state: d.varchar({ length: 255 }),
	}),
	(t) => [
		primaryKey({ columns: [t.provider, t.providerAccountId] }),
		index("account_user_id_idx").on(t.userId),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
	"session",
	(d) => ({
		sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
		userId: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => users.id),
		expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
	}),
	(t) => [index("t_user_id_idx").on(t.userId)],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
	"verification_token",
	(d) => ({
		identifier: d.varchar({ length: 255 }).notNull(),
		token: d.varchar({ length: 255 }).notNull(),
		expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
	}),
	(t) => [primaryKey({ columns: [t.identifier, t.token] })],
);
