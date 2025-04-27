import { authConfig } from "./config";
import { getToken } from "next-auth/jwt";
import { env } from "./env";
import { getSession } from "@auth/express";

/**
 * Get token from nextjs session in express
 */
export const getTokenExpress = async (req: Request) => {
    const token = await getToken({ req, secret: env.AUTH_SECRET });
    return token;
};

// export const getSessionExpress = async (req: Request) => {
//     const session = await getSession(req, authConfig);
//     return session;
// };
