import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { GroupDetailsDialog } from "./group-details-dialog";
import { memo } from "react";
import type { RouterOutputs } from "~/trpc/react";

type ConversationWithMembers = RouterOutputs["conversation"]["getAll"][number];
type MemberInfo = { id: string; name: string | null; role: string | null };

type ChatHeaderProps = {
    chatOpened: ConversationWithMembers;
    currentUser: { id: string; name?: string | null } | undefined;
    isChatMuted: boolean;
    typingUsers: Map<string, string[]>;
    onlineUsers: string[];
    membersMap: Map<string, MemberInfo>;
    onClearChat: () => void;
    onLeaveGroup: () => void;
    onUpdateMutedChat: (chatId: string, muted: boolean) => void;
    onUpdateContact: (userId: string, action: "add" | "remove") => void;
};

const ChatHeader = ({
    chatOpened,
    currentUser,
    isChatMuted,
    typingUsers,
    onlineUsers,
    membersMap,
    onClearChat,
    onLeaveGroup,
    onUpdateMutedChat,
    onUpdateContact,
}: ChatHeaderProps) => {
    const [clearChatDialogOpen, setClearChatDialogOpen] = useState(false);
    const [leaveGroupDialogOpen, setLeaveGroupDialogOpen] = useState(false);
    const [groupDetailsDialogOpen, setGroupDetailsDialogOpen] = useState(false);

    const chatName =
        chatOpened.type === "group"
            ? chatOpened.name || ""
            : chatOpened.members.find((m) => m.userId !== currentUser?.id)?.user
                  .name || "";
    const chatImage =
        chatOpened.type === "group"
            ? chatOpened.image
            : chatOpened.members.find((m) => m.userId !== currentUser?.id)?.user
                  .image;

    return (
        <div className="p-4 border-b flex justify-between items-center h-18">
            <div className="flex items-center select-none">
                <Avatar className="h-10 w-10 mr-4">
                    <AvatarImage src={chatImage || undefined} alt={chatName} />
                    <AvatarFallback>
                        {chatName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="font-bold">{chatName}</h2>
                    <p className="text-xs text-muted-foreground">
                        {typingUsers.size > 0 &&
                            `${new Intl.ListFormat("en").format(
                                Array.from(typingUsers.values()).flatMap(
                                    (ids) =>
                                        ids.map(
                                            (id) =>
                                                membersMap.get(id)?.name || ""
                                        )
                                )
                            )} is typing...`}
                        {typingUsers.size === 0 &&
                            (chatOpened.type === "direct"
                                ? onlineUsers.some((c) => c === currentUser?.id)
                                    ? "Online"
                                    : chatOpened.name?.includes(" (Unknown)")
                                    ? ""
                                    : "Offline"
                                : `${new Intl.ListFormat("en").format(
                                      Array.from(membersMap.values())
                                          .map((e) => e.name || "")
                                          .sort((a, b) => a.localeCompare(b))
                                  )}`)}
                    </p>
                </div>
            </div>
            <div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-5 w-5" />
                            <span className="sr-only">More Options</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {chatOpened.type === "direct" && (
                            <>
                                <DropdownMenuItem
                                    onClick={() => setClearChatDialogOpen(true)}
                                >
                                    Clear Chat
                                </DropdownMenuItem>

                                {chatOpened.name?.includes("(Unknown)") && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            const otherMember =
                                                chatOpened.members.find(
                                                    (m) =>
                                                        m.userId !==
                                                        currentUser?.id
                                                );
                                            if (otherMember) {
                                                onUpdateContact(
                                                    otherMember.userId,
                                                    "add"
                                                );
                                            }
                                        }}
                                    >
                                        Add Contact
                                    </DropdownMenuItem>
                                )}
                            </>
                        )}
                        {chatOpened.type === "group" && (
                            <>
                                <DropdownMenuItem
                                    onClick={() =>
                                        setLeaveGroupDialogOpen(true)
                                    }
                                >
                                    Leave Group
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        setGroupDetailsDialogOpen(true)
                                    }
                                >
                                    Group Details
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuItem
                            onClick={() => {
                                if (chatOpened) {
                                    onUpdateMutedChat(
                                        chatOpened.id,
                                        !isChatMuted
                                    );
                                }
                            }}
                        >
                            {isChatMuted ? "Unmute" : "Mute"} Chat
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Dialog
                    open={clearChatDialogOpen}
                    onOpenChange={setClearChatDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Clear Chat</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to clear all messages?
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <DialogClose asChild>
                                <Button
                                    variant="destructive"
                                    onClick={onClearChat}
                                >
                                    Clear
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog
                    open={leaveGroupDialogOpen}
                    onOpenChange={setLeaveGroupDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Leave Group</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to leave this group? Only
                                admins can re-add you.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <DialogClose asChild>
                                <Button
                                    variant="destructive"
                                    onClick={onLeaveGroup}
                                >
                                    Leave
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog
                    open={groupDetailsDialogOpen}
                    onOpenChange={setGroupDetailsDialogOpen}
                >
                    <GroupDetailsDialog
                        conversationId={chatOpened.id}
                        onClose={() => setGroupDetailsDialogOpen(false)}
                    />
                </Dialog>
            </div>
        </div>
    );
};

export default memo(ChatHeader);
