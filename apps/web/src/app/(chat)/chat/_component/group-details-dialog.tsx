"use client";

import { Check, Copy, Edit2, Trash, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { useSession } from "next-auth/react";

interface GroupDetailsDialogProps {
    conversationId: string;
    onClose: () => void;
}

export default function GroupDetailsDialog({
    conversationId,
    onClose,
}: GroupDetailsDialogProps) {
    const { data: session } = useSession();
    const [copied, setCopied] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");

    const { data: group, isLoading: isLoadingGroup } =
        api.conversation.getById.useQuery(
            { conversationId },
            { enabled: !!conversationId }
        );

    const { data: members, isLoading: isLoadingMembers } =
        api.conversation.getMembers.useQuery(
            { conversationId },
            { enabled: !!conversationId }
        );

    const utils = api.useUtils();
    const updateGroup = api.conversation.update.useMutation({
        onSuccess: () => {
            toast.success("Group updated successfully");
            setEditMode(false);
            utils.conversation.getById.invalidate({
                conversationId,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const inviteUser = api.conversation.addMembers.useMutation({
        onSuccess: () => {
            toast.success("Invitation sent successfully");
            setInviteEmail("");
            utils.conversation.getMembers.invalidate({
                conversationId,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const removeMember = api.conversation.removeMember.useMutation({
        onSuccess: () => {
            toast.success("Member removed successfully");
            utils.conversation.getMembers.invalidate({
                conversationId,
            });
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    useEffect(() => {
        if (group) {
            setGroupName(group.name ?? "");
        }
    }, [group]);

    const handleUpdateGroup = () => {
        if (!groupName.trim()) {
            toast.error("Group name cannot be empty");
            return;
        }

        updateGroup.mutate({
            conversationId,
            name: groupName.trim(),
        });
    };

    const handleInviteUser = () => {
        if (!inviteEmail.trim()) {
            toast.error("Email cannot be empty");
            return;
        }

        inviteUser.mutate({
            conversationId,
            userIds: [inviteEmail.trim()],
        });
    };

    const handleRemoveMember = (memberId: string) => {
        removeMember.mutate({
            conversationId,
            userId: memberId,
        });
    };

    const isCurrentUserAdmin = members?.some(
        (member) =>
            member.role === "admin" && member.userId === session?.user.id
    );

    return (
        <DialogContent
            className="sm:max-w-[500px]"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={onClose}
        >
            <DialogHeader>
                <DialogTitle>Group Details</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="members">Members</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                    {isLoadingGroup ? (
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-5 w-32 mt-4" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="groupName">
                                        Group Name
                                    </Label>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setEditMode(!editMode)}
                                    >
                                        {editMode ? (
                                            <X className="h-4 w-4" />
                                        ) : (
                                            <Edit2 className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                            {editMode ? "Cancel" : "Edit"}
                                        </span>
                                    </Button>
                                </div>
                                {editMode ? (
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            id="groupName"
                                            value={groupName}
                                            onChange={(e) =>
                                                setGroupName(e.target.value)
                                            }
                                            placeholder="Enter group name"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleUpdateGroup}
                                            disabled={updateGroup.isPending}
                                        >
                                            {updateGroup.isPending
                                                ? "Saving..."
                                                : "Save"}
                                        </Button>
                                    </div>
                                ) : (
                                    <Input
                                        id="groupName"
                                        value={groupName}
                                        disabled
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Invite by Email</Label>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        type="email"
                                        placeholder="user@example.com"
                                        value={inviteEmail}
                                        onChange={(e) =>
                                            setInviteEmail(e.target.value)
                                        }
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handleInviteUser}
                                        disabled={
                                            inviteUser.isPending ||
                                            !inviteEmail.trim()
                                        }
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        <span className="sr-only">Invite</span>
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>

                <TabsContent value="members" className="mt-4">
                    {isLoadingMembers ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div
                                    key={String(i)}
                                    className="flex items-center space-x-2"
                                >
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-1 flex-1">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-3">
                                {members?.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-accent/50"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <Avatar>
                                                <AvatarImage
                                                    src={member.image || ""}
                                                />
                                                <AvatarFallback>
                                                    {member.name
                                                        ?.slice(0, 2)
                                                        .toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {member.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {member.role === "admin"
                                                        ? "Admin"
                                                        : "Member"}
                                                </p>
                                            </div>
                                        </div>

                                        {member.role !== "admin" &&
                                            isCurrentUserAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() =>
                                                        handleRemoveMember(
                                                            member.userId
                                                        )
                                                    }
                                                    disabled={
                                                        removeMember.isPending
                                                    }
                                                >
                                                    <Trash className="h-4 w-4" />
                                                    <span className="sr-only">
                                                        Remove
                                                    </span>
                                                </Button>
                                            )}
                                    </div>
                                ))}

                                {members && members.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">
                                        No members found
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
}
