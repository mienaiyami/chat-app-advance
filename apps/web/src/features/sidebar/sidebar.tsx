"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Search, VolumeOff } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import { api } from "~/trpc/react";
import { useConversation } from "~/providers/conversation-provider";
import { formatDate } from "~/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import ProfileDialog from "./components/profile-dialog";
import AddContactDialog from "./components/add-contact-dialog";
import CreateGroupDialog from "./components/create-group-dialog";
import { useRouter } from "next/navigation";
import { Skeleton } from "~/components/ui/skeleton";

export default function Sidebar() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: session } = useSession();

    const {
        conversations,
        activeConversationId,
        isLoading,
        setActiveConversation,
    } = useConversation();
    const router = useRouter();

    const userSettings = api.user.getSettings.useQuery(undefined, {
        enabled: !!session?.user.id,
    });

    const filteredConversations = conversations.filter(
        (conversation) =>
            conversation.name
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            conversation.members.some((member) =>
                member.user.name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase())
            )
    );

    const handleSelectConversation = (conversationId: string) => {
        setActiveConversation("");
        router.push(`/chat/${conversationId}`);
    };

    return (
        <div className="w-full flex-shrink-0 border rounded-l-lg flex flex-col">
            <TooltipProvider
                delayDuration={500}
                disableHoverableContent
                skipDelayDuration={500}
            >
                <div className="p-4 border-b h-16 flex flex-row gap-1">
                    <Tooltip>
                        <ProfileDialog />
                    </Tooltip>
                    <Tooltip>
                        <AddContactDialog />
                    </Tooltip>
                    <Tooltip>
                        <CreateGroupDialog />
                    </Tooltip>
                </div>
                <div className="p-2 relative">
                    <Search
                        size={"1.3em"}
                        className="text-muted-foreground pointer-events-none absolute top top-1/2 -translate-y-1/2 left-4"
                    />
                    <Input
                        placeholder="Search"
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <ScrollArea className="flex-grow">
                    {isLoading || userSettings.isLoading ? (
                        <>
                            {Array(5)
                                .fill(0)
                                .map((_, index) => (
                                    <div
                                        key={String(index)}
                                        className="flex w-full space-x-2 items-center h-full rounded-none p-2 first:border-t border-b"
                                    >
                                        <Skeleton className="h-10 w-10 rounded-full mr-4" />
                                        <div className="flex-grow min-w-0 flex flex-col items-start space-y-2">
                                            <div className="flex flex-row w-full justify-between">
                                                <Skeleton className="h-4 w-1/3" />
                                                <Skeleton className="h-3 w-12" />
                                            </div>
                                            <Skeleton className="h-3 w-4/5" />
                                        </div>
                                    </div>
                                ))}
                        </>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-grow select-none items-center justify-center">
                            <span className="text-muted-foreground">
                                No contacts/chat found
                            </span>
                        </div>
                    ) : (
                        filteredConversations.map((conversation) => {
                            const otherUser =
                                conversation.type === "direct"
                                    ? conversation.members.find(
                                          (member) =>
                                              member.userId !==
                                              session?.user?.id
                                      )?.user
                                    : null;

                            const displayName =
                                conversation.type === "direct"
                                    ? otherUser?.name || "Unknown User"
                                    : conversation.name || "Unnamed Group";

                            const displayPicture =
                                conversation.type === "direct"
                                    ? otherUser?.image || ""
                                    : conversation.image || "";

                            const conversationId = conversation.id;

                            const unreadCount = conversation.unreadCount || 0;
                            const isMuted = conversation.muted || false;

                            return (
                                <Button
                                    variant="ghost"
                                    key={conversationId}
                                    className={cn(
                                        "flex w-full space-x-2 items-center h-full rounded-none p-2 hover:bg-accent first:border-t border-b",
                                        activeConversationId === conversationId
                                            ? "bg-accent"
                                            : ""
                                    )}
                                    onClick={() =>
                                        handleSelectConversation(conversationId)
                                    }
                                >
                                    <Avatar className="h-10 w-10 mr-4">
                                        <AvatarImage
                                            src={displayPicture}
                                            alt={displayName}
                                        />
                                        <AvatarFallback>
                                            {displayName
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0 flex flex-col items-start">
                                        <div className="flex flex-row w-full">
                                            <span className="font-medium truncate">
                                                {displayName}
                                            </span>
                                            <span
                                                className="ml-auto font-xs text-muted-foreground"
                                                title={String(
                                                    conversation.lastMessageAt
                                                )}
                                            >
                                                {conversation.lastMessageAt
                                                    ? formatDate(
                                                          conversation.lastMessageAt
                                                      )
                                                    : "-"}
                                            </span>
                                        </div>
                                        <div className="flex flex-row w-full items-center">
                                            <span
                                                className="text-sm text-muted-foreground truncate"
                                                title={
                                                    conversation.lastMessage ||
                                                    ""
                                                }
                                            >
                                                {conversation.lastMessage
                                                    ? conversation.lastMessage
                                                          .replace("\n", " ")
                                                          .slice(0, 20) +
                                                      (conversation.lastMessage
                                                          .length > 20
                                                          ? "..."
                                                          : "")
                                                    : "No messages yet"}
                                            </span>
                                            {isMuted && (
                                                <span className="ml-auto text-muted-foreground">
                                                    <VolumeOff className="w-4 h-4" />
                                                    <span className="sr-only">
                                                        Muted Chat
                                                    </span>
                                                </span>
                                            )}
                                            {unreadCount > 0 && (
                                                <span className="ml-auto bg-primary text-secondary rounded-full aspect-square w-4 text-xs">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Button>
                            );
                        })
                    )}
                </ScrollArea>
            </TooltipProvider>
        </div>
    );
}
