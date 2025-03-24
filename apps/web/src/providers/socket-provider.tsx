"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
    joinChat: (chatId: string) => void;
    leaveChat: (chatId: string) => void;
    joinGroup: (groupId: string) => void;
    leaveGroup: (groupId: string) => void;
    sendChatTyping: (chatId: string, isTyping: boolean) => void;
    sendGroupTyping: (groupId: string, isTyping: boolean) => void;
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    joinChat: () => {},
    leaveChat: () => {},
    joinGroup: () => {},
    leaveGroup: () => {},
    sendChatTyping: () => {},
    sendGroupTyping: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const { data: session } = useSession();
    useEffect(() => {
        if (!session?.user?.id) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }
        if (!socket) {
            const socketInstance = io({
                path: "/api/socket",
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            socketInstance.on("connect", () => {
                console.log("Socket connected:", socketInstance.id);
            });

            socketInstance.on("disconnect", () => {
                console.log("Socket disconnected");
            });

            socketInstance.on("connect_error", (error) => {
                console.error("Socket connection error:", error);
            });

            setSocket(socketInstance);

            return () => {
                socketInstance.disconnect();
                // setSocket(null);
            };
        }
    }, [session?.user?.id]);

    useEffect(() => {
        console.log(socket);
    }, [socket]);

    const joinChat = (chatId: string) => {
        if (socket?.connected) {
            socket.emit("chat:join", chatId);
        }
    };

    const leaveChat = (chatId: string) => {
        if (socket?.connected) {
            socket.emit("chat:leave", chatId);
        }
    };

    const joinGroup = (groupId: string) => {
        if (socket?.connected) {
            socket.emit("group:join", groupId);
        }
    };

    const leaveGroup = (groupId: string) => {
        if (socket?.connected) {
            socket.emit("group:leave", groupId);
        }
    };

    const sendChatTyping = (chatId: string, isTyping: boolean) => {
        if (socket?.connected && session?.user?.id) {
            socket.emit("chat:typing", {
                chatId,
                userId: session.user.id,
                isTyping,
            });
        }
    };

    const sendGroupTyping = (groupId: string, isTyping: boolean) => {
        if (socket?.connected && session?.user?.id) {
            socket.emit("group:typing", {
                groupId,
                userId: session.user.id,
                isTyping,
            });
        }
    };

    return (
        <SocketContext.Provider
            value={{
                socket,
                isConnected: socket?.connected ?? false,
                joinChat,
                leaveChat,
                joinGroup,
                leaveGroup,
                sendChatTyping,
                sendGroupTyping,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
};
