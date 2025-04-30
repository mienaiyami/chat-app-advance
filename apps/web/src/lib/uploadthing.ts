import { generateReactHelpers } from "@uploadthing/react";
import type { ChatFileRouter } from "~/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } =
	generateReactHelpers<ChatFileRouter>();
