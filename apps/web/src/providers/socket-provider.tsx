"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Set<string>;
    typingUsers: Set<string>;
};

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const { data: session } = useSession();

    useEffect(() => {
        if (!session) {
            console.log("No session found, cannot connect to socket");
            return;
        }

        const socketInstance = io(
            process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
            {
                auth: {
                    token: session.user.id,
                },
            }
        );

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
                const newSet = new Set(prev);
                if (status === "online") {
                    newSet.add(userId);
                } else {
                    newSet.delete(userId);
                }
                return newSet;
            });
        });

        socketInstance.on("user:typing", (userId: string) => {
            setTypingUsers((prev) => new Set([...prev, userId]));
        });

        socketInstance.on("user:stop_typing", (userId: string) => {
            setTypingUsers((prev) => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
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
    }, [session]);

    const value = {
        socket,
        isConnected,
        onlineUsers,
        typingUsers,
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
