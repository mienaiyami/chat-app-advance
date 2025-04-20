"use client";

import {
	AlertTriangle,
	CheckCircle,
	HelpCircle,
	Settings,
	ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

type ErrorType = "Configuration" | "AccessDenied" | "Verification" | "Default";

interface ErrorDetails {
	title: string;
	description: string;
	icon: React.ReactNode;
	action: { label: string; href: string };
}

const errorMap: Record<ErrorType, ErrorDetails> = {
	Configuration: {
		title: "Server Configuration Error",
		description:
			"There is a problem with the server configuration. The authentication system cannot be initialized correctly.",
		icon: <Settings className="h-12 w-12 text-destructive" />,
		action: { label: "Contact Support", href: "/help" },
	},
	AccessDenied: {
		title: "Access Denied",
		description:
			"You do not have permission to sign in. Your account may not have the required roles or permissions.",
		icon: <ShieldAlert className="h-12 w-12 text-destructive" />,
		action: { label: "Go to Home", href: "/" },
	},
	Verification: {
		title: "Verification Error",
		description:
			"The verification token has expired or has already been used. Please request a new verification link.",
		icon: <CheckCircle className="h-12 w-12 text-destructive" />,
		action: { label: "Try Again", href: "/auth/signin" },
	},
	Default: {
		title: "Authentication Error",
		description:
			"An unexpected error occurred during the authentication process. Please try again later.",
		icon: <AlertTriangle className="h-12 w-12 text-destructive" />,
		action: { label: "Try Again", href: "/auth/signin" },
	},
};

export default function ErrorPage() {
	const searchParams = useSearchParams();
	const error = (searchParams?.get("error") as ErrorType) || "Default";

	const errorDetails = errorMap[error] || errorMap.Default;

	return (
		<div className="container mx-auto flex h-screen w-screen flex-col items-center justify-center">
			<Card className="mx-auto w-full max-w-md">
				<CardHeader className="space-y-1 text-center">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
						{errorDetails.icon || (
							<HelpCircle className="h-12 w-12 text-destructive" />
						)}
					</div>
					<CardTitle className="font-bold text-2xl">
						{errorDetails.title}
					</CardTitle>
					<CardDescription>{errorDetails.description}</CardDescription>
				</CardHeader>

				<CardContent className="space-y-4">
					<div className="rounded-md bg-muted p-4">
						<div className="flex">
							<AlertTriangle className="mr-3 h-5 w-5 text-amber-500" />
							<p className="text-muted-foreground text-sm">
								Error code: <span className="font-mono">{error}</span>
							</p>
						</div>
					</div>
				</CardContent>

				<CardFooter className="flex flex-col space-y-4">
					<div className="flex w-full space-x-2">
						<Link href="/" className="w-full">
							<Button variant="outline" className="w-full">
								Back to Home
							</Button>
						</Link>
						<Link href={errorDetails.action.href} className="w-full">
							<Button className="w-full">{errorDetails.action.label}</Button>
						</Link>
					</div>

					<p className="text-center text-muted-foreground text-sm">
						Need help?{" "}
						<Link
							href="/help"
							className="underline underline-offset-2 hover:text-primary"
						>
							Contact our support team
						</Link>
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}
