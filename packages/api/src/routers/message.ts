import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { eq, and, desc, sql, gt, not, isNull } from "@repo/database";
import {
    users,
    messages,
    conversations,
    conversationMembers,
    type Attachment,
} from "@repo/database/schema";
import { TRPCError } from "@trpc/server";
// import { emitChatMessage, emitGroupMessage } from "@repo/socket";

const attachmentSchema = z.object({
    fType: z.enum(["image", "video", "audio", "file"]).nullable(),
    url: z.string().url().nullable(),
    size: z.number().nullable(),
    mimeType: z.string().nullable(),
    name: z.string().nullable(),
});

const SENDER_SELECT = {
    columns: {
        id: true,
        name: true,
        image: true,
    },
} as const;

export const messageRouter = createTRPCRouter({
    getMessages: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                cursor: z.number().nullish(),
                limit: z.number().min(1).max(100).default(50),
            })
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const membership = await ctx.db.query.conversationMembers.findFirst(
                {
                    where: and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.userId, userId)
                    ),
                }
            );

            if (!membership) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You are not a member of this conversation",
                });
            }

            const query = ctx.db.query.messages.findMany({
                where: and(
                    eq(messages.conversationId, input.conversationId),
                    isNull(messages.deletedAt)
                ),
                orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                limit: input.limit,
                offset: input.cursor ? input.cursor : undefined,
                with: {
                    sender: SENDER_SELECT,
                    repliedTo: {
                        with: {
                            sender: SENDER_SELECT,
                        },
                    },
                },
            });

            const totalCount = await ctx.db
                .select({ count: sql`count(*)`.mapWith(Number) })
                .from(messages)
                .where(
                    and(
                        eq(messages.conversationId, input.conversationId),
                        isNull(messages.deletedAt)
                    )
                );

            const conversationMessages = await query;

            await ctx.db
                .update(conversationMembers)
                .set({ lastReadAt: new Date() })
                .where(
                    and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.userId, userId)
                    )
                );
            const nextCursor = input.cursor
                ? Number(input.cursor) + conversationMessages.length
                : conversationMessages.length;
            return {
                messages: conversationMessages,
                nextCursor:
                    nextCursor === totalCount[0]?.count ? null : nextCursor,
            };
        }),

    sendMessage: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                text: z.string().min(1),
                repliedToId: z.string().nullish(),
                attachment: attachmentSchema.nullish(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const membership = await ctx.db.query.conversationMembers.findFirst(
                {
                    where: and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.userId, userId)
                    ),
                }
            );

            if (!membership) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You are not a member of this conversation",
                });
            }

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.closed) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "This conversation is closed",
                });
            }

            const result = await ctx.db.transaction(async (tx) => {
                const newMessages = await tx
                    .insert(messages)
                    .values({
                        conversationId: input.conversationId,
                        senderId: userId,
                        text: input.text,
                        ...(input.repliedToId && {
                            repliedToId: input.repliedToId,
                        }),
                        ...(input.attachment && {
                            attachment: input.attachment,
                        }),
                    })
                    .returning();

                if (!newMessages[0]) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to create message",
                    });
                }

                const newMessageId = newMessages[0].id;

                const messageWithDetails = await tx.query.messages.findFirst({
                    where: eq(messages.id, newMessageId),
                    with: {
                        sender: SENDER_SELECT,
                        repliedTo: {
                            with: {
                                sender: SENDER_SELECT,
                            },
                        },
                    },
                });

                if (!messageWithDetails) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to fetch created message details",
                    });
                }

                return messageWithDetails;
            });

            try {
                if (conversation.type === "direct") {
                    // emitChatMessage(input.conversationId, result);
                } else {
                    // emitGroupMessage(input.conversationId, result);
                }
            } catch (error) {
                console.error("Failed to emit message:", error);
            }

            return result;
        }),

    deleteMessage: protectedProcedure
        .input(z.object({ messageId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const message = await ctx.db.query.messages.findFirst({
                where: eq(messages.id, input.messageId),
                with: {
                    conversation: true,
                },
            });

            if (!message) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Message not found",
                });
            }

            const isGroupConversation = message.conversation.type === "group";

            if (message.senderId !== userId && !isGroupConversation) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You can only delete your own messages",
                });
            }

            if (isGroupConversation && message.senderId !== userId) {
                const isAdmin =
                    await ctx.db.query.conversationMembers.findFirst({
                        where: and(
                            eq(
                                conversationMembers.conversationId,
                                message.conversationId
                            ),
                            eq(conversationMembers.userId, userId),
                            eq(conversationMembers.role, "admin")
                        ),
                    });

                if (!isAdmin) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message:
                            "Only admins and the sender can delete messages",
                    });
                }
            }

            await ctx.db
                .update(messages)
                .set({ deletedAt: new Date() })
                .where(eq(messages.id, input.messageId));

            return { success: true };
        }),

    editMessage: protectedProcedure
        .input(z.object({ messageId: z.string(), text: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const message = await ctx.db.query.messages.findFirst({
                where: eq(messages.id, input.messageId),
            });

            if (!message) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Message not found",
                });
            }

            if (message.senderId !== userId) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "You can only edit your own messages",
                });
            }

            await ctx.db
                .update(messages)
                .set({ text: input.text })
                .where(eq(messages.id, input.messageId));

            const updatedMessage = await ctx.db.query.messages.findFirst({
                where: eq(messages.id, input.messageId),
                with: {
                    sender: SENDER_SELECT,
                    repliedTo: {
                        with: {
                            sender: SENDER_SELECT,
                        },
                    },
                },
            });

            if (!updatedMessage) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update message",
                });
            }
            return updatedMessage;
        }),
});
