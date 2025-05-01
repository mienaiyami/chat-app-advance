import http from "node:http";
import { env } from "@repo/auth/env";
import { Server } from "socket.io";

import { type AppRouter, createCaller, createTRPCContext } from "@repo/api";
import { getTokenExpress } from "@repo/auth/express";
import type {
    ClientToServerEvents,
    InterServerEvents,
    ServerToClientEvents,
    SocketData,
} from "./types";

const server = http.createServer();

// userId -> [socketId]
const onlineUsers = new Map<string, Set<string>>();
// conversationId -> Set of userIds who are typing
const typingUsers = new Map<string, Set<string>>();

const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
>(server, {
    cors: {
        origin: env.NEXT_PUBLIC_WEB_URL,
        credentials: true,
    },
});

const messageTimestamps = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userTimestamps = messageTimestamps.get(userId) || [];
    const recentTimestamps = userTimestamps.filter((ts) => now - ts < 10000);
    const isLimited = recentTimestamps.length >= 10;
    messageTimestamps.set(userId, [...recentTimestamps, now]);
    return isLimited;
}

io.use(async (socket, next) => {
    try {
        const session = await getTokenExpress(
            socket.request as unknown as Request
        );
        if (!session || !session.sub || !session.exp) {
            return next(
                new Error("Authentication error: Invalid or expired session")
            );
        }

        const caller = createCaller(
            await createTRPCContext({
                headers: new Headers(),
                session: {
                    user: {
                        id: session.sub,
                        email: session.email,
                        image: session.picture,
                        name: session.name,
                    },
                    expires: new Date(session.exp * 1000).toISOString(),
                    // sessionToken: "",
                },
            })
        );

        socket.data.userId = session.sub;
        socket.data.api = caller;

        // if (isRateLimited(session.sub)) {
        //     socket.emit("error", {
        //         message: "You're sending messages too quickly",
        //     });
        //     return;
        // }
        next();
    } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication error"));
    }
});

io.on("connection", async (socket) => {
    const api = socket.data.api;
    const userId = socket.data.userId;

    // const test = await api.user.search({
    //     query: "@",
    // });
    // console.log(test[1]);

    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    if (userId) {
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set<string>());
        }
        onlineUsers.get(userId)?.add(socket.id);
        io.emit("user:status", { userId, status: "online" });
    }

    socket.on("message:send", async (params) => {
        try {
            if (isRateLimited(userId)) {
                socket.emit("error", {
                    message: "You're sending messages too quickly",
                });
                return;
            }

            const messagesResult = await api.message.sendMessage({
                conversationId: params.conversationId,
                text: params.text,
                attachment: params.attachment,
                repliedToId: params.repliedToId,
            });

            if (messagesResult.id) {
                const conversation = await api.conversation.getById({
                    conversationId: params.conversationId,
                });

                if (conversation) {
                    const memberIds = conversation.members.map((m) => m.userId);

                    // Send the message to all members, including sender for confirmation
                    for (const memberId of memberIds) {
                        const memberSocketIds = onlineUsers.get(memberId);
                        if (memberSocketIds) {
                            io.to(Array.from(memberSocketIds)).emit(
                                "message:new",
                                {
                                    ...messagesResult,
                                    tempId: params.tempId,
                                }
                            );
                        }
                    }

                    const conversationUpdate = {
                        id: params.conversationId,
                        lastMessage: messagesResult,
                        updatedAt: new Date(),
                    };

                    for (const memberId of memberIds) {
                        const memberSocketIds = onlineUsers.get(memberId);
                        if (memberSocketIds) {
                            io.to(Array.from(memberSocketIds)).emit(
                                "conversation:update",
                                conversationUpdate
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("error", {
                message: "Failed to send message",
            });
        }
    });

    socket.on("message:edit", async (params) => {
        try {
            await api.message.editMessage({
                messageId: params.messageId,
                text: params.text,
            });

            const messagesResult = await api.message.editMessage({
                messageId: params.messageId,
                text: params.text,
            });

            if (messagesResult) {
                const conversation = await api.conversation.getById({
                    conversationId: messagesResult.conversationId,
                });

                if (conversation) {
                    const memberIds = conversation.members.map((m) => m.userId);

                    for (const memberId of memberIds) {
                        const memberSocketId = onlineUsers.get(memberId);
                        if (memberSocketId) {
                            io.to(Array.from(memberSocketId)).emit(
                                "message:update",
                                messagesResult
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error editing message:", error);
            socket.emit("error", {
                message: "Failed to edit message",
            });
        }
    });

    socket.on("message:delete", async (params) => {
        try {
            await api.message.deleteMessage({
                messageId: params.messageId,
            });

            const memberIds = onlineUsers.keys();

            for (const memberId of memberIds) {
                const memberSocketId = onlineUsers.get(memberId);
                if (memberSocketId) {
                    io.to(Array.from(memberSocketId)).emit("message:delete", {
                        messageId: params.messageId,
                        conversationId: params.conversationId,
                    });
                }
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            socket.emit("error", {
                message: "Failed to delete message",
            });
        }
    });

    socket.on("conversation:read", async (params) => {
        try {
            await api.conversation.markAsRead({
                conversationId: params.conversationId,
            });

            const conversation = await api.conversation.getById({
                conversationId: params.conversationId,
            });

            if (conversation) {
                const memberIds = conversation.members.map((m) => m.userId);
                const timestamp = new Date().toISOString();

                for (const memberId of memberIds) {
                    if (memberId !== userId) {
                        const memberSocketIds = onlineUsers.get(memberId);
                        if (memberSocketIds) {
                            io.to(Array.from(memberSocketIds)).emit(
                                "conversation:read",
                                {
                                    conversationId: params.conversationId,
                                    userId,
                                    timestamp,
                                }
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error marking conversation as read:", error);
        }
    });

    socket.on("conversation:typing", async (params) => {
        try {
            const { conversationId } = params;

            if (!typingUsers.has(conversationId)) {
                typingUsers.set(conversationId, new Set<string>());
            }
            typingUsers.get(conversationId)?.add(userId);

            console.log({
                conversationId,
                userId,
            });

            const conversation = await api.conversation.getById({
                conversationId,
            });

            if (conversation) {
                const memberIds = conversation.members.map((m) => m.userId);

                for (const memberId of memberIds) {
                    if (memberId !== userId) {
                        const memberSocketIds = onlineUsers.get(memberId);
                        if (memberSocketIds) {
                            io.to(Array.from(memberSocketIds)).emit(
                                "user:typing",
                                {
                                    conversationId,
                                    userId,
                                }
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error handling typing indicator:", error);
        }
    });

    socket.on("conversation:stop_typing", async (params) => {
        try {
            const { conversationId } = params;

            typingUsers.get(conversationId)?.delete(userId);

            const conversation = await api.conversation.getById({
                conversationId,
            });

            if (conversation) {
                const memberIds = conversation.members.map((m) => m.userId);

                for (const memberId of memberIds) {
                    if (memberId !== userId) {
                        const memberSocketIds = onlineUsers.get(memberId);
                        if (memberSocketIds) {
                            io.to(Array.from(memberSocketIds)).emit(
                                "user:stop_typing",
                                {
                                    conversationId,
                                    userId,
                                }
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error handling stop typing indicator:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id} (User: ${userId})`);

        if (userId) {
            onlineUsers.get(userId)?.delete(socket.id);
            if (onlineUsers.get(userId)?.size === 0) {
                onlineUsers.delete(userId);
            }

            for (const [conversationId, users] of typingUsers.entries()) {
                if (users.has(userId)) {
                    users.delete(userId);

                    io.emit("user:stop_typing", {
                        conversationId,
                        userId,
                    });
                }
            }

            io.emit("user:status", { userId, status: "offline" });
        }
    });
});

const PORT = env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});

export { io };
