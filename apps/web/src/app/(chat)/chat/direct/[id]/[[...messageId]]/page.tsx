"use client";

import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import ChatArea from "~/app/(chat)/chat/_component/chat-area";
import { useConversation } from "~/providers/conversation-provider";

export default function DirectChatPage() {
    const params = useParams();
    const { setActiveConversationId } = useConversation();

    const conversationId = params.id as string;
    const messageId = params.messageId
        ? (params.messageId as string[])[0]
        : null;

    useEffect(() => {
        if (conversationId) {
            setActiveConversationId(conversationId);
        }

        return () => {
            setActiveConversationId(null);
        };
    }, [conversationId, setActiveConversationId]);

    return <ChatArea conversationId={conversationId} messageId={messageId} />;
}
