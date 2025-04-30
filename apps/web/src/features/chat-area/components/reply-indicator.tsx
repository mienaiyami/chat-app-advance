import { memo } from "react";
import { Button } from "~/components/ui/button";
import { X } from "lucide-react";
import type { RouterOutputs } from "~/trpc/react";

type Message = RouterOutputs["message"]["getMessages"]["messages"][number];

type ReplyIndicatorProps = {
    selectedForReply: Message;
    currentUserName: string | null | undefined;
    chatName: string;
    onCancelReply: () => void;
};

const ReplyIndicator = ({
    selectedForReply,
    currentUserName,
    chatName,
    onCancelReply,
}: ReplyIndicatorProps) => {
    return (
        <div className="-top-full left-0 w-full p-2 rounded-t-md border-t text-xs select-none">
            <div className="flex items-center justify-between">
                <button
                    className="hover:underline"
                    onClick={() => {
                        const element = document.querySelector(
                            `[data-message-id="${selectedForReply.id}"]`
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
                                { once: true }
                            );
                        }
                    }}
                >
                    Replying to{" "}
                    {selectedForReply.senderId === currentUserName
                        ? currentUserName
                        : chatName}
                </button>
                <Button
                    variant="ghost"
                    className="w-6 h-6 rounded-full p-1"
                    onClick={onCancelReply}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Cancel Reply</span>
                </Button>
            </div>
        </div>
    );
};

export default memo(ReplyIndicator);
