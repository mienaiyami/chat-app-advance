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
            <ChatHeader
                chatOpened={chatOpened}
                currentUser={currentUser}
                isChatMuted={isChatMuted}
                membersMap={membersMap}
            />

            <MessageList
                currentUser={currentUser}
                isCurrentUserAdmin={isCurrentUserAdmin}
                onEditStart={handleEditStart}
                onReply={handleReply}
                selectedForReply={selectedForReply}
            />

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
