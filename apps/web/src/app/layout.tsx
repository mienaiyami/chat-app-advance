import "~/styles/globals.css";
// import "~/app/_socket";

import { auth } from "@repo/auth";
import { Inter } from "next/font/google";
import { SessionProvider, SocketProvider } from "~/components";
import { TRPCReactProvider } from "~/trpc/react";
import { env } from "~/env";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
});

export const metadata = {
    title: "Chat App",
    description: "A modern chat application",
    icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <html lang="en">
            <body className={`font-sans ${inter.variable}`}>
                <TRPCReactProvider>
                    <SessionProvider session={session}>
                        <SocketProvider>{children}</SocketProvider>
                    </SessionProvider>
                </TRPCReactProvider>
            </body>
        </html>
    );
}
