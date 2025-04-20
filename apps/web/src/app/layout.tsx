import "~/styles/globals.css";
// import "~/app/_socket";

import { auth } from "@repo/auth";
import { Inter } from "next/font/google";
import { SessionProvider, SocketProvider } from "~/components";
import { ThemeProvider } from "~/components/theme/theme-provider";
import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";

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
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<SessionProvider session={session}>
							<SocketProvider>{children}</SocketProvider>
						</SessionProvider>
					</ThemeProvider>
				</TRPCReactProvider>
			</body>
		</html>
	);
}
