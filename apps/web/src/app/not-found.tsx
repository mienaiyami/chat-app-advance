"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
export default function NotFound() {
	const router = useRouter();
	return (
		<div className="grid place-items-center pt-20">
			<h1 className="font-bold text-4xl tracking-tight">404</h1>
			<p className="text-muted-foreground text-xl">
				{`The page you're looking for doesn't exist.`}
			</p>
			<Button className="mt-4 w-32" onClick={() => router.back()}>
				Back
			</Button>
			<Button asChild className="mt-4 w-32">
				<Link href="/">Home</Link>
			</Button>
		</div>
	);
}
