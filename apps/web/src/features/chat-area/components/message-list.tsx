import { memo, useRef } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Loader2 } from "lucide-react";
import { TooltipProvider } from "~/components/ui/tooltip";
import MessageItem from "./message-item";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderers } from "./renderers";
import type { RouterOutputs } from "~/trpc/react";
import { useMessage } from "~/providers/message-provider";
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
        hasMore,
        isLoadingMore,
        loadMoreMessages,
        deleteMessage,
    } = useMessage();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    return (
        <TooltipProvider
            delayDuration={100}
            disableHoverableContent
            skipDelayDuration={0}
        >
            <ScrollArea
                className="overflow-y-auto p-4 h-full"
                ref={scrollAreaRef}
            >
                {hasMore && (
                    <div className="flex justify-center mb-4">
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
                        sender={message.sender}
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
            </ScrollArea>
        </TooltipProvider>
    );
};

export default memo(MessageList);
