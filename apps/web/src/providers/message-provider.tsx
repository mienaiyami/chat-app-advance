"use client";

import type {
    ClientToServerEvents,
    MessageWithRelationsAndTempId,
} from "@app/socket/types";
import type { Attachment, MessageWithRelations } from "@repo/database";
import { useSession } from "next-auth/react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { toast } from "sonner";
import { useUploadThing } from "~/lib/uploadthing";
import { type RouterOutputs, api } from "~/trpc/react";
import { useConversation } from "./conversation-provider";
import { useSocket } from "./socket-provider";

type Message = MessageWithRelations;

/**
 * status can be undefined for messages "sent"
 */
export type MessageWithStatus = Message & {
    status?: "sending" | "sent" | "error";
};

type SendMessageParams = Omit<
    Parameters<ClientToServerEvents["message:send"]>[0],
    "attachment"
> & {
    attachment?: Attachment | File | null;
};

interface MessageContextType {
    messages: MessageWithStatus[];
    messageCount: number;
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
    const [messages, setMessages] = useState<MessageWithStatus[]>([]);
    const [isSending, setIsSending] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    /**
     * this is used mainly in message list to scroll to bottom
     * only when a new message is sent (not edited or deleted)
     */
    const [messageCount, setMessageCount] = useState(0);
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
            const allMessages = messagesData.pages
                .flatMap((page) => page.messages)
                .reverse();

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

        const handleNewMessage = (
            newMessage: MessageWithRelationsAndTempId
        ) => {
            if (newMessage.conversationId === activeConversationId) {
                setMessages((prev) => {
                    const pendingIndex =
                        newMessage.senderId === session?.user.id
                            ? prev.findIndex(
                                  (msg) => msg.id === newMessage.tempId
                              )
                            : -1;

                    if (pendingIndex >= 0) {
                        // Replace the pending message with the confirmed one
                        const updatedMessages = [...prev];
                        updatedMessages[pendingIndex] = {
                            ...newMessage,
                            status: "sent",
                        };
                        return updatedMessages;
                    }
                    if (pendingIndex === -1)
                        setMessageCount((prev) => prev + 1);
                    return [...prev, newMessage];
                });
            }
        };

        const handleUpdateMessage = (updatedMessage: Message) => {
            if (updatedMessage.conversationId === activeConversationId) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === updatedMessage.id
                            ? { ...updatedMessage, status: "sent" }
                            : msg
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
                if (res?.[0] && activeConversationId && session?.user.id) {
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

                    if (socket && isConnected) {
                        socket.emit("message:send", {
                            conversationId: activeConversationId,
                            text: uploadedFile.name,
                            senderId: session.user.id,
                            attachment: {
                                url: uploadedFile.ufsUrl,
                                name: uploadedFile.name,
                                size: uploadedFile.size,
                                fType,
                                mimeType:
                                    uploadedFile.type ||
                                    "application/octet-stream",
                            },
                        });
                    } else {
                        sendMessageMutation.mutateAsync({
                            conversationId: activeConversationId,
                            text: uploadedFile.name,
                            attachment: {
                                url: uploadedFile.ufsUrl,
                                name: uploadedFile.name,
                                size: uploadedFile.size,
                                fType,
                                mimeType:
                                    uploadedFile.type ||
                                    "application/octet-stream",
                            },
                        });
                    }
                }
                setIsSending(false);
            },
            onUploadError: (error) => {
                toast.error(`Error uploading file: ${error.message}`);
                setIsSending(false);
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
                if (attachment && "lastModified" in attachment) {
                    const file = attachment as unknown as File;
                    await startUpload([file]);
                    return;
                }

                const optimisticMessage: MessageWithStatus = {
                    ...createOptimisticMessage(
                        conversationId,
                        text.trim(),
                        session?.user,
                        repliedToId,
                        attachment as Attachment | null
                    ),
                    status: "sending",
                };

                setMessages((prev) => [...prev, optimisticMessage]);
                setMessageCount((init) => init + 1);

                // Use socket if connected, otherwise use TRPC
                if (socket && isConnected && session?.user.id) {
                    socket.emit("message:send", {
                        conversationId,
                        text: text.trim(),
                        senderId: session.user.id,
                        repliedToId,
                        attachment,
                        tempId: optimisticMessage.id,
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
                // Mark the optimistic message as error
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.status === "sending" &&
                        msg.text === text.trim() &&
                        msg.conversationId === conversationId
                            ? { ...msg, status: "error" }
                            : msg
                    )
                );
            } finally {
                setIsSending(false);
            }
        },
        [sendMessageMutation, startUpload, socket, isConnected, session?.user]
    );

    const editMessage = useCallback(
        async (messageId: string, text: string) => {
            if (!text.trim()) return;

            try {
                // Optimistic update for edit
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId
                            ? {
                                  ...msg,
                                  text: text.trim(),
                                  status: "sending",
                                  edited: true,
                              }
                            : msg
                    )
                );

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
                // Revert to original text on error
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === messageId ? { ...msg, status: "error" } : msg
                    )
                );
            }
        },
        [editMessageMutation, socket, isConnected]
    );

    const deleteMessage = useCallback(
        async (messageId: string) => {
            try {
                // Optimistic update for delete
                setMessages((prev) =>
                    prev.filter((msg) => msg.id !== messageId)
                );

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
                refetch(); // Revert by refetching on error
            }
        },
        [
            deleteMessageMutation,
            socket,
            isConnected,
            activeConversationId,
            refetch,
        ]
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
                messageCount,
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

function createOptimisticMessage(
    conversationId: string,
    text: string,
    user:
        | { id: string; name?: string | null; image?: string | null }
        | undefined,
    repliedToId: string | null | undefined,
    attachment: Attachment | null
): Message {
    const now = new Date();
    const id = `temp-${now.getTime()}`;

    return {
        id,
        text,
        conversationId,
        senderId: user?.id || "unknown",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        repliedToId: repliedToId || null,
        attachment,
        // Add sender info directly in the message to match server response
        sender: {
            id: user?.id || "unknown",
            name: user?.name || null,
            image: user?.image || null,
        },
        repliedTo: null,
    } as Message;
}
