"use client";

import { useState, useCallback, useEffect } from "react";
import { useMessage } from "~/providers/message-provider";
import { useConversation } from "~/providers/conversation-provider";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useSocket } from "~/providers/socket-provider";

import ChatHeader from "./components/chat-header";
import MessageList from "./components/message-list";
import MessageInput from "./components/message-input";
import ReplyIndicator from "./components/reply-indicator";

import type { RouterOutputs } from "~/trpc/react";
type Message = RouterOutputs["message"]["getMessages"]["messages"][number];
type ConversationWithMembers = RouterOutputs["conversation"]["getAll"][number];

export function ChatArea() {
    const { data: session } = useSession();
    const { typingUsers, onlineUsers } = useSocket();
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

    const clearChatMutation = api.conversation.clearChat.useMutation({
        onSuccess: () => {
            toast.success("Chat cleared successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to clear chat");
        },
    });

    const leaveGroupMutation = api.conversation.leave.useMutation({
        onSuccess: () => {
            toast.success("Left group successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to leave group");
        },
    });

    const removeMemberMutation = api.conversation.removeMember.useMutation({
        onSuccess: () => {
            toast.success("Member removed successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to remove member");
        },
    });

    const updateContactMutation = api.user.updateContact.useMutation({
        onSuccess: () => {
            toast.success("Contact updated successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update contact");
        },
    });

    const utils = api.useUtils();
    const updateMutedChatMutation = api.user.updateMutedChat.useMutation({
        onSuccess: () => {
            toast.success("Chat preference updated");
            // Invalidate the members query to refresh the muted status
            if (activeConversationId) {
                utils.user.getMembers.invalidate({
                    conversationId: activeConversationId,
                });
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update chat preference");
        },
    });

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

    const handleClearChat = useCallback(() => {
        if (activeConversationId) {
            clearChatMutation.mutate({ conversationId: activeConversationId });
        }
    }, [activeConversationId, clearChatMutation]);

    const handleLeaveGroup = useCallback(() => {
        if (activeConversationId) {
            leaveGroupMutation.mutate({ conversationId: activeConversationId });
        }
    }, [activeConversationId, leaveGroupMutation]);

    const handleUpdateContact = useCallback(
        (userId: string, action: "add" | "remove") => {
            updateContactMutation.mutate({ userId, action });
        },
        [updateContactMutation]
    );

    const handleUpdateMutedChat = useCallback(
        (chatId: string, muted: boolean) => {
            updateMutedChatMutation.mutate({ conversationId: chatId, muted });
        },
        [updateMutedChatMutation]
    );

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
                typingUsers={typingUsers}
                onlineUsers={onlineUsers}
                membersMap={membersMap}
                onClearChat={handleClearChat}
                onLeaveGroup={handleLeaveGroup}
                onUpdateMutedChat={handleUpdateMutedChat}
                onUpdateContact={handleUpdateContact}
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
