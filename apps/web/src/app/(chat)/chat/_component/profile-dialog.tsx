"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Moon, Sun, LogOut, Loader2 } from "lucide-react";
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
import { useRouter } from "next/navigation";
export default function ProfileDialog() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const { theme, setTheme } = useTheme();
    const utils = api.useUtils();

    const { data: currentUser, isLoading: isLoadingUser } =
        api.user.current.useQuery(undefined);

    const { data: settings, isLoading: isLoadingSettings } =
        api.user.getSettings.useQuery(undefined, {
            enabled: open,
        });

    const updateProfile = api.user.updateProfile.useMutation({
        onSuccess: () => {
            toast.success("Profile updated successfully");
            utils.user.current.invalidate();
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

    const handleUpdateProfile = () => {
        if (!userName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }

        updateProfile.mutate({
            name: userName.trim(),
            ...(avatarUrl.trim() && { image: avatarUrl.trim() }),
        });
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/signin" });
    };

    const isLoading = isLoadingUser || isLoadingSettings;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
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
                                        <AvatarImage src={avatarUrl || ""} />
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
                                            Avatar URL
                                        </Label>
                                        <Input
                                            id="avatar"
                                            placeholder="https://example.com/avatar.jpg"
                                            value={avatarUrl}
                                            onChange={(e) =>
                                                setAvatarUrl(e.target.value)
                                            }
                                        />
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handleUpdateProfile}
                                        disabled={updateProfile.isPending}
                                    >
                                        {updateProfile.isPending && (
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
