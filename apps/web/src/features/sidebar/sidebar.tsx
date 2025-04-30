"use client";

import { Search, VolumeOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { formatDate } from "~/lib/utils";
import { cn } from "~/lib/utils";
import { useConversation } from "~/providers/conversation-provider";
import { api } from "~/trpc/react";
import AddContactDialog from "./components/add-contact-dialog";
import CreateGroupDialog from "./components/create-group-dialog";
import ProfileDialog from "./components/profile-dialog";

export default function Sidebar() {
	const [searchQuery, setSearchQuery] = useState("");
	const { data: session } = useSession();

	const {
		conversations,
		activeConversationId,
		isLoading,
		setActiveConversation,
	} = useConversation();
	const router = useRouter();

	const userSettings = api.user.getSettings.useQuery(undefined, {
		enabled: !!session?.user.id,
	});

	const filteredConversations = conversations.filter(
		(conversation) =>
			conversation.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			conversation.members.some((member) =>
				member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()),
			),
	);

	const handleSelectConversation = (conversationId: string) => {
		setActiveConversation("");
		router.push(`/chat/${conversationId}`);
	};

	return (
		<div className="flex w-full flex-shrink-0 flex-col rounded-l-lg border">
			<TooltipProvider
				delayDuration={500}
				disableHoverableContent
				skipDelayDuration={500}
			>
				<div className="flex h-16 flex-row gap-1 border-b p-4">
					<Tooltip>
						<ProfileDialog />
					</Tooltip>
					<Tooltip>
						<AddContactDialog />
					</Tooltip>
					<Tooltip>
						<CreateGroupDialog />
					</Tooltip>
				</div>
				<div className="relative p-2">
					<Search
						size={"1.3em"}
						className="top -translate-y-1/2 pointer-events-none absolute top-1/2 left-4 text-muted-foreground"
					/>
					<Input
						placeholder="Search"
						className="pl-8"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<ScrollArea className="flex-grow">
					{isLoading || userSettings.isLoading ? (
						<>
							{Array(5)
								.fill(0)
								.map((_, index) => (
									<div
										key={String(index)}
										className="flex h-full w-full items-center space-x-2 rounded-none border-b p-2 first:border-t"
									>
										<Skeleton className="mr-4 h-10 w-10 rounded-full" />
										<div className="flex min-w-0 flex-grow flex-col items-start space-y-2">
											<div className="flex w-full flex-row justify-between">
												<Skeleton className="h-4 w-1/3" />
												<Skeleton className="h-3 w-12" />
											</div>
											<Skeleton className="h-3 w-4/5" />
										</div>
									</div>
								))}
						</>
					) : filteredConversations.length === 0 ? (
						<div className="flex flex-grow select-none items-center justify-center">
							<span className="text-muted-foreground">
								No contacts/chat found
							</span>
						</div>
					) : (
						filteredConversations.map((conversation) => {
							const otherUser =
								conversation.type === "direct"
									? conversation.members.find(
											(member) => member.userId !== session?.user?.id,
										)?.user
									: null;

							const displayName =
								conversation.type === "direct"
									? otherUser?.name || "Unknown User"
									: conversation.name || "Unnamed Group";

							const displayPicture =
								conversation.type === "direct"
									? otherUser?.image || ""
									: conversation.image || "";

							const conversationId = conversation.id;

							const unreadCount = conversation.unreadCount || 0;
							const isMuted = conversation.muted || false;

							return (
								<Button
									variant="ghost"
									key={conversationId}
									className={cn(
										"flex h-full w-full items-center space-x-2 rounded-none border-b p-2 first:border-t hover:bg-accent",
										activeConversationId === conversationId ? "bg-accent" : "",
									)}
									onClick={() => handleSelectConversation(conversationId)}
								>
									<Avatar className="mr-4 h-10 w-10">
										<AvatarImage src={displayPicture} alt={displayName} />
										<AvatarFallback>
											{displayName.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex min-w-0 flex-grow flex-col items-start">
										<div className="flex w-full flex-row">
											<span className="truncate font-medium">
												{displayName}
											</span>
											<span
												className="ml-auto font-xs text-muted-foreground"
												title={String(conversation.lastMessageAt)}
											>
												{conversation.lastMessageAt
													? formatDate(conversation.lastMessageAt)
													: "-"}
											</span>
										</div>
										<div className="flex w-full flex-row items-center">
											<span
												className="truncate text-muted-foreground text-sm"
												title={conversation.lastMessage || ""}
											>
												{conversation.lastMessage
													? conversation.lastMessage
															.replace("\n", " ")
															.slice(0, 20) +
														(conversation.lastMessage.length > 20 ? "..." : "")
													: "No messages yet"}
											</span>
											{isMuted && (
												<span className="ml-auto text-muted-foreground">
													<VolumeOff className="h-4 w-4" />
													<span className="sr-only">Muted Chat</span>
												</span>
											)}
											{unreadCount > 0 && (
												<span className="ml-auto aspect-square w-4 rounded-full bg-primary text-secondary text-xs">
													{unreadCount}
												</span>
											)}
										</div>
									</div>
								</Button>
							);
						})
					)}
				</ScrollArea>
			</TooltipProvider>
		</div>
	);
}
