"use client";

import { useState, useCallback, useEffect } from "react";
import { useMessage } from "~/providers/message-provider";
import { useConversation } from "~/providers/conversation-provider";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";

import ChatHeader from "./components/chat-header";
import MessageList from "./components/message-list";
import MessageInput from "./components/message-input";
import ReplyIndicator from "./components/reply-indicator";
import { Skeleton } from "~/components/ui/skeleton";

import type { RouterOutputs } from "~/trpc/react";
type Message = RouterOutputs["message"]["getMessages"]["messages"][number];
type ConversationWithMembers = RouterOutputs["conversation"]["getAll"][number];

export function ChatArea() {
    const { data: session } = useSession();
    const {
        sendMessage,
        editMessage,
        isSending,
        isUploadingFile,
        handleTyping,
    } = useMessage();

    const { activeConversationId, conversations } = useConversation();

    const [newMessage, setNewMessage] = useState("");
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [selectedForReply, setSelectedForReply] = useState<Message | null>(
        null
    );

    const membersQuery = api.user.getMembers.useQuery(
        {
            conversationId: activeConversationId || "",
        },
        {
            enabled: !!activeConversationId,
        }
    );

    const isLoadingMembers = membersQuery.isLoading;
    const membersMap = new Map(membersQuery.data?.map((m) => [m.id, m]) || []);

    const chatOpened = conversations.find(
        (c) => c.id === activeConversationId
    ) as ConversationWithMembers | undefined;
    const currentUser = session?.user;
    const currentUserMembership = currentUser && membersMap.get(currentUser.id);
    const isChatMuted = currentUserMembership?.muted || false;
    const isCurrentUserAdmin = currentUserMembership?.role === "admin";

    // Reset state when changing conversations
    useEffect(() => {
        setNewMessage("");
        setEditingMessage(null);
        setSelectedForReply(null);
    }, [activeConversationId]);

    const handleSendMessage = useCallback(
        (file?: File | null) => {
            if (editingMessage) {
                if (newMessage.trim()) {
                    editMessage(editingMessage.id, newMessage.trim());
                    setEditingMessage(null);
                    setNewMessage("");
                }
                return;
            }

            if (
                activeConversationId &&
                currentUser?.id &&
                (newMessage.trim() || file)
            ) {
                sendMessage({
                    conversationId: activeConversationId,
                    text: newMessage.trim(),
                    repliedToId: selectedForReply?.id,
                    attachment: file || null,
                    senderId: currentUser.id,
                });
                setNewMessage("");
                setSelectedForReply(null);
            }
        },
        [
            editingMessage,
            newMessage,
            activeConversationId,
            currentUser?.id,
            selectedForReply?.id,
            sendMessage,
            editMessage,
        ]
    );

    const handleEditStart = useCallback((message: Message) => {
        setEditingMessage(message);
        setNewMessage(message.text);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingMessage(null);
        setNewMessage("");
    }, []);

    const handleReply = useCallback((message: Message) => {
        setSelectedForReply(message);
    }, []);

    const handleCancelReply = useCallback(() => {
        setSelectedForReply(null);
    }, []);

    if (!chatOpened) {
        return (
            <div className="h-full flex-1 grid place-items-center select-none border rounded-r-lg border-l-0 max-h-screen">
                <p className="text-accent-foreground">
                    Select a chat/group to start chatting
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex-1 flex flex-col border rounded-r-lg border-l-0 max-h-screen">
            {isLoadingMembers ? (
                <ChatHeaderSkeleton />
            ) : (
                <ChatHeader
                    chatOpened={chatOpened}
                    currentUser={currentUser}
                    isChatMuted={isChatMuted}
                    membersMap={membersMap}
                />
            )}

            {isLoadingMembers ? (
                <MessageListSkeleton />
            ) : (
                <MessageList
                    currentUser={currentUser}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    onEditStart={handleEditStart}
                    onReply={handleReply}
                    selectedForReply={selectedForReply}
                />
            )}

            {selectedForReply && (
                <ReplyIndicator
                    selectedForReply={selectedForReply}
                    currentUserName={currentUser?.name}
                    chatName={chatOpened.name || ""}
                    onCancelReply={handleCancelReply}
                />
            )}

            <MessageInput
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                editingMessage={editingMessage}
                selectedForReply={selectedForReply}
                isSending={isSending}
                isUploadingFile={isUploadingFile}
                onSend={handleSendMessage}
                onCancelEdit={handleCancelEdit}
                onCancelReply={handleCancelReply}
                onTyping={handleTyping}
            />
        </div>
    );
}

function ChatHeaderSkeleton() {
    return (
        <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </div>
    );
}

function MessageListSkeleton() {
    const skeletonItems = Array.from({ length: 5 }).map((_, i) => ({
        id: `skeleton-message-${i}-${Math.random().toString(36).substr(2, 9)}`,
        // isLeft: i % 2 === 0,
    }));

    return (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {skeletonItems.map((item) => (
                <div
                    key={item.id}
                    className={`flex ${
                        // item.isLeft ? "justify-start" : "justify-end"
                        "justify-start"
                    }`}
                >
                    <div
                        className={`flex ${
                            // item.isLeft ? "flex-row" : "flex-row-reverse"
                            "flex-row"
                        } items-start gap-2 max-w-[80%]`}
                    >
                        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-14" />
                            </div>
                            <Skeleton
                                className={`h-16 w-full min-w-40 rounded-md ${
                                    // item.isLeft
                                    //     ? "rounded-tl-none"
                                    //     : "rounded-tr-none"
                                    "rounded-sm"
                                }`}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
