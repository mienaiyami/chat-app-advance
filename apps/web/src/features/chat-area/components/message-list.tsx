import { ChevronDown, Loader2 } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { TooltipProvider } from "~/components/ui/tooltip";
import { useMessage } from "~/providers/message-provider";
import type { RouterOutputs } from "~/trpc/react";
import MessageItem from "./message-item";
import { renderers } from "./renderers";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
type Message = RouterOutputs["message"]["getMessages"]["messages"][number];

type MessageListProps = {
    currentUser: { id: string; name?: string | null } | undefined;
    isCurrentUserAdmin: boolean;
    onEditStart: (message: Message) => void;
    onReply: (message: Message) => void;
    selectedForReply: Message | null;
};

const MessageList = ({
    currentUser,
    isCurrentUserAdmin,
    onEditStart,
    onReply,
    selectedForReply,
}: MessageListProps) => {
    const {
        messages,
        messageCount,
        hasMore,
        isLoadingMore,
        loadMoreMessages,
        deleteMessage,
        markAsRead,
    } = useMessage();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevMessagesLengthRef = useRef(messages.length);
    const lastVisibleMessageIdRef = useRef<string | null>(null);

    const scrollToBottom = () => {
        const scrollElement =
            scrollAreaRef.current?.querySelector(":scope > div");
        if (scrollElement) {
            scrollElement.scrollTo({
                top: scrollElement.scrollHeight,
                behavior: "smooth",
            });
            setUnreadCount(0);
            lastVisibleMessageIdRef.current =
                messages[messages.length - 1]?.id || null;

            void markAsRead();
        }
    };

    useEffect(() => {
        const scrollElement =
            scrollAreaRef.current?.querySelector(":scope > div");

        if (!scrollElement) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollElement;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            // show button when scrolled up more than 1 client height
            setShowScrollToBottom(distanceFromBottom > clientHeight);

            // If scrolled to bottom, reset unread count and update last seen message
            if (distanceFromBottom < 20) {
                setUnreadCount(0);
                lastVisibleMessageIdRef.current =
                    messages[messages.length - 1]?.id || null;

                void markAsRead();
            }
        };

        scrollElement.addEventListener("scroll", handleScroll);
        return () => scrollElement.removeEventListener("scroll", handleScroll);
    }, [messages, markAsRead]);

    // Track new messages and update unread count
    useEffect(() => {
        // Check if we received new messages
        if (
            messages.length > prevMessagesLengthRef.current &&
            showScrollToBottom
        ) {
            // If we're not at the bottom and have new messages, increment unread count
            setUnreadCount(
                (prev) =>
                    prev + (messages.length - prevMessagesLengthRef.current)
            );
        }

        prevMessagesLengthRef.current = messages.length;
    }, [messages.length, showScrollToBottom]);

    // this will run when the message count changes, which is when a new message is sent
    useEffect(() => {
        const scrollElement =
            scrollAreaRef.current?.querySelector(":scope > div");
        // only scroll if current top is only 1 client height from bottom
        if (scrollElement) {
            const scrollTop = scrollElement.scrollTop;
            const scrollHeight = scrollElement.scrollHeight;
            const clientHeight = scrollElement.clientHeight;
            if (scrollTop + clientHeight >= scrollHeight - clientHeight) {
                scrollElement.scrollTo({
                    top: scrollHeight,
                    behavior: "smooth",
                });
                setUnreadCount(0);
                lastVisibleMessageIdRef.current =
                    messages[messages.length - 1]?.id || null;

                void markAsRead();
            }
        }
    }, [messageCount]);

    return (
        <TooltipProvider
            delayDuration={100}
            disableHoverableContent
            skipDelayDuration={0}
        >
            <ScrollArea
                className="h-full max-h-fit overflow-y-auto p-4"
                ref={scrollAreaRef}
            >
                {hasMore && (
                    <div className="mb-4 flex justify-center">
                        <Button
                            variant="outline"
                            disabled={isLoadingMore}
                            onClick={loadMoreMessages}
                        >
                            {isLoadingMore ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Load More"
                            )}
                        </Button>
                    </div>
                )}
                {messages.map((message, i, arr) => (
                    <MessageItem
                        key={message.id}
                        message={message}
                        isFirstMessage={
                            i === 0 ||
                            !!message.repliedTo ||
                            (i > 0 && arr[i - 1]?.senderId !== message.senderId)
                        }
                        isCurrentUser={currentUser?.id === message.senderId}
                        isCurrentUserAdmin={isCurrentUserAdmin}
                        onEdit={() => onEditStart(message)}
                        isRepliedTo={selectedForReply?.id === message.id}
                        onReply={() => onReply(message)}
                        onDelete={() => deleteMessage(message.id)}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={renderers}
                        >
                            {message.text}
                        </ReactMarkdown>
                    </MessageItem>
                ))}

                {showScrollToBottom && (
                    <Button
                        onClick={scrollToBottom}
                        variant={"ghost"}
                        className={cn(
                            "z-[1000000] absolute bottom-4 right-4 rounded-full shadow-md transition-all",
                            "bg-secondary",
                            "hover:bg-primary/20"
                        )}
                        size="icon"
                    >
                        <ChevronDown className=" h-4 w-4" />
                        <Badge
                            variant={"default"}
                            className={cn(
                                "absolute -top-1 -right-1 size-4",
                                unreadCount > 0 ? "" : "hidden"
                            )}
                        >
                            {unreadCount}
                        </Badge>
                    </Button>
                )}
            </ScrollArea>
        </TooltipProvider>
    );
};

export default memo(MessageList);
