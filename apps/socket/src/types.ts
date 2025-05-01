import type { createCaller } from "@repo/api";
import type {
    Attachment,
    Message,
    MessageInsert,
    MessageWithRelations,
} from "@repo/database";

export type ConversationUpdatePayload = {
    id: string;
    lastMessage?: MessageWithRelations | null;
    updatedAt: Date;
};

export type MessageWithRelationsAndTempId = MessageWithRelations & {
    tempId?: string;
};

export type ServerToClientEvents = {
    "message:new": (message: MessageWithRelationsAndTempId) => void;
    "message:update": (message: MessageWithRelations) => void;
    "message:delete": (params: {
        messageId: string;
        conversationId: string;
    }) => void;

    "conversation:update": (data: ConversationUpdatePayload) => void;
    "conversation:read": (params: {
        conversationId: string;
        userId: string;
        timestamp: string;
    }) => void;

    "user:status": (params: {
        userId: string;
        status: "online" | "offline";
    }) => void;
    "user:typing": (params: { conversationId: string; userId: string }) => void;
    "user:stop_typing": (params: {
        conversationId: string;
        userId: string;
    }) => void;

    error: (data: { message: string }) => void;
};

// Extended MessageInsert with optional tempId for optimistic updates
export type MessageInsertWithTempId = MessageInsert & {
    tempId?: string;
};

export type ClientToServerEvents = {
    "message:send": (params: MessageInsertWithTempId) => void;
    "message:edit": (params: { messageId: string; text: string }) => void;
    "message:delete": (params: {
        messageId: string;
        conversationId: string;
    }) => void;

    "conversation:read": (params: { conversationId: string }) => void;
    "conversation:typing": (params: { conversationId: string }) => void;
    "conversation:stop_typing": (params: { conversationId: string }) => void;
};

export type InterServerEvents = {
    ping: () => void;
};

export type SocketData = {
    userId: string;
    api: ReturnType<typeof createCaller>;
};
