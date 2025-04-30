import { auth } from "@repo/auth";
import { type FileRouter, createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const fileRouter = {
	avatarUploader: f({
		image: {
			maxFileSize: "4MB",
		},
	})
		.middleware(async ({ req }) => {
			const session = await auth();

			// eslint-disable-next-line @typescript-eslint/only-throw-error
			if (!session?.user.id) throw new UploadThingError("Unauthorized");
			return { userId: session?.user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			console.log("Upload complete for userId:", metadata.userId);

			console.log("file url", file.ufsUrl);
			return { uploadedBy: metadata.userId };
		}),
	chatFileUploader: f({
		image: {
			/**
			 * For full list of options and defaults, see the File Route API reference
			 * @see https://docs.uploadthing.com/file-routes#route-config
			 */
			maxFileSize: "8MB",
		},
		video: {
			maxFileSize: "16MB",
		},
		audio: {
			maxFileSize: "8MB",
		},
		blob: {
			maxFileSize: "16MB",
		},
		pdf: {
			maxFileSize: "16MB",
		},
	})
		.middleware(async ({ req }) => {
			const session = await auth();

			// eslint-disable-next-line @typescript-eslint/only-throw-error
			if (!session?.user.id) throw new UploadThingError("Unauthorized");
			return { userId: session?.user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
			console.log("Upload complete for userId:", metadata.userId);

			console.log("file url", file.ufsUrl);
			return { uploadedBy: metadata.userId };
		}),
} satisfies FileRouter;

export type ChatFileRouter = typeof fileRouter;
