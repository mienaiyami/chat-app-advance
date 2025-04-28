"use client";
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
} from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";

export interface Conversation {
    id: string;
    name: string | null;
    image: string | null;
    type: "direct" | "group" | null;
    createdAt: Date;
    updatedAt: Date | null;
    lastMessage?: string | null;
    lastMessageAt?: Date | null;
    unreadCount: number;
    members: {
        userId: string;
        user: {
            id: string;
            name: string | null;
            image: string | null;
        };
    }[];
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
            "useConversation must be used within a ConversationProvider"
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

    const {
        data: conversations,
        isLoading,
        error,
    } = api.conversation.getAll.useQuery(undefined, {
        enabled: !!session?.user.id,
        refetchOnWindowFocus: false,
        refetchInterval: 30000,
        select: (data) => {
            return data.map((conversation) => {
                const lastMessage = conversation.messages[0]?.text || null;
                const lastMessageAt =
                    conversation.messages[0]?.createdAt ||
                    conversation.updatedAt;

                return {
                    ...conversation,
                    lastMessage,
                    lastMessageAt,
                };
            });
        },
    });

    const setActiveConversation = useCallback(
        (id: string) => {
            if (isLoading || !id || !conversations) return;
            const conversation = conversations.find((c) => c.id === id);
            if (conversation) {
                setActiveConversationId(id);
            } else {
                toast.error("Conversation not found");
            }
        },
        [conversations, isLoading]
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
