import http from "node:http";
import { Server } from "socket.io";
import { env } from "@repo/auth/env";

import { sessions, users, eq, db } from "@repo/database";

const server = http.createServer();

// userId -> socketId
const onlineUsers = new Map<string, string>();

const io = new Server(server, {
    cors: {
        //todo add hosted url on prod
        origin: "*",
        methods: ["GET", "POST"],
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
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        console.log(token);
        const session = await db.query.sessions.findFirst({
            where: eq(sessions.sessionToken, token),
            with: {
                user: true,
            },
        });

        if (!session || new Date(session.expires) < new Date()) {
            return next(
                new Error("Authentication error: Invalid or expired session")
            );
        }

        socket.data.userId = session.userId;
        socket.data.user = session.user;

        if (isRateLimited(session.userId)) {
            socket.emit("error", {
                message: "You're sending messages too quickly",
            });
            return;
        }
        next();
    } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication error"));
    }
});

io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    if (userId) {
        onlineUsers.set(userId, socket.id);
        io.emit("user:status", { userId, status: "online" });
    }

    socket.on("test", (data) => {
        console.log(data);
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id} (User: ${userId})`);
        if (userId) {
            onlineUsers.delete(userId);
            io.emit("user:status", { userId, status: "offline" });
        }
    });
});

const PORT = env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
    console.log(`Socket server running on port ${PORT}`);
});

export { io };
