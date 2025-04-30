import { Loader2, Paperclip, Send, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmojiPicker } from "~/components/emoji-picker";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { convertHtmlToMarkdown, formatFileSize } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type Message = RouterOutputs["message"]["getMessages"]["messages"][number];

type MessageInputProps = {
	newMessage: string;
	setNewMessage: (value: string | ((prev: string) => string)) => void;
	editingMessage: Message | null;
	selectedForReply: Message | null;
	isSending: boolean;
	isUploadingFile: boolean;
	onSend: (file?: File | null) => void;
	onCancelEdit: () => void;
	onCancelReply: () => void;
	onTyping: () => void;
};

const MessageInput = ({
	newMessage,
	setNewMessage,
	editingMessage,
	selectedForReply,
	isSending,
	isUploadingFile,
	onSend,
	onCancelEdit,
	onCancelReply,
	onTyping,
}: MessageInputProps) => {
	const msgInputRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(
		null,
	);

	useEffect(() => {
		if (msgInputRef.current && msgInputRef.current.scrollHeight < 100) {
			msgInputRef.current.style.height = "auto";
			msgInputRef.current.style.height = `${msgInputRef.current.scrollHeight}px`;
		}
		// msgInputRef.current?.focus();
	}, [newMessage]);

	useEffect(() => {
		if (editingMessage || selectedForReply) {
			msgInputRef.current?.focus();
		}
	}, [editingMessage, selectedForReply]);

	useEffect(() => {
		if (selectedFile) {
			if (
				selectedFile.type.startsWith("image/") ||
				selectedFile.type.startsWith("video/")
			) {
				const url = URL.createObjectURL(selectedFile);
				setSelectedFilePreview(url);
				return () => URL.revokeObjectURL(url);
			}
			setSelectedFilePreview(null);
		}
	}, [selectedFile]);

	const triggerFileInput = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			if (file.size > 16 * 1024 * 1024) {
				toast.error("File too large to upload. Limit is 16MB");
				return;
			}

			setSelectedFile(file);
		},
		[],
	);

	const handleRemoveFile = useCallback(() => {
		setSelectedFile(null);
		setSelectedFilePreview(null);
	}, []);

	const handleSend = useCallback(() => {
		if (selectedFile) {
			onSend(selectedFile);
			setSelectedFile(null);
			setSelectedFilePreview(null);
		} else {
			onSend();
		}
	}, [onSend, selectedFile]);

	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			e.preventDefault();
			if (e.clipboardData.types.includes("Files")) {
				try {
					const file = e.clipboardData.files[0];
					if (!file) return;
					if (file.size > 16 * 1024 * 1024) {
						toast.error("File too large to upload. Limit is 16MB");
						return;
					}
					setSelectedFile(file);
				} catch (error) {
					console.error(error);
					toast.error("Failed to upload file from clipboard");
				}
				return;
			}
			if (e.clipboardData.types.includes("text/html")) {
				const text = e.clipboardData.getData("text/html");
				const md = convertHtmlToMarkdown(text);
				setNewMessage((prev: string) => prev + md);
				return;
			}
			if (e.clipboardData.types.includes("text/plain")) {
				const text = e.clipboardData.getData("text/plain");
				setNewMessage((prev: string) => prev + text);
				return;
			}
		},
		[setNewMessage],
	);

	return (
		<div className="relative border-t p-4">
			{selectedFile && (
				<div className="mb-3 flex select-none items-center justify-between rounded-md border p-2">
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
									selectedFilePreview || URL.createObjectURL(selectedFile);
								window.open(url, "_blank");
								// Don't revoke URL if it's the preview
								if (!selectedFilePreview) {
									URL.revokeObjectURL(url);
								}
							}}
							className="cursor-pointer hover:underline"
						>
							<span className="font-medium text-sm">
								{selectedFile.name} ({formatFileSize(selectedFile.size)})
							</span>
						</button>
						<Button variant="ghost" size="icon" onClick={handleRemoveFile}>
							<X className="h-4 w-4" />
							<span className="sr-only">Remove File</span>
						</Button>
					</div>
				</div>
			)}
			<div className="flex items-end gap-2">
				<Button
					variant="ghost"
					size="icon"
					onClick={triggerFileInput}
					disabled={!!editingMessage || !!selectedFile}
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
					placeholder={editingMessage ? "Edit message..." : "Type a message..."}
					ref={msgInputRef}
					value={newMessage}
					rows={1}
					className="row-auto max-h-32 min-h-fit resize-none"
					onChange={(e) => {
						setNewMessage(e.target.value);
						if (!editingMessage) {
							onTyping();
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							if (!e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						} else if (e.key === "Escape") {
							if (editingMessage) {
								onCancelEdit();
							} else if (selectedForReply) {
								onCancelReply();
							} else if (selectedFile) {
								handleRemoveFile();
							}
						}
					}}
					onPaste={handlePaste}
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
					onClick={handleSend}
					disabled={
						isSending ||
						isUploadingFile ||
						(!editingMessage && newMessage.trim() === "" && !selectedFile)
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
				<div className="mt-1 flex select-none items-center justify-between text-muted-foreground text-xs">
					<div className="ml-12">Editing message</div>
					<Button
						variant="ghost"
						size="sm"
						className="px-2 py-0"
						onClick={onCancelEdit}
					>
						Cancel
					</Button>
				</div>
			)}
		</div>
	);
};

export default memo(MessageInput);
