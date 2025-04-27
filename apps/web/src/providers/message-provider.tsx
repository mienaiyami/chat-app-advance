"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "~/trpc/react";
import { useConversation } from "./conversation-provider";
import type { Attachment } from "@repo/database";

type Message = RouterOutputs["message"]["getMessages"]["messages"][number];

interface SendMessageParams {
    conversationId: string;
    text: string;
    repliedToId?: string;
    attachment?: File;
}

interface MessageContextType {
    messages: Message[];
    sendMessage: (params: SendMessageParams) => Promise<void>;
    editMessage: (messageId: string, text: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    markAsRead: () => Promise<void>;
    isSending: boolean;
    handleTyping: () => void;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const useMessage = () => {
    const context = useContext(MessageContext);
    if (!context) {
        throw new Error("useMessage must be used within a MessageProvider");
    }
    return context;
};

export const MessageProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const { activeConversationId } = useConversation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
        null
    );

    const { data: messagesData, refetch } = api.message.getMessages.useQuery(
        {
            conversationId: activeConversationId || "",
            limit: 100,
        },
        {
            enabled: !!activeConversationId,
            refetchOnWindowFocus: false,
        }
    );

    useEffect(() => {
        if (messagesData?.messages) {
            setMessages(messagesData.messages);
        }
    }, [messagesData]);

    const sendMessageMutation = api.message.sendMessage.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send message");
        },
    });

    const editMessageMutation = api.message.editMessage.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to edit message");
        },
    });

    const deleteMessageMutation = api.message.deleteMessage.useMutation({
        onSuccess: () => {
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete message");
        },
    });

    const markAsReadMutation = api.conversation.markAsRead.useMutation({
        onError: (error) => {
            console.error("Failed to mark as read:", error);
        },
    });

    // Handle file upload (simplified)
    const handleFileUpload = async (file: File): Promise<Attachment> => {
        // This would normally upload to a storage service like S3
        // For this example, we'll just pretend we uploaded it successfully

        // Determine the file type
        const fType = file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
            ? "video"
            : file.type.startsWith("audio/")
            ? "audio"
            : "file";

        // Return mock attachment info
        return {
            name: file.name,
            size: file.size,
            fType,
            url: URL.createObjectURL(file), // In a real app, this would be the uploaded file URL
            mimeType: file.type,
        };
    };

    const sendMessage = async ({
        conversationId,
        text,
        repliedToId,
        attachment,
    }: SendMessageParams) => {
        if (!text.trim() && !attachment) return;

        setIsSending(true);
        try {
            let attachmentData: Attachment | undefined;

            if (attachment) {
                attachmentData = await handleFileUpload(attachment);
            }

            await sendMessageMutation.mutateAsync({
                conversationId,
                text: text.trim(),
                repliedToId,
                attachment: attachmentData,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    const editMessage = async (messageId: string, text: string) => {
        if (!text.trim()) return;

        try {
            await editMessageMutation.mutateAsync({
                messageId,
                text: text.trim(),
            });
        } catch (error) {
            console.error(error);
        }
    };

    const deleteMessage = async (messageId: string) => {
        try {
            await deleteMessageMutation.mutateAsync({
                messageId,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const markAsRead = async () => {
        if (!activeConversationId) return Promise.resolve();

        try {
            await markAsReadMutation.mutateAsync({
                conversationId: activeConversationId,
            });
            return Promise.resolve();
        } catch (error) {
            console.error(error);
            return Promise.reject(error);
        }
    };
    const handleTyping = () => {
        // In a real app, you would emit a socket event to notify other users
        // that the current user is typing

        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // Set a timeout to clear the typing indicator after 2 seconds of inactivity
        const timeout = setTimeout(() => {
            // In a real app, emit a socket event to clear typing indicator
        }, 2000);

        setTypingTimeout(timeout);
    };

    // Clean up typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout]);

    const value = {
        messages,
        sendMessage,
        editMessage,
        deleteMessage,
        markAsRead,
        isSending,
        handleTyping,
    };

    return (
        <MessageContext.Provider value={value}>
            {children}
        </MessageContext.Provider>
    );
};
