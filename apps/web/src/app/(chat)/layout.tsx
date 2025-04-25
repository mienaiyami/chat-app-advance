"use client";

import { SocketProvider } from "~/providers/socket-provider";
import { ConversationProvider } from "~/providers/conversation-provider";
import { MessageProvider } from "~/providers/message-provider";

type ChatLayoutProps = {
    children: React.ReactNode;
};

export default function ChatLayout({ children }: ChatLayoutProps) {
    return (
        <SocketProvider>
            <ConversationProvider>
                <MessageProvider>
                    <div className="flex h-screen w-full">{children}</div>
                </MessageProvider>
            </ConversationProvider>
        </SocketProvider>
    );
}
