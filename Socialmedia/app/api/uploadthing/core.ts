import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { db } from "@/lib/db/queries";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f({ 
    image: { 
      maxFileSize: "4MB", 
      maxFileCount: 5 
    } 
  })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Upload complete for userId:", metadata.userId);
      console.log("📎 File URL:", file.url);
      return { uploadedBy: metadata.userId };
    }),
    
  avatarUploader: f({ 
    image: { 
      maxFileSize: "4MB", 
      maxFileCount: 1 
    } 
  })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Avatar upload complete for userId:", metadata.userId);
      await db.users.updateAvatar(metadata.userId, file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  coverUploader: f({ 
    image: { 
      maxFileSize: "8MB", 
      maxFileCount: 1 
    } 
  })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Cover upload complete for userId:", metadata.userId);
      await db.users.updateCover(metadata.userId, file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  videoUploader: f({ 
    video: { 
      maxFileSize: "16MB", 
      maxFileCount: 3 
    } 
  })
    .middleware(async () => {
      const session = await getServerSession(authOptions);
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Video upload complete for userId:", metadata.userId);
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;