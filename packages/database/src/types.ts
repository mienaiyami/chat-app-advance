import type {
    conversationMembers,
    conversations,
    users,
    userSettings,
} from "./schema";

export type UserSettings = typeof userSettings.$inferSelect;
export type UserSettingsInsert = typeof userSettings.$inferInsert;

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type ConversationInsert = typeof conversations.$inferInsert;

export type ConversationMember = typeof conversationMembers.$inferSelect;
export type ConversationMemberInsert = typeof conversationMembers.$inferInsert;
