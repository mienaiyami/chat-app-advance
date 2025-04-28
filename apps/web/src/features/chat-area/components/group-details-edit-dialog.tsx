"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Search, Loader2 } from "lucide-react";
import { Label } from "~/components/ui/label";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { DialogDescription } from "@radix-ui/react-dialog";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useDebounce } from "~/hooks/use-debounce";
import { useUploadThing } from "~/lib/uploadthing";

type User = {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
};

type GroupDetailsEditDialogProps = {
    conversationId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function GroupDetailsEditDialog({
    conversationId,
    open,
    onOpenChange,
}: GroupDetailsEditDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [groupName, setGroupName] = useState("");
    const [displayPicture, setDisplayPicture] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    const utils = api.useUtils();

    const { startUpload, isUploading: isUploadingAvatar } = useUploadThing(
        "avatarUploader",
        {
            onClientUploadComplete: (res) => {
                if (res?.[0]) {
                    setDisplayPicture(res[0].ufsUrl);
                    setIsUploading(false);
                    toast.success("Group avatar uploaded successfully");
                }
            },
            onUploadError: (error) => {
                toast.error(`Error uploading avatar: ${error.message}`);
                setIsUploading(false);
            },
        }
    );

    const searchUsersQuery = api.user.search.useQuery(
        { query: debouncedSearchQuery },
        {
            enabled: !!debouncedSearchQuery,
            staleTime: 10000,
        }
    );

    const { data: members = [] } = api.user.getMembers.useQuery(
        { conversationId },
        { enabled: !!conversationId && open }
    );
    const addMemberMutation = api.conversation.addMembers.useMutation({
        onSuccess: () => {
            toast.success("Member added successfully");
            utils.user.getMembers.invalidate({ conversationId });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to add member");
        },
    });

    const { data: contacts = [] } = api.user.getContacts.useQuery(undefined, {
        enabled: open,
    });

    const editGroupMutation = api.conversation.update.useMutation({
        onSuccess: () => {
            toast.success("Group updated successfully");
            utils.conversation.getById.invalidate({ conversationId });
            utils.user.getMembers.invalidate({ conversationId });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update group");
        },
    });

    useEffect(() => {
        if (!open) {
            setGroupName("");
            setSelectedUsers([]);
            setDisplayPicture(null);
            setSearchQuery("");
        }
    }, [open]);

    const filteredUsers =
        searchUsersQuery.data?.filter(
            (user) => !members.some((member) => member.id === user.id)
        ) || [];

    const toggleUserSelection = (user: User) => {
        setSelectedUsers((prev) => {
            if (prev.some((u) => u.id === user.id)) {
                return prev.filter((u) => u.id !== user.id);
            }
            return [...prev, user];
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            toast.error("File too large. Maximum size is 4MB");
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Only image files are allowed");
            return;
        }

        setIsUploading(true);
        startUpload([file]);
    };

    const handleEditGroup = () => {
        const updates: {
            id: string;
            name?: string;
            image?: string;
        } = {
            id: conversationId,
        };

        if (groupName) updates.name = groupName;
        if (displayPicture) updates.image = displayPicture;
        if (selectedUsers.length > 0) {
            addMemberMutation.mutate({
                conversationId,
                userIds: selectedUsers.map((user) => user.id),
            });
        }

        editGroupMutation.mutate({
            conversationId,
            ...updates,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-96 select-none">
                <DialogHeader>
                    <DialogTitle>Edit Group Details</DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-sm text-muted-foreground">
                    Leave empty to keep the current value
                </DialogDescription>
                <div className="grid gap-2 py-4">
                    <Label className="flex w-full items-start flex-col gap-2 mb-2">
                        Group Name
                        <Input
                            placeholder="Group Name"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </Label>
                    <Label className="flex w-full items-start flex-col gap-2">
                        Avatar
                        <Input
                            type="file"
                            className="w-full"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={isUploading || isUploadingAvatar}
                        />
                        {(isUploading || isUploadingAvatar) && (
                            <div className="flex items-center mt-1">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                <span className="text-sm">Uploading...</span>
                            </div>
                        )}
                    </Label>
                    {displayPicture && (
                        <div className="flex flex-row items-center px-4 gap-4">
                            <div className="mb-2 flex justify-center">
                                <Avatar className="w-16 h-16">
                                    <AvatarImage
                                        src={displayPicture}
                                        alt="Group avatar"
                                    />
                                    <AvatarFallback>GP</AvatarFallback>
                                </Avatar>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setDisplayPicture(null);
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    )}

                    <Label className="flex w-full items-start flex-col gap-2">
                        Add Members
                        <div className="relative w-full">
                            <Input
                                className="w-full"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="text-muted-foreground absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </Label>
                    {selectedUsers.length > 0 && (
                        <div className="text-xs flex flex-col gap-0.5 border-b pb-2">
                            <span>Selected Users ({selectedUsers.length})</span>
                            <ScrollArea className="w-full">
                                <div className="w-full flex flex-row gap-1 flex-nowrap">
                                    {selectedUsers.map((user) => (
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                toggleUserSelection(user)
                                            }
                                            key={user.id}
                                            className="flex items-center space-x-2 bg-accent/50 rounded-full p-1 text-xs h-6"
                                        >
                                            <Avatar className="w-4 h-4">
                                                <AvatarImage
                                                    src={
                                                        user.image || undefined
                                                    }
                                                    alt={user.name || ""}
                                                />
                                                <AvatarFallback>
                                                    {(user.name || "")
                                                        .slice(0, 2)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="max-w-24 pr-1 truncate">
                                                {user.name || ""}
                                            </span>
                                        </Button>
                                    ))}
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>
                    )}
                    {searchUsersQuery.isLoading && (
                        <p className="text-sm text-muted-foreground text-center">
                            Loading...
                        </p>
                    )}
                    {!searchUsersQuery.isLoading &&
                        filteredUsers.length > 0 && (
                            <ScrollArea className="w-full">
                                <div className="max-h-60 p-1">
                                    {filteredUsers.map((user) => (
                                        <Button
                                            key={user.id}
                                            variant="ghost"
                                            className={`flex w-full space-x-2 items-center h-full p-2 rounded-md ${
                                                selectedUsers.some(
                                                    (u) => u.id === user.id
                                                )
                                                    ? "bg-accent/50"
                                                    : ""
                                            }`}
                                            disabled={user.id === currentUserId}
                                            onClick={() =>
                                                toggleUserSelection(user)
                                            }
                                        >
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={
                                                        user.image || undefined
                                                    }
                                                    alt={user.name || ""}
                                                />
                                                <AvatarFallback>
                                                    {(user.name || "")
                                                        .slice(0, 2)
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-grow min-w-0 flex flex-col items-start">
                                                <p className="text-sm font-medium truncate">
                                                    {user.name || ""}{" "}
                                                    {user.id ===
                                                        currentUserId &&
                                                        "(You)"}
                                                    {contacts.some(
                                                        (contact) =>
                                                            contact.contactId ===
                                                            user.id
                                                    ) && " (In Contacts)"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {user.email || ""}
                                                </p>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                                <ScrollBar orientation="vertical" />
                            </ScrollArea>
                        )}
                    {!searchUsersQuery.isLoading &&
                        searchQuery &&
                        filteredUsers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center">
                                No users found / Already in group
                            </p>
                        )}
                </div>
                <div className="flex justify-end space-x-2">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setGroupName("");
                                setSelectedUsers([]);
                                setDisplayPicture(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleEditGroup}
                        disabled={
                            editGroupMutation.isPending ||
                            isUploading ||
                            isUploadingAvatar
                        }
                    >
                        {editGroupMutation.isPending ||
                        isUploading ||
                        isUploadingAvatar
                            ? "Saving..."
                            : "Save"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
