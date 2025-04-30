"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

export default function SignOutPage() {
	const [isLoading, setIsLoading] = useState(false);
	const searchParams = useSearchParams();
	const callbackUrl = searchParams?.get("callbackUrl") || "/";
	const reason = searchParams?.get("reason");

	const handleSignOut = async () => {
		setIsLoading(true);
		await signOut({ callbackUrl });
	};

	return (
		<div className="container mx-auto flex h-screen w-screen flex-col items-center justify-center">
			<Link
				href="/chat"
				className="absolute top-8 left-8 flex items-center gap-2 py-2 font-medium text-lg transition-colors hover:text-primary"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Chat
			</Link>

			<Card className="mx-auto w-full max-w-md">
				<CardHeader className="space-y-1 text-center">
					<CardTitle className="font-bold text-2xl">Sign Out</CardTitle>
					<CardDescription>Are you sure you want to sign out?</CardDescription>
				</CardHeader>

				<CardContent className="grid place-items-center text-center">
					{reason && (
						<p className="mb-2 rounded-md p-1 text-destructive text-sm ring ring-destructive/50">
							Reason: {decodeURIComponent(reason)}
						</p>
					)}
					<div className="mx-auto flex gap-2 self-center">
						<Link href="/chat">
							<Button variant="outline">Cancel</Button>
						</Link>
						<Button
							onClick={handleSignOut}
							disabled={isLoading}
							variant="destructive"
							className="px-8"
						>
							{isLoading ? (
								<span className="flex items-center justify-center">
									<svg
										className="mr-2 h-4 w-4 animate-spin"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
											fill="none"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Processing...
								</span>
							) : (
								<>
									<LogOut className="mr-2 h-4 w-4" />
									Sign Out
								</>
							)}
						</Button>
					</div>
				</CardContent>

				<CardFooter className="flex justify-center">
					<p className="text-center text-muted-foreground text-sm">
						Need help?{" "}
						<Link
							href="/help"
							className="underline underline-offset-2 hover:text-primary"
						>
							Contact support
						</Link>
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}
