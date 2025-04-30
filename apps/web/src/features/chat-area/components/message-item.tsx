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
		{ addSuffix: true },
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
			className={`group/message relative flex flex-col items-start rounded-sm hover:bg-accent/10 ${
				isRepliedTo ? "bg-accent/20" : ""
			}`}
			onMouseEnter={() => setShowActions(true)}
			onMouseLeave={() => setShowActions(false)}
			data-message-id={message.id}
		>
			{isFirstMessage && (
				<div className="mt-2 mb-1 flex w-full cursor-default flex-col items-start justify-between gap-0.5">
					{message.repliedTo && (
						<div
							className="mb-1 w-full max-w-md cursor-pointer select-none rounded-sm border-l-2 py-1 pl-2 text-muted-foreground text-xs"
							onClick={() => {
								const element = document.querySelector(
									`[data-message-id="${message.repliedTo?.id}"]`,
								);
								if (element) {
									element.scrollIntoView({
										behavior: "smooth",
									});
									element.classList.add("animate-flash");
									element.addEventListener(
										"animationend",
										() => {
											element.classList.remove("animate-flash");
										},
										{ once: true },
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
							<div className="mb-1 flex items-center gap-1">
								<Reply className="h-3 w-3" />
								<span className="font-medium">
									Replying to{" "}
									{message.repliedTo.senderId === message.senderId
										? "themselves"
										: message.repliedTo.sender?.name || "Unknown"}
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
						<Avatar className="mr-2 h-8 w-8">
							<AvatarImage src={sender.image || ""} alt={sender.name || ""} />
							<AvatarFallback>
								{(sender.name || "").slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-row items-center gap-2">
							<h3 className="font-semibold text-sm">{sender.name}</h3>
							<Tooltip delayDuration={500}>
								<TooltipTrigger asChild>
									<span className="text-muted-foreground text-xs">
										{formattedTimestamp}
									</span>
								</TooltipTrigger>
								<TooltipContent className="px-2 py-1 text-xs">
									{new Date(message.createdAt).toLocaleDateString()}{" "}
									{new Date(message.createdAt).toLocaleTimeString()}
								</TooltipContent>
							</Tooltip>
						</div>
					</div>
				</div>
			)}

			<div className="flex w-full flex-row items-start gap-1.5">
				<Tooltip delayDuration={500}>
					<TooltipTrigger asChild>
						<div className="select-none pt-3 pl-1 font-mono text-accent-foreground/30 text-xs opacity-0 group-hover/message:opacity-100">
							{new Date(message.createdAt).toLocaleTimeString("en-GB", {
								hour: "2-digit",
								minute: "2-digit",
								hour12: false,
							})}
						</div>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs">
						{new Date(message.createdAt).toLocaleDateString()}{" "}
						{new Date(message.createdAt).toLocaleTimeString()}
					</TooltipContent>
				</Tooltip>

				<div className="relative w-full">
					<div
						className={`w-fit max-w-80 break-words rounded-sm bg-accent/50 p-2 text-accent-foreground lg:max-w-2/3 ${
							isFirstMessage ? "mb-1" : "my-1"
						} ${hasAttachment ? "space-y-3" : ""}`}
					>
						<div className="whitespace-pre-wrap break-words">{children}</div>

						{hasAttachment && (
							<div className="mt-2">
								{["image", "video"].includes(
									message.attachment?.fType || "",
								) ? (
									<div className="relative flex w-full max-w-sm">
										<Button
											asChild
											size="icon"
											variant="secondary"
											className="absolute top-2 right-2 size-8"
										>
											<a
												href={message.attachment?.url ?? ""}
												target="_blank"
												rel="noopener noreferrer"
											>
												<Download className="size-4" />
											</a>
										</Button>
										{message.attachment?.fType === "image" ? (
											<img
												src={message.attachment.url ?? ""}
												alt={message.text}
												className="max-h-60 rounded-md object-cover"
											/>
										) : (
											<video
												src={message.attachment?.url ?? ""}
												controls
												className="max-h-60 rounded-md object-cover"
											/>
										)}
									</div>
								) : (
									<Button
										onClick={handleOpenAttachment}
										variant="ghost"
										className="flex w-full items-center gap-2 rounded-md bg-accent p-2 text-sm hover:bg-accent/80"
									>
										<Paperclip className="h-4 w-4" />
										<span className="max-w-[200px] truncate">
											{message.attachment?.name || message.text}
										</span>
										<span className="text-muted-foreground text-xs">
											{message.attachment?.size
												? `(${formatFileSize(message.attachment.size)})`
												: ""}
										</span>
									</Button>
								)}
							</div>
						)}
					</div>

					{isEdited && (
						<div className="mt-0.5 ml-1 select-none text-muted-foreground text-xs">
							(edited)
						</div>
					)}

					<div
						className={`absolute top-0 right-0 hidden flex-row items-center gap-0 rounded-sm bg-accent/50 group-hover/message:flex ${
							showActions ? "flex" : ""
						}`}
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									className="h-8 w-8 rounded-none rounded-l-sm p-2"
									onClick={onReply}
								>
									<Reply className="aspect-square h-4" />
									<span className="sr-only">Reply</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent className="px-2 py-1 text-xs">
								Reply
							</TooltipContent>
						</Tooltip>

						{canEdit && onEdit && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										className="h-8 w-8 rounded-none p-2"
										onClick={onEdit}
									>
										<Edit2 className="aspect-square h-4" />
										<span className="sr-only">Edit</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent className="px-2 py-1 text-xs">
									Edit
								</TooltipContent>
							</Tooltip>
						)}

						{canDelete && onDelete && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										className="h-8 w-8 rounded-none rounded-r-sm p-2"
										onClick={onDelete}
									>
										<Trash2 className="aspect-square h-4" />
										<span className="sr-only">Delete</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent className="px-2 py-1 text-xs">
									Delete{" "}
									{isCurrentUserAdmin && !isCurrentUser ? "as Admin" : ""}
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
