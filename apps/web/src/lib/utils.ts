import { type ClassValue, clsx } from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { twMerge } from "tailwind-merge";
import TurndownService from "turndown";

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

/**
 * Format date to "HH:mm" if it is today
 * Format date to "Yesterday" if it is yesterday
 * Format date to "dd/MM/yyyy" if it is not today or yesterday
 * example:
 * 10/05/2025
 * 10:00
 * Yesterday
 * 09/05/2025
 */
export const formatDateShort = (date: Date | string): string => {
    const now = new Date();
    const messageDate = new Date(date);

    const isToday =
        now.getDate() === messageDate.getDate() &&
        now.getMonth() === messageDate.getMonth() &&
        now.getFullYear() === messageDate.getFullYear();

    const timeString = format(messageDate, "HH:mm");

    if (isToday) {
        return timeString;
    }
    const isYesterday =
        now.getDate() - 1 === messageDate.getDate() &&
        now.getMonth() === messageDate.getMonth() &&
        now.getFullYear() === messageDate.getFullYear();

    if (isYesterday) {
        return "Yesterday";
    }
    const dateString = format(messageDate, "dd/MM/yyyy");
    // return `${dateString} at ${timeString}`;
    return dateString;
};

/**
 * Format date to "EEEE, dd MMMM yyyy 'at' HH:mm"
 * example:
 * Yesterday, 30 April 2025 at 10:00
 */
export const formatDateLong = (date?: Date | string | null): string => {
    if (!date) return "";
    return format(date, "EEEE, dd MMMM yyyy 'at' HH:mm");
};

export const formatDateDistance = (date: Date | string): string => {
    const now = new Date();
    const messageDate = new Date(date);
    if (now.getTime() - messageDate.getTime() < 1000 * 60 * 60 * 24) {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    }
    return format(date, "dd/MM/yyyy HH:mm");
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};
