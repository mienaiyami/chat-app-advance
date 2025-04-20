"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const ToggleTheme = ({
	className,
	size,
}: {
	className?: string;
	size?: "sm" | "lg" | "default" | "icon";
}) => {
	const { setTheme, theme } = useTheme();
	return (
		<Button
			variant={"outline"}
			size={size ?? "sm"}
			className={cn(className)}
			onClick={() => {
				setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
			}}
		>
			{theme === "dark" ? (
				<Sun className="h-4 w-4" />
			) : (
				<Moon className="h-4 w-4" />
			)}
		</Button>
	);
};

export default ToggleTheme;
