"use client";
import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
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
    unreadCount?: number;
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
    const [conversations, setConversations] = useState<Conversation[]>([]);

    // Fetch all conversations for the current user
    const { data, isLoading, error } = api.conversation.getAll.useQuery(
        undefined,
        {
            enabled: !!session?.user.id,
            refetchOnWindowFocus: false,
        }
    );

    // Get unread counts for all conversations
    const { data: unreadCounts } = api.conversation.getAllUnreadCounts.useQuery(
        undefined,
        {
            enabled: !!session?.user.id,
            refetchInterval: 30000, // Refresh every 30 seconds
        }
    );

    const setActiveConversation = useCallback(
        (id: string) => {
            const conversation = conversations.find((c) => c.id === id);
            if (conversation) {
                setActiveConversationId(id);
            } else {
                toast.error("Conversation not found");
            }
        },
        [conversations]
    );

    // Update conversations when data changes
    useEffect(() => {
        if (data) {
            // Map conversations and add additional properties
            const enhancedConversations = data.map((conversation) => {
                // Find unread count for this conversation
                const unread = unreadCounts?.conversations.find(
                    (c) => c.conversationId === conversation.id
                );

                // Get last message if available
                const lastMessage = conversation.messages[0]?.text || null;

                return {
                    ...conversation,
                    lastMessage,
                    lastMessageAt:
                        conversation.messages[0]?.createdAt ||
                        conversation.updatedAt,
                    unreadCount: unread?.unreadCount || 0,
                };
            });

            setConversations(enhancedConversations);
        }
    }, [data, unreadCounts]);

    useEffect(() => {
        if (error) {
            toast.error("Failed to load conversations");
            console.error(error);
        }
    }, [error]);

    const value = {
        conversations,
        activeConversationId,
        setActiveConversation,
        isLoading,
    };

    return (
        <ConversationContext.Provider value={value}>
            {children}
        </ConversationContext.Provider>
    );
};
