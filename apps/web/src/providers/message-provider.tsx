"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "~/trpc/react";
import { useConversation } from "./conversation-provider";
import { useUploadThing } from "~/lib/uploadthing";
import { useSocket } from "./socket-provider";
import { useSession } from "next-auth/react";
import type { MessageWithRelations } from "@repo/database";
import type { ClientToServerEvents } from "@app/socket/types";

type Message = MessageWithRelations;

type SendMessageParams = Parameters<ClientToServerEvents["message:send"]>[0];

interface MessageContextType {
    messages: Message[];
    sendMessage: (params: SendMessageParams) => Promise<void>;
    editMessage: (messageId: string, text: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    markAsRead: () => Promise<void>;
    isSending: boolean;
    isUploadingFile: boolean;
    handleTyping: () => void;
    hasMore: boolean;
    isLoadingMore: boolean;
    loadMoreMessages: () => void;
}

const MessageContext = createContext<MessageContextType | null>(null);

const getMimeTypeFromExtension = (extension: string): string => {
    const imageTypes = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
    const videoTypes = ["mp4", "webm", "ogg", "mov", "avi"];
    const audioTypes = ["mp3", "wav", "ogg", "aac"];

    if (imageTypes.includes(extension)) return `image/${extension}`;
    if (videoTypes.includes(extension)) return `video/${extension}`;
    if (audioTypes.includes(extension)) return `audio/${extension}`;

    return "application/octet-stream";
};

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
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { data: session } = useSession();

    const { socket, isConnected, emitTyping, emitStopTyping } = useSocket();

    const {
        data: messagesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
    } = api.message.getMessages.useInfiniteQuery(
        {
            conversationId: activeConversationId || "",
            // using low limit for testing
            limit: 10,
        },
        {
            enabled: !!activeConversationId,
            refetchOnWindowFocus: false,
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        }
    );

    useEffect(() => {
        if (messagesData?.pages) {
            const allMessages = messagesData.pages.flatMap(
                (page) => page.messages
            );
            setMessages(allMessages);
        }
    }, [messagesData]);

    const loadMoreMessages = useCallback(() => {
        if (!isFetchingNextPage && hasNextPage) {
            fetchNextPage();
        }
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        const handleNewMessage = (newMessage: Message) => {
            console.log("newMessage", newMessage);
            if (newMessage.conversationId === activeConversationId) {
                setMessages((prev) => [newMessage, ...prev]);
            }
        };

        const handleUpdateMessage = (updatedMessage: Message) => {
            if (updatedMessage.conversationId === activeConversationId) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === updatedMessage.id ? updatedMessage : msg
                    )
                );
            }
        };

        const handleDeleteMessage = ({
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
        socket.on("message:update", handleUpdateMessage);
        socket.on("message:delete", handleDeleteMessage);

        return () => {
            socket.off("message:new", handleNewMessage);
            socket.off("message:update", handleUpdateMessage);
            socket.off("message:delete", handleDeleteMessage);
        };
    }, [socket, isConnected, activeConversationId]);

    useEffect(() => {
        if (activeConversationId && socket && isConnected) {
            markAsRead();
        }
    }, [activeConversationId, socket, isConnected]);

    const sendMessageMutation = api.message.sendMessage.useMutation({
        onSuccess: () => {
            // Don't need to refetch as socket will provide the new message
            // Only refetch if socket is not connected
            if (!isConnected) {
                refetch();
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send message");
        },
    });

    const editMessageMutation = api.message.editMessage.useMutation({
        onSuccess: () => {
            if (!isConnected) {
                refetch();
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to edit message");
        },
    });

    const deleteMessageMutation = api.message.deleteMessage.useMutation({
        onSuccess: () => {
            if (!isConnected) {
                refetch();
            }
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

    const { startUpload, isUploading: isUploadingFile } = useUploadThing(
        "chatFileUploader",
        {
            onClientUploadComplete: (res) => {
                if (res?.[0] && activeConversationId) {
                    const uploadedFile = res[0];
                    const fileType =
                        uploadedFile.name.split(".").pop()?.toLowerCase() || "";

                    let fType: "image" | "video" | "audio" | "file" = "file";
                    if (uploadedFile.type?.startsWith("image/")) {
                        fType = "image";
                    } else if (uploadedFile.type?.startsWith("video/")) {
                        fType = "video";
                    } else if (uploadedFile.type?.startsWith("audio/")) {
                        fType = "audio";
                    }
                }
            },
            onUploadError: (error) => {
                toast.error(`Error uploading file: ${error.message}`);
            },
        }
    );

    const sendMessage = useCallback(
        async ({
            conversationId,
            text,
            repliedToId,
            attachment,
        }: SendMessageParams) => {
            if (!text.trim() && !attachment) return;

            setIsSending(true);
            try {
                // When user uploads a file via the UI
                if (attachment && "lastModified" in attachment) {
                    // It's a File object from browser
                    await startUpload([attachment as unknown as File]);
                    return;
                }
                // Use socket if connected, otherwise use TRPC
                if (socket && isConnected && session?.user.id) {
                    socket.emit("message:send", {
                        conversationId,
                        text: text.trim(),
                        senderId: session.user.id,
                        repliedToId,
                        attachment,
                    });
                } else {
                    await sendMessageMutation.mutateAsync({
                        conversationId,
                        text: text.trim(),
                        repliedToId,
                        attachment,
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsSending(false);
            }
        },
        [
            sendMessageMutation,
            startUpload,
            socket,
            isConnected,
            session?.user.id,
        ]
    );

    const editMessage = useCallback(
        async (messageId: string, text: string) => {
            if (!text.trim()) return;

            try {
                // Use socket if connected, otherwise use TRPC
                if (socket && isConnected) {
                    socket.emit("message:edit", {
                        messageId,
                        text: text.trim(),
                    });
                } else {
                    await editMessageMutation.mutateAsync({
                        messageId,
                        text: text.trim(),
                    });
                }
            } catch (error) {
                console.error(error);
            }
        },
        [editMessageMutation, socket, isConnected]
    );

    const deleteMessage = useCallback(
        async (messageId: string) => {
            try {
                if (socket && isConnected && activeConversationId) {
                    socket.emit("message:delete", {
                        messageId,
                        conversationId: activeConversationId,
                    });
                } else {
                    await deleteMessageMutation.mutateAsync({
                        messageId,
                    });
                }
            } catch (error) {
                console.error(error);
            }
        },
        [deleteMessageMutation, socket, isConnected, activeConversationId]
    );

    const markAsRead = useCallback(async () => {
        if (!activeConversationId) return Promise.resolve();

        try {
            // Use socket if connected, otherwise use TRPC
            if (socket && isConnected) {
                socket.emit("conversation:read", {
                    conversationId: activeConversationId,
                });
            } else {
                await markAsReadMutation.mutateAsync({
                    conversationId: activeConversationId,
                });
            }
            return Promise.resolve();
        } catch (error) {
            console.error(error);
            return Promise.reject(error);
        }
    }, [activeConversationId, markAsReadMutation, socket, isConnected]);

    const handleTyping = useCallback(() => {
        if (!activeConversationId || !socket || !isConnected) return;

        emitTyping(activeConversationId);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            emitStopTyping(activeConversationId);
        }, 2000);
    }, [activeConversationId, socket, isConnected, emitTyping, emitStopTyping]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    return (
        <MessageContext.Provider
            value={{
                messages,
                sendMessage,
                editMessage,
                deleteMessage,
                markAsRead,
                isSending,
                isUploadingFile,
                handleTyping,
                hasMore: !!hasNextPage,
                isLoadingMore: isFetchingNextPage,
                loadMoreMessages,
            }}
        >
            {children}
        </MessageContext.Provider>
    );
};
