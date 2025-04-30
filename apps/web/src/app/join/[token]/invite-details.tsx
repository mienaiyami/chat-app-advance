"use client";

import { formatDistance } from "date-fns";
import { AlertCircle, CheckCircle, Loader2, Lock, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

type InviteDetailsProps = {
	token: string;
	onJoin: (conversationId: string) => void;
};

export function InviteDetails({ token, onJoin }: InviteDetailsProps) {
	const router = useRouter();

	const {
		data: groupPreview,
		isLoading,
		error: queryError,
	} = api.conversation.getGroupPreviewByToken.useQuery(
		{ token },
		{
			retry: false,
		},
	);

	const joinMutation = api.conversation.joinByLink.useMutation({
		onSuccess: (data) => {
			onJoin(data.conversationId);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to join group");
		},
	});

	const handleJoin = () => {
		joinMutation.mutate({ token });
	};

	const handleGoToChat = () => {
		if (groupPreview?.isAlreadyMember && groupPreview.id) {
			router.push(`/chat/${groupPreview.id}`);
		} else {
			router.push("/chat");
		}
	};

	const errorMessage =
		joinMutation.error?.message || (queryError ? queryError.message : null);

	if (isLoading) {
		return (
			<Card className="w-[400px]">
				<CardHeader>
					<CardTitle>Loading Invitation</CardTitle>
					<CardDescription>Retrieving group information...</CardDescription>
				</CardHeader>
				<CardContent className="flex justify-center py-8">
					<Loader2 className="h-12 w-12 animate-spin text-primary" />
				</CardContent>
			</Card>
		);
	}

	if (errorMessage) {
		return (
			<Card className="w-[400px]">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertCircle className="h-5 w-5 text-destructive" />
						Error Loading Invitation
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertDescription>
							{errorMessage || "Unknown error occurred"}
						</AlertDescription>
					</Alert>
				</CardContent>
				<CardFooter>
					<Button
						variant="secondary"
						className="w-full"
						onClick={() => router.push("/chat")}
					>
						Go to Chats
					</Button>
				</CardFooter>
			</Card>
		);
	}

	if (groupPreview?.isAlreadyMember) {
		return (
			<Card className="w-[400px]">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle className="h-5 w-5 text-green-500" />
						Already a Member
					</CardTitle>
					<CardDescription>
						You're already a member of this group
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-4">
						<Avatar className="h-16 w-16">
							<AvatarImage
								src={groupPreview?.image || undefined}
								alt={groupPreview?.name || "Group"}
							/>
							<AvatarFallback>
								{(groupPreview?.name || "Group").slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div>
							<h3 className="font-bold text-xl">{groupPreview?.name}</h3>
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Users className="h-4 w-4" />
								<span>{groupPreview?.memberCount} members</span>
							</div>
						</div>
					</div>
				</CardContent>
				<CardFooter>
					<Button
						variant="default"
						className="w-full"
						onClick={() => router.push(`/chat/${groupPreview.id}`)}
					>
						Go to Group Chat
					</Button>
				</CardFooter>
			</Card>
		);
	}

	return (
		<Card className="w-[400px]">
			<CardHeader>
				<CardTitle>Group Invitation</CardTitle>
				<CardDescription>You've been invited to join a group</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-4">
					<Avatar className="h-16 w-16">
						<AvatarImage
							src={groupPreview?.image || undefined}
							alt={groupPreview?.name || "Group"}
						/>
						<AvatarFallback>
							{(groupPreview?.name || "Group").slice(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div>
						<h3 className="font-bold text-xl">{groupPreview?.name}</h3>
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Users className="h-4 w-4" />
							<span>{groupPreview?.memberCount} members</span>
							{groupPreview?.isPrivate && (
								<>
									<Lock className="ml-2 h-4 w-4" />
									<span>Private</span>
								</>
							)}
						</div>
					</div>
				</div>

				{groupPreview?.description && (
					<p className="text-muted-foreground text-sm">
						{groupPreview.description}
					</p>
				)}

				<p className="text-muted-foreground text-xs">
					Created{" "}
					{formatDistance(
						new Date(groupPreview?.createdAt || new Date()),
						new Date(),
						{ addSuffix: true },
					)}
				</p>

				{groupPreview?.expiresAt && (
					<p className="text-muted-foreground text-xs">
						Invite expires{" "}
						{formatDistance(new Date(groupPreview.expiresAt), new Date(), {
							addSuffix: true,
						})}
					</p>
				)}
			</CardContent>
			<CardFooter className="flex gap-2">
				<Button
					variant="default"
					className="w-full"
					onClick={handleJoin}
					disabled={joinMutation.isPending}
				>
					{joinMutation.isPending ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Joining...
						</>
					) : (
						"Join Group"
					)}
				</Button>
				<Button variant="secondary" onClick={handleGoToChat}>
					Cancel
				</Button>
			</CardFooter>
		</Card>
	);
}
