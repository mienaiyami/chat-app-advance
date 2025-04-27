"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/chat");
        }
    }, [status, router]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 p-6 dark:from-gray-900 dark:to-gray-800">
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                <h1 className="font-extrabold text-5xl text-gray-900 tracking-tight sm:text-[5rem] dark:text-white">
                    Chat App <span className="text-blue-500">Advance</span>
                </h1>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
                    <div className="flex flex-col gap-4 rounded-xl bg-white/10 p-6 text-white hover:bg-white/20">
                        <h3 className="font-bold text-2xl">Direct Chats</h3>
                        <div className="text-lg">
                            Connect directly with your contacts for private
                            messaging.
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 rounded-xl bg-white/10 p-6 text-white hover:bg-white/20">
                        <h3 className="font-bold text-2xl">
                            Group Conversations
                        </h3>
                        <div className="text-lg">
                            Create and participate in group discussions with
                            multiple users.
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    {status === "unauthenticated" && (
                        <Link
                            href="/auth/signin"
                            className="rounded-full bg-blue-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-blue-600"
                        >
                            Sign In
                        </Link>
                    )}
                    {status === "authenticated" && (
                        <Link
                            href="/dashboard"
                            className="rounded-full bg-blue-500 px-10 py-3 font-semibold text-white no-underline transition hover:bg-blue-600"
                        >
                            Go to Dashboard
                        </Link>
                    )}
                    {status === "loading" && (
                        <div className="rounded-full bg-gray-300 px-10 py-3 font-semibold text-gray-600">
                            Loading...
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
