"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useSocket } from "~/components";
import { api, type RouterOutputs } from "~/trpc/react";

export type Message = RouterOutputs["message"]["sendMessage"];
export type TypingStatus = Record<string, boolean>;

export function useConversationSocket(
    conversationId: string | null,
    conversationType: "direct" | "group" | null = null
) {
    const socketHook = useSocket();
    const { data: session } = useSession();
    const utils = api.useUtils();
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<TypingStatus>({});

    const { data: initialMessages } = api.message.getMessages.useQuery(
        { conversationId: conversationId ?? "", limit: 50 },
        { enabled: !!conversationId }
    );

    useEffect(() => {
        if (initialMessages?.messages) {
            setMessages(initialMessages.messages);
        }
    }, [initialMessages]);

    useEffect(() => {
        if (!conversationId || !socketHook.isConnected) return;

        if (conversationType === "direct" || conversationType === null) {
            socketHook.socket?.emit("chat:join", conversationId);
        }

        if (conversationType === "group" || conversationType === null) {
            socketHook.socket?.emit("group:join", conversationId);
        }

        return () => {
            if (conversationType === "direct" || conversationType === null) {
                socketHook.socket?.emit("chat:leave", conversationId);
            }

            if (conversationType === "group" || conversationType === null) {
                socketHook.socket?.emit("group:leave", conversationId);
            }
        };
    }, [
        conversationId,
        conversationType,
        socketHook.isConnected,
        socketHook.socket,
    ]);

    useEffect(() => {
        if (!socketHook.socket || !conversationId) return;

        const handleNewMessage = (newMessage: Message) => {
            if (newMessage.conversationId === conversationId) {
                setMessages((prevMessages) => [...prevMessages, newMessage]);
                utils.message.getMessages.invalidate({ conversationId });
            }
        };

        const handleTypingStatus = ({
            userId,
            isTyping,
        }: {
            userId: string;
            isTyping: boolean;
        }) => {
            if (userId !== session?.user?.id) {
                setTypingUsers((prev) => ({
                    ...prev,
                    [userId]: isTyping,
                }));
            }
        };

        socketHook.socket.on("chat:message", handleNewMessage);
        socketHook.socket.on("group:message", handleNewMessage);

        socketHook.socket.on("chat:typing", handleTypingStatus);
        socketHook.socket.on("group:typing", handleTypingStatus);

        return () => {
            socketHook.socket?.off("chat:message", handleNewMessage);
            socketHook.socket?.off("group:message", handleNewMessage);
            socketHook.socket?.off("chat:typing", handleTypingStatus);
            socketHook.socket?.off("group:typing", handleTypingStatus);
        };
    }, [socketHook.socket, conversationId, session?.user?.id, utils.message]);

    const setTyping = useCallback(
        (isTyping: boolean) => {
            if (!conversationId || !session?.user?.id) return;

            if (conversationType === "direct") {
                socketHook.socket?.emit("chat:typing", {
                    chatId: conversationId,
                    userId: session.user.id,
                    isTyping,
                });
            } else if (conversationType === "group") {
                socketHook.socket?.emit("group:typing", {
                    groupId: conversationId,
                    userId: session.user.id,
                    isTyping,
                });
            }
        },
        [conversationId, conversationType, session?.user?.id, socketHook.socket]
    );

    const addOptimisticMessage = useCallback((message: Message) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    const updateMessage = useCallback((updatedMessage: Message) => {
        setMessages((prev) =>
            prev.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
            )
        );
    }, []);

    const deleteMessage = useCallback((messageId: string) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    }, []);

    const sendMessageMutation = api.message.sendMessage.useMutation({
        onMutate: (variables) => {
            const sender = session?.user;
            if (!sender || !sender.name || !sender.image) return;
            const id = `optimistic-message-${Date.now()}`;

            const optimisticMessage = {
                id,
                conversationId: variables.conversationId,
                text: variables.text,
                senderId: sender.id,
                createdAt: new Date(),
                updatedAt: null,
                deletedAt: null,
                repliedToId: variables.repliedToId ?? null,
                attachment: variables.attachment ?? null,
                sender: {
                    id: sender.id,
                    name: sender.name,
                    image: sender.image,
                },
                repliedTo: null,
            } as Message;

            addOptimisticMessage(optimisticMessage);
            return { id };
        },
        onError: (error, variables, context) => {
            console.error(error);
            if (context?.id) {
                setMessages((prev) =>
                    prev.filter((msg) => msg.id !== context.id)
                );
            }
        },
        onSuccess: (data) => {
            updateMessage(data);
            if (conversationId) {
                utils.message.getMessages.invalidate({ conversationId });
            }
        },
    });

    return {
        messages,
        typingUsers,
        setTyping,
        updateMessage,
        deleteMessage,
        isAnyoneTyping: Object.values(typingUsers).some((isTyping) => isTyping),
        sendMessage: sendMessageMutation.mutate,
        isLoading: sendMessageMutation.isPending,
    };
}
