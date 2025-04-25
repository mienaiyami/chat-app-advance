"use client";

import { useState } from "react";
import { useConversation } from "~/providers/conversation-provider";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { X, PlusCircle, Search, Plus, Users } from "lucide-react";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { useDebounce } from "~/hooks/use-debounce";

export default function Sidebar() {
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 500);
    const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const {
        conversations,
        activeConversationId,
        setActiveConversationId,
        createDirectConversation,
        createGroupConversation,
        isLoading,
    } = useConversation();

    const usersQuery = api.user.search.useQuery(
        { query: debouncedQuery },
        {
            enabled: !!debouncedQuery,
        }
    );

    const filteredConversations = conversations.filter((conversation) => {
        // For direct messages, filter by the other user's name
        if (conversation.type === "direct") {
            const otherMember = conversation.members.find(
                (member) => member.userId !== session?.user.id
            );
            return otherMember?.user.name
                ?.toLowerCase()
                .includes(query.toLowerCase());
        }
        // For groups, filter by group name
        return conversation.name?.toLowerCase().includes(query.toLowerCase());
    });

    const handleCreateDirectChat = async (targetUserId: string) => {
        try {
            const conversationId = await createDirectConversation.mutateAsync({
                targetUserId,
            });
            router.push(`/chat/direct/${conversationId}`);
        } catch (error) {
            console.error("Failed to create direct chat", error);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || selectedUsers.length === 0) return;

        try {
            const groupId = await createGroupConversation.mutateAsync({
                name: newGroupName,
                members: selectedUsers,
            });
            setCreateGroupDialogOpen(false);
            setNewGroupName("");
            setSelectedUsers([]);
            router.push(`/chat/group/${groupId}`);
        } catch (error) {
            console.error("Failed to create group", error);
        }
    };

    const handleSelectUser = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const navigateToChat = (id: string, type: "direct" | "group") => {
        setActiveConversationId(id);
        router.push(`/chat/${type}/${id}`);
    };

    const getConversationName = (conversation: (typeof conversations)[0]) => {
        if (conversation.type === "group") {
            return conversation.name;
        }

        const otherMember = conversation.members.find(
            (member) => member.userId !== session?.user.id
        );

        return otherMember?.user.name || "Unknown";
    };

    const getConversationImage = (conversation: (typeof conversations)[0]) => {
        if (conversation.type === "group") {
            return conversation.image;
        }

        const otherMember = conversation.members.find(
            (member) => member.userId !== session?.user.id
        );

        return otherMember?.user.image;
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return "?";
        return name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    return (
        <div className="flex flex-col w-80 border-r border-border h-full">
            <div className="p-4 flex justify-between items-center border-b">
                <h2 className="text-xl font-semibold">Chats</h2>
                <div className="flex space-x-2">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setCreateGroupDialogOpen(true)}
                    >
                        <Users className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="p-3">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        className="pl-8"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <p>Loading conversations...</p>
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-4 h-32">
                        <p className="text-sm text-muted-foreground">
                            No conversations found
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {filteredConversations.map((conversation) => {
                            const isActive =
                                activeConversationId === conversation.id;
                            const conversationName =
                                getConversationName(conversation);
                            const avatarSrc =
                                getConversationImage(conversation);
                            const initials = getInitials(conversationName);
                            const lastMessageText =
                                conversation.lastMessage?.text ||
                                "No messages yet";
                            const lastMessageTime = conversation.lastMessage
                                ?.createdAt
                                ? format(
                                      new Date(
                                          conversation.lastMessage.createdAt
                                      ),
                                      "HH:mm"
                                  )
                                : "";

                            return (
                                <button
                                    key={conversation.id}
                                    className={cn(
                                        "w-full flex items-center space-x-3 p-2 rounded-lg transition-colors text-left",
                                        isActive
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-muted"
                                    )}
                                    onClick={() =>
                                        navigateToChat(
                                            conversation.id,
                                            conversation.type ?? "direct"
                                        )
                                    }
                                >
                                    <Avatar>
                                        <AvatarImage src={avatarSrc || ""} />
                                        <AvatarFallback>
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium truncate">
                                                {conversationName}
                                            </p>
                                            {lastMessageTime && (
                                                <span className="text-xs text-muted-foreground">
                                                    {lastMessageTime}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {lastMessageText}
                                        </p>
                                    </div>
                                    {conversation.unreadCount > 0 && (
                                        <div className="bg-primary text-primary-foreground text-xs font-medium rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
                                            {conversation.unreadCount}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Group Dialog */}
            <Dialog
                open={createGroupDialogOpen}
                onOpenChange={setCreateGroupDialogOpen}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Input
                                placeholder="Group name"
                                value={newGroupName}
                                onChange={(e) =>
                                    setNewGroupName(e.target.value)
                                }
                                className="mb-4"
                            />
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search users..."
                                    className="pl-8"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map((userId) => {
                                    const user = usersQuery.data?.find(
                                        (u) => u.id === userId
                                    );
                                    return (
                                        <div
                                            key={userId}
                                            className="flex items-center bg-muted rounded-full pl-2 pr-1 py-1"
                                        >
                                            <span className="text-sm mr-1">
                                                {user?.name || userId}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    handleSelectUser(userId)
                                                }
                                                className="h-5 w-5 rounded-full bg-background flex items-center justify-center"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="max-h-52 overflow-y-auto">
                            {usersQuery.data
                                ?.filter((user) => user.id !== session?.user.id)
                                .map((user) => (
                                    <div
                                        key={user.id}
                                        className={cn(
                                            "flex items-center space-x-3 p-2 rounded-lg cursor-pointer",
                                            selectedUsers.includes(user.id)
                                                ? "bg-accent text-accent-foreground"
                                                : "hover:bg-muted"
                                        )}
                                        onClick={() =>
                                            handleSelectUser(user.id)
                                        }
                                        onKeyUp={(e) => {
                                            if (e.key === "Enter") {
                                                handleSelectUser(user.id);
                                            }
                                        }}
                                    >
                                        <Avatar>
                                            <AvatarImage
                                                src={user.image || ""}
                                            />
                                            <AvatarFallback>
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium">
                                                {user.name}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={handleCreateGroup}
                            disabled={
                                !newGroupName.trim() ||
                                selectedUsers.length === 0
                            }
                        >
                            Create Group
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
