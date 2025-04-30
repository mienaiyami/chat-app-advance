import { redirect } from "next/navigation";
import { ConversationProvider } from "~/providers/conversation-provider";
import { MessageProvider } from "~/providers/message-provider";
import { SocketProvider } from "~/providers/socket-provider";
import { api } from "~/trpc/server";

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
				`${error instanceof Error ? error.message : "Unknown error"}`,
			)}`,
		);
	}
	return (
		<SocketProvider>
			<ConversationProvider>
				<MessageProvider>
					<div className="grid h-screen w-full place-items-center">
						{children}
					</div>
				</MessageProvider>
			</ConversationProvider>
		</SocketProvider>
	);
}
