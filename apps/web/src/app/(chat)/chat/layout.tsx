import { ChatArea } from "~/features/chat-area/chat-area";
import Sidebar from "~/features/sidebar/sidebar";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[18rem_1fr] lg:grid-cols-[24rem_1fr] h-full w-full 2xl:w-[90dvw] 2xl:h-[90dvh]">
            <Sidebar />
            <div className="max-w-[calc(100vw-18rem)] lg:max-w-[calc(100vw-24rem)]">
                {children}
            </div>
        </div>
    );
}
