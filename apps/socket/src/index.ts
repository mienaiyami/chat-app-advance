import http from "node:http";
import { env } from "@repo/auth/env";
import { Server } from "socket.io";

import { db, eq, sessions, users } from "@repo/database";
import { type AppRouter, createCaller, createTRPCContext } from "@repo/api";
import { getTokenExpress } from "@repo/auth/express";

declare module "socket.io" {
    interface Socket {
        d: {
            userId: string;
            // user: User;
            api: ReturnType<typeof createCaller>;
        };
    }
}

const server = http.createServer();

// userId -> socketId
const onlineUsers = new Map<string, string>();

const io = new Server(server, {
    cors: {
        //todo add hosted url on prod
        origin: "http://localhost:3000",
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
        // console.log({ session });
        if (!session || !session.sub || !session.exp) {
            return next(
                new Error("Authentication error: Invalid or expired session")
            );
        }

        // const sessionTest = await getSessionExpress(
        //     socket.request as unknown as Request
        // );
        // console.log({ sessionTest });

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
                    sessionToken: "",
                },
            })
        );

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.sub),
        });

        socket.d = {
            userId: session.sub,
            // user: user,
            api: caller,
        };

        if (isRateLimited(session.sub)) {
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
    const api = socket.d.api;
    const userId = socket.d.userId;

    // const test = await api.user.search({
    //     query: "@",
    // });
    // console.log(test[1]);

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
