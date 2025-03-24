import { z } from "zod";
import { and, eq, or } from "@repo/database";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { users, userSettings } from "@repo/database/schema";

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
                username: z.string().min(3).optional(),
                avatarUrl: z.string().url().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.session.user.id;

            const updatedUser = await ctx.db
                .update(users)
                .set({
                    ...(input.username && { username: input.username }),
                    ...(input.avatarUrl && { avatarUrl: input.avatarUrl }),
                    updatedAt: new Date(),
                })
                .where(eq(users.id, userId))
                .returning();

            return updatedUser[0];
        }),

    updateSettings: protectedProcedure
        .input(
            z.object({
                theme: z.enum(["light", "dark", "system"]).optional(),
                notifications: z.boolean().optional(),
                soundEnabled: z.boolean().optional(),
                language: z.string().optional(),
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
                })
                .returning();

            return newSettings[0];
        }),
});
