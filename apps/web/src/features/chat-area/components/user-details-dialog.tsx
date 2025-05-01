"use client";

import { useState, type ReactNode } from "react";
import { Mail, UserPlus, ShieldCheck, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { useConversation } from "~/providers/conversation-provider";
import { toast } from "sonner";
import { formatDateLong } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";

const renderRoleBadge = (role: string | null) => {
    if (role === "admin") {
        return (
            <Badge
                variant="secondary"
                className="flex items-center gap-1 font-normal"
            >
                <ShieldCheck className="h-3 w-3" />
                Admin
            </Badge>
        );
    }
    if (role === "owner") {
        return (
            <Badge
                variant="secondary"
                className="flex items-center gap-1 font-normal"
            >
                <ShieldCheck className="h-3 w-3" />
                Owner
            </Badge>
        );
    }
    return (
        <Badge
            variant="outline"
            className="flex items-center gap-1 font-normal"
        >
            <User className="h-3 w-3" />
            Member
        </Badge>
    );
};

interface UserDetailsDialogProps {
    userId: string;
    children: React.ReactNode;
}

export default function UserDetailsDialog({
    userId,
    children,
}: UserDetailsDialogProps) {
    const [open, setOpen] = useState(false);
    const { setActiveConversation, activeConversationId } = useConversation();

    const { data: membershipDetails } =
        api.conversation.getMemberDetails.useQuery(
            { conversationId: activeConversationId || "", userId },
            {
                enabled: open && !!activeConversationId,
            }
        );

    const { data: user, isLoading } = api.user.getById.useQuery(
        { userId },
        {
            enabled: open,
            refetchOnWindowFocus: false,
        }
    );

    const createDirectChatMutation = api.conversation.createDirect.useMutation({
        onSuccess: (data) => {
            if (data) {
                setActiveConversation(data.id);
                setOpen(false);
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create conversation");
        },
    });

    const addContactMutation = api.user.updateContact.useMutation({
        onSuccess: () => {
            toast.success("Contact added successfully");
            setOpen(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to add contact");
        },
    });

    const handleSendMessage = () => {
        if (!userId) return;

        createDirectChatMutation.mutate({ targetUserId: userId });
    };

    const handleAddContact = () => {
        if (!userId) return;

        addContactMutation.mutate({
            userId,
            action: "add",
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>User Details</DialogTitle>
                    <DialogDescription>
                        View information about this user
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <UserDetailsSkeleton />
                ) : !user ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <p className="text-muted-foreground">User not found</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 p-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage
                                src={user.image || ""}
                                alt={user.name || ""}
                            />
                            <AvatarFallback className="text-xl">
                                {(user.name || "").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col items-center gap-1">
                            <h3 className="font-semibold text-xl">
                                {user.name}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                {user.email}
                            </p>

                            {membershipDetails?.role && (
                                <div className="mt-1">
                                    {renderRoleBadge(membershipDetails.role)}
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="flex w-full flex-col gap-4 text-sm">
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground">
                                    Member since
                                </span>
                                <span>{formatDateLong(user.createdAt)}</span>
                            </div>

                            {membershipDetails && (
                                <div>
                                    {membershipDetails.joinedAt && (
                                        <div className="flex flex-col gap-1 mb-2">
                                            <span className="text-muted-foreground">
                                                Joined conversation
                                            </span>
                                            <span>
                                                {formatDateLong(
                                                    membershipDetails.joinedAt
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex w-full gap-3 mt-4">
                            <Button
                                onClick={handleAddContact}
                                variant="outline"
                                className="flex-1"
                                disabled={addContactMutation.isPending}
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Contact
                            </Button>
                            <Button
                                onClick={handleSendMessage}
                                className="flex-1"
                                disabled={createDirectChatMutation.isPending}
                            >
                                <Mail className="h-4 w-4 mr-2" />
                                Message
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function UserDetailsSkeleton() {
    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <Skeleton className="h-24 w-24 rounded-full" />

            <div className="flex flex-col items-center gap-2 w-full">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
            </div>

            <Separator />

            <div className="flex flex-col w-full gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
            </div>

            <div className="flex w-full gap-3 mt-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
            </div>
        </div>
    );
}
