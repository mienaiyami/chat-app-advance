"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSocket } from "./socket-provider";
import { api, type RouterOutputs } from "~/trpc/react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type Conversation = RouterOutputs["conversation"]["getAll"][number];

type ConversationContextType = {
    activeConversationId: string | null;
    conversations: Conversation[];
    isLoading: boolean;
    setActiveConversationId: (id: string | null) => void;
    createDirectConversation: ReturnType<
        typeof api.conversation.createDirect.useMutation
    >;
    createGroupConversation: ReturnType<
        typeof api.conversation.createGroup.useMutation
    >;
    updateGroupConversation: ReturnType<
        typeof api.conversation.update.useMutation
    >;
    addMembersToGroup: ReturnType<
        typeof api.conversation.addMembers.useMutation
    >;
    removeMemberFromGroup: ReturnType<
        typeof api.conversation.removeMember.useMutation
    >;
    updateMemberRole: ReturnType<
        typeof api.conversation.updateRole.useMutation
    >;
    leaveGroup: ReturnType<typeof api.conversation.leave.useMutation>;
};

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [activeConversationId, setActiveConversationId] = useState<
        string | null
    >(null);
    const { socket } = useSocket();
    const { data: session } = useSession();

    const utils = api.useUtils();
    const getConversationsQuery = api.conversation.getAll.useQuery(undefined, {
        enabled: !!session?.user.id,
    });

    const createDirectConversationMutation =
        api.conversation.createDirect.useMutation({
            onSuccess: async () => {
                await utils.conversation.getAll.invalidate();
            },
            onError: (error) => {
                toast.error("Failed to create direct conversation");
                console.error(error);
            },
        });

    const createGroupConversationMutation =
        api.conversation.createGroup.useMutation({
            onSuccess: async () => {
                await utils.conversation.getAll.invalidate();
            },
            onError: (error) => {
                toast.error("Failed to create group conversation");
                console.error(error);
            },
        });

    const updateGroupConversationMutation = api.conversation.update.useMutation(
        {
            onSuccess: async () => {
                await utils.conversation.getAll.invalidate();
            },
            onError: (error) => {
                toast.error("Failed to update group conversation");
                console.error(error);
            },
        }
    );

    const addMembersToGroupMutation = api.conversation.addMembers.useMutation({
        onSuccess: async () => {
            await utils.conversation.getAll.invalidate();
        },
        onError: (error) => {
            toast.error("Failed to add members to group");
            console.error(error);
        },
    });

    const removeMemberMutation = api.conversation.removeMember.useMutation({
        onSuccess: async () => {
            await utils.conversation.getAll.invalidate();
        },
        onError: (error) => {
            toast.error("Failed to remove member from group");
            console.error(error);
        },
    });

    const updateMemberRoleMutation = api.conversation.updateRole.useMutation({
        onSuccess: async () => {
            await utils.conversation.getAll.invalidate();
        },
        onError: (error) => {
            toast.error("Failed to update member role");
            console.error(error);
        },
    });

    const leaveGroupMutation = api.conversation.leave.useMutation({
        onSuccess: async (_, { conversationId }) => {
            if (activeConversationId === conversationId) {
                setActiveConversationId(null);
            }
            await utils.conversation.getAll.invalidate();
        },
        onError: (error) => {
            toast.error("Failed to leave group");
            console.error(error);
        },
    });

    useEffect(() => {
        if (!socket) return;

        throw new Error("todo: add socket listeners");
        return () => {};
    }, [socket, activeConversationId, session?.user.id]);

    const value: ConversationContextType = {
        conversations: getConversationsQuery.data ?? [],
        isLoading: getConversationsQuery.isLoading,
        activeConversationId,
        setActiveConversationId,
        createDirectConversation: createDirectConversationMutation,
        createGroupConversation: createGroupConversationMutation,
        updateGroupConversation: updateGroupConversationMutation,
        addMembersToGroup: addMembersToGroupMutation,
        removeMemberFromGroup: removeMemberMutation,
        updateMemberRole: updateMemberRoleMutation,
        leaveGroup: leaveGroupMutation,
    };

    return (
        <ConversationContext.Provider value={value}>
            {children}
        </ConversationContext.Provider>
    );
}

export const useConversation = () => {
    const context = useContext(ConversationContext);
    if (!context) {
        throw new Error(
            "useConversation must be used within a ConversationProvider"
        );
    }
    return context;
};
