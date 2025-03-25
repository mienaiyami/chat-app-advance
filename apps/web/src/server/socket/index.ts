import type { NextApiRequest } from "next";
import type { NextApiResponseServerIO } from "~/types/next";

// Online users map: userId -> socketId
const onlineUsers = new Map<string, string>();

let io: SocketIOServer | undefined;

export const initSocketServer = (
	req: NextApiRequest,
	res: NextApiResponseServerIO,
) => {
	if (!io) {
		console.log("Socket.io initializing...");
		if (!res.socket.server.io) {
			const httpServer = res.socket.server as unknown as Server;
			io = new SocketIOServer(httpServer, {
				path: "/api/socket",
				addTrailingSlash: false,
				cors: {
					origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
					methods: ["GET", "POST"],
					credentials: true,
				},
			});

			res.socket.server.io = io;

			io.on("connection", (socket) => {
				console.log(`Socket connected: ${socket.id}`);

				socket.on("user:login", (userId: string) => {
					if (!userId) return;

					onlineUsers.set(userId, socket.id);
					console.log(`User ${userId} connected with socket ${socket.id}`);

					socket.broadcast.emit("user:online", userId);

					const onlineUserIds = Array.from(onlineUsers.keys());
					socket.emit("users:online", onlineUserIds);
				});

				socket.on("chat:join", (chatId: string) => {
					socket.join(`chat:${chatId}`);
					console.log(`Socket ${socket.id} joined chat:${chatId}`);
				});

				socket.on("chat:leave", (chatId: string) => {
					socket.leave(`chat:${chatId}`);
					console.log(`Socket ${socket.id} left chat:${chatId}`);
				});

				socket.on("group:join", (groupId: string) => {
					socket.join(`group:${groupId}`);
					console.log(`Socket ${socket.id} joined group:${groupId}`);
				});

				socket.on("group:leave", (groupId: string) => {
					socket.leave(`group:${groupId}`);
					console.log(`Socket ${socket.id} left group:${groupId}`);
				});

				socket.on(
					"chat:typing",
					(data: {
						chatId: string;
						userId: string;
						isTyping: boolean;
					}) => {
						const { chatId, userId, isTyping } = data;
						socket
							.to(`chat:${chatId}`)
							.emit("chat:typing", { userId, isTyping });
					},
				);

				socket.on(
					"group:typing",
					(data: {
						groupId: string;
						userId: string;
						isTyping: boolean;
					}) => {
						const { groupId, userId, isTyping } = data;
						socket
							.to(`group:${groupId}`)
							.emit("group:typing", { userId, isTyping });
					},
				);

				socket.on("disconnect", () => {
					console.log(`Socket disconnected: ${socket.id}`);

					for (const [userId, socketId] of onlineUsers.entries()) {
						if (socketId === socket.id) {
							onlineUsers.delete(userId);
							console.log(`User ${userId} is now offline`);

							socket.broadcast.emit("user:offline", userId);
							break;
						}
					}
				});
			});

			console.log("Socket.io server initialized");
		} else {
			io = res.socket.server.io;
			console.log("Using existing socket.io server");
		}
	}

	return io;
};

/**
 * Emit a message to all members of a chat
 */
export const emitChatMessage = (chatId: string, message: unknown) => {
	if (!io) return;
	io.to(`chat:${chatId}`).emit("chat:message", message);
};

/**
 * Emit a message to all members of a group
 */
export const emitGroupMessage = (groupId: string, message: unknown) => {
	if (!io) return;
	io.to(`group:${groupId}`).emit("group:message", message);
};

/**
 * Notify about a new chat creation
 */
export const emitNewChat = (userIds: string[], chat: unknown) => {
	if (!io) return;

	userIds.forEach((userId) => {
		const socketId = onlineUsers.get(userId);
		if (socketId) {
			io?.to(socketId).emit("chat:new", chat);
		}
	});
};

/**
 * Notify about a new group creation
 */
export const emitNewGroup = (userIds: string[], group: unknown) => {
	if (!io) return;

	userIds.forEach((userId) => {
		const socketId = onlineUsers.get(userId);
		if (socketId) {
			io?.to(socketId).emit("group:new", group);
		}
	});
};

/**
 * Check if a user is online
 */
export const isUserOnline = (userId: string): boolean => {
	return onlineUsers.has(userId);
};
