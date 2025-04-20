"use client";

import { AlertCircle, ArrowLeft, Github } from "lucide-react";
import { getProviders, signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";

type Provider = {
	id: string;
	name: string;
	type: string;
	signinUrl: string;
	callbackUrl: string;
};

type Providers = Record<string, Provider> | null;

const errorMessages: Record<string, string> = {
	OAuthSignin: "Error signing in with OAuth provider.",
	OAuthCallback: "Error during OAuth callback.",
	OAuthCreateAccount: "Error creating OAuth provider user.",
	EmailCreateAccount: "Error creating email provider user.",
	Callback: "Error in the OAuth callback handler.",
	OAuthAccountNotLinked: "Email already associated with another provider.",
	EmailSignin: "Error sending email verification.",
	CredentialsSignin: "Invalid email or password.",
	SessionRequired: "You must be signed in to access this page.",
	Default: "An error occurred during authentication.",
};

export default function SignInPage() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [providers, setProviders] = useState<Providers>(null);
	const searchParams = useSearchParams();
	const error = searchParams?.get("error");
	const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

	useEffect(() => {
		const fetchProviders = async () => {
			const fetchedProviders = await getProviders();
			setProviders(fetchedProviders);
		};

		void fetchProviders();
	}, []);

	const handleEmailSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await signIn("credentials", { email, callbackUrl });
		} catch (error) {
			console.error("Sign in error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const handleProviderSignIn = (providerId: string) => {
		setIsLoading(true);
		void signIn(providerId, { callbackUrl });
	};

	return (
		<div className="container mx-auto flex h-screen w-screen flex-col items-center justify-center">
			<Link
				href="/"
				className="absolute top-8 left-8 flex items-center gap-2 py-2 font-medium text-lg transition-colors hover:text-primary"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Home
			</Link>

			<Card className="mx-auto w-full max-w-md">
				<CardHeader className="space-y-1 text-center">
					<CardTitle className="font-bold text-2xl">Sign in</CardTitle>
					<CardDescription>
						Choose your preferred sign in method
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-2">
					{error && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>
								{errorMessages[error] || errorMessages.Default}
							</AlertDescription>
						</Alert>
					)}

					{providers?.github && (
						<Button
							variant="outline"
							className="w-full"
							onClick={() => handleProviderSignIn("github")}
							disabled={isLoading}
						>
							<Github className="h-4 w-4" />
							Sign in with GitHub
						</Button>
					)}

					{providers?.google && (
						<Button
							variant="outline"
							className="w-full"
							onClick={() => handleProviderSignIn("google")}
							disabled={isLoading}
						>
							<svg
								role="img"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 128 128"
							>
								<path
									fill="currentColor"
									d="M44.59 4.21a63.28 63.28 0 0 0 4.33 120.9a67.6 67.6 0 0 0 32.36.35a57.13 57.13 0 0 0 25.9-13.46a57.44 57.44 0 0 0 16-26.26a74.33 74.33 0 0 0 1.61-33.58H65.27v24.69h34.47a29.72 29.72 0 0 1-12.66 19.52a36.16 36.16 0 0 1-13.93 5.5a41.29 41.29 0 0 1-15.1 0A37.16 37.16 0 0 1 44 95.74a39.3 39.3 0 0 1-14.5-19.42a38.31 38.31 0 0 1 0-24.63a39.25 39.25 0 0 1 9.18-14.91A37.17 37.17 0 0 1 76.13 27a34.28 34.28 0 0 1 13.64 8q5.83-5.8 11.64-11.63c2-2.09 4.18-4.08 6.15-6.22A61.22 61.22 0 0 0 87.2 4.59a64 64 0 0 0-42.61-.38"
								/>
							</svg>
							Sign in with Google
						</Button>
					)}

					{process.env.NODE_ENV === "development" && providers?.credentials && (
						<>
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-card px-2 text-muted-foreground">
										Or continue with
									</span>
								</div>
							</div>

							<form onSubmit={handleEmailSignIn} className="space-y-2">
								<Input
									id="email"
									type="email"
									placeholder="mocked@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={isLoading}
								/>

								<Button
									variant="outline"
									className="w-full"
									type="submit"
									disabled={isLoading}
								>
									Sign in with Mock Credentials
								</Button>
							</form>
						</>
					)}
				</CardContent>

				<CardFooter className="flex flex-col space-y-2">
					<p className="mt-2 text-center text-muted-foreground text-sm">
						By signing in, you agree to our{" "}
						<Link
							href="/terms"
							className="underline underline-offset-2 hover:text-primary"
						>
							Terms of Service
						</Link>{" "}
						and{" "}
						<Link
							href="/privacy"
							className="whitespace-nowrap underline underline-offset-2 hover:text-primary"
						>
							Privacy Policy
						</Link>
					</p>
				</CardFooter>
			</Card>
		</div>
	);
}
