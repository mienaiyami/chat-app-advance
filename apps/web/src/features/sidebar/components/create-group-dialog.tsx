"use client";

import { Image, Loader2, Plus, UsersRound } from "lucide-react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Textarea } from "~/components/ui/textarea";
import { TooltipContent } from "~/components/ui/tooltip";
import { TooltipTrigger } from "~/components/ui/tooltip";
import { api } from "~/trpc/react";

export default function CreateGroupDialog() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [groupName, setGroupName] = useState("");
	const [description, setDescription] = useState("");
	const [image, setImage] = useState("");
	const [isPrivate, setIsPrivate] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedUsers, setSelectedUsers] = useState<
		{
			id: string;
			name: string | null;
			image: string | null;
			email: string | null;
		}[]
	>([]);

	const { data: contacts, isLoading: isLoadingContacts } =
		api.user.search.useQuery(
			{ query: searchQuery },
			{ enabled: open && searchQuery.length > 0 },
		);

	const createGroup = api.conversation.createGroup.useMutation({
		onSuccess: (data) => {
			if (!data) {
				toast.error("Failed to create group");
				return;
			}
			toast.success("Group created successfully");
			setOpen(false);
			resetForm();
			router.push(`/chat/${data.id}`);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create group");
		},
	});

	const handleCreateGroup = () => {
		if (!groupName.trim()) {
			toast.error("Group name is required");
			return;
		}

		createGroup.mutate({
			name: groupName.trim(),
			description: description.trim(),
			image: image.trim().length > 0 ? image.trim() : undefined,
			members: selectedUsers.map((user) => user.id),
			isPrivate,
		});
	};

	const handleSelectUser = (user: {
		id: string;
		name: string | null;
		image: string | null;
		email: string | null;
	}) => {
		if (!selectedUsers.some((u) => u.id === user.id)) {
			setSelectedUsers([...selectedUsers, user]);
		}
		setSearchQuery("");
	};

	const handleRemoveUser = (userId: string) => {
		setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
	};

	const resetForm = () => {
		setGroupName("");
		setDescription("");
		setImage("");
		setIsPrivate(false);
		setSearchQuery("");
		setSelectedUsers([]);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				setOpen(isOpen);
				if (!isOpen) resetForm();
			}}
		>
			<TooltipTrigger asChild>
				<DialogTrigger asChild>
					<Button variant="outline" className="">
						<UsersRound className="h-5 w-5" />
						<span className="sr-only">New Group</span>
					</Button>
				</DialogTrigger>
			</TooltipTrigger>
			<TooltipContent>
				<p>New Group</p>
			</TooltipContent>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>Create a Group Chat</DialogTitle>
					<DialogDescription>
						Create a new group to chat with multiple contacts at once.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="groupName">Group Name</Label>
						<Input
							id="groupName"
							placeholder="Enter group name"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Textarea
							id="description"
							placeholder="Add a description for your group"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="resize-none"
							rows={3}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="image">Group Image URL (Optional)</Label>
						<Input
							id="image"
							placeholder="https://example.com/image.jpg"
							value={image}
							onChange={(e) => setImage(e.target.value)}
						/>
					</div>
					<div className="flex items-center space-x-2">
						<Checkbox
							id="isPrivate"
							checked={isPrivate}
							onCheckedChange={(checked) => setIsPrivate(!!checked)}
						/>
						<Label htmlFor="isPrivate" className="cursor-pointer">
							Private Group (manual add only)
						</Label>
					</div>
					<div className="grid gap-2">
						<Label>Add Members</Label>
						<div className="mb-2 flex flex-wrap gap-2">
							{selectedUsers.map((user) => (
								<div
									key={user.id}
									className="flex items-center rounded-full bg-secondary py-1 pr-2 pl-1"
								>
									<Avatar className="mr-1 h-5 w-5">
										<AvatarImage src={user.image || ""} />
										<AvatarFallback>
											{user.name?.slice(0, 2).toUpperCase() || "?"}
										</AvatarFallback>
									</Avatar>
									<span className="font-medium text-xs">{user.name}</span>
									<Button
										variant="ghost"
										size="icon"
										className="ml-1 h-4 w-4 rounded-full"
										onClick={() => handleRemoveUser(user.id)}
									>
										<X className="h-3 w-3" />
										<span className="sr-only">Remove</span>
									</Button>
								</div>
							))}
						</div>
						<Input
							placeholder="Search for contacts"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						{searchQuery.length > 0 && (
							<ScrollArea className="h-[200px] rounded-md border">
								<div className="p-2">
									{isLoadingContacts ? (
										<div className="py-4 text-center text-muted-foreground">
											Searching...
										</div>
									) : contacts && contacts.length > 0 ? (
										contacts.map((contact) => (
											<Button
												key={contact.id}
												variant="ghost"
												className="w-full justify-start"
												onClick={() => handleSelectUser(contact)}
												disabled={selectedUsers.some(
													(u) => u.id === contact.id,
												)}
											>
												<Avatar className="mr-2 h-6 w-6">
													<AvatarImage src={contact.image || ""} />
													<AvatarFallback>
														{contact.name?.slice(0, 2).toUpperCase() || "?"}
													</AvatarFallback>
												</Avatar>
												<span>{contact.name}</span>
											</Button>
										))
									) : (
										<div className="py-4 text-center text-muted-foreground">
											No contacts found
										</div>
									)}
								</div>
							</ScrollArea>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleCreateGroup}
						disabled={createGroup.isPending || !groupName.trim()}
					>
						{createGroup.isPending && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Create Group
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
