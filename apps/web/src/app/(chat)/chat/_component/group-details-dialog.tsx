"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
    CalendarDays,
    Edit,
    MoreVertical,
    Search,
    User,
    UserPlus,
} from "lucide-react";
import { Separator } from "~/components/ui/separator";
import { formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { GroupDetailsEditDialog } from "./group-details-edit-dialog";
import { useDialog } from "~/hooks/use-dialog";

type GroupDetailsDialogProps = {
    conversationId: string;
    onClose: () => void;
};

export function GroupDetailsDialog({
    conversationId,
    onClose,
}: GroupDetailsDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;
    const groupDetailsEditDialog = useDialog<HTMLButtonElement>();
    const utils = api.useUtils();

    // Get conversation details
    const { data: conversationDetails } = api.conversation.getById.useQuery(
        { conversationId },
        { enabled: !!conversationId }
    );

    // Get members
    const { data: members = [] } = api.user.getMembers.useQuery(
        { conversationId },
        { enabled: !!conversationId }
    );

    // tRPC mutations
    const updateRoleMutation = api.conversation.updateRole.useMutation({
        onSuccess: () => {
            toast.success("Admin status updated successfully");
            utils.user.getMembers.invalidate({ conversationId });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update admin status");
        },
    });

    const removeMemberMutation = api.conversation.removeMember.useMutation({
        onSuccess: () => {
            toast.success("Member removed successfully");
            utils.user.getMembers.invalidate({ conversationId });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to remove member");
        },
    });

    if (!conversationDetails || conversationDetails.type !== "group")
        return null;

    const sortedMembers = [...members].sort((a, b) => {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (a.role !== "admin" && b.role === "admin") return 1;
        return 0;
    });

    const filteredMembers = sortedMembers.filter((member) =>
        (member.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isAdmin =
        members.find((m) => m.id === currentUserId)?.role === "admin";

    return (
        <DialogContent className="sm:max-w-[425px] cursor-default">
            <DialogHeader className="select-none">
                <DialogTitle>Group Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2 py-4">
                <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                        <AvatarImage
                            src={conversationDetails.image || undefined}
                            alt={conversationDetails.name || "Group"}
                        />
                        <AvatarFallback>
                            {(conversationDetails.name || "Group")
                                .slice(0, 2)
                                .toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold">
                            {conversationDetails.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {members.length} members
                        </p>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground flex items-center">
                    <CalendarDays className="w-4 h-4 mr-1" />
                    Created on:{" "}
                    {formatDate(new Date(conversationDetails.createdAt))}
                </p>
                <div className="select-none">
                    <h3 className="mb-2 text-lg font-semibold relative">
                        Members
                    </h3>
                    <div className="flex items-center mb-2 relative">
                        <Input
                            placeholder="Search members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8"
                        />
                        <Search className="h-4 w-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <ScrollArea className="h-[200px]">
                        {filteredMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between h-12 p-2 hover:bg-accent/50 rounded-md"
                            >
                                <div className="flex items-center">
                                    <Avatar className="w-8 h-8 mr-2">
                                        <AvatarImage
                                            src={member.image || undefined}
                                            alt={member.name || ""}
                                        />
                                        <AvatarFallback>
                                            {(member.name || "")
                                                .slice(0, 2)
                                                .toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="select-text">
                                        <p className="text-sm font-medium">
                                            {member.name || ""}
                                            {member.id === currentUserId &&
                                                " (You)"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center select-none">
                                    {member.role === "admin" && (
                                        <Badge variant="secondary">Admin</Badge>
                                    )}
                                    {isAdmin && member.id !== currentUserId && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        updateRoleMutation.mutate(
                                                            {
                                                                conversationId,
                                                                userId: member.id,
                                                                role:
                                                                    member.role ===
                                                                    "admin"
                                                                        ? "member"
                                                                        : "admin",
                                                            }
                                                        )
                                                    }
                                                >
                                                    {member.role === "admin"
                                                        ? "Remove Admin"
                                                        : "Make Admin"}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        removeMemberMutation.mutate(
                                                            {
                                                                conversationId,
                                                                userId: member.id,
                                                            }
                                                        )
                                                    }
                                                >
                                                    Remove from Group
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
                {isAdmin && (
                    <div className="flex justify-between">
                        <Button
                            className="flex items-center w-full"
                            {...groupDetailsEditDialog.triggerProps}
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Details
                            <Separator
                                orientation="vertical"
                                className="mx-6 bg-primary-foreground"
                            />
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Members
                        </Button>
                        <GroupDetailsEditDialog
                            conversationId={conversationId}
                            open={groupDetailsEditDialog.isOpen}
                            onOpenChange={groupDetailsEditDialog.setIsOpen}
                        />
                    </div>
                )}
                <Button variant="destructive" onClick={onClose}>
                    Leave Group
                </Button>
            </div>
        </DialogContent>
    );
}
