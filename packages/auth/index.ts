import NextAuth, { type Session, type NextAuthResult } from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const result = NextAuth(authConfig);

export const handlers: NextAuthResult["handlers"] = result.handlers;
export const uncachedAuth: NextAuthResult["auth"] = result.auth;
export const signIn: NextAuthResult["signIn"] = result.signIn;
export const signOut: NextAuthResult["signOut"] = result.signOut;

export const auth: NextAuthResult["auth"] = cache(uncachedAuth);
export type NextSession = Session;
