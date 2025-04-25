"use client";

import Sidebar from "./_component/sidebar";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full w-full">
            <Sidebar />
            <div className="flex-1">{children}</div>
        </div>
    );
}
