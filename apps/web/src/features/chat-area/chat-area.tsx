"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { MoreHorizontal, Paperclip, Send, X, Loader2 } from "lucide-react";
import { Textarea } from "~/components/ui/textarea";
import { TooltipProvider } from "~/components/ui/tooltip";
import { useMessage } from "~/providers/message-provider";
import { useConversation } from "~/providers/conversation-provider";
import { convertHtmlToMarkdown, formatFileSize } from "~/lib/utils";
import { EmojiPicker } from "~/components/emoji-picker";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "~/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import MessageItem from "./components/message-item";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { GroupDetailsDialog } from "./components/group-details-dialog";
import { renderers } from "./components/renderers";
import { useSocket } from "~/providers/socket-provider";
type Message = RouterOutputs["message"]["getMessages"]["messages"][number];

export function ChatArea() {
    const { data: session } = useSession();
    const { typingUsers, onlineUsers } = useSocket();
    const {
        messages,
        sendMessage,
        editMessage,
        deleteMessage,
        markAsRead,
        isSending,
        isUploadingFile,
        handleTyping,
    } = useMessage();

    const { activeConversationId, conversations } = useConversation();

    const membersQuery = api.user.getMembers.useQuery(
        {
            conversationId: activeConversationId || "",
        },
        {
            enabled: !!activeConversationId,
        }
    );
    const membersMap = new Map(membersQuery.data?.map((m) => [m.id, m]) || []);

    const [newMessage, setNewMessage] = useState("");
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [selectedForReply, setSelectedForReply] = useState<Message | null>(
        null
    );

    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const msgInputRef = useRef<HTMLTextAreaElement>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFilePreview, setSelectedFilePreview] = useState<
        string | null
    >(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [clearChatDialogOpen, setClearChatDialogOpen] = useState(false);
    const [leaveGroupDialogOpen, setLeaveGroupDialogOpen] = useState(false);
    const [groupDetailsDialogOpen, setGroupDetailsDialogOpen] = useState(false);

    const chatOpened = conversations.find((c) => c.id === activeConversationId);

    const currentUser = session?.user;

    const currentUserMembership = currentUser && membersMap.get(currentUser.id);
    const isChatMuted = currentUserMembership?.muted || false;

    const clearChatMutation = api.conversation.clearChat.useMutation({
        onSuccess: () => {
            toast.success("Chat cleared successfully");
            setClearChatDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to clear chat");
        },
    });

    const leaveGroupMutation = api.conversation.leave.useMutation({
        onSuccess: () => {
            toast.success("Left group successfully");
            setLeaveGroupDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to leave group");
        },
    });

    const removeMemberMutation = api.conversation.removeMember.useMutation({
        onSuccess: () => {
            toast.success("Member removed successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to remove member");
        },
    });

    const updateContactMutation = api.user.updateContact.useMutation({
        onSuccess: () => {
            toast.success("Contact updated successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update contact");
        },
    });

    const utils = api.useUtils();
    const updateMutedChatMutation = api.user.updateMutedChat.useMutation({
        onSuccess: () => {
            toast.success("Chat preference updated");
            // Invalidate the members query to refresh the muted status
            if (activeConversationId) {
                utils.user.getMembers.invalidate({
                    conversationId: activeConversationId,
                });
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update chat preference");
        },
    });

    // Clear input and reset state when changing conversations
    useEffect(() => {
        setNewMessage("");
        setEditingMessage(null);
        msgInputRef.current?.focus();
        setClearChatDialogOpen(false);
        setLeaveGroupDialogOpen(false);
        setGroupDetailsDialogOpen(false);
    }, [activeConversationId]);

    useEffect(() => {
        if (selectedForReply) {
            msgInputRef.current?.focus();
        }
    }, [selectedForReply]);

    // Scroll to bottom when messages change
    // useEffect(() => {
    //     scrollAreaRef.current?.querySelector(":scope >div")?.scrollTo({
    //         top: 999999999,
    //         behavior: "auto",
    //     });
    //     if (activeConversationId) {
    //         markAsRead();
    //     }
    // }, [messages, activeConversationId, markAsRead]);

    // Handle file preview
    useLayoutEffect(() => {
        if (selectedFile) {
            if (selectedFile.type.startsWith("image/")) {
                setSelectedFilePreview(URL.createObjectURL(selectedFile));
            } else {
                setSelectedFilePreview(null);
            }
        }
    }, [selectedFile]);

    const handleSendMessage = () => {
        if (editingMessage) {
            handleSaveEdit();
            return;
        }

        if (
            activeConversationId &&
            currentUser?.id &&
            (newMessage.trim() || selectedFile)
        ) {
            sendMessage({
                conversationId: activeConversationId,
                text: newMessage.trim(),
                repliedToId: selectedForReply?.id,
                attachment: selectedFile
                    ? {
                          url: URL.createObjectURL(selectedFile),
                          name: selectedFile.name,
                          size: selectedFile.size,
                          fType: "file",
                          mimeType: selectedFile.type,
                      }
                    : null,
                senderId: currentUser.id,
            });
            setNewMessage("");
            setSelectedFile(null);
            setSelectedForReply(null);
        }
    };

    const handleEditStart = (message: Message) => {
        setEditingMessage(message);
        setNewMessage(message.text);
        msgInputRef.current?.focus();
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setNewMessage("");
    };

    const handleSaveEdit = () => {
        if (editingMessage && newMessage.trim()) {
            editMessage(editingMessage.id, newMessage.trim());
            setEditingMessage(null);
            setNewMessage("");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 16 * 1024 * 1024) {
            toast.error("File too large to upload. Limit is 16MB");
            return;
        }

        setSelectedFile(file);

        // For image files, create a preview
        if (file.type.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setSelectedFilePreview(url);
        } else {
            setSelectedFilePreview(null);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
    };

    const clearChat = () => {
        if (activeConversationId) {
            clearChatMutation.mutate({ conversationId: activeConversationId });
        }
    };

    const leaveGroup = () => {
        if (activeConversationId) {
            leaveGroupMutation.mutate({ conversationId: activeConversationId });
        }
    };

    const removeMember = (params: { groupId: string; userId: string }) => {
        removeMemberMutation.mutate({
            conversationId: params.groupId,
            userId: params.userId,
        });
    };

    const updateContact = (userId: string, action: "add" | "remove") => {
        updateContactMutation.mutate({ userId, action });
    };

    const updateMutedChat = (chatId: string, muted: boolean) => {
        updateMutedChatMutation.mutate({ conversationId: chatId, muted });
    };

    if (!chatOpened)
        return (
            <div className="h-full flex-1 grid place-items-center select-none border rounded-r-lg border-l-0 max-h-screen">
                <p className="text-accent-foreground">
                    Select a chat/group to start chatting
                </p>
            </div>
        );

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
        <div className="h-full flex-1 flex flex-col border rounded-r-lg border-l-0 max-h-screen">
            <div className="p-4 border-b flex justify-between items-center h-18">
                <div className="flex items-center select-none">
                    <Avatar className="h-10 w-10 mr-4">
                        <AvatarImage
                            src={chatImage || undefined}
                            alt={chatName}
                        />
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
                                                    membersMap.get(id)?.name ||
                                                    ""
                                            )
                                    )
                                )} is typing...`}
                            {typingUsers.size === 0 &&
                                (chatOpened.type === "direct"
                                    ? onlineUsers.some(
                                          (c) => c === currentUser?.id
                                      )
                                        ? "Online"
                                        : chatOpened.name?.includes(
                                              " (Unknown)"
                                          )
                                        ? ""
                                        : "Offline"
                                    : `${new Intl.ListFormat("en").format(
                                          Array.from(membersMap.values())
                                              .map((e) => e.name || "")
                                              .sort((a, b) =>
                                                  a.localeCompare(b)
                                              )
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
                                        onClick={() =>
                                            setClearChatDialogOpen(true)
                                        }
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
                                                    updateContact(
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
                                        updateMutedChat(
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
                                        onClick={clearChat}
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
                                    Are you sure you want to leave this group?
                                    Only admins can re-add you.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                    <Button
                                        variant="destructive"
                                        onClick={leaveGroup}
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
            <TooltipProvider
                delayDuration={100}
                disableHoverableContent
                skipDelayDuration={0}
            >
                <ScrollArea
                    className="overflow-y-auto p-4 h-full"
                    ref={scrollAreaRef}
                >
                    {messages.map((message, i, arr) => (
                        <MessageItem
                            key={message.id}
                            message={message}
                            isFirstMessage={
                                i === 0 ||
                                !!message.repliedTo ||
                                (i > 0 &&
                                    arr[i - 1]?.senderId !== message.senderId)
                            }
                            sender={message.sender}
                            isCurrentUser={currentUser?.id === message.senderId}
                            isCurrentUserAdmin={
                                membersMap.get(currentUser?.id || "")?.role ===
                                "admin"
                            }
                            onEdit={() => handleEditStart(message)}
                            onDelete={() => {
                                deleteMessage(message.id);
                            }}
                            isRepliedTo={selectedForReply?.id === message.id}
                            onReply={() => setSelectedForReply(message)}
                        >
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={renderers}
                            >
                                {message.text}
                            </ReactMarkdown>
                        </MessageItem>
                    ))}
                </ScrollArea>
            </TooltipProvider>
            {selectedForReply && (
                <div className="-top-full left-0 w-full p-2 rounded-t-md border-t text-xs select-none">
                    <div className="flex items-center justify-between">
                        <button
                            className="hover:underline"
                            onClick={() => {
                                const element = document.querySelector(
                                    `[data-message-id="${selectedForReply.id}"]`
                                );
                                if (element) {
                                    element.scrollIntoView({
                                        behavior: "smooth",
                                    });
                                    element.classList.add("animate-flash");
                                    element.addEventListener(
                                        "animationend",
                                        () => {
                                            element.classList.remove(
                                                "animate-flash"
                                            );
                                        },
                                        { once: true }
                                    );
                                }
                            }}
                        >
                            Replying to{" "}
                            {selectedForReply.senderId === currentUser?.id
                                ? currentUser.name
                                : chatOpened.name}
                        </button>
                        <Button
                            variant="ghost"
                            className="w-6 h-6 rounded-full p-1"
                            onClick={() => setSelectedForReply(null)}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancel Reply</span>
                        </Button>
                    </div>
                </div>
            )}
            {selectedFile && (
                <div className="p-2 border-t flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                        {selectedFilePreview && (
                            <a
                                href={selectedFilePreview}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Click to preview ${selectedFile.name}`}
                            >
                                <img
                                    src={selectedFilePreview}
                                    alt={selectedFile.name}
                                    className="h-40 w-40 rounded-md"
                                />
                            </a>
                        )}
                        <button
                            title={`Click to preview ${selectedFile.name}`}
                            onClick={(e) => {
                                e.preventDefault();
                                const url =
                                    selectedFilePreview ||
                                    URL.createObjectURL(selectedFile);
                                window.open(url, "_blank");
                                // Don't revoke URL if it's the preview
                                if (!selectedFilePreview) {
                                    URL.revokeObjectURL(url);
                                }
                            }}
                            className="hover:underline cursor-pointer"
                        >
                            <span className="text-sm font-medium">
                                {selectedFile.name} (
                                {formatFileSize(selectedFile.size)})
                            </span>
                        </button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveFile}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove File</span>
                        </Button>
                    </div>
                </div>
            )}
            <div className="p-4 border-t relative">
                <div className="flex items-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={triggerFileInput}
                        disabled={!!editingMessage}
                    >
                        <Paperclip className="h-5 w-5" />
                        <span className="sr-only">Attach File</span>
                    </Button>
                    <input
                        hidden
                        type="file"
                        accept="*"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <Textarea
                        placeholder={
                            editingMessage
                                ? "Edit message..."
                                : "Type a message..."
                        }
                        ref={msgInputRef}
                        value={newMessage}
                        rows={1}
                        className="resize-none min-h-fit max-h-32 row-auto"
                        onChange={(e) => {
                            setNewMessage(e.target.value);
                            if (!editingMessage) {
                                handleTyping();
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            } else if (e.key === "Escape") {
                                if (editingMessage) {
                                    handleCancelEdit();
                                } else {
                                    setSelectedForReply(null);
                                }
                            }
                        }}
                        onPaste={(e) => {
                            e.preventDefault();
                            if (e.clipboardData.types.includes("Files")) {
                                try {
                                    const file = e.clipboardData.files[0];
                                    if (!file) return;
                                    if (file.size > 100 * 1024 * 1024) {
                                        toast.error(
                                            "File too large to upload. Limit is 100MB"
                                        );
                                        return;
                                    }
                                    setSelectedFile(file);
                                } catch (error) {
                                    console.error(error);
                                    toast.error(
                                        "Failed to upload file from clipboard"
                                    );
                                }
                                return;
                            }
                            if (e.clipboardData.types.includes("text/html")) {
                                const text =
                                    e.clipboardData.getData("text/html");
                                const md = convertHtmlToMarkdown(text);
                                setNewMessage((prev) => prev + md);
                                return;
                            }
                            if (e.clipboardData.types.includes("text/plain")) {
                                const text =
                                    e.clipboardData.getData("text/plain");
                                setNewMessage((prev) => prev + text);
                                return;
                            }
                        }}
                    />

                    <EmojiPicker
                        onEmojiSelect={(emoji) => {
                            const input = msgInputRef.current;
                            if (!input) return;
                            const startPos = input.selectionStart || 0;
                            const endPos = input.selectionEnd || 0;
                            const text = input.value;
                            const before = text.substring(0, startPos);
                            const after = text.substring(endPos, text.length);
                            input.value = before + emoji + after;
                            input.selectionStart = startPos + emoji.length;
                            input.selectionEnd = startPos + emoji.length;
                            setNewMessage(input.value);
                        }}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={
                            isSending ||
                            isUploadingFile ||
                            (!editingMessage &&
                                newMessage.trim() === "" &&
                                !selectedFile)
                        }
                    >
                        {editingMessage ? (
                            "Save"
                        ) : isUploadingFile ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="h-5 w-5" />
                                <span className="sr-only">Send Message</span>
                            </>
                        )}
                    </Button>
                </div>
                {editingMessage && (
                    <div className="mt-1 select-none flex justify-between items-center text-xs text-muted-foreground">
                        <div className="ml-12">Editing message</div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className=" py-0 px-2"
                            onClick={handleCancelEdit}
                        >
                            Cancel
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
