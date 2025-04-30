"use client";
import type { MessageWithRelations } from "@repo/database";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useSocket } from "./socket-provider";

type Message = MessageWithRelations;

export interface Conversation {
	id: string;
	name: string | null;
	image: string | null;
	type: "direct" | "group" | null;
	createdAt: Date;
	updatedAt: Date | null;
	lastMessage?: string | null;
	lastMessageAt?: Date | null;
	members: {
		userId: string;
		user: {
			id: string;
			name: string | null;
			image: string | null;
		};
	}[];
	//
	unreadCount: number;
	muted: boolean;
}

interface ConversationContextType {
	conversations: Conversation[];
	activeConversationId: string | null;
	setActiveConversation: (id: string) => void;
	isLoading: boolean;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export const useConversation = () => {
	const context = useContext(ConversationContext);
	if (!context) {
		throw new Error(
			"useConversation must be used within a ConversationProvider",
		);
	}
	return context;
};

export const ConversationProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { data: session } = useSession();
	const [activeConversationId, setActiveConversationId] = useState<
		string | null
	>(null);
	const { socket, isConnected } = useSocket();
	const router = useRouter();

	const {
		data: conversations,
		isLoading,
		error,
		refetch,
	} = api.conversation.getAll.useQuery(undefined, {
		enabled: !!session?.user.id,
		refetchOnWindowFocus: false,
		refetchInterval: 30000,
		select: (data) => {
			return data.map((conversation) => {
				const lastMessage = conversation.messages[0]?.text || null;
				const lastMessageAt =
					conversation.messages[0]?.createdAt || conversation.updatedAt;

				return {
					...conversation,
					lastMessage,
					lastMessageAt,
				};
			});
		},
	});

	useEffect(() => {
		if (!socket || !isConnected) return;

		const handleConversationUpdate = (data: {
			id: string;
			lastMessage?: Message | null;
			updatedAt: Date;
		}) => {
			console.log({
				data,
			});
			refetch();
		};

		const handleConversationRead = ({
			conversationId,
			userId,
			timestamp,
		}: {
			conversationId: string;
			userId: string;
			timestamp: string;
		}) => {
			if (session?.user.id !== userId) {
				refetch();
			}
		};

		socket.on("conversation:update", handleConversationUpdate);
		socket.on("conversation:read", handleConversationRead);

		return () => {
			socket.off("conversation:update", handleConversationUpdate);
			socket.off("conversation:read", handleConversationRead);
		};
	}, [socket, isConnected, refetch, session?.user.id]);

	const setActiveConversation = useCallback(
		(id: string) => {
			if (isLoading || !id || !conversations) return;
			const conversation = conversations.find((c) => c.id === id);
			if (conversation) {
				setActiveConversationId(id);
			} else {
				toast.error("Conversation not found");
				router.push("/chat");
			}
		},
		[conversations, isLoading],
	);

	useEffect(() => {
		if (error) {
			toast.error("Failed to load conversations");
			console.error(error);
		}
	}, [error]);

	return (
		<ConversationContext.Provider
			value={{
				conversations: conversations || [],
				activeConversationId,
				setActiveConversation,
				isLoading,
			}}
		>
			{children}
		</ConversationContext.Provider>
	);
};
