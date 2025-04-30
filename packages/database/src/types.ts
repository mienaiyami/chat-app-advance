import type {
	conversationMembers,
	conversations,
	messages,
	userSettings,
	users,
} from "./schema";

export type UserSettings = typeof userSettings.$inferSelect;
export type UserSettingsInsert = typeof userSettings.$inferInsert;

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type ConversationInsert = typeof conversations.$inferInsert;

export type ConversationMember = typeof conversationMembers.$inferSelect;
export type ConversationMemberInsert = typeof conversationMembers.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;

export type MessageWithRelations = Message & {
	sender: {
		id: string;
		name: string | null;
		image: string | null;
	};
	repliedTo:
		| (Message & {
				sender: {
					id: string;
					name: string | null;
					image: string | null;
				};
		  })
		| null;
};
