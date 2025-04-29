import { SocketProvider } from "~/providers/socket-provider";
import { ConversationProvider } from "~/providers/conversation-provider";
import { MessageProvider } from "~/providers/message-provider";
import { api } from "~/trpc/server";
import { redirect } from "next/navigation";

type ChatLayoutProps = {
    children: React.ReactNode;
};

export default async function ChatLayout({ children }: ChatLayoutProps) {
    try {
        // just to check status
        const user = await api.user.current();
    } catch (error) {
        console.error(error);
        redirect(
            `/auth/signout?callbackUrl=/&reason=${encodeURIComponent(
                `${error instanceof Error ? error.message : "Unknown error"}`
            )}`
        );
    }
    return (
        <SocketProvider>
            <ConversationProvider>
                <MessageProvider>
                    <div className="grid place-items-center h-screen w-full">
                        {children}
                    </div>
                </MessageProvider>
            </ConversationProvider>
        </SocketProvider>
    );
}
