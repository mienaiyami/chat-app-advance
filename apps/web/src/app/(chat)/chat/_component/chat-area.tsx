"use client";

import { useEffect, useRef, useState } from "react";
import { useMessage } from "~/providers/message-provider";
import { useConversation } from "~/providers/conversation-provider";
import { useSocket } from "~/providers/socket-provider";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Textarea } from "~/components/ui/textarea";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import {
    Paperclip,
    Send,
    Image,
    X,
    MoreHorizontal,
    Smile,
    Trash,
    Edit,
    Reply,
    Check,
    Info,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog";

type ChatAreaProps = {
    conversationId: string;
    messageId?: string | null;
};

export default function ChatArea({ conversationId, messageId }: ChatAreaProps) {
    const { data: session } = useSession();
    const {
        messages,
        sendMessage,
        deleteMessage,
        editMessage,
        isFetching,
        replyToMessage,
        setReplyToMessage,
        markAsRead,
    } = useMessage();
    const { conversations, activeConversationId } = useConversation();
    const { socket, onlineUsers, typingUsers } = useSocket();

    const [newMessage, setNewMessage] = useState("");
    const [editingMessage, setEditingMessage] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(
        null
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const conversation = conversations.find((c) => c.id === conversationId);

    useEffect(() => {
        if (messageId && messagesEndRef.current) {
            const messageElement = document.getElementById(
                `message-${messageId}`
            );
            if (messageElement) {
                messageElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
                // Add a highlight effect
                messageElement.classList.add("bg-accent");
                setTimeout(() => {
                    messageElement.classList.remove("bg-accent");
                }, 3000);
            }
        } else {
            scrollToBottom();
        }
    }, [messages, messageId]);

    useEffect(() => {
        markAsRead();
    }, [messages, markAsRead]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        setNewMessage("");
        setEditingMessage(null);
        setAttachment(null);
        setAttachmentPreview(null);
    }, [conversationId]);

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && !attachment) || isFetching) return;

        if (editingMessage) {
            await editMessage(editingMessage, newMessage);
            setEditingMessage(null);
        } else {
            await sendMessage({
                conversationId,
                text: newMessage,
                repliedToId: replyToMessage?.id,
                attachment: attachment
                    ? {
                          name: attachment.name,
                          size: attachment.size,
                          fType: attachment.type.startsWith("image/")
                              ? "image"
                              : "file",
                          url: URL.createObjectURL(attachment),
                          mimeType: attachment.type,
                      }
                    : undefined,
            });
            setReplyToMessage(null);
        }

        setNewMessage("");
        setAttachment(null);
        setAttachmentPreview(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);

        // Emit typing events
        if (socket && conversationId) {
            socket.emit("user:typing", conversationId);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                socket.emit("user:stop_typing", conversationId);
            }, 3000);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target?.files?.[0]) {
            const file = e.target.files[0];
            setAttachment(file);

            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setAttachmentPreview(
                        (event.target?.result as string) || null
                    );
                };
                reader.readAsDataURL(file);
            } else {
                setAttachmentPreview(null);
            }
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const cancelEdit = () => {
        setEditingMessage(null);
        setNewMessage("");
    };

    const getDisplayName = (userId: string) => {
        if (!conversation) return "Unknown";

        const member = conversation.members.find((m) => m.userId === userId);
        return member?.user.name || "Unknown";
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

    const isUserOnline = (userId: string) => {
        return onlineUsers.has(userId);
    };

    const isUserTyping = (userId: string) => {
        return typingUsers.has(userId) && userId !== session?.user?.id;
    };

    const getConversationInfo = () => {
        if (!conversation)
            return {
                name: "Unknown",
                image: null,
                description: null,
                membersCount: 0,
            };

        if (conversation.type === "direct") {
            const otherMember = conversation.members.find(
                (m) => m.userId !== session?.user?.id
            );
            return {
                name: otherMember?.user.name || "Unknown",
                image: otherMember?.user.image,
                description: null,
                membersCount: 2,
                isOnline: otherMember
                    ? isUserOnline(otherMember.userId)
                    : false,
            };
        }

        return {
            name: conversation.name || "Group",
            image: conversation.image,
            description: conversation.description,
            membersCount: conversation.members.length,
            isOnline: false,
        };
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">
                    Select a conversation to start chatting
                </p>
            </div>
        );
    }

    const conversationInfo = getConversationInfo();

    const typingMembersNames = conversation.members
        .filter((m) => isUserTyping(m.userId))
        .map((m) => m.user.name || "Someone")
        .join(", ");

    return (
        <div className="flex flex-col flex-1 h-full">
            <div className="border-b p-3 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <Avatar>
                        <AvatarImage src={conversationInfo.image || ""} />
                        <AvatarFallback>
                            {getInitials(conversationInfo.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h2 className="font-semibold">
                                {conversationInfo.name}
                            </h2>
                            {conversation.type === "direct" &&
                                conversationInfo.isOnline && (
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                )}
                        </div>
                        {conversation.type === "direct" ? (
                            <p className="text-xs text-muted-foreground">
                                {conversationInfo.isOnline
                                    ? "Online"
                                    : "Offline"}
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground">
                                {conversationInfo.membersCount} members
                            </p>
                        )}
                    </div>
                </div>
                <div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowGroupInfo(true)}
                    >
                        <Info className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((message) => {
                        const isCurrentUser =
                            message.senderId === session?.user.id;
                        const date = new Date(message.createdAt);
                        const timeString = format(date, "HH:mm");
                        const formattedDate = format(date, "dd MMM yyyy");

                        return (
                            <div
                                key={message.id}
                                id={`message-${message.id}`}
                                className={cn(
                                    "flex transition-colors duration-300 rounded-lg p-1",
                                    isCurrentUser
                                        ? "justify-end"
                                        : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[80%] flex",
                                        isCurrentUser
                                            ? "flex-row-reverse"
                                            : "flex-row"
                                    )}
                                >
                                    {!isCurrentUser && (
                                        <Avatar className="h-8 w-8 mr-2">
                                            <AvatarImage
                                                src={message.sender.image || ""}
                                            />
                                            <AvatarFallback>
                                                {getInitials(
                                                    message.sender.name
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}

                                    <div
                                        className={cn(
                                            "rounded-lg p-3 space-y-1",
                                            isCurrentUser
                                                ? "bg-primary text-primary-foreground mr-2"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {!isCurrentUser && (
                                            <p className="text-xs font-medium">
                                                {message.sender.name}
                                            </p>
                                        )}

                                        {message.repliedTo && (
                                            <div
                                                className={cn(
                                                    "text-xs p-2 rounded border-l-2 mb-2",
                                                    isCurrentUser
                                                        ? "border-primary-foreground/50 bg-primary-foreground/10"
                                                        : "border-muted-foreground/50 bg-muted-foreground/10"
                                                )}
                                            >
                                                <p className="font-medium">
                                                    {
                                                        message.repliedTo.sender
                                                            .name
                                                    }
                                                </p>
                                                <p className="truncate">
                                                    {message.repliedTo.text}
                                                </p>
                                            </div>
                                        )}

                                        {message.attachment?.url && (
                                            <div className="mb-2">
                                                {message.attachment.fType ===
                                                "image" ? (
                                                    <div className="relative w-64 h-48 rounded-md overflow-hidden">
                                                        <img
                                                            src={
                                                                message
                                                                    .attachment
                                                                    .url
                                                            }
                                                            alt="Attachment"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2 p-2 rounded bg-background/50">
                                                        <Paperclip className="h-4 w-4" />
                                                        <span className="text-sm">
                                                            {
                                                                message
                                                                    .attachment
                                                                    .name
                                                            }
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <p className="whitespace-pre-wrap break-words">
                                            {message.text}
                                        </p>

                                        <div className="flex items-center justify-end space-x-2">
                                            <span className="text-xs opacity-70">
                                                {timeString}
                                            </span>

                                            {isCurrentUser && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                        >
                                                            <MoreHorizontal className="h-3 w-3" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditingMessage(
                                                                    message.id
                                                                );
                                                                setNewMessage(
                                                                    message.text
                                                                );
                                                                textareaRef.current?.focus();
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            <span>Edit</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                deleteMessage(
                                                                    message.id
                                                                )
                                                            }
                                                            className="text-destructive"
                                                        >
                                                            <Trash className="h-4 w-4 mr-2" />
                                                            <span>Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() =>
                                                    setReplyToMessage(message)
                                                }
                                            >
                                                <Reply className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {typingMembersNames && (
                        <div className="text-xs text-muted-foreground animate-pulse">
                            {typingMembersNames}{" "}
                            {typingMembersNames.includes(",") ? "are" : "is"}{" "}
                            typing...
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {replyToMessage && (
                <div className="flex items-center justify-between mx-4 p-2 border rounded-t-md bg-muted/50">
                    <div className="flex items-center">
                        <Reply className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div>
                            <p className="text-xs font-medium">
                                Replying to {replyToMessage.sender.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {replyToMessage.text}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setReplyToMessage(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {attachment && (
                <div className="flex items-center justify-between mx-4 p-2 border-t border-x rounded-t-md bg-muted/50">
                    <div className="flex items-center">
                        <div className="w-10 h-10 flex items-center justify-center">
                            {attachmentPreview ? (
                                <div className="relative w-8 h-8 rounded overflow-hidden">
                                    <img
                                        src={attachmentPreview}
                                        alt="Attachment preview"
                                        className="object-cover"
                                    />
                                </div>
                            ) : (
                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                            )}
                        </div>
                        <span className="text-sm truncate max-w-64">
                            {attachment.name}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={removeAttachment}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <div className="p-4 space-y-2">
                {editingMessage && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Editing message</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={cancelEdit}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={triggerFileInput}
                    >
                        <Paperclip className="h-5 w-5" />
                    </Button>

                    <Textarea
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="flex-1 max-h-32"
                        rows={1}
                        ref={textareaRef}
                    />

                    <Button
                        type="button"
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={
                            (!newMessage.trim() && !attachment) || isFetching
                        }
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Group Info Dialog */}
            <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {conversation.type === "direct"
                                ? "Conversation Info"
                                : "Group Info"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-2">
                            <Avatar className="h-24 w-24">
                                <AvatarImage
                                    src={conversationInfo.image || ""}
                                />
                                <AvatarFallback className="text-2xl">
                                    {getInitials(conversationInfo.name)}
                                </AvatarFallback>
                            </Avatar>
                            <h3 className="text-xl font-semibold">
                                {conversationInfo.name}
                            </h3>
                            {conversationInfo.description && (
                                <p className="text-sm text-muted-foreground text-center">
                                    {conversationInfo.description}
                                </p>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-medium mb-2">
                                {conversation.type === "direct"
                                    ? "Participants"
                                    : "Members"}{" "}
                                ({conversationInfo.membersCount})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {conversation.members.map((member) => (
                                    <div
                                        key={member.userId}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={
                                                        member.user.image || ""
                                                    }
                                                />
                                                <AvatarFallback>
                                                    {getInitials(
                                                        member.user.name
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {member.user.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {member.role === "owner"
                                                        ? "Owner"
                                                        : member.role ===
                                                          "admin"
                                                        ? "Admin"
                                                        : isUserOnline(
                                                              member.userId
                                                          )
                                                        ? "Online"
                                                        : "Offline"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
