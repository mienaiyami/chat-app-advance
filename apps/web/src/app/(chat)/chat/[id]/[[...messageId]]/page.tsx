"use client";

import { useParams } from "next/navigation";
import React, { useEffect } from "react";
import { ChatArea } from "~/features/chat-area/chat-area";
import { useConversation } from "~/providers/conversation-provider";

export default function DirectChatPage() {
	const params = useParams();
	const { setActiveConversation } = useConversation();

	const conversationId = params.id as string;
	const messageId = params.messageId ? (params.messageId as string[])[0] : null;

	useEffect(() => {
		if (conversationId) {
			setActiveConversation(conversationId);
		}

		return () => {
			setActiveConversation("");
		};
	}, [conversationId, setActiveConversation]);

	return <ChatArea />;
}
