"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@app/socket/types";
import { useRouter } from "next/navigation";

type SocketContextType = {
    socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
    isConnected: boolean;
    onlineUsers: string[];
    typingUsers: Map<string, string[]>;
    emitTyping: (conversationId: string) => void;
    emitStopTyping: (conversationId: string) => void;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket<
        ServerToClientEvents,
        ClientToServerEvents
    > | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(
        new Map()
    );
    const { data: session } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!session) {
            router.push("/auth/signin");
            return;
        }
        // if (session?.user?.id === prevSession.current) return;
        // prevSession.current = session?.user?.id;

        const socketInstance: Socket<
            ServerToClientEvents,
            ClientToServerEvents
        > = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
            withCredentials: true,
        });

        socketInstance.on("connect", () => {
            console.log("Connected to socket");
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            console.log("Disconnected from socket");
            setIsConnected(false);
        });

        socketInstance.on("user:status", ({ userId, status }) => {
            setOnlineUsers((prev) => {
                if (status === "online" && !prev.includes(userId)) {
                    return [...prev, userId];
                }
                if (status === "offline") {
                    return prev.filter((id) => id !== userId);
                }
                return prev;
            });
        });

        socketInstance.on("user:typing", ({ conversationId, userId }) => {
            setTypingUsers((prev) => {
                const newMap = new Map(prev);
                const currentTyping = newMap.get(conversationId) || [];

                if (!currentTyping.includes(userId)) {
                    newMap.set(conversationId, [...currentTyping, userId]);
                }

                return newMap;
            });
        });

        socketInstance.on("user:stop_typing", ({ conversationId, userId }) => {
            setTypingUsers((prev) => {
                const newMap = new Map(prev);
                const currentTyping = newMap.get(conversationId) || [];

                if (currentTyping.includes(userId)) {
                    newMap.set(
                        conversationId,
                        currentTyping.filter((id) => id !== userId)
                    );
                }

                return newMap;
            });
        });

        socketInstance.on("error", (data: { message: string }) => {
            console.error(data.message);
            toast.error(data.message || "An unexpected error occurred");
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [session?.user.id]);

    const emitTyping = (conversationId: string) => {
        if (socket?.connected) {
            socket.emit("conversation:typing", { conversationId });
        }
    };

    const emitStopTyping = (conversationId: string) => {
        if (socket?.connected) {
            socket.emit("conversation:stop_typing", { conversationId });
        }
    };

    const value = {
        socket,
        isConnected,
        onlineUsers,
        typingUsers,
        emitTyping,
        emitStopTyping,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};
