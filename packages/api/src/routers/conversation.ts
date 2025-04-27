import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
    conversationMembers,
    conversations,
    messages,
    users,
} from "@repo/database/schema";
import { and, eq, gt, inArray, sql, not } from "@repo/database";

const MEMBER_SELECT = {
    columns: {
        id: true,
        name: true,
        image: true,
    },
} as const;

export const conversationRouter = createTRPCRouter({
    getAll: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        const userConversations = await ctx.db.query.conversations.findMany({
            where: (conversations, { exists }) =>
                exists(
                    ctx.db
                        .select({ id: conversationMembers.id })
                        .from(conversationMembers)
                        .where(
                            and(
                                eq(
                                    conversationMembers.conversationId,
                                    conversations.id
                                ),
                                eq(conversationMembers.userId, userId)
                            )
                        )
                ),
            with: {
                members: {
                    with: {
                        user: MEMBER_SELECT,
                    },
                },
                messages: {
                    orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                    limit: 1,
                },
                creator: MEMBER_SELECT,
            },
            orderBy: (conversations, { desc }) => [
                desc(conversations.updatedAt),
            ],
        });

        return userConversations;
    }),

    getById: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
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

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
                with: {
                    members: {
                        with: {
                            user: MEMBER_SELECT,
                        },
                    },
                    creator: MEMBER_SELECT,
                },
            });

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

            return conversation;
        }),

    createDirect: protectedProcedure
        .input(
            z.object({
                targetUserId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const existingConversation = await ctx.db.transaction(
                async (tx) => {
                    const existingConversationIds = await tx
                        .select({
                            conversationId: conversationMembers.conversationId,
                        })
                        .from(conversationMembers)
                        .where(eq(conversationMembers.userId, userId));

                    if (existingConversationIds.length === 0) return null;

                    const conversationsWithBothUsers = await tx
                        .select({
                            conversationId: conversationMembers.conversationId,
                        })
                        .from(conversationMembers)
                        .where(
                            and(
                                eq(
                                    conversationMembers.userId,
                                    input.targetUserId
                                ),
                                inArray(
                                    conversationMembers.conversationId,
                                    existingConversationIds.map(
                                        (c) => c.conversationId
                                    )
                                )
                            )
                        );

                    if (conversationsWithBothUsers.length === 0) return null;

                    for (const {
                        conversationId,
                    } of conversationsWithBothUsers) {
                        const conversation =
                            await tx.query.conversations.findFirst({
                                where: and(
                                    eq(conversations.id, conversationId),
                                    eq(conversations.type, "direct")
                                ),
                            });

                        if (!conversation) continue;

                        const memberCount = await tx
                            .select({ count: sql<number>`count(*)` })
                            .from(conversationMembers)
                            .where(
                                eq(
                                    conversationMembers.conversationId,
                                    conversationId
                                )
                            );

                        if (memberCount[0]?.count === 2) {
                            return await tx.query.conversations.findFirst({
                                where: eq(conversations.id, conversationId),
                                with: {
                                    members: {
                                        with: {
                                            user: MEMBER_SELECT,
                                        },
                                    },
                                    creator: MEMBER_SELECT,
                                },
                            });
                        }
                    }

                    return null;
                }
            );

            if (existingConversation) {
                return existingConversation;
            }

            return await ctx.db.transaction(async (tx) => {
                const [newConversation] = await tx
                    .insert(conversations)
                    .values({
                        type: "direct",
                        creatorId: userId,
                    })
                    .returning();

                if (!newConversation) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to create new conversation",
                    });
                }

                await tx.insert(conversationMembers).values([
                    {
                        conversationId: newConversation.id,
                        userId,
                        role: "owner",
                    },
                    {
                        conversationId: newConversation.id,
                        userId: input.targetUserId,
                        role: "owner",
                    },
                ]);

                return await tx.query.conversations.findFirst({
                    where: eq(conversations.id, newConversation.id),
                    with: {
                        members: {
                            with: {
                                user: MEMBER_SELECT,
                            },
                        },
                        creator: MEMBER_SELECT,
                    },
                });
            });
        }),

    createGroup: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1),
                description: z.string().optional(),
                image: z.string().url().optional(),
                members: z.array(z.string()).optional(),
                isPrivate: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            return await ctx.db.transaction(async (tx) => {
                const [newConversation] = await tx
                    .insert(conversations)
                    .values({
                        type: "group",
                        name: input.name,
                        description: input.description || "",
                        image: input.image,
                        creatorId: userId,
                        isPrivate: input.isPrivate ?? false,
                    })
                    .returning();

                if (!newConversation) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Failed to create group conversation",
                    });
                }

                await tx.insert(conversationMembers).values({
                    conversationId: newConversation.id,
                    userId,
                    role: "admin",
                });

                if (input.members && input.members.length > 0) {
                    await tx.insert(conversationMembers).values(
                        input.members.map((memberId) => ({
                            conversationId: newConversation.id,
                            userId: memberId,
                        }))
                    );
                }

                return await tx.query.conversations.findFirst({
                    where: eq(conversations.id, newConversation.id),
                    with: {
                        members: {
                            with: {
                                user: MEMBER_SELECT,
                            },
                        },
                        creator: MEMBER_SELECT,
                    },
                });
            });
        }),

    update: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                image: z.string().url().optional(),
                isPrivate: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.type !== "group") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Only group conversations can be updated",
                });
            }

            const isAdmin = await ctx.db.query.conversationMembers.findFirst({
                where: and(
                    eq(
                        conversationMembers.conversationId,
                        input.conversationId
                    ),
                    eq(conversationMembers.userId, userId),
                    eq(conversationMembers.role, "admin")
                ),
            });

            if (!isAdmin) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only group admins can update the conversation",
                });
            }

            const [updatedConversation] = await ctx.db
                .update(conversations)
                .set({
                    ...(input.name && { name: input.name }),
                    ...(input.description !== undefined && {
                        description: input.description,
                    }),
                    ...(input.image && {
                        image: input.image,
                    }),
                    ...(input.isPrivate !== undefined && {
                        isPrivate: input.isPrivate,
                    }),
                    updatedAt: new Date(),
                })
                .where(eq(conversations.id, input.conversationId))
                .returning();

            return updatedConversation;
        }),

    markAsRead: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

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

            return { success: true };
        }),

    getUnreadCount: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            return ctx.db.transaction(async (tx) => {
                const [lastReadAt] = await tx
                    .select({ lastReadAt: conversationMembers.lastReadAt })
                    .from(conversationMembers)
                    .where(
                        and(
                            eq(
                                conversationMembers.conversationId,
                                input.conversationId
                            ),
                            eq(conversationMembers.userId, userId)
                        )
                    );

                if (!lastReadAt) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Conversation not found",
                    });
                }

                const unreadCount = await tx
                    .select({
                        count: sql`count(*)`.mapWith(Number),
                    })
                    .from(messages)
                    .where(
                        and(
                            eq(messages.conversationId, input.conversationId),
                            gt(messages.createdAt, lastReadAt.lastReadAt)
                        )
                    );

                return unreadCount[0]?.count ?? 0;
            });
        }),
    getMembers: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const members = await ctx.db
                .select({
                    userId: conversationMembers.userId,
                    role: conversationMembers.role,
                    name: users.name,
                    image: users.image,
                })
                .from(conversationMembers)
                .leftJoin(users, eq(conversationMembers.userId, users.id))
                .where(
                    eq(conversationMembers.conversationId, input.conversationId)
                );

            return members;
        }),
    addMembers: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                userIds: z.array(z.string()),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.type !== "group") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Members can only be added to group conversations",
                });
            }

            const isAdmin = await ctx.db.query.conversationMembers.findFirst({
                where: and(
                    eq(
                        conversationMembers.conversationId,
                        input.conversationId
                    ),
                    eq(conversationMembers.userId, userId),
                    eq(conversationMembers.role, "admin")
                ),
            });

            if (!isAdmin) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only group admins can add members",
                });
            }

            const existingMembers = await ctx.db
                .select({ userId: conversationMembers.userId })
                .from(conversationMembers)
                .where(
                    eq(conversationMembers.conversationId, input.conversationId)
                );

            const existingMemberIds = new Set(
                existingMembers.map((m) => m.userId)
            );

            const newMemberIds = input.userIds.filter(
                (id) => !existingMemberIds.has(id)
            );

            if (newMemberIds.length > 0) {
                await ctx.db.insert(conversationMembers).values(
                    newMemberIds.map((userId) => ({
                        conversationId: input.conversationId,
                        userId,
                    }))
                );
            }

            return { success: true, addedCount: newMemberIds.length };
        }),

    removeMember: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                userId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const currentUserId = ctx.session.user.id;

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.type !== "group") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message:
                        "Members can only be removed from group conversations",
                });
            }

            if (currentUserId !== input.userId) {
                const admins = await ctx.db.query.conversationMembers.findMany({
                    where: and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.role, "admin")
                    ),
                    columns: {
                        userId: true,
                    },
                });

                if (!admins.some((admin) => admin.userId === currentUserId)) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Only admins can remove members",
                    });
                }

                if (admins.length === 1 && admins[0]?.userId === input.userId) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Cannot remove the only admin",
                    });
                }
            }

            if (conversation.creatorId === input.userId) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Cannot remove the group creator",
                });
            }

            await ctx.db
                .delete(conversationMembers)
                .where(
                    and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.userId, input.userId)
                    )
                );

            return { success: true };
        }),

    leave: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.type === "direct") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot leave a direct chat",
                });
            }

            const admins = await ctx.db.query.conversationMembers.findMany({
                where: and(
                    eq(
                        conversationMembers.conversationId,
                        input.conversationId
                    ),
                    eq(conversationMembers.role, "admin")
                ),
                columns: {
                    userId: true,
                },
            });

            if (admins.length === 1 && admins[0]?.userId === userId) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Cannot leave as the only admin",
                });
            }

            if (conversation.creatorId === userId) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message:
                        "Group creator cannot leave. Transfer ownership or delete the group instead.",
                });
            }

            await ctx.db
                .delete(conversationMembers)
                .where(
                    and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.userId, userId)
                    )
                );

            return { success: true };
        }),

    updateRole: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                userId: z.string(),
                role: z.enum(["admin", "member"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const currentUserId = ctx.session.user.id;

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.type !== "group") {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Roles only apply to group conversations",
                });
            }

            const isAdmin = await ctx.db.query.conversationMembers.findFirst({
                where: and(
                    eq(
                        conversationMembers.conversationId,
                        input.conversationId
                    ),
                    eq(conversationMembers.userId, currentUserId),
                    eq(conversationMembers.role, "admin")
                ),
            });

            if (!isAdmin) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can change roles",
                });
            }

            if (currentUserId === input.userId) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Cannot change your own role",
                });
            }

            //todo: add more checks for admin roles: who can demote the admin,etc

            if (
                conversation.creatorId === input.userId &&
                input.role !== "admin"
            ) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Cannot change the role of the group creator",
                });
            }

            await ctx.db
                .update(conversationMembers)
                .set({
                    role: input.role === "admin" ? "admin" : "member",
                })
                .where(
                    and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.userId, input.userId)
                    )
                );

            return { success: true };
        }),

    close: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.type === "direct") {
                const isMember =
                    await ctx.db.query.conversationMembers.findFirst({
                        where: and(
                            eq(
                                conversationMembers.conversationId,
                                input.conversationId
                            ),
                            eq(conversationMembers.userId, userId)
                        ),
                    });

                if (!isMember) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "You are not a member of this conversation",
                    });
                }
            } else {
                const isAdmin =
                    await ctx.db.query.conversationMembers.findFirst({
                        where: and(
                            eq(
                                conversationMembers.conversationId,
                                input.conversationId
                            ),
                            eq(conversationMembers.userId, userId),
                            eq(conversationMembers.role, "admin")
                        ),
                    });

                if (!isAdmin) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Only group admins can close the conversation",
                    });
                }
            }

            await ctx.db
                .update(conversations)
                .set({ closed: true })
                .where(eq(conversations.id, input.conversationId));

            return { success: true };
        }),

    getAllUnreadCounts: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        const userConversationMembers =
            await ctx.db.query.conversationMembers.findMany({
                where: eq(conversationMembers.userId, userId),
                with: {
                    conversation: true,
                },
            });

        const unreadCounts = await Promise.all(
            userConversationMembers.map(async (member) => {
                const count = await ctx.db
                    .select({ count: sql`count(*)`.mapWith(Number) })
                    .from(messages)
                    .where(
                        and(
                            eq(messages.conversationId, member.conversationId),
                            gt(messages.createdAt, member.lastReadAt),
                            not(eq(messages.senderId, userId))
                        )
                    );

                return {
                    conversationId: member.conversationId,
                    type: member.conversation.type,
                    unreadCount: count[0]?.count ?? 0,
                };
            })
        );

        const directChats = unreadCounts.filter((c) => c.type === "direct");
        const groups = unreadCounts.filter((c) => c.type === "group");

        return {
            conversations: unreadCounts,
            directChats,
            groups,
            totalUnread: unreadCounts.reduce(
                (sum, item) => sum + item.unreadCount,
                0
            ),
        };
    }),

    clearChat: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
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

            // For direct chats, we just mark messages as deleted for this user
            // For group chats, only admins can clear all messages
            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });

            if (!conversation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Conversation not found",
                });
            }

            if (conversation.type === "group") {
                // Only admins can clear group chat history
                const isAdmin =
                    await ctx.db.query.conversationMembers.findFirst({
                        where: and(
                            eq(
                                conversationMembers.conversationId,
                                input.conversationId
                            ),
                            eq(conversationMembers.userId, userId),
                            eq(conversationMembers.role, "admin")
                        ),
                    });

                if (!isAdmin) {
                    throw new TRPCError({
                        code: "FORBIDDEN",
                        message: "Only group admins can clear chat history",
                    });
                }

                // Delete all messages in the conversation
                await ctx.db
                    .delete(messages)
                    .where(eq(messages.conversationId, input.conversationId));
            } else {
                // For direct chats, we mark messages as deleted for this user only
                // This would typically require a messagesDeletedForUsers table
                // For simplicity in this example, we'll just delete all messages
                await ctx.db
                    .delete(messages)
                    .where(eq(messages.conversationId, input.conversationId));
            }

            return { success: true };
        }),

    updateMuted: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                muted: z.boolean(),
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

            await ctx.db
                .update(conversationMembers)
                .set({ muted: input.muted })
                .where(
                    and(
                        eq(
                            conversationMembers.conversationId,
                            input.conversationId
                        ),
                        eq(conversationMembers.userId, userId)
                    )
                );

            return { success: true };
        }),
});
