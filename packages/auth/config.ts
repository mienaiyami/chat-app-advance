import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db, eq } from "@repo/database";
import { accounts, sessions, users, verificationTokens } from "@repo/database";
import { env } from "./env";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            // ...other properties
            // role: UserRole;
        } & DefaultSession["user"];
        // sessionToken: string;
    }

    // interface User {
    //   // ...other properties
    //   // role: UserRole;
    // }
}

const isDev = process.env.NODE_ENV === "development";

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig: NextAuthConfig = {
    // debug: isDev,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/signin",
        signOut: "/auth/signout",
        error: "/auth/error",
    },
    providers: [
        // DiscordProvider
        GithubProvider({
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
        }),
        GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
        }),
        ...(isDev
            ? [
                  CredentialsProvider({
                      name: "Mock Credentials",
                      credentials: {
                          email: {
                              label: "Email",
                              type: "email",
                              placeholder: "mock@example.com",
                          },
                      },
                      async authorize(credentials) {
                          if (!credentials?.email) {
                              return null;
                          }

                          const user = await db.query.users.findFirst({
                              where: eq(
                                  users.email,
                                  credentials.email as string
                              ),
                          });

                          if (!user?.id.startsWith("mock-")) {
                              return null;
                          }
                          return user;
                      },
                  }),
              ]
            : []),
    ],
    adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    callbacks: {
        session: async ({ session, token }) => {
            // token.sub is the user id
            if (!token.sub) {
                return session;
            }
            return {
                ...session,
                user: {
                    ...session.user,
                    id: token.sub,
                },
            };
        },
        signIn: async ({ user }) => {
            if (!user?.id) {
                return false;
            }
            // const existingRole = await db.query.userRoles.findMany({
            //     where: eq(userRoles.userId, user.id),
            // });
            // if (existingRole.length === 0) {
            //     await db.insert(userRoles).values({
            //         role: "student",
            //         userId: user.id,
            //     });
            // }
            return true;
        },
    },
};
