"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "~/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { InviteDetails } from "./invite-details";

type JoinState = "loading" | "authenticating" | "preview" | "success" | "error";

export default function JoinGroupPage({
    params,
}: {
    params: { token: string };
}) {
    const { token } = params;
    const router = useRouter();
    const { status } = useSession();
    const [joinState, setJoinState] = useState<JoinState>("loading");
    const [errorMessage, setErrorMessage] = useState<string>("");

    const joinMutation = api.conversation.joinByLink.useMutation({
        onSuccess: (data) => {
            setJoinState("success");
            setTimeout(() => {
                router.push(`/chat/${data.conversationId}`);
            }, 2000);
        },
        onError: (error) => {
            setJoinState("error");
            setErrorMessage(error.message || "Failed to join group");
        },
    });

    useEffect(() => {
        if (status === "loading") {
            setJoinState("authenticating");
            return;
        }

        if (status === "unauthenticated") {
            router.push(
                `/sign-in?callbackUrl=${encodeURIComponent(`/join/${token}`)}`
            );
            return;
        }

        setJoinState("preview");
    }, [status, token, router]);

    const handleDirectJoin = () => {
        setJoinState("loading");
        joinMutation.mutate({ token });
    };

    const handleJoinFromPreview = (conversationId: string) => {
        setJoinState("success");
        setTimeout(() => {
            router.push(`/chat/${conversationId}`);
        }, 2000);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            {joinState === "preview" && (
                <InviteDetails token={token} onJoin={handleJoinFromPreview} />
            )}

            {(joinState === "loading" || joinState === "authenticating") && (
                <Card className="w-[350px]">
                    <CardHeader>
                        <CardTitle>
                            {joinState === "authenticating"
                                ? "Checking Authentication"
                                : "Processing Invitation"}
                        </CardTitle>
                        <CardDescription>
                            {joinState === "authenticating"
                                ? "Verifying your account..."
                                : "Processing your invitation..."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-6">
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    </CardContent>
                    <CardFooter>
                        <p className="text-center text-sm text-muted-foreground w-full">
                            {joinState === "authenticating"
                                ? "Please wait while we verify your account"
                                : "Please wait while we process your invitation"}
                        </p>
                    </CardFooter>
                </Card>
            )}

            {joinState === "success" && (
                <Card className="w-[350px]">
                    <CardHeader>
                        <CardTitle>Successfully Joined!</CardTitle>
                        <CardDescription>
                            You've joined the group chat
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-6">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                    </CardContent>
                    <CardFooter>
                        <p className="text-center text-sm text-muted-foreground w-full">
                            Redirecting you to the conversation...
                        </p>
                    </CardFooter>
                </Card>
            )}

            {joinState === "error" && (
                <Card className="w-[350px]">
                    <CardHeader>
                        <CardTitle>Failed to Join</CardTitle>
                        <CardDescription>
                            Could not join the group
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <XCircle className="h-16 w-16 text-destructive" />
                        <p className="text-center text-sm text-destructive">
                            {errorMessage}
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Button
                            variant="default"
                            onClick={() => router.push("/chat")}
                        >
                            Go to Chats
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
