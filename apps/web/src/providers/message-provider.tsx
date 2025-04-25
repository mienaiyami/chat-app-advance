"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./socket-provider";
import { useConversation } from "./conversation-provider";
import { toast } from "sonner";
import { api, type RouterInputs, type RouterOutputs } from "~/trpc/react";

type Message = RouterOutputs["message"]["getMessages"]["messages"][number];
type MessageInput = RouterInputs["message"]["sendMessage"];

type MessageContextType = {
    messages: Message[];
    isFetching: boolean;
    isFetchingNextPage: boolean;
    isSending: boolean;
    sendMessage: (input: MessageInput) => Promise<void>;
    editMessage: (messageId: string, text: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    markAsRead: () => Promise<void>;
    replyToMessage: Message | null;
    setReplyToMessage: (message: Message | null) => void;
    loadMoreMessages: () => Promise<void>;
    hasMoreMessages: boolean;
};

const MessageContext = createContext<MessageContextType | null>(null);

export function MessageProvider({ children }: { children: React.ReactNode }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
    const { socket } = useSocket();
    const { activeConversationId } = useConversation();

    const utils = api.useUtils();

    useEffect(() => {
        setMessages([]);
        setReplyToMessage(null);
    }, [activeConversationId]);

    const {
        data: messagesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isFetching,
    } = api.message.getMessages.useInfiniteQuery(
        {
            conversationId: activeConversationId ?? "",
        },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            enabled: !!activeConversationId,
        }
    );

    const sendMessageMutation = api.message.sendMessage.useMutation({
        onSuccess: async () => {
            // await utils.message.getMessages.invalidate();

            setReplyToMessage(null);
        },
        onError: (error) => {
            toast.error("Failed to send message");
            console.error(error);
        },
    });

    const editMessageMutation = api.message.editMessage.useMutation({
        onSuccess: async (updatedMessage) => {
            // todo: update the message in the messages array
        },
        onError: (error) => {
            toast.error("Failed to edit message");
            console.error(error);
        },
    });

    const deleteMessageMutation = api.message.deleteMessage.useMutation({
        onSuccess: async ({ success }, { messageId }) => {
            if (success) {
                setMessages((prev) =>
                    prev.filter((msg) => msg.id !== messageId)
                );
            } else {
                toast.error("Failed to delete message");
            }
        },
        onError: (error) => {
            toast.error("Failed to delete message");
            console.error(error);
        },
    });

    const markAsReadMutation = api.conversation.markAsRead.useMutation({
        onSuccess: async () => {
            await utils.conversation.getAll.invalidate();
        },
        onError: (error) => {
            toast.error("Failed to mark messages as read");
            console.error(error);
        },
    });

    useEffect(() => {
        if (!socket || !activeConversationId) return;

        const handleNewMessage = (message: Message) => {
            if (message.conversationId === activeConversationId) {
                setMessages((prev) => [...prev, message]);
                markAsRead();
            }
        };

        const handleMessageUpdated = (message: Message) => {
            if (message.conversationId === activeConversationId) {
                setMessages((prev) =>
                    prev.map((msg) => (msg.id === message.id ? message : msg))
                );
            }
        };

        const handleMessageDeleted = ({
            messageId,
            conversationId,
        }: {
            messageId: string;
            conversationId: string;
        }) => {
            if (conversationId === activeConversationId) {
                setMessages((prev) =>
                    prev.filter((msg) => msg.id !== messageId)
                );
            }
        };

        socket.on("message:new", handleNewMessage);
        socket.on("message:updated", handleMessageUpdated);
        socket.on("message:deleted", handleMessageDeleted);

        return () => {
            socket.off("message:new", handleNewMessage);
            socket.off("message:updated", handleMessageUpdated);
            socket.off("message:deleted", handleMessageDeleted);
        };
    }, [socket, activeConversationId]);

    const sendMessage = async (input: MessageInput) => {
        if (!activeConversationId) return;
        sendMessageMutation.mutate({
            conversationId: input.conversationId,
            text: input.text,
            repliedToId: input.repliedToId,
            attachment: input.attachment,
        });
    };

    const editMessage = async (messageId: string, text: string) => {
        editMessageMutation.mutate({ messageId, text });
    };

    const deleteMessage = async (messageId: string) => {
        deleteMessageMutation.mutate({ messageId });
    };

    const markAsRead = async () => {
        if (!activeConversationId) return;

        markAsReadMutation.mutate({
            conversationId: activeConversationId,
        });
    };

    const loadMoreMessages = async () => {
        if (!hasNextPage || isFetchingNextPage || !activeConversationId) return;

        fetchNextPage();
    };

    const value: MessageContextType = {
        messages,
        isFetching,
        isFetchingNextPage,
        isSending: sendMessageMutation.isPending,
        sendMessage,
        editMessage,
        deleteMessage,
        markAsRead,
        replyToMessage,
        setReplyToMessage,
        loadMoreMessages,
        hasMoreMessages: hasNextPage,
    };

    return (
        <MessageContext.Provider value={value}>
            {children}
        </MessageContext.Provider>
    );
}

export const useMessage = () => {
    const context = useContext(MessageContext);
    if (!context) {
        throw new Error("useMessage must be used within a MessageProvider");
    }
    return context;
};
