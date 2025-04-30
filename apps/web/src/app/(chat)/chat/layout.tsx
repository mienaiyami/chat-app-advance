import { ChatArea } from "~/features/chat-area/chat-area";
import Sidebar from "~/features/sidebar/sidebar";

export default function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="grid h-full max-h-screen w-full grid-cols-[18rem_1fr] md:grid-cols-[20rem_1fr] lg:grid-cols-[24rem_1fr] 2xl:h-[90dvh] 2xl:w-[90dvw]">
			<Sidebar />
			<div className="max-h-full max-w-[calc(100vw-18rem)] md:max-w-[calc(100vw-20rem)] lg:max-w-[calc(100vw-24rem)]">
				{children}
			</div>
		</div>
	);
}
