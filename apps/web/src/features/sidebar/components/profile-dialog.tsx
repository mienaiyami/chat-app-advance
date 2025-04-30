"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Moon, Sun, LogOut, Loader2, Upload, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";
import { useSession, signOut } from "next-auth/react";
import { Separator } from "~/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { useTheme } from "next-themes";
import { useUploadThing } from "~/lib/uploadthing";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "~/components/ui/tooltip";

export default function ProfileDialog() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { theme, setTheme } = useTheme();
    const utils = api.useUtils();

    const { data: currentUser, isLoading: isLoadingUser } =
        api.user.current.useQuery(undefined);

    const { data: settings, isLoading: isLoadingSettings } =
        api.user.getSettings.useQuery(undefined, {
            enabled: open,
        });

    const { startUpload } = useUploadThing("avatarUploader", {
        onClientUploadComplete: (res) => {
            if (res?.[0]) {
                setAvatarUrl(res[0].ufsUrl);
                setIsUploading(false);
                toast.success("Avatar uploaded successfully");
            }
        },
        onUploadError: (error) => {
            toast.error(`Error uploading avatar: ${error.message}`);
            setIsUploading(false);
        },
    });

    const updateProfile = api.user.updateProfile.useMutation({
        onSuccess: () => {
            toast.success("Profile updated successfully");
            utils.user.current.invalidate();
            // Clear local file state after successful update
            setSelectedFile(null);
            setPreviewUrl(null);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update profile");
        },
    });

    const updateSettings = api.user.updateSettings.useMutation({
        onSuccess: (data) => {
            toast.success("Settings updated successfully");
            if (data?.theme && data.theme !== theme) {
                setTheme(data.theme);
            }
            utils.user.getSettings.invalidate();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update settings");
        },
    });

    useEffect(() => {
        if (currentUser) {
            setUserName(currentUser.name || "");
            setAvatarUrl(currentUser.image || "");
        }
    }, [currentUser]);

    useEffect(() => {
        if (selectedFile) {
            const url = URL.createObjectURL(selectedFile);
            setPreviewUrl(url);

            return () => URL.revokeObjectURL(url);
        }
    }, [selectedFile]);

    const handleUpdateProfile = async () => {
        if (!userName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        try {
            let finalAvatarUrl = avatarUrl;

            if (selectedFile) {
                setIsUploading(true);
                const uploadResult = await startUpload([selectedFile]);

                if (uploadResult?.[0]) {
                    finalAvatarUrl = uploadResult[0].ufsUrl;
                }
            }

            updateProfile.mutate({
                name: userName.trim(),
                ...(finalAvatarUrl.trim() && { image: finalAvatarUrl.trim() }),
            });
        } catch (error) {
            setIsUploading(false);
            toast.error("Failed to upload avatar");
        }
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/auth/signin" });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 4 * 1024 * 1024) {
            toast.error("File too large. Maximum size is 4MB");
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Only image files are allowed");
            return;
        }

        setSelectedFile(file);
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const isLoading = isLoadingUser || isLoadingSettings;

    const displayAvatar = previewUrl || avatarUrl || "";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button variant="ghost" className="h-9 w-9 ">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={avatarUrl || ""} />
                            <AvatarFallback>
                                {userName?.slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Profile</span>
                    </Button>
                </DialogTrigger>
            </TooltipTrigger>

            <TooltipContent>
                <p>Profile</p>
            </TooltipContent>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>User Profile</DialogTitle>
                    <DialogDescription>
                        View and update your profile information and settings.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4 mt-4">
                        {isLoadingUser ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-center mb-6">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={displayAvatar} />
                                        <AvatarFallback>
                                            {userName
                                                ?.slice(0, 2)
                                                .toUpperCase() || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            value={userName}
                                            onChange={(e) =>
                                                setUserName(e.target.value)
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            value={session?.user.email || ""}
                                            disabled
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="avatar">
                                            Profile Picture
                                        </Label>
                                        <div className="flex gap-2 items-center">
                                            <Input
                                                id="avatar"
                                                type="file"
                                                className="w-full py-1.5"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                            />
                                            {selectedFile && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={clearSelectedFile}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        {isUploading && (
                                            <div className="flex items-center mt-2">
                                                <Loader2 className="size-4 animate-spin mr-2" />
                                                <span className="text-sm">
                                                    Uploading...
                                                </span>
                                            </div>
                                        )}
                                        {previewUrl && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                                New avatar selected (will be
                                                uploaded when you save)
                                            </div>
                                        )}
                                        {!previewUrl && avatarUrl && (
                                            <div className="text-sm text-muted-foreground break-all mt-1">
                                                Current: {avatarUrl}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleUpdateProfile}
                                        disabled={
                                            updateProfile.isPending ||
                                            isUploading
                                        }
                                    >
                                        {(updateProfile.isPending ||
                                            isUploading) && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Save Profile
                                    </Button>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4 mt-4">
                        {isLoadingSettings ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : settings ? (
                            <>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex flex-col items-start gap-1">
                                            Theme
                                            <p className="font-normal text-muted-foreground text-sm">
                                                Choose your preferred theme
                                            </p>
                                        </Label>
                                        <Select
                                            defaultValue={
                                                settings.theme || "system"
                                            }
                                            onValueChange={(value) =>
                                                updateSettings.mutate({
                                                    theme: value as
                                                        | "light"
                                                        | "dark"
                                                        | "system",
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue placeholder="Select theme" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="light">
                                                    <div className="flex items-center">
                                                        <Sun className="mr-2 h-4 w-4" />
                                                        <span>Light</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="dark">
                                                    <div className="flex items-center">
                                                        <Moon className="mr-2 h-4 w-4" />
                                                        <span>Dark</span>
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="system">
                                                    System
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label
                                            className="flex cursor-pointer flex-col items-start gap-1"
                                            htmlFor={`notifications-${currentUser?.id}`}
                                        >
                                            Notifications
                                            <p className="font-normal text-muted-foreground text-sm">
                                                Enable or disable notifications
                                            </p>
                                        </Label>
                                        <Switch
                                            id={`notifications-${currentUser?.id}`}
                                            checked={
                                                settings.notifications || false
                                            }
                                            onCheckedChange={(checked) =>
                                                updateSettings.mutate({
                                                    notifications: checked,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label
                                            className="flex cursor-pointer flex-col items-start gap-1"
                                            htmlFor={`sound-${currentUser?.id}`}
                                        >
                                            Sound
                                            <p className="font-normal text-muted-foreground text-sm">
                                                Enable or disable sounds
                                            </p>
                                        </Label>
                                        <Switch
                                            id={`sound-${currentUser?.id}`}
                                            checked={
                                                settings.soundEnabled || false
                                            }
                                            onCheckedChange={(checked) =>
                                                updateSettings.mutate({
                                                    soundEnabled: checked,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Label className="flex flex-col items-start gap-1">
                                            Language
                                            <p className="font-normal text-muted-foreground text-sm">
                                                Choose your preferred language
                                            </p>
                                        </Label>
                                        <Select
                                            defaultValue={
                                                settings.language || "en"
                                            }
                                            disabled={true}
                                            onValueChange={(value) =>
                                                updateSettings.mutate({
                                                    language: value,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-32">
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="en">
                                                    English
                                                </SelectItem>
                                                <SelectItem value="fr">
                                                    French
                                                </SelectItem>
                                                <SelectItem value="es">
                                                    Spanish
                                                </SelectItem>
                                                <SelectItem value="de">
                                                    German
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        ) : null}

                        <Separator className="my-4" />

                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={handleSignOut}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
