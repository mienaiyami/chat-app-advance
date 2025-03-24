import { userRouter } from "./routers/user";
import { messageRouter } from "./routers/message";
import { createCallerFactory, createTRPCRouter } from "./trpc";
import { conversationRouter } from "./routers/conversation";

export const appRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
    user: userRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
