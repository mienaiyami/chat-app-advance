import { memo, useRef, useEffect, useState, useCallback } from "react";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Paperclip, Send, Loader2, X } from "lucide-react";
import { EmojiPicker } from "~/components/emoji-picker";
import { toast } from "sonner";
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
    const [selectedFilePreview, setSelectedFilePreview] = useState<
        string | null
    >(null);

    useEffect(() => {
        if (msgInputRef.current && msgInputRef.current.scrollHeight < 100) {
            msgInputRef.current.style.height = "auto";
            msgInputRef.current.style.height = `${msgInputRef.current.scrollHeight}px`;
        }
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
            } else {
                setSelectedFilePreview(null);
            }
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
        []
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
        [setNewMessage]
    );

    return (
        <div className="p-4 border-t relative">
            {selectedFile && (
                <div className="p-2 mb-3 border flex items-center justify-between select-none rounded-md">
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
                    placeholder={
                        editingMessage ? "Edit message..." : "Type a message..."
                    }
                    ref={msgInputRef}
                    value={newMessage}
                    rows={1}
                    className="resize-none min-h-fit max-h-32 row-auto"
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
                        className="py-0 px-2"
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
