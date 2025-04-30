"use client";

import { formatDistance } from "date-fns";
import {
    Download,
    Edit2,
    MoreHorizontal,
    Paperclip,
    Reply,
    Trash2,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";
import type { RouterOutputs } from "~/trpc/react";

type Message = RouterOutputs["message"]["getMessages"]["messages"][number];

interface MessageItemProps {
    message: Message;
    isFirstMessage: boolean;
    isCurrentUser: boolean;
    isCurrentUserAdmin: boolean;
    sender: {
        id: string;
        name: string | null;
        image: string | null;
    };
    onReply: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    isRepliedTo?: boolean;
    children?: React.ReactNode;
}

export default function MessageItem({
    message,
    isFirstMessage,
    isCurrentUser,
    isCurrentUserAdmin,
    sender,
    onReply,
    onEdit,
    onDelete,
    isRepliedTo,
    children,
}: MessageItemProps) {
    const [showActions, setShowActions] = useState(false);

    const canEdit = isCurrentUser;
    const isEdited =
        message.updatedAt &&
        // 2 sec extra coz updatedAt is made by js while createdAt is made by db
        new Date(message.updatedAt).getTime() >
            new Date(message.createdAt).getTime() + 2_000;
    const canDelete = isCurrentUser || isCurrentUserAdmin;
    const hasAttachment = !!message.attachment;

    const formattedTimestamp = formatDistance(
        new Date(message.createdAt),
        new Date(),
        { addSuffix: true }
    );

    const handleOpenAttachment = () => {
        if (message.attachment?.url) {
            window.open(message.attachment.url, "_blank");
        }
    };
    // if (message.attachment) {
    //     console.log(message.attachment);
    // }

    return (
        <div
            className={`group/message hover:bg-accent/10 rounded-md relative flex flex-col items-start ${
                isRepliedTo ? "bg-accent/20" : ""
            }`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            data-message-id={message.id}
        >
            {isFirstMessage && (
                <div className="w-full flex flex-col gap-0.5 items-start justify-between mb-1 mt-2 cursor-default">
                    {message.repliedTo && (
                        <div
                            className="select-none cursor-pointer mb-1 w-full max-w-md border-l-2 pl-2 py-1 text-xs text-muted-foreground rounded-sm"
                            onClick={() => {
                                const element = document.querySelector(
                                    `[data-message-id="${message.repliedTo?.id}"]`
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
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    e.currentTarget.click();
                                }
                            }}
                        >
                            <div className="flex items-center gap-1 mb-1">
                                <Reply className="h-3 w-3" />
                                <span className="font-medium">
                                    Replying to{" "}
                                    {message.repliedTo.senderId ===
                                    message.senderId
                                        ? "themselves"
                                        : message.repliedTo.sender?.name ||
                                          "Unknown"}
                                </span>
                            </div>
                            <div className="line-clamp-2 italic">
                                {message.repliedTo.attachment ? (
                                    <span className="flex items-center gap-1">
                                        <Paperclip className="h-3 w-3" />
                                        <span>{message.repliedTo.text}</span>
                                    </span>
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {message.repliedTo.text}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage
                                src={sender.image || ""}
                                alt={sender.name || ""}
                            />
                            <AvatarFallback>
                                {(sender.name || "").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-row gap-2 items-center">
                            <h3 className="text-sm font-semibold">
                                {sender.name}
                            </h3>
                            <Tooltip delayDuration={500}>
                                <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground">
                                        {formattedTimestamp}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs px-2 py-1">
                                    {new Date(
                                        message.createdAt
                                    ).toLocaleDateString()}{" "}
                                    {new Date(
                                        message.createdAt
                                    ).toLocaleTimeString()}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-row items-start gap-1.5 w-full">
                <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                        <div className="font-mono pt-3 pl-1 group-hover/message:opacity-100 opacity-0 select-none text-xs text-accent-foreground/30">
                            {new Date(message.createdAt).toLocaleTimeString(
                                "en-GB",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                }
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs px-2 py-1">
                        {new Date(message.createdAt).toLocaleDateString()}{" "}
                        {new Date(message.createdAt).toLocaleTimeString()}
                    </TooltipContent>
                </Tooltip>

                <div className="relative w-full">
                    <div
                        className={`max-w-80 lg:max-w-2/3 p-2 bg-accent/50 text-accent-foreground w-fit rounded-lg break-words ${
                            isFirstMessage ? "mb-1" : "my-1"
                        } ${hasAttachment ? "space-y-3" : ""}`}
                    >
                        <div className="break-words whitespace-pre-wrap">
                            {children}
                        </div>

                        {hasAttachment && (
                            <div className="mt-2">
                                {["image", "video"].includes(
                                    message.attachment?.fType || ""
                                ) ? (
                                    <div className="flex w-full max-w-sm relative">
                                        <Button
                                            asChild
                                            size="icon"
                                            variant="secondary"
                                            className="size-8 absolute top-2 right-2"
                                        >
                                            <a
                                                href={
                                                    message.attachment?.url ??
                                                    ""
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Download className="size-4" />
                                            </a>
                                        </Button>
                                        {message.attachment?.fType ===
                                        "image" ? (
                                            <img
                                                src={
                                                    message.attachment.url ?? ""
                                                }
                                                alt={message.text}
                                                className="max-h-60 rounded-md object-cover"
                                            />
                                        ) : (
                                            <video
                                                src={
                                                    message.attachment?.url ??
                                                    ""
                                                }
                                                controls
                                                className="max-h-60 rounded-md object-cover"
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleOpenAttachment}
                                        variant="ghost"
                                        className="flex w-full items-center gap-2 p-2 bg-accent hover:bg-accent/80 rounded-md text-sm"
                                    >
                                        <Paperclip className="h-4 w-4" />
                                        <span className="truncate max-w-[200px]">
                                            {message.attachment?.name ||
                                                message.text}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {message.attachment?.size
                                                ? `(${formatFileSize(
                                                      message.attachment.size
                                                  )})`
                                                : ""}
                                        </span>
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {isEdited && (
                        <div className="select-none text-xs text-muted-foreground mt-0.5 ml-1">
                            (edited)
                        </div>
                    )}

                    <div
                        className={`group-hover/message:flex bg-accent/50 rounded-sm absolute right-0 top-0 hidden flex-row gap-0 items-center ${
                            showActions ? "flex" : ""
                        }`}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-8 h-8 p-2 rounded-none rounded-l-sm"
                                    onClick={onReply}
                                >
                                    <Reply className="aspect-square h-4" />
                                    <span className="sr-only">Reply</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs px-2 py-1">
                                Reply
                            </TooltipContent>
                        </Tooltip>

                        {canEdit && onEdit && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="w-8 h-8 p-2 rounded-none"
                                        onClick={onEdit}
                                    >
                                        <Edit2 className="aspect-square h-4" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs px-2 py-1">
                                    Edit
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {canDelete && onDelete && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="w-8 h-8 p-2 rounded-none rounded-r-sm"
                                        onClick={onDelete}
                                    >
                                        <Trash2 className="aspect-square h-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs px-2 py-1">
                                    Delete{" "}
                                    {isCurrentUserAdmin && !isCurrentUser
                                        ? "as Admin"
                                        : ""}
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
