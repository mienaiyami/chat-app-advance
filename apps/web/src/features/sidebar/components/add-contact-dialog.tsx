"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Search, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

export default function AddContactDialog() {
    const router = useRouter();
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: users, isLoading } = api.user.search.useQuery(
        { query: searchQuery },
        { enabled: open && searchQuery.length > 0 }
    );

    const updateContact = api.user.updateContact.useMutation({
        onSuccess: () => {
            toast.success("Contact added successfully");
            setSearchQuery("");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to add contact");
        },
    });

    const createDirect = api.conversation.createDirect.useMutation({
        onSuccess: (data) => {
            if (data) {
                setOpen(false);
                router.push(`/chat/${data.id}`);
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create conversation");
        },
    });

    const handleAddContact = (userId: string) => {
        if (userId === session?.user.id) {
            toast.error("You cannot add yourself as a contact");
            return;
        }

        updateContact.mutate({
            userId,
            action: "add",
        });
    };

    const handleStartConversation = (userId: string) => {
        createDirect.mutate({
            targetUserId: userId,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button variant="outline" className="ml-auto">
                        <UserPlus className="h-5 w-5" />

                        <span className="sr-only">Add Contact</span>
                    </Button>
                </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
                <p>Add Contact</p>
            </TooltipContent>
            <DialogContent className="cursor-default">
                <DialogHeader>
                    <DialogTitle>Add Contact</DialogTitle>
                    <DialogDescription>
                        Search for users to add to your contacts.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 pt-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email"
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {searchQuery.length > 0 && (
                        <ScrollArea className="h-[300px] rounded-md border">
                            {isLoading ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : users && users.length > 0 ? (
                                <div className="p-2">
                                    {users.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex gap-2 items-center justify-between rounded-sm p-2 hover:bg-accent"
                                        >
                                            <div className="flex gap-2 items-center">
                                                <Avatar className=" h-8 w-8">
                                                    <AvatarImage
                                                        src={user.image || ""}
                                                    />
                                                    <AvatarFallback>
                                                        {user.name
                                                            ?.slice(0, 2)
                                                            .toUpperCase() ||
                                                            "?"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col w-52">
                                                    <p
                                                        className="text-sm font-medium truncate"
                                                        title={user.name || ""}
                                                    >
                                                        {user.name}
                                                    </p>
                                                    <p
                                                        className="text-xs text-muted-foreground truncate"
                                                        title={user.email || ""}
                                                    >
                                                        {user.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        handleAddContact(
                                                            user.id
                                                        )
                                                    }
                                                    disabled={
                                                        updateContact.isPending
                                                    }
                                                >
                                                    Add
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        handleStartConversation(
                                                            user.id
                                                        )
                                                    }
                                                    disabled={
                                                        createDirect.isPending
                                                    }
                                                >
                                                    Message
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">
                                    No users found
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
