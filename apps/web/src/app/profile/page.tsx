"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function ProfilePage() {
	const { data: session, status } = useSession();
	const router = useRouter();

	const { data: userData, isLoading: isUserLoading } =
		api.user.current.useQuery(undefined, {
			enabled: status === "authenticated",
		});

	const handleSignOut = async () => {
		router.push("/auth/signout");
	};

	if (status === "unauthenticated") {
		router.push("/auth/signin");
		return null;
	}

	if (status === "loading" || isUserLoading) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-blue-500 border-t-2 border-b-2"></div>
				<p className="mt-4 text-gray-600 dark:text-gray-300">
					Loading profile...
				</p>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
			<header className="flex items-center justify-between bg-white p-4 shadow dark:bg-gray-800">
				<Link href="/dashboard" className="text-blue-500 hover:underline">
					&larr; Back to Dashboard
				</Link>
				<h1 className="font-bold text-2xl text-gray-900 dark:text-white">
					Your Profile
				</h1>
				<div className="w-24"></div>
			</header>

			<main className="flex flex-1 flex-col items-center p-6">
				<div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
					{/* Profile header */}
					<div className="mb-8 flex flex-col items-center">
						<div className="relative mb-4 h-24 w-24 overflow-hidden rounded-full">
							{session?.user?.image ? (
								<img
									src={session.user.image}
									alt={session.user.name || "User"}
									width={96}
									height={96}
									className="h-full w-full object-cover"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center bg-blue-100 font-bold text-2xl text-blue-600 dark:bg-blue-900 dark:text-blue-200">
									{session?.user?.name?.charAt(0) || "U"}
								</div>
							)}
						</div>
						<h2 className="font-bold text-2xl text-gray-900 dark:text-white">
							{session?.user?.name}
						</h2>
						<p className="text-gray-600 dark:text-gray-300">
							{session?.user?.email}
						</p>
					</div>

					{/* User settings */}
					<div className="mb-8 rounded-md border border-gray-200 p-4 dark:border-gray-700">
						<h3 className="mb-4 font-semibold text-gray-900 text-xl dark:text-white">
							Settings
						</h3>

						{userData?.settings ? (
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-gray-700 dark:text-gray-300">
										Theme
									</span>
									<span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-800 text-sm dark:bg-gray-700 dark:text-gray-200">
										{userData.settings.theme || "Light"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-700 dark:text-gray-300">
										Notifications
									</span>
									<span
										className={`rounded-full px-3 py-1 font-medium text-sm ${
											userData.settings.notifications
												? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
												: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
										}`}
									>
										{userData.settings.notifications ? "Enabled" : "Disabled"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-700 dark:text-gray-300">
										Sound
									</span>
									<span
										className={`rounded-full px-3 py-1 font-medium text-sm ${
											userData.settings.soundEnabled
												? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
												: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
										}`}
									>
										{userData.settings.soundEnabled ? "Enabled" : "Disabled"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-gray-700 dark:text-gray-300">
										Language
									</span>
									<span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-800 text-sm dark:bg-gray-700 dark:text-gray-200">
										{userData.settings.language || "English"}
									</span>
								</div>
							</div>
						) : (
							<p className="text-gray-500 dark:text-gray-400">
								No settings found. Default settings will be applied.
							</p>
						)}
					</div>

					<div className="flex flex-col space-y-4">
						<Link
							href="/profile/edit"
							className="flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
						>
							Edit Profile
						</Link>
						<button
							onClick={handleSignOut}
							className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							Sign out
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
