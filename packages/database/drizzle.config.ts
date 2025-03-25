import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in the environment");
}

export default {
    schema: "./src/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    tablesFilter: ["chat-app-advance_*"],
} satisfies Config;
