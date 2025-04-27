import { type ClassValue, clsx } from "clsx";
import TurndownService from "turndown";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
});

export const convertHtmlToMarkdown = (html: string): string => {
    return turndownService.turndown(html);
};

export const formatDate = (date: Date | string): string => {
    const now = new Date();
    const messageDate = new Date(date);

    const isToday =
        now.getDate() === messageDate.getDate() &&
        now.getMonth() === messageDate.getMonth() &&
        now.getFullYear() === messageDate.getFullYear();

    const timeString = messageDate.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    if (isToday) {
        return `Today at ${timeString}`;
    }

    const dateString = messageDate.toLocaleDateString("en-GB", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
    });
    return `${dateString} at ${timeString}`;
};

export const formatDate2 = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    };

    return new Intl.DateTimeFormat("en-GB", options).format(date);
};
export const formatFileSize = (bytes: number): string => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Number.parseFloat((bytes / 1024 ** i).toFixed(2))} ${sizes[i]}`;
};
