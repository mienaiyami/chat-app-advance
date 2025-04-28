import { z } from "zod";
import { and, eq, or, not, inArray } from "@repo/database";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import {
    users,
    userSettings,
    userContacts,
    conversationMembers,
} from "@repo/database/schema";
import { TRPCError } from "@trpc/server";

const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    image: true,
} as const;

export const userRouter = createTRPCRouter({
    current: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;
        const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, userId),
            with: {
                settings: true,
            },
            columns: USER_SELECT,
        });

        console.log({ userId });
        if (!user) {
            throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "User not found",
            });
        }
        return user;
    }),

    search: protectedProcedure
        .input(
            z.object({
                query: z.string().min(1),
            })
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const searchedUsers = await ctx.db.query.users.findMany({
                where: (users, { like, and, ne }) =>
                    and(
                        ne(users.id, userId),
                        or(
                            like(users.name, `%${input.query}%`),
                            like(users.email, `%${input.query}%`)
                        )
                    ),
                // limit: 10,
                columns: USER_SELECT,
            });

            return searchedUsers;
        }),

    updateProfile: protectedProcedure
        .input(
            z.object({
                name: z.string().min(3).optional(),
                image: z.string().url().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;
            console.log(input);

            const updatedUser = await ctx.db
                .update(users)
                .set({
                    ...(input.name && { name: input.name }),
                    ...(input.image && { image: input.image }),
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId))
                .returning();
            console.log(updatedUser[0]);
            return updatedUser[0];
        }),

    updateSettings: protectedProcedure
        .input(
            z.object({
                theme: z.enum(["light", "dark", "system"]).nullish(),
                notifications: z.boolean().nullish(),
                soundEnabled: z.boolean().nullish(),
                language: z.string().nullish(),
                // mutedChats: z.array(z.string()).nullish(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const existingSettings = await ctx.db.query.userSettings.findFirst({
                where: eq(userSettings.userId, userId),
            });

            if (existingSettings) {
                const updated = await ctx.db
                    .update(userSettings)
                    .set({
                        ...(input.theme && { theme: input.theme }),
                        ...(input.notifications !== undefined && {
                            notifications: input.notifications,
                        }),
                        ...(input.soundEnabled !== undefined && {
                            soundEnabled: input.soundEnabled,
                        }),
                        ...(input.language && { language: input.language }),
                        // ...(input.mutedChats && {
                        //     mutedChats: input.mutedChats,
                        // }),
                        updatedAt: new Date(),
                    })
                    .where(eq(userSettings.userId, userId))
                    .returning();

                return updated[0];
            }

            const newSettings = await ctx.db
                .insert(userSettings)
                .values({
                    userId,
                    ...(input.theme && { theme: input.theme }),
                    ...(input.notifications !== undefined && {
                        notifications: input.notifications,
                    }),
                    ...(input.soundEnabled !== undefined && {
                        soundEnabled: input.soundEnabled,
                    }),
                    ...(input.language && { language: input.language }),
                    // ...(input.mutedChats && { mutedChats: input.mutedChats }),
                })
                .returning();

            return newSettings[0];
        }),

    getSettings: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        const settings = await ctx.db.query.userSettings.findFirst({
            where: eq(userSettings.userId, userId),
        });

        console.log(settings);

        if (!settings) {
            const defaultSettings = await ctx.db
                .insert(userSettings)
                .values({
                    userId,
                    theme: "system",
                    notifications: true,
                    soundEnabled: true,
                    language: "en",
                    // mutedChats: [],
                })
                .returning();

            return defaultSettings[0];
        }

        return settings;
    }),

    getContacts: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.session.user.id;

        const contacts = await ctx.db.query.userContacts.findMany({
            where: eq(userContacts.userId, userId),
            columns: {
                contactId: true,
            },
        });

        return contacts;
    }),

    getMembers: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Check if user is a member of the conversation
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

            // Get all members of the conversation
            const members = await ctx.db
                .select({
                    id: users.id,
                    name: users.name,
                    image: users.image,
                    role: conversationMembers.role,
                    muted: conversationMembers.muted,
                })
                .from(conversationMembers)
                .innerJoin(users, eq(conversationMembers.userId, users.id))
                .where(
                    eq(conversationMembers.conversationId, input.conversationId)
                );

            return members;
        }),

    getTypingUsers: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            // In a real app, this would use a real-time service like Socket.io
            // For now, return an empty array (no one is typing)
            return [];
        }),

    updateContact: protectedProcedure
        .input(
            z.object({
                userId: z.string(),
                action: z.enum(["add", "remove"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const currentUserId = ctx.session.user.id;

            if (currentUserId === input.userId) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot add yourself as a contact",
                });
            }

            // Check if the user exists
            const userExists = await ctx.db.query.users.findFirst({
                where: eq(users.id, input.userId),
            });

            if (!userExists) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "User not found",
                });
            }

            if (input.action === "add") {
                // Check if already a contact
                const existingContact =
                    await ctx.db.query.userContacts.findFirst({
                        where: and(
                            eq(userContacts.userId, currentUserId),
                            eq(userContacts.contactId, input.userId)
                        ),
                    });

                if (existingContact) {
                    return { success: true }; // Already a contact
                }

                // Add as contact
                await ctx.db.insert(userContacts).values({
                    userId: currentUserId,
                    contactId: input.userId,
                });
            } else {
                // Remove contact
                await ctx.db
                    .delete(userContacts)
                    .where(
                        and(
                            eq(userContacts.userId, currentUserId),
                            eq(userContacts.contactId, input.userId)
                        )
                    );
            }

            return { success: true };
        }),

    updateMutedChat: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                muted: z.boolean(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            // Check if the user is a member of the conversation
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

            // Update the muted field directly in the conversationMembers table
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
