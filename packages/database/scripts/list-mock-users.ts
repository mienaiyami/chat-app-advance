import { db } from "@repo/database";

const listMockUsers = async () => {
    const users = await db.query.users.findMany({
        where: (users, { like }) => like(users.id, "mock-%"),
    });

    console.log(users.map((user) => user.email));
    process.exit(0);
};

void listMockUsers().catch((error) => {
    console.error("Failed to list mock users:", error);
    process.exit(1);
});
