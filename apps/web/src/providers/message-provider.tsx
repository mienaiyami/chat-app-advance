"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { toast } from "sonner";
import { api, type RouterOutputs } from "~/trpc/react";
import { useConversation } from "./conversation-provider";
import type { Attachment } from "@repo/database";
import { useUploadThing } from "~/lib/uploadthing";
import type { ClientUploadedFileData } from "uploadthing/types";

type Message = RouterOutputs["message"]["getMessages"]["messages"][number];

interface SendMessageParams {
    conversationId: string;
    text: string;
    repliedToId?: string;
    attachment?: File;
    attachmentUrl?: string;
}

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
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
        null
    );

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

    const { startUpload, isUploading: isUploadingFile } = useUploadThing(
        "chatFileUploader",
        {
            onClientUploadComplete: (res) => {
                if (res && res[0] && activeConversationId) {
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

                    sendMessageMutation.mutateAsync({
                        conversationId: activeConversationId,
                        text: uploadedFile.name,
                        attachment: {
                            url: uploadedFile.ufsUrl,
                            name: uploadedFile.name,
                            size: uploadedFile.size,
                            fType,
                            mimeType:
                                uploadedFile.type || "application/octet-stream",
                        },
                    });
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
            attachmentUrl,
        }: SendMessageParams) => {
            if (!text.trim() && !attachment && !attachmentUrl) return;

            setIsSending(true);
            try {
                if (attachment) {
                    await startUpload([attachment]);
                    return;
                }

                if (attachmentUrl) {
                    const fileExtension =
                        attachmentUrl.split(".").pop()?.toLowerCase() || "";
                    const mimeType = getMimeTypeFromExtension(fileExtension);

                    let fType: "image" | "video" | "audio" | "file" = "file";
                    if (mimeType.startsWith("image/")) {
                        fType = "image";
                    } else if (mimeType.startsWith("video/")) {
                        fType = "video";
                    } else if (mimeType.startsWith("audio/")) {
                        fType = "audio";
                    }

                    await sendMessageMutation.mutateAsync({
                        conversationId,
                        text: text.trim(),
                        repliedToId,
                        attachment: {
                            url: attachmentUrl,
                            name: text.trim() || "File",
                            size: 0,
                            fType,
                            mimeType,
                        },
                    });
                } else {
                    await sendMessageMutation.mutateAsync({
                        conversationId,
                        text: text.trim(),
                        repliedToId,
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsSending(false);
            }
        },
        [sendMessageMutation, startUpload]
    );

    const editMessage = useCallback(
        async (messageId: string, text: string) => {
            if (!text.trim()) return;

            try {
                await editMessageMutation.mutateAsync({
                    messageId,
                    text: text.trim(),
                });
            } catch (error) {
                console.error(error);
            }
        },
        [editMessageMutation]
    );

    const deleteMessage = useCallback(
        async (messageId: string) => {
            try {
                await deleteMessageMutation.mutateAsync({
                    messageId,
                });
            } catch (error) {
                console.error(error);
            }
        },
        [deleteMessageMutation]
    );

    const markAsRead = useCallback(async () => {
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
    }, [activeConversationId, markAsReadMutation]);

    const handleTyping = useCallback(() => {
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
    }, [typingTimeout]);

    // Clean up typing timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
        };
    }, [typingTimeout]);

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
