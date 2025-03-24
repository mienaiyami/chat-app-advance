import type { NextApiRequest } from "next";
import { initSocketServer } from "~/server/socket/index";
import type { NextApiResponseServerIO } from "~/types/next";

export const GET = async (
    req: NextApiRequest,
    res: NextApiResponseServerIO
) => {
    initSocketServer(req, res);

    res.status(200).json({
        success: true,
        message: "Socket server running",
    });
};

export const config = {
    api: {
        bodyParser: false,
    },
};
