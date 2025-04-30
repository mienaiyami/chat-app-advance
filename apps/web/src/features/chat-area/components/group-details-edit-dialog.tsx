"use client";

import { DialogDescription } from "@radix-ui/react-dialog";
import { Loader2, Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { useDebounce } from "~/hooks/use-debounce";
import { useUploadThing } from "~/lib/uploadthing";
import { api } from "~/trpc/react";

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
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;

	const utils = api.useUtils();

	const { startUpload } = useUploadThing("avatarUploader", {
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
	});

	const searchUsersQuery = api.user.search.useQuery(
		{ query: debouncedSearchQuery },
		{
			enabled: !!debouncedSearchQuery,
			staleTime: 10000,
		},
	);

	const { data: members = [] } = api.user.getMembers.useQuery(
		{ conversationId },
		{ enabled: !!conversationId && open },
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
			setSelectedFile(null);
			setPreviewUrl(null);
			setSearchQuery("");
		}
	}, [open]);

	useEffect(() => {
		if (selectedFile) {
			const url = URL.createObjectURL(selectedFile);
			setPreviewUrl(url);

			return () => URL.revokeObjectURL(url);
		}
	}, [selectedFile]);

	const filteredUsers =
		searchUsersQuery.data?.filter(
			(user) => !members.some((member) => member.id === user.id),
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

		setSelectedFile(file);
		setDisplayPicture(null);
	};

	const clearSelectedFile = () => {
		setSelectedFile(null);
		setPreviewUrl(null);
	};

	const handleEditGroup = async () => {
		if (isUploading) return;

		const updates: {
			conversationId: string;
			name?: string;
			image?: string;
		} = {
			conversationId,
		};

		if (groupName) updates.name = groupName;

		try {
			if (selectedFile) {
				setIsUploading(true);
				const uploadResult = await startUpload([selectedFile]);

				if (uploadResult?.[0]) {
					updates.image = uploadResult[0].ufsUrl;
				}
			} else if (displayPicture) {
				updates.image = displayPicture;
			}

			if (selectedUsers.length > 0) {
				addMemberMutation.mutate({
					conversationId,
					userIds: selectedUsers.map((user) => user.id),
				});
			}

			editGroupMutation.mutate(updates);
		} catch (error) {
			setIsUploading(false);
			toast.error("Failed to upload image");
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="select-none sm:max-w-96">
				<DialogHeader>
					<DialogTitle>Edit Group Details</DialogTitle>
				</DialogHeader>
				<DialogDescription className="text-muted-foreground text-sm">
					Leave empty to keep the current value
				</DialogDescription>
				<div className="grid gap-2 py-4">
					<Label className="mb-2 flex w-full flex-col items-start gap-2">
						Group Name
						<Input
							placeholder="Group Name"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
						/>
					</Label>
					<Label className="flex w-full flex-col items-start gap-2">
						Avatar
						<Input
							type="file"
							className="w-full py-1.5"
							accept="image/*"
							onChange={handleFileUpload}
							disabled={isUploading}
						/>
						{isUploading && (
							<div className="flex items-center">
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								<span className="text-sm">Uploading...</span>
							</div>
						)}
					</Label>
					{previewUrl && (
						<div className="flex flex-row items-center gap-4 px-4">
							<div className="mb-2 flex justify-center">
								<Avatar className="size-16">
									<AvatarImage src={previewUrl} alt="Group avatar preview" />
									<AvatarFallback>GP</AvatarFallback>
								</Avatar>
							</div>
							<Button variant="ghost" onClick={clearSelectedFile} size="icon">
								<X className="size-4" />
							</Button>
						</div>
					)}
					{!previewUrl && displayPicture && (
						<div className="flex flex-row items-center gap-4 px-4">
							<div className="mb-2 flex justify-center">
								<Avatar className="size-16">
									<AvatarImage src={displayPicture} alt="Group avatar" />
									<AvatarFallback>GP</AvatarFallback>
								</Avatar>
							</div>
							<Button
								variant="ghost"
								onClick={() => {
									setDisplayPicture(null);
								}}
								size="icon"
							>
								<X className="size-4" />
							</Button>
						</div>
					)}

					<Label className="flex w-full flex-col items-start gap-2">
						Add Members
						<div className="relative w-full">
							<Input
								className="w-full pl-8"
								placeholder="Search users..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 h-4 w-4 text-muted-foreground" />
						</div>
					</Label>
					{selectedUsers.length > 0 && (
						<div className="flex flex-col gap-0.5 border-b pb-2 text-xs">
							<span>Selected Users ({selectedUsers.length})</span>
							<ScrollArea className="w-full">
								<div className="flex w-full flex-row flex-nowrap gap-1">
									{selectedUsers.map((user) => (
										<Button
											variant="ghost"
											onClick={() => toggleUserSelection(user)}
											key={user.id}
											className="flex h-6 items-center space-x-2 rounded-full bg-accent/50 p-1 text-xs"
										>
											<Avatar className="h-4 w-4">
												<AvatarImage
													src={user.image || undefined}
													alt={user.name || ""}
												/>
												<AvatarFallback>
													{(user.name || "").slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<span className="max-w-24 truncate pr-1">
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
						<p className="text-center text-muted-foreground text-sm">
							Loading...
						</p>
					)}
					{!searchUsersQuery.isLoading && filteredUsers.length > 0 && (
						<ScrollArea className="w-full">
							<div className="max-h-60 p-1">
								{filteredUsers.map((user) => (
									<Button
										key={user.id}
										variant="ghost"
										className={`flex h-full w-full items-center space-x-2 rounded-md p-2 ${
											selectedUsers.some((u) => u.id === user.id)
												? "bg-accent/50"
												: ""
										}`}
										disabled={user.id === currentUserId}
										onClick={() => toggleUserSelection(user)}
									>
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={user.image || undefined}
												alt={user.name || ""}
											/>
											<AvatarFallback>
												{(user.name || "").slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div className="flex min-w-0 flex-grow flex-col items-start">
											<p className="truncate font-medium text-sm">
												{user.name || ""} {user.id === currentUserId && "(You)"}
												{contacts.some(
													(contact) => contact.contactId === user.id,
												) && " (In Contacts)"}
											</p>
											<p className="truncate text-muted-foreground text-xs">
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
							<p className="text-center text-muted-foreground text-sm">
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
								setSelectedFile(null);
								setPreviewUrl(null);
							}}
						>
							Cancel
						</Button>
					</DialogClose>
					<Button
						onClick={handleEditGroup}
						disabled={editGroupMutation.isPending || isUploading}
					>
						{editGroupMutation.isPending || isUploading ? "Saving..." : "Save"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
