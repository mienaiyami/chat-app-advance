"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"all" | "direct" | "groups">(
        "all"
    );

    const { data: conversations, isLoading: isLoadingConversations } =
        api.conversation.getAll.useQuery(undefined, {
            enabled: status === "authenticated",
        });

    const filteredConversations = conversations?.filter(
        (conversation) =>
            activeTab === "all" ||
            (activeTab === "direct" && conversation.type === "direct") ||
            (activeTab === "groups" && conversation.type === "group")
    );

    if (status === "unauthenticated") {
        router.push("/auth/signin");
        return null;
    }

    if (status === "loading" || isLoadingConversations) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                    Loading dashboard...
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
            <header className="flex items-center justify-between bg-white p-4 shadow dark:bg-gray-800">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Dashboard
                </h1>
                <div className="flex items-center gap-4">
                    <Link
                        href="/profile"
                        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400"
                    >
                        <div className="relative h-8 w-8 overflow-hidden rounded-full">
                            {session?.user?.image ? (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || "User"}
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-blue-100 text-sm font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                                    {session?.user?.name?.charAt(0) || "U"}
                                </div>
                            )}
                        </div>
                        <span className="hidden sm:inline">
                            {session?.user?.name}
                        </span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 p-6">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={`rounded-md px-4 py-2 ${
                                    activeTab === "all"
                                        ? "bg-blue-600 text-white dark:bg-blue-500"
                                        : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                }`}
                            >
                                All Conversations
                            </button>
                            <button
                                onClick={() => setActiveTab("direct")}
                                className={`rounded-md px-4 py-2 ${
                                    activeTab === "direct"
                                        ? "bg-blue-600 text-white dark:bg-blue-500"
                                        : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                }`}
                            >
                                Direct Messages
                            </button>
                            <button
                                onClick={() => setActiveTab("groups")}
                                className={`rounded-md px-4 py-2 ${
                                    activeTab === "groups"
                                        ? "bg-blue-600 text-white dark:bg-blue-500"
                                        : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                }`}
                            >
                                Group Chats
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() =>
                                    router.push("/conversation/new/direct")
                                }
                                className="rounded-md bg-white px-4 py-2 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                                New Chat
                            </button>
                            <button
                                onClick={() =>
                                    router.push("/conversation/new/group")
                                }
                                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                                New Group
                            </button>
                        </div>
                    </div>

                    {/* Conversations List */}
                    <div className="space-y-4">
                        {filteredConversations &&
                        filteredConversations.length > 0 ? (
                            filteredConversations.map((conversation) => (
                                <Link
                                    key={conversation.id}
                                    href={`/conversation/${conversation.id}`}
                                    className="block rounded-lg bg-white p-4 shadow transition-transform hover:scale-[1.01] dark:bg-gray-800"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-12 w-12 overflow-hidden rounded-full">
                                                {conversation.image ? (
                                                    <Image
                                                        src={conversation.image}
                                                        alt={
                                                            conversation.name ||
                                                            "Conversation"
                                                        }
                                                        width={48}
                                                        height={48}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center bg-blue-100 text-lg font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                                                        {(
                                                            conversation.name ||
                                                            "C"
                                                        ).charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {conversation.name ||
                                                        (conversation.type ===
                                                        "direct"
                                                            ? "Direct Chat"
                                                            : "Group Chat")}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {conversation.type ===
                                                    "direct"
                                                        ? "Direct Message"
                                                        : `Group · ${conversation.members.length} members`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                                            {conversation.messages &&
                                            conversation.messages.length > 0 &&
                                            conversation.messages[0] ? (
                                                <time
                                                    dateTime={conversation.messages[0].createdAt.toISOString()}
                                                >
                                                    {new Date(
                                                        conversation.messages[0].createdAt
                                                    ).toLocaleDateString()}
                                                </time>
                                            ) : (
                                                <span>No messages yet</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-800">
                                <h3 className="mb-2 text-xl font-medium text-gray-900 dark:text-white">
                                    No conversations yet
                                </h3>
                                <p className="mb-6 text-gray-600 dark:text-gray-400">
                                    {activeTab === "all"
                                        ? "Start a new conversation by clicking the buttons above."
                                        : activeTab === "direct"
                                        ? "Start a direct message with someone."
                                        : "Create or join a group chat."}
                                </p>
                                <div className="flex justify-center gap-4">
                                    {activeTab === "all" ||
                                    activeTab === "direct" ? (
                                        <button
                                            onClick={() =>
                                                router.push(
                                                    "/conversation/new/direct"
                                                )
                                            }
                                            className="rounded-md bg-white px-4 py-2 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                        >
                                            New Direct Message
                                        </button>
                                    ) : null}
                                    {activeTab === "all" ||
                                    activeTab === "groups" ? (
                                        <button
                                            onClick={() =>
                                                router.push(
                                                    "/conversation/new/group"
                                                )
                                            }
                                            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                        >
                                            New Group
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
